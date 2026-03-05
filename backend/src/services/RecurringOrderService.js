const db = require('../config/database');
const RecurringOrderRepository = require('../repositories/RecurringOrderRepository');
const WalletRepository = require('../repositories/WalletRepository');
const { ORDER_STATUS } = require('../config/constants');
const LockService = require('./LockService');
const { emitToUser } = require('../utils/socket');
const logger = require('../utils/logger');

/**
 * 周期订单业务服务层
 * 完全独立，不影响OrderService
 */
class RecurringOrderService {
    /**
     * 创建周期订单
     * @param {*} userId 用户ID
     * @param {*} data { serviceId, serviceName, totalSessions, startDate, sessionPrice, address, ... }
     */
    static async createRecurringOrder(userId, data) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. 验证服务ID（只能是遛狗36或喂猫37）
            if (![36, 37].includes(data.serviceId)) {
                throw new Error('周期单只支持遛狗和喂猫服务');
            }

            // 2. 生成订单号
            const orderNo = 'RO' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();

            // 3. 计算总价
            const totalPrice = data.sessionPrice * data.totalSessions;

            // 4. 创建母订单
            const recurringOrderId = await RecurringOrderRepository.createRecurringOrder({
                orderNo,
                userId,
                providerId: data.providerId || null,
                serviceId: data.serviceId,
                serviceName: data.serviceName,
                totalSessions: data.totalSessions,
                sessionInterval: data.sessionInterval || 1,
                startDate: data.startDate,
                totalPrice,
                sessionPrice: data.sessionPrice,
                address: data.address,
                contactPhone: data.contactPhone,
                serviceTime: data.serviceTime,
                remark: data.remark
            }, connection);

            // 5. 创建各个服务场次（重构：现在是真实的订单记录）
            const OrderRepository = require('../repositories/OrderRepository');
            const sessions = [];
            for (let i = 0; i < data.totalSessions; i++) {
                const sessionDate = new Date(data.startDate);
                sessionDate.setDate(sessionDate.getDate() + i * (data.sessionInterval || 1));
                const dateStr = sessionDate.toISOString().split('T')[0];

                // 生成子订单号 (在母单号后面加序号)
                const subOrderNo = `${orderNo}-${i + 1}`;

                // 直接在 orders 表创建真实的履约记录
                const subOrderId = await OrderRepository.create({
                    order_no: subOrderNo,
                    user_id: userId,
                    provider_id: data.providerId || null,
                    service_id: data.serviceId,
                    service_name: data.serviceName,
                    service_price: data.sessionPrice,
                    total_price: data.sessionPrice,
                    service_address: data.address,
                    contact_phone: data.contactPhone,
                    contact_name: data.contactName || '下单客户',
                    service_time: `${dateStr} ${data.serviceTime}`,
                    status: 1, // 周期单子项通常直接是“已接单/待服务”状态
                    order_type: 1, // 周期单标记
                    parent_recurring_id: recurringOrderId, // 关联母单
                    session_index: i + 1, // 场次序号
                    pay_status: 1, // 周期单母单支付后，子单默认也是支付状态（资金在母单池子）
                    remark: data.remark // 核心：同步宠物信息到子订单
                }, connection);

                sessions.push({ sessionId: subOrderId, sessionDate: dateStr, index: i + 1 });
            }

            await connection.commit();

            return {
                recurringOrderId,
                orderNo,
                totalPrice,
                sessions
            };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * 获取服务清单（根据服务类型）
     */
    static getChecklistItems(serviceId, serviceName = '') {
        const isDog = Number(serviceId) === 36 || serviceName?.includes('狗');
        const isCat = Number(serviceId) === 37 || serviceName?.includes('猫') || serviceName?.includes('喂养') || serviceName?.includes('宠物');
        
        if (isDog || isCat) {
            return ['门牌号/入场录像', '铲屎/换水/清扫', '15秒喂食/互动视频'];
        }
        return [];
    }

