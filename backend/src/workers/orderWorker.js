const { Worker } = require('bullmq');
const db = require('../config/database');
const { connection } = require('../utils/queue');
const { ORDER_STATUS } = require('../config/constants');

/**
 * 订单超时处理 Worker
 */
const orderWorker = new Worker('order-timeout', async (job) => {
    const { orderId } = job.data;
    console.log(`>> [Worker] Checking timeout for Order ${orderId}`);

    const conn = await db.getConnection();
    try {
        // 1. 查询订单当前状态
        const [orders] = await conn.query(
            'SELECT id, status, pay_status FROM orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) return;

        const order = orders[0];

        // 2. 如果仍处于“待支付”状态，则自动取消 (10 = WAIT_PAY)
        if (order.status === ORDER_STATUS.WAIT_PAY && order.pay_status === 0) {
            console.log(`>> [Worker] Order ${orderId} timed out. Cancelling...`);
            await conn.query(
                'UPDATE orders SET status = 4, cancel_reason = "支付超时自动取消", cancel_by = 0 WHERE id = ?',
                [orderId]
            );
            return { cancelled: true };
        } else {
            console.log(`>> [Worker] Order ${orderId} is already paid or processed. Skipping.`);
            return { cancelled: false };
        }
    } catch (err) {
        console.error(`>> [Worker] Error processing Order ${orderId}:`, err);
        throw err;
    } finally {
        conn.release();
    }
}, { connection });

orderWorker.on('completed', (job) => {
    console.log(`>> [Worker] Job ${job.id} completed:`, job.returnvalue);
});

orderWorker.on('failed', (job, err) => {
    console.error(`>> [Worker] Job ${job.id} failed:`, err.message);
});

module.exports = orderWorker;
