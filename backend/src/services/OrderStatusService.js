/**
 * OrderStatusService - 订单状态管理服务
 * 从 OrderService 拆分，专注于订单状态变更逻辑
 */
const { ORDER_STATUS } = require('../config/constants');
const OrderRepository = require('../repositories/OrderRepository');
const { eventBus, EVENTS } = require('../utils/eventBus');
const db = require('../config/database');

class OrderStatusService {
    /**
     * 获取业务策略 (静态方法)
     */
    static getStrategy(serviceName, categoryName) {
        const homeStrategy = require('./orderStrategies/HomeOrderStrategy');
        const petStrategy = require('./orderStrategies/PetOrderStrategy');
        const medicalStrategy = require('./orderStrategies/MedicalOrderStrategy');
        const BaseOrderStrategy = require('./orderStrategies/BaseOrderStrategy');
        const baseStrategy = new BaseOrderStrategy();

        if (categoryName?.includes('居家') || serviceName?.includes('做饭')) return homeStrategy;
        if (categoryName?.includes('宠物')) return petStrategy;
        if (categoryName?.includes('陪诊')) return medicalStrategy;
        if (categoryName?.includes('陪伴') || categoryName?.includes('陪护') || categoryName?.includes('养老') || serviceName?.includes('探访')) return baseStrategy;
        return null;
    }

