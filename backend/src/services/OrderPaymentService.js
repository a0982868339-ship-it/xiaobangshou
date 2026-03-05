/**
 * OrderPaymentService - 订单支付服务
 * 从 OrderService 拆分，专注于支付与退款逻辑
 */
const { ORDER_STATUS } = require('../config/constants');
const OrderRepository = require('../repositories/OrderRepository');
const WalletRepository = require('../repositories/WalletRepository');
const { eventBus, EVENTS } = require('../utils/eventBus');
const LockService = require('./LockService');
const db = require('../config/database');

class OrderPaymentService {
    /**
     * 支付订单全流程 (含锁保护 & 事件化)
     */
    static async payOrder(userId, orderId) {
        return await LockService.wrap(`pay:${orderId}`, async () => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const order = await OrderRepository.findById(orderId, connection, true);
                if (!order || order.user_id !== userId) throw new Error('订单不存在');
                if (order.pay_status === 1) throw new Error('订单已支付');
                if (order.status === ORDER_STATUS.CANCELLED) throw new Error('订单已取消');

                // 时间检查
                const serviceTime = new Date(order.service_time);
                if ((serviceTime - new Date()) / (1000 * 60) < 60) {
                    await OrderRepository.update(orderId, { status: ORDER_STATUS.CANCELLED }, connection);
                    throw new Error('预约时间过近 (不到1小时)，系统已自动取消订单');
                }

                // 2. 锁定账户并校验余额
                const balanceBefore = await WalletRepository.getBalanceForUpdate(userId, connection);
                const amount = parseFloat(order.total_price);
                if (balanceBefore < amount) throw new Error('余额不足');

                const balanceAfter = balanceBefore - amount;
                await WalletRepository.updateBalance(userId, balanceAfter, connection);

                await OrderRepository.update(orderId, {
                    pay_status: 1,
                    status: ORDER_STATUS.WAIT_ACCEPT,
                    pay_time: new Date()
                }, connection);

                await WalletRepository.addRecord({
                    userId, orderId, orderNo: order.order_no, type: 2, amount: -amount,
                    balanceBefore, balanceAfter, remark: `支付服务订单: ${order.service_name}`
                }, connection);

                await connection.commit();

                // [EVENT] 发送支付成功事件
                eventBus.emit(EVENTS.ORDER.PAID, { order, connection: db });

                return order;
            } catch (err) {
                if (connection) await connection.rollback();
                throw err;
            } finally {
                if (connection) connection.release();
            }
        }, 15000);
    }

    /**
     * 确认外部支付（如支付宝）成功
     */
    static async confirmExternalPayment(orderId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const order = await OrderRepository.findById(orderId, connection, true);
            if (!order) throw new Error('订单不存在');
            if (order.pay_status === 1) return order; // 已支付则直接返回

            await OrderRepository.update(orderId, {
                pay_status: 1,
                status: ORDER_STATUS.WAIT_ACCEPT,
                pay_time: new Date()
            }, connection);

            await connection.commit();
            
            // 发送支付成功事件
            eventBus.emit(EVENTS.ORDER.PAID, { order, connection: db });
            
            return order;
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 响应取消申请 (含锁保护)
     */
    static async handleCancelResponse(providerUserId, orderId, action) {
        return await LockService.wrap(`cancel_resp:${orderId}`, async () => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const [pRows] = await connection.query('SELECT id FROM providers WHERE user_id = ?', [providerUserId]);
                if (pRows.length === 0) throw new Error('无权操作');
                const providerId = pRows[0].id;

                const order = await OrderRepository.findById(orderId, connection, true);
                if (!order || order.provider_id !== providerId) throw new Error('订单不存在');
                if (order.status !== ORDER_STATUS.CANCEL_NEGOTIATING) throw new Error('订单不在协商取消状态');

                if (action === 'agree') {
                    const amount = parseFloat(order.total_price);
                    const balanceBefore = await WalletRepository.getBalanceForUpdate(order.user_id, connection);
                    const balanceAfter = balanceBefore + amount;

                    await WalletRepository.updateBalance(order.user_id, balanceAfter, connection);
                    await OrderRepository.update(orderId, { status: ORDER_STATUS.CANCELLED, pay_status: 2 }, connection);

                    await WalletRepository.addRecord({
                        userId: order.user_id, orderId, orderNo: order.order_no, type: 1, amount,
                        balanceBefore, balanceAfter, remark: `订单取消退款: ${order.service_name}`
                    }, connection);

                    await OrderRepository.logStatus({
                        orderId, oldStatus: order.status, newStatus: ORDER_STATUS.CANCELLED,
                        operatorId: providerUserId, operatorRole: 'provider', remark: '师傅同意取消申请 (已退款)'
                    }, connection);
                } else {
                    await OrderRepository.update(orderId, { status: ORDER_STATUS.ACCEPTED }, connection);
                    await OrderRepository.logStatus({
                        orderId, oldStatus: order.status, newStatus: ORDER_STATUS.ACCEPTED,
                        operatorId: providerUserId, operatorRole: 'provider', remark: '师傅拒绝取消申请'
                    }, connection);

                    // [新增] 发送拒绝取消事件
                    eventBus.emit(EVENTS.ORDER.CANCEL_REJECTED, { order });
                }

                await connection.commit();

                // [新增] 发送取消结果事件
                if (action === 'agree') {
                    eventBus.emit(EVENTS.ORDER.CANCELLED, { order, reason: 'provider_agreed' });
                }

                return order;
            } catch (err) {
                if (connection) await connection.rollback();
                throw err;
            } finally {
                if (connection) connection.release();
            }
        }, 15000);
    }
}

module.exports = OrderPaymentService;
