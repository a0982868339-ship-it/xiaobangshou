const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const AlipayService = require('../services/AlipayService');
const OrderPaymentService = require('../services/OrderPaymentService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 获取支付宝支付链接
 */
router.get('/pay/:orderId', authMiddleware, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;
        const url = await AlipayService.createPaymentUrl(orderId, userId);
        sendSuccess(res, url);
    } catch (error) {
        sendError(res, error.message);
    }
});

/**
 * 支付宝异步通知回调
 */
router.post('/notify', async (req, res) => {
    try {
        const params = req.body;
        logger.info('>> [AlipayNotify] Received:', params);
        
        const result = await AlipayService.handleNotify(params);
        if (result) {
            // 这里调用 OrderPaymentService 处理订单状态更新
            // 需确保 OrderPaymentService 支持通过订单号更新
            const { orderNo } = result;
            const db = require('../config/database');
            const [orderRows] = await db.query('SELECT id, user_id FROM orders WHERE order_no = ?', [orderNo]);
            
            if (orderRows.length > 0) {
                const order = orderRows[0];
                // 调用现有的支付逻辑（可能需要微调以支持外部支付确认）
                // 这里为了演示，假设直接更新
                await OrderPaymentService.confirmExternalPayment(order.id);
            }
            
            res.send('success');
        } else {
            res.send('fail');
        }
    } catch (error) {
        logger.error('>> [AlipayNotify] Error:', error);
        res.send('fail');
    }
});

module.exports = router;