    /**
     * 服务者抢单
     */
    static async acceptOrder(userId, orderId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [pRows] = await connection.query(`
                SELECT p.id, p.work_status, p.health_cert_status, u.id_card_verified 
                FROM providers p 
                JOIN users u ON p.user_id = u.id
                WHERE p.user_id = ? FOR UPDATE
            `, [userId]);
            
            if (pRows.length === 0) throw new Error('您不是服务者');
            const provider = pRows[0];
            const providerId = provider.id;

            // [核心防御升级] 强校验：实名 + 健康证
            if (provider.id_card_verified !== 1) {
                throw new Error('您的实名认证尚未通过，请先完成认证。');
            }
            if (provider.health_cert_status !== 1) {
                throw new Error('您的健康证审核尚未完成，暂无法提供服务。');
            }

            // [原有校验] 抢单时二次校验接单状态
            if (provider.work_status === 0) {
                throw new Error('您当前处于休息状态，请先开启接单模式');
            }

            const order = await OrderRepository.findById(orderId, connection, true);
            if (!order) throw new Error('订单不存在');
            if (order.status !== ORDER_STATUS.WAIT_ACCEPT) throw new Error('订单已被抢走');

            // [新增] 校验被指定订单的承接权
            if (order.assignment_type === 2 && order.provider_id && order.provider_id !== providerId) {
                throw new Error('该订单已由客户指名其他服务人员，您无法抢单');
            }

            await OrderRepository.update(orderId, {
                provider_id: providerId,
                status: ORDER_STATUS.ACCEPTED,
                accepted_at: new Date()
            }, connection);

            await OrderRepository.logStatus({
                orderId, oldStatus: order.status, newStatus: ORDER_STATUS.ACCEPTED,
                operatorId: userId, operatorRole: 'provider', remark: '接单成功'
            }, connection);

            await connection.commit();

            eventBus.emit(EVENTS.ORDER.ACCEPTED, { order });

            return order;
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 服务者确认到达
     */
    static async arriveOrder(userId, orderId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const order = await OrderRepository.findById(orderId, connection, true);
            if (!order) throw new Error('订单不存在');

            const [pRows] = await connection.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
            if (pRows.length === 0 || pRows[0].id !== order.provider_id) throw new Error('无权操作');
            if (order.is_arrived === 1) throw new Error('已确认过到达');

            await OrderRepository.update(orderId, {
                status: ORDER_STATUS.ARRIVED,
                arrived_at: new Date(),
                is_arrived: 1
            }, connection);

            await OrderRepository.logStatus({
                orderId, oldStatus: order.status, newStatus: ORDER_STATUS.ARRIVED,
                operatorId: userId, operatorRole: 'provider', remark: '确认到达服务地点'
            }, connection);

            await connection.commit();

            eventBus.emit(EVENTS.ORDER.ARRIVED, { order });

            return order;
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 通用状态变更 (含校验、日志与策略扩展)
     */
    static async updateStatus(orderId, operatorId, operatorRole, newStatus, params = {}) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const order = await OrderRepository.findById(orderId, connection, true);
            if (!order) {
                // [兼容逻辑] 如果 orders 表没找到，可能是旧版场次 ID（如 ID 47）
                const RecurringOrderService = require('./RecurringOrderService');
                try {
                    console.log(`>> [OrderStatusService] Fallback to Legacy Session: ID=${orderId}`);
                    // 根据新状态，转发到对应的 Service 方法
                    if (String(newStatus) === '11') await RecurringOrderService.markSessionArrived(operatorId, orderId);
                    else if (String(newStatus) === '2') await RecurringOrderService.startSessionService(operatorId, orderId);
                    else if (String(newStatus) === '3') await RecurringOrderService.completeSessionService(operatorId, orderId, params.proof_data || params);

                    await connection.commit();
                    return { success: true, isLegacy: true };
                } catch (legacyErr) {
                    console.error('>> [OrderStatusService] Legacy Fallback Failed:', legacyErr);
                    throw new Error('订单不存在或无法处理历史数据');
                }
            }

            let updateData = {};
            if (newStatus !== undefined) updateData.status = newStatus;

            // 处理扩展数据
            if (params.proof_data) updateData.proof_data = JSON.stringify(params.proof_data);
            if (params.proofImages) updateData.proof_images = JSON.stringify(params.proofImages);
            if (params.completionTags) updateData.completion_tags = JSON.stringify(params.completionTags);
            if (params.confirmSatisfaction) updateData.confirm_status = 1;

            // D. [新增] 周期单子项清单同步逻辑
            if (String(newStatus) === '3' && (order.order_type === 1 || order.parent_recurring_id)) {
                const tags = params.completionTags || [];
                if (tags.length > 0) {
                    // 如果提交了标签，尝试匹配并勾选清单 (模糊匹配：标签包含清单关键字或清单包含标签)
                    await connection.query(`
                        UPDATE recurring_checklist_logs 
                        SET completed = 1, completed_at = NOW() 
                        WHERE session_id = ? AND (checklist_item IN (?) OR EXISTS (
                            SELECT 1 FROM (SELECT ? as t) as tmp WHERE checklist_item LIKE CONCAT('%', t, '%')
                        ))
                    `, [orderId, tags, tags[0]]);
                } else {
                    // 如果没传标签但订单完成了，全量勾选清单作为兜底
                    await connection.query('UPDATE recurring_checklist_logs SET completed = 1, completed_at = NOW() WHERE session_id = ?', [orderId]);
                }
            }

            // 特殊状态逻辑：标记已到达
            if (String(newStatus) === String(ORDER_STATUS.ARRIVED)) {
                updateData.arrived_at = new Date();
                updateData.is_arrived = 1;
            }

            // 特殊状态逻辑：开始服务
            if (String(newStatus) === String(ORDER_STATUS.IN_SERVICE)) {
                if (order.status !== ORDER_STATUS.ARRIVED && order.is_arrived !== 1 && order.status !== ORDER_STATUS.ACCEPTED) {
                    throw new Error('请先确认到达后再开始服务');
                }
                updateData.started_at = new Date();
            }

            // 特殊状态逻辑：确认完成
            if (String(newStatus) === String(ORDER_STATUS.COMPLETED)) {
                const [pRows] = await connection.query('SELECT * FROM providers WHERE id = ?', [order.provider_id]);
                const provider = pRows[0];
                
                // 1. 动态等级计算：1-普通, 2-资深, 3-金牌
                let newLevel = 1;
                const count = (provider?.order_count || 0) + 1;
                if (count >= 50) newLevel = 3; 
                else if (count >= 10) newLevel = 2;
                
                await connection.query('UPDATE providers SET order_count = ?, level = ? WHERE id = ?', [count, newLevel, provider.id]);

                // 2. 获取实时系统结算配置
                const [configRows] = await connection.query('SELECT config_key, config_value FROM system_configs WHERE config_key LIKE "SETTLE_DELAY_%"');
                const configMap = {}; 
                configRows.forEach(c => configMap[c.config_key] = parseInt(c.config_value));
                
                // 3. 计算差异化结算时间 (T+0, T+1, T+2)
                let delayHours = 48; // 默认 T+2
                if (newLevel === 3) delayHours = configMap['SETTLE_DELAY_GOLD'] ?? 0;
                else if (newLevel === 2) delayHours = configMap['SETTLE_DELAY_REGULAR'] ?? 24;
                else delayHours = configMap['SETTLE_DELAY_JUNIOR'] ?? 48;

                const settleAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
                updateData.complete_time = new Date();
                updateData.settle_at = settleAt;

                // 周期单重构：母子联动逻辑 (如果该订单有关联母单，更新母单进度并触发分段结算)
                if (order.parent_recurring_id) {
                    const RecurringOrderService = require('./RecurringOrderService');
                    await connection.query(
                        'UPDATE recurring_orders SET completed_sessions = completed_sessions + 1 WHERE id = ?',
                        [order.parent_recurring_id]
                    );
                    console.log(`>> [Settlement] Triggering milestone settlement for session: ${orderId}`);
                    await RecurringOrderService.settleSession(orderId);
                }
            }

            if (Object.keys(updateData).length > 0) {
                await OrderRepository.update(orderId, updateData, connection);
            }

            // 调用策略更新扩展表
            const strategy = OrderStatusService.getStrategy(order.service_name, order.category_name);
            if (strategy && strategy.updateExtra) {
                await strategy.updateExtra(orderId, params, connection);
            }

            // 日志记录
            await OrderRepository.logStatus({
                orderId, oldStatus: order.status, newStatus: newStatus || order.status,
                operatorId, operatorRole, remark: params.remark || '更新订单资料',
                lat: params.lat, lng: params.lng
            }, connection);

            await connection.commit();

            // [EVENT] 状态变更事件
            if (newStatus !== undefined) {
                if (String(newStatus) === String(ORDER_STATUS.ARRIVED)) {
                    eventBus.emit(EVENTS.ORDER.ARRIVED, { order });
                }
                if (String(newStatus) === String(ORDER_STATUS.IN_SERVICE)) {
                    eventBus.emit(EVENTS.ORDER.IN_SERVICE, { order });
                }
                if (String(newStatus) === String(ORDER_STATUS.COMPLETED)) {
                    eventBus.emit(EVENTS.ORDER.COMPLETED, { order });
                }
            }

            return { order, newStatus };
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 评价订单
     */
    static async reviewOrder(userId, orderId, reviewData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const { rating, content, images, tags } = reviewData;

            const order = await OrderRepository.findById(orderId, connection, true);
            if (!order || order.user_id !== userId) throw new Error('订单不存在');
            if (order.status !== ORDER_STATUS.COMPLETED) throw new Error('只有完成订单后才能评价');

            await connection.query(
                'INSERT INTO order_reviews (order_id, user_id, provider_id, rating, content, images, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [orderId, userId, order.provider_id, rating, content, JSON.stringify(images || []), JSON.stringify(tags || [])]
            );

            await OrderRepository.update(orderId, { status: ORDER_STATUS.REVIEWED }, connection);

            await connection.commit();

            // [新增] 发送评价完成通知
            eventBus.emit(EVENTS.ORDER.REVIEWED, { order });

            return order;
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 取消订单 (支付前或抢单前)
     */
    static async cancelOrder(userId, orderId) {
        const order = await OrderRepository.findById(orderId);
        if (!order || order.user_id !== userId) throw new Error('订单不存在');

        if (order.status > ORDER_STATUS.WAIT_ACCEPT && order.status !== ORDER_STATUS.WAIT_PAY) {
            throw new Error('师傅已接单，禁止直接取消，需发起取消申请');
        }

        await OrderRepository.update(orderId, { status: ORDER_STATUS.CANCELLED });
        await OrderRepository.logStatus({
            orderId, oldStatus: order.status, newStatus: ORDER_STATUS.CANCELLED,
            operatorId: userId, operatorRole: 'user', remark: '用户取消订单'
        });

        eventBus.emit(EVENTS.ORDER.CANCELLED, { order });

        return order;
    }

    /**
     * 发起取消申请 (支付后)
     */
    static async requestCancel(userId, orderId) {
        const order = await OrderRepository.findById(orderId);
        if (!order || order.user_id !== userId) throw new Error('订单不存在');

        if (order.status === ORDER_STATUS.CANCEL_NEGOTIATING) throw new Error('已在协商取消中');
        if (order.status < ORDER_STATUS.ACCEPTED) throw new Error('订单尚未接单，请直接取消');

        await OrderRepository.update(orderId, { status: ORDER_STATUS.CANCEL_NEGOTIATING });

        const [pRows] = await db.query('SELECT user_id FROM providers WHERE id = ?', [order.provider_id]);
        if (pRows.length > 0) {
            eventBus.emit(EVENTS.ORDER.CANCEL_REQUESTED, { order, providerUserId: pRows[0].user_id });
        }

        return order;
    }

    /**
     * 用户反馈不满意 (发起争议)
     */
    static async disputeOrder(userId, orderId, reason) {
        await OrderRepository.update(orderId, { confirm_status: 3, settlement_status: 1, dispute_reason: reason });
    }

    /**
     * 用户删除订单 (软删除)
     */
    static async deleteOrder(userId, orderId, status = 1) {
        await OrderRepository.update(orderId, { user_delete_status: status });
    }

    /**
     * 更新订单备注
     */
    static async updateOrderRemark(orderId, remark) {
        await OrderRepository.update(orderId, { remark });
    }

    /**
     * 更新排期状态 (周期单)
     */
    static async updateScheduleStatus(scheduleId, providerUserId, status, proofImages) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [schedules] = await connection.query('SELECT s.*, o.provider_id, o.id as order_id, o.total_count FROM order_schedules s JOIN orders o ON s.order_id = o.id WHERE s.id = ? FOR UPDATE', [scheduleId]);
            if (schedules.length === 0) throw new Error('排期不存在');
            const schedule = schedules[0];

            const [providers] = await connection.query('SELECT id FROM providers WHERE user_id = ?', [providerUserId]);
            if (providers.length === 0 || providers[0].id !== schedule.provider_id) throw new Error('无权操作');

            await connection.query('UPDATE order_schedules SET status = ?, proof_images = ?, completed_at = NOW() WHERE id = ?', [status, JSON.stringify(proofImages || []), scheduleId]);

            if (status === 1) {
                await connection.query('UPDATE orders SET completed_count = completed_count + 1 WHERE id = ?', [schedule.order_id]);
                const [orderRows] = await connection.query('SELECT total_count, completed_count, provider_id FROM orders WHERE id = ? FOR UPDATE', [schedule.order_id]);
                const currentOrder = orderRows[0];

                if (currentOrder.completed_count >= currentOrder.total_count) {
                    const [pRows] = await connection.query('SELECT level FROM providers WHERE id = ?', [currentOrder.provider_id]);
                    const providerLevel = pRows[0]?.level || 1;
                    
                    // 获取实时系统配置
                    const [configRows] = await connection.query('SELECT config_key, config_value FROM system_configs WHERE config_key LIKE "SETTLE_DELAY_%"');
                    const configMap = {}; 
                    configRows.forEach(c => configMap[c.config_key] = parseInt(c.config_value));

                    let delayHours = 48; // 默认 T+2
                    if (providerLevel === 3) delayHours = configMap['SETTLE_DELAY_GOLD'] ?? 0;
                    else if (providerLevel === 2) delayHours = configMap['SETTLE_DELAY_REGULAR'] ?? 24;
                    else delayHours = configMap['SETTLE_DELAY_JUNIOR'] ?? 48;

                    const settleAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
                    await connection.query('UPDATE orders SET status = ?, complete_time = NOW(), settle_at = ? WHERE id = ?', [ORDER_STATUS.COMPLETED, settleAt, schedule.order_id]);
                }
            }

            await connection.commit();
            return schedule;
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = OrderStatusService;