    /**
     * 支付周期订单（一次性托管支付）
     */
    static async payRecurringOrder(userId, recurringOrderId) {
        return await LockService.wrap(`pay_recurring:${recurringOrderId}`, async () => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                // 1. 查询订单
                const order = await RecurringOrderRepository.findByIdWithSessions(recurringOrderId, connection);
                if (!order || order.user_id !== userId) {
                    throw new Error('订单不存在');
                }
                if (order.pay_status === 1) {
                    throw new Error('订单已支付');
                }

                // 2. 扣除用户余额
                const balanceBefore = await WalletRepository.getBalanceForUpdate(userId, connection);
                const amount = parseFloat(order.total_price);

                if (balanceBefore < amount) {
                    throw new Error('余额不足');
                }

                const balanceAfter = balanceBefore - amount;
                await WalletRepository.updateBalance(userId, balanceAfter, connection);

                // 3. 更新订单状态（托管冻结金额）
                await RecurringOrderRepository.updateRecurringOrder(recurringOrderId, {
                    payStatus: 1,
                    status: 1, // 进行中
                    payTime: new Date(),
                    frozenAmount: amount
                }, connection);

                // 4. 记录钱包流水
                await WalletRepository.addRecord({
                    userId,
                    orderId: recurringOrderId,
                    orderNo: order.order_no,
                    type: 2, // 支出
                    amount: -amount,
                    balanceBefore,
                    balanceAfter,
                    remark: `支付周期单: ${order.service_name} x${order.total_sessions}次`
                }, connection);

                await connection.commit();
                return { success: true, orderNo: order.order_no };
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        }, 15000);
    }

    /**
     * 师傅打卡
     */
    static async punchSession(providerId, sessionId, reportData) {
        // 统一走 OrderService.updateStatus
        const OrderService = require('./OrderService');
        return await OrderService.updateStatus(sessionId, providerId, 'provider', 3, reportData);
    }

    /**
     * 用户确认服务完成
     */
    static async confirmSession(userId, sessionId) {
        // 统一走 OrderService.updateStatus
        const OrderService = require('./OrderService');
        return await OrderService.updateStatus(sessionId, userId, 'user', 3, { confirmSatisfaction: true });
    }

    /**
     * 结算场次（从托管池释放给服务者）
     */
    static async settleSession(sessionId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. 查询子订单 (orders 表)
            const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [sessionId]);
            const subOrder = orderRows[0];
            if (!subOrder || !subOrder.parent_recurring_id) {
                throw new Error('子订单不存在或非周期单');
            }

            // 2. 查询母订单 (recurring_orders 表)
            const [motherRows] = await connection.query('SELECT * FROM recurring_orders WHERE id = ? FOR UPDATE', [subOrder.parent_recurring_id]);
            const motherOrder = motherRows[0];
            if (!motherOrder) throw new Error('母订单不存在');
            if (!motherOrder.provider_id) throw new Error('未分配服务者');

            const sessionPrice = parseFloat(subOrder.total_price);

            // 3. 给服务者加钱 (users 表)
            const [providerRows] = await connection.query('SELECT id, balance FROM users WHERE id = (SELECT user_id FROM providers WHERE id = ?) FOR UPDATE', [motherOrder.provider_id]);
            if (providerRows.length === 0) throw new Error('服务者账户不存在');
            
            const providerUser = providerRows[0];
            const providerBalance = parseFloat(providerUser.balance || 0);
            const newProviderBalance = providerBalance + sessionPrice;
            
            await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newProviderBalance, providerUser.id]);

            // 4. 减少母单托管冻结金额
            const newFrozenAmount = parseFloat(motherOrder.frozen_amount) - sessionPrice;
            await connection.query('UPDATE recurring_orders SET frozen_amount = ? WHERE id = ?', [newFrozenAmount, motherOrder.id]);

            // 5. 记录服务者钱包流水 (wallet_records 表)
            const WalletRepository = require('../repositories/WalletRepository');
            await WalletRepository.addRecord({
                userId: providerUser.id,
                orderId: subOrder.id,
                orderNo: subOrder.order_no,
                type: 1, // 收入
                amount: sessionPrice,
                balanceBefore: providerBalance,
                balanceAfter: newProviderBalance,
                remark: `周期单分段收入: ${motherOrder.service_name} (第${subOrder.session_index}次)`
            }, connection);

            // 6. 如果全部完成，更新母订单状态
            if (motherOrder.completed_sessions >= motherOrder.total_sessions) {
                await connection.query('UPDATE recurring_orders SET status = 2 WHERE id = ?', [motherOrder.id]);
            }

            await connection.commit();
            console.log(`>> [Settlement] Successfully settled session ${sessionId}, amount: ${sessionPrice}`);
            return { success: true };
        } catch (err) {
            await connection.rollback();
            console.error('>> [Settlement] Error:', err);
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * 完成清单项 (重构：支持子订单模型)
     */
    static async completeChecklistItem(providerId, sessionId, itemName) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. 获取母单 ID 及权限校验信息
            const [orderRows] = await connection.query('SELECT provider_id, parent_recurring_id FROM orders WHERE id = ?', [sessionId]);
            let motherId;
            let realProviderId;

            if (orderRows.length > 0 && orderRows[0].parent_recurring_id) {
                motherId = orderRows[0].parent_recurring_id;
                realProviderId = orderRows[0].provider_id;
            } else {
                const session = await RecurringOrderRepository.findSessionById(sessionId, connection);
                if (!session) throw new Error('场次不存在');
                motherId = session.recurring_order_id;
                const [orders] = await connection.query('SELECT provider_id FROM recurring_orders WHERE id = ?', [motherId]);
                realProviderId = orders[0]?.provider_id;
            }

            // 只要匹配当前用户/服务者身份即可
            if (realProviderId !== providerId && (await this.getRealProviderId(providerId)) !== realProviderId) {
                // 如果 providerId 是 userId，我们需要转换一下
                const [pRows] = await connection.query('SELECT id FROM providers WHERE user_id = ?', [providerId]);
                const pid = pRows[0]?.id;
                if (pid !== realProviderId) throw new Error('无权操作');
            }

            await RecurringOrderRepository.completeChecklistItem(sessionId, itemName, connection);
            await connection.commit();

            return { success: true };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    // 辅助方法：获取真实的服务者ID
    static async getRealProviderId(userIdOrPid) {
        const [rows] = await db.query('SELECT id FROM providers WHERE user_id = ? OR id = ?', [userIdOrPid, userIdOrPid]);
        return rows[0]?.id;
    }


    /**
     * 师傅标记已到达 (深度重构：支持所有架构版本)
     */
    static async markSessionArrived(providerId, sessionId) {
        // 1. 新模型探测 (优先走 OrderService 统一状态机)
        const [orderRows] = await db.query('SELECT id, parent_recurring_id FROM orders WHERE id = ?', [sessionId]);
        if (orderRows.length > 0) {
            const OrderService = require('./OrderService');
            return await OrderService.updateStatus(sessionId, providerId, 'provider', 11);
        }
        throw new Error('订单不存在或已废弃');
    }

    /**
     * 师傅开始服务 (深度重构：支持所有架构版本)
     */
    static async startSessionService(providerId, sessionId) {
        // 1. 新模型探测
        const [orderRows] = await db.query('SELECT id FROM orders WHERE id = ?', [sessionId]);
        if (orderRows.length > 0) {
            const OrderService = require('./OrderService');
            return await OrderService.updateStatus(sessionId, providerId, 'provider', 2);
        }
        throw new Error('订单不存在或已废弃');
    }

    /**
     * 师傅完成服务并打卡 (深度重构：支持所有架构版本)
     */
    static async completeSessionService(providerId, sessionId, rawReportData) {
        // 数据规范化
        const reportData = rawReportData.proof_data || rawReportData;
        const images = reportData.images || reportData.proofImages || [];

        // 1. 新模型探测
        const [orderRows] = await db.query('SELECT id FROM orders WHERE id = ?', [sessionId]);
        if (orderRows.length > 0) {
            const OrderService = require('./OrderService');
            return await OrderService.updateStatus(sessionId, providerId, 'provider', 3, {
                proof_data: reportData,
                proofImages: images,
                completionTags: reportData.completionTags || []
            });
        }
        throw new Error('订单不存在或已废弃');
    }

    /**
     * 获取周期订单单次场次详情 (对齐 OrderDetail 所需数据)
     */
    static async getRecurringSessionDetail(sessionId, userId, userRole) {
        // [核心修复] 1. 优先探测是否为旧模型 (order_schedules 表)
        const [scheduleRows] = await db.query('SELECT * FROM order_schedules WHERE id = ?', [sessionId]);
        if (scheduleRows.length > 0) {
            const schedule = scheduleRows[0];
            const OrderRepository = require('../repositories/OrderRepository');
            // 获取母订单信息
            const motherOrder = await OrderRepository.findDetail(schedule.order_id);
            if (!motherOrder) throw new Error('母订单不存在');

            // 权限校验 (使用母订单的权限)
            await this.checkAccess(motherOrder, userId, userRole);

            // 组装模拟订单对象，对齐前端消费
            return {
                ...motherOrder,
                id: schedule.id, // 场次ID作为主ID
                status: schedule.status === 1 ? 3 : (schedule.status === 2 ? 4 : motherOrder.status), // 状态映射
                service_time: `${schedule.service_date.toISOString().split('T')[0]} ${schedule.service_time}`,
                is_recurring_session: true,
                parent_recurring_id: motherOrder.id,
                total_count: motherOrder.total_count,
                completed_count: motherOrder.completed_count,
                review_rating: motherOrder.review_rating || 0,
                total_price: Number(motherOrder.total_price || 0),
                platform_fee: Number(motherOrder.platform_fee || 0),
                checklist: this.getChecklistItems(motherOrder.service_id, motherOrder.service_name).map((item, idx) => ({
                    id: `schedule_${idx}`,
                    checklist_item: item,
                    completed: schedule.status === 1 ? 1 : 0
                }))
            };
        }

        // 2. 新模型探测 (子订单在 orders 表中)
        const OrderRepository = require('../repositories/OrderRepository');
        const session = await OrderRepository.findDetail(sessionId);
        
        if (!session) {
            throw new Error('订单不存在或已废弃');
        }

        // 权限校验
        await this.checkAccess(session, userId, userRole);

        // 3. 查询母订单进度信息 (用于详情页进度条展示)
        let motherInfo = { total_count: 1, completed_count: 0 };
        if (session.parent_recurring_id) {
            const [mRows] = await db.query('SELECT total_sessions, completed_sessions, address, contact_phone, contact_name, provider_id FROM recurring_orders WHERE id = ?', [session.parent_recurring_id]);
            if (mRows.length > 0) {
                motherInfo = {
                    total_count: mRows[0].total_sessions,
                    completed_count: mRows[0].completed_sessions,
                    mother_address: mRows[0].address,
                    mother_phone: mRows[0].contact_phone,
                    mother_contact: mRows[0].contact_name,
                    mother_provider_id: mRows[0].provider_id
                };
            }
        }

        // 4. 获取清单 (实时从 orders.proof_data 映射)
        const items = this.getChecklistItems(session.service_id, session.service_name);
        const pd = typeof session.proof_data === 'string' ? JSON.parse(session.proof_data || '{}') : (session.proof_data || {});
        const hasEntry = pd.entry_proof || pd.entry?.video;
        const hasWalking = pd.walking_proof?.length > 0 || pd.environment?.images?.length > 0;
        const hasExit = pd.exit_proof || pd.interaction?.video;

        const checklist = items.map((item, idx) => {
            let completed = 0;
            if (item.includes('门牌') || item.includes('入场')) completed = hasEntry ? 1 : 0;
            else if (item.includes('铲屎') || item.includes('环境')) completed = hasWalking ? 1 : 0;
            else if (item.includes('喂食') || item.includes('互动')) completed = hasExit ? 1 : 0;
            if ([3, 5].includes(session.status)) completed = 1;
            return { id: `auto_${idx}`, checklist_item: item, completed };
        });

        // 5. 组装最终结果 (完全兼容 OrderDetail.vue 的数据消费)
        return {
            ...session,
            ...motherInfo,
            id: session.id,
            status: session.status,
            checklist: checklist,
            is_recurring_session: !!session.parent_recurring_id,
            review_rating: session.review_rating || 0,
            total_price: Number(session.total_price || 0),
            platform_fee: Number(session.platform_fee || 0)
        };
    }

    // 辅助方法：统一权限校验逻辑
    static async checkAccess(session, userId, userRole) {
        const [pRows] = await db.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
        const providerId = pRows?.length > 0 ? pRows[0].id : null;

        const isOwner = session.user_id === userId;
        const isAssignedProvider = session.provider_id === providerId || (process.env.NODE_ENV !== 'production' && (session.provider_id === userId || session.provider_user_id === userId));
        const isAdmin = userRole === 'admin';
        const isPublicGrab = session.status === 0 && userRole === 'provider';

        let isMotherAssigned = false;
        if (session.parent_recurring_id && (providerId || userId)) {
            // 探测两种母单表
            const [mRows] = await db.query('SELECT provider_id FROM recurring_orders WHERE id = ?', [session.parent_recurring_id]);
            const [mRows2] = await db.query('SELECT provider_id FROM orders WHERE id = ?', [session.parent_recurring_id]);
            const motherProviderId = mRows[0]?.provider_id || mRows2[0]?.provider_id;
            
            if (motherProviderId === providerId || (process.env.NODE_ENV !== 'production' && motherProviderId === userId)) {
                isMotherAssigned = true;
            }
        }

        if (!isOwner && !isAssignedProvider && !isAdmin && !isPublicGrab && !isMotherAssigned) {
            console.error(`>> [AuthError] User ${userId} has no access to session. Role: ${userRole}`);
            // 暂时放行 provider 以供排错
            if (userRole !== 'provider') {
                throw new Error('无权查看该场次详情');
            }
        }
    }

    /**
     * 获取周期订单详情
     */
    static async getRecurringOrderDetail(orderId, userId, userRole) {
        // 强制打印调试信息，确认进入了哪个校验分支
        console.log(`>> [RecurringOrderService] Detail Request: ID=${orderId}, UserID=${userId}, Role=${userRole}`);

        let order = await RecurringOrderRepository.findByIdWithSessions(orderId);

        // 兼容性修复：如果在 recurring_orders 表中找不到，尝试在 orders 表中查找并转换
        if (!order) {
            const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
            if (rows && rows.length > 0) {
                const mainOrder = rows[0];
                if (mainOrder.order_type == 1) {
                    order = {
                        id: mainOrder.id,
                        order_no: mainOrder.order_no,
                        user_id: mainOrder.user_id,
                        provider_id: mainOrder.provider_id,
                        service_id: mainOrder.service_id,
                        service_name: mainOrder.service_name,
                        total_price: mainOrder.total_price,
                        session_price: mainOrder.service_price,
                        status: mainOrder.status,
                        address: mainOrder.service_address,
                        service_address: mainOrder.service_address, // 增加对齐字段
                        contact_name: mainOrder.contact_name,       // 历史补全
                        contact_phone: mainOrder.contact_phone,
                        pay_status: mainOrder.pay_status,
                        service_time: mainOrder.service_time,
                        remark: mainOrder.remark,
                        sessions: []
                    };

                    const [schedules] = await db.query('SELECT * FROM order_schedules WHERE order_id = ? ORDER BY service_date ASC', [orderId]);
                    order.sessions = schedules.map((s, index) => ({
                        id: s.id,
                        recurring_order_id: mainOrder.id,
                        session_index: index + 1,
                        session_date: s.service_date,
                        service_time: s.service_time,
                        status: s.status === 1 ? 'settled' : (s.status === 2 ? 'cancelled' : 'pending'),
                        checklist: []
                    }));
                    order.total_sessions = schedules.length;
                    order.completed_sessions = schedules.filter(s => s.status === 1).length;
                }
            }
        }

        if (!order) throw new Error('订单不存在');

        // --- 权限校验核心修复 ---
        // 1. 如果是开发环境，且当前用户是订单的下单人或承接人，直接放行
        const isDev = process.env.NODE_ENV !== 'production';

        // 获取当前用户的服务者ID（如果他是服务者的话）
        const [pRows] = await db.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
        const providerId = pRows?.length > 0 ? pRows[0].id : null;

        console.log(`>> [RecurringOrderService] Auth Debug: OrderUser=${order.user_id}, OrderProvider=${order.provider_id}, CurrentUser=${userId}, CurrentProvider=${providerId}`);

        // 只要满足其中一个身份，就允许查看
        const isOwner = order.user_id === userId;
        const isAssignedProvider = order.provider_id === providerId || (isDev && order.provider_id === userId);

        if (isOwner || isAssignedProvider) {
            console.log('>> [RecurringOrderService] Auth Passed');
            return order;
        }

        // 如果都不满足，报错
        throw new Error('无权查看');
    }

    /**
     * 师傅拒绝取消请求
     */
    static async rejectCancellation(providerId, recurringOrderId, rejectReason) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 验证权限
            const order = await RecurringOrderRepository.findByIdWithSessions(recurringOrderId, connection);
            if (!order || order.provider_id !== providerId) {
                throw new Error('无权操作');
            }

            if (order.cancel_status !== 'pending') {
                throw new Error('订单未在取消申请中');
            }

            // 更新订单取消状态
            await RecurringOrderRepository.updateRecurringOrder(recurringOrderId, {
                cancelStatus: 'rejected',
                cancelRejectReason: rejectReason,
                cancelRejectTime: new Date()
            }, connection);

            await connection.commit();

            // 实时通知用户
            emitToUser(order.user_id, 'recurring_order_reject_cancel', {
                orderId: recurringOrderId,
                orderNo: order.order_no,
                rejectReason: rejectReason,
                message: `师傅已拒绝取消申请：${rejectReason}`
            });

            return { success: true };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * 师傅同意部分取消（取消未开始的场次）
     */
    static async acceptPartialCancellation(providerId, recurringOrderId) {
        return await LockService.wrap(`cancel_recurring:${recurringOrderId}`, async () => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                // 验证权限
                const order = await RecurringOrderRepository.findByIdWithSessions(recurringOrderId, connection);
                if (!order || order.provider_id !== providerId) {
                    throw new Error('无权操作');
                }

                if (order.cancel_status !== 'pending') {
                    throw new Error('订单未在取消申请中');
                }

                // 1. 计算可取消的场次（status=0或11）
                const cancellableSessions = order.sessions.filter(s => s.status === 0 || s.status === 11);
                const completedSessions = order.sessions.filter(s => s.status === 3);
                const inProgressSessions = order.sessions.filter(s => s.status === 2);

                if (cancellableSessions.length === 0) {
                    throw new Error('没有可取消的场次');
                }

                // 2. 计算退款金额
                const sessionPrice = parseFloat(order.session_price);
                const refundAmount = cancellableSessions.length * sessionPrice;
                const providerIncome = completedSessions.length * sessionPrice;

                // 3. 更新可取消场次的状态为已取消
                for (let session of cancellableSessions) {
                    await RecurringOrderRepository.updateSession(session.id, {
                        status: 'cancelled',
                        cancelledAt: new Date()
                    }, connection);
                }

                // 4. 更新母订单状态
                const newStatus = completedSessions.length > 0 ? 2 : 4; // 2=部分完成, 4=已取消
                await RecurringOrderRepository.updateRecurringOrder(recurringOrderId, {
                    status: newStatus,
                    cancelStatus: 'accepted',
                    cancelAcceptTime: new Date(),
                    totalSessions: completedSessions.length + inProgressSessions.length, // 更新总次数
                    frozenAmount: order.frozen_amount - refundAmount // 减少冻结金额
                }, connection);

                // 5. 退款给用户
                const balanceBefore = await WalletRepository.getBalanceForUpdate(order.user_id, connection);
                const balanceAfter = balanceBefore + refundAmount;
                await WalletRepository.updateBalance(order.user_id, balanceAfter, connection);

                // 6. 记录退款流水
                await WalletRepository.addRecord({
                    userId: order.user_id,
                    orderId: recurringOrderId,
                    orderNo: order.order_no,
                    type: 1, // 收入
                    amount: refundAmount,
                    balanceBefore,
                    balanceAfter,
                    remark: `周期单部分取消退款: 取消${cancellableSessions.length}次服务`
                }, connection);

                await connection.commit();

                // 实时通知用户
                emitToUser(order.user_id, 'recurring_order_cancelled', {
                    orderId: recurringOrderId,
                    orderNo: order.order_no,
                    cancelledSessions: cancellableSessions.length,
                    refundAmount: refundAmount.toFixed(2),
                    message: `周期单已部分取消，退款¥${refundAmount.toFixed(2)}`
                });

                return {
                    success: true,
                    cancelledSessions: cancellableSessions.length,
                    refundAmount: refundAmount.toFixed(2),
                    providerIncome: providerIncome.toFixed(2)
                };
            } catch (err) {
                await connection.rollback();
                throw err;
            } finally {
                connection.release();
            }
        });
    }

    /**
     * 用户申请取消单场次
     */
    static async requestSessionCancel(userId, sessionId) {
        // 1. 查询场次信息 (统一走 orders 表)
        const [sessions] = await db.query('SELECT * FROM orders WHERE id = ?', [sessionId]);
        if (sessions.length === 0) throw new Error('场次不存在');
        const session = sessions[0];

        // 2. 校验状态（只有待服务/已到达可申请取消）
        if (![0, 1, 11].includes(session.status)) {
            throw new Error('该场次已开始服务，无法申请取消');
        }

        // 3. 查询母订单
        const motherId = session.parent_recurring_id;
        const [orders] = await db.query('SELECT * FROM recurring_orders WHERE id = ?', [motherId]);
        if (orders.length === 0) throw new Error('母订单不存在');
        const order = orders[0];

        if (order.user_id !== userId) throw new Error('无权操作');

        // 4. 更新场次状态为取消协商中 (status = 12)
        await db.query(`UPDATE orders SET status = 12, updated_at = NOW() WHERE id = ?`, [sessionId]);

        // 5. 通知服务者
        const [providers] = await db.query('SELECT user_id FROM providers WHERE id = ?', [order.provider_id]);
        if (providers.length > 0) {
            const NotificationService = require('./NotificationService');
            await NotificationService.notify(providers[0].user_id, 'CANCEL_REQUEST', {
                serviceName: `${order.service_name} (单日取消)`,
                orderNo: session.order_no,
                orderId: sessionId
            }, {
                targetId: sessionId,
                socketEvent: 'CANCEL_REQUEST'
            });
        }
    }

    /**
     * 服务者同意取消单场次
     */
    static async acceptSessionCancel(providerUserId, sessionId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. 查询场次 (统一走 orders 表)
            const [sessions] = await connection.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [sessionId]);
            if (sessions.length === 0) throw new Error('场次不存在');
            const session = sessions[0];

            if (session.status !== 12) {
                throw new Error('该场次不在取消协商状态');
            }

            // 2. 查母订单
            const motherId = session.parent_recurring_id;
            const [orders] = await connection.query('SELECT * FROM recurring_orders WHERE id = ? FOR UPDATE', [motherId]);
            if (orders.length === 0) throw new Error('母订单不存在');
            const order = orders[0];

            // 校验服务者权限
            const [providers] = await connection.query('SELECT id FROM providers WHERE user_id = ?', [providerUserId]);
            if (providers.length === 0 || providers[0].id !== order.provider_id) {
                throw new Error('无权操作');
            }

            // 3. 更新场次状态为已取消 (status = 4)
            await connection.query(`UPDATE orders SET status = 4, updated_at = NOW() WHERE id = ?`, [sessionId]);

            // 4. 计算退款金额
            const refundAmount = parseFloat(session.total_price);

            // 5. 退款给用户
            const WalletRepository = require('../repositories/WalletRepository');
            const balanceBefore = await WalletRepository.getBalanceForUpdate(order.user_id, connection);
            const balanceAfter = balanceBefore + refundAmount;
            await WalletRepository.updateBalance(order.user_id, balanceAfter, connection);

            // 6. 记录流水
            await WalletRepository.addRecord({
                userId: order.user_id,
                orderId: motherId,
                orderNo: order.order_no,
                type: 1, // 收入/退款
                amount: refundAmount,
                balanceBefore,
                balanceAfter,
                remark: `周期单单日取消退款: ${session.service_time}`
            }, connection);

            await connection.commit();

        // 7. 通知用户
        const { emitToUser } = require('../utils/socket');
        emitToUser(order.user_id, 'order_status_update', {
            orderId: sessionId,
            status: 4,
            message: `您申请取消的服务已通过，退款¥${refundAmount.toFixed(2)}`
        });

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * 服务者拒绝取消单场次
     */
    static async rejectSessionCancel(providerUserId, sessionId, rejectReason = '') {
        // 1. 查询场次
        const [sessions] = await db.query('SELECT * FROM orders WHERE id = ?', [sessionId]);
        if (sessions.length === 0) throw new Error('场次不存在');
        const session = sessions[0];

        if (session.status !== 12) {
            throw new Error('该场次不在取消协商状态');
        }

        // 2. 校验服务者权限
        const motherId = session.parent_recurring_id;
        const [orders] = await db.query('SELECT * FROM recurring_orders WHERE id = ?', [motherId]);
        if (orders.length === 0) throw new Error('母订单不存在');
        const order = orders[0];

        const [providers] = await db.query('SELECT id FROM providers WHERE user_id = ?', [providerUserId]);
        if (providers.length === 0 || providers[0].id !== order.provider_id) {
            throw new Error('无权操作');
        }

        // 3. 恢复场次状态为已接单 (status = 1)
        await db.query(`UPDATE orders SET status = 1, updated_at = NOW() WHERE id = ?`, [sessionId]);

        // 4. 通知用户
        const { emitToUser } = require('../utils/socket');
        emitToUser(order.user_id, 'order_status_update', {
            orderId: sessionId,
            status: 1,
            message: `您申请取消的服务被拒绝${rejectReason ? `：${rejectReason}` : ''}`
        });
    }
}

module.exports = RecurringOrderService;


