const alipaySdk = require('../config/alipay');
const { AlipayFormData } = require('alipay-sdk');
const { ORDER_STATUS } = require('../config/constants');
const OrderRepository = require('../repositories/OrderRepository');
const logger = require('../utils/logger');

class AlipayService {
    /**
     * 创建支付订单链接
     */
    static async createPaymentUrl(orderId, userId) {
        try {
            const order = await OrderRepository.findById(orderId);
            if (!order || order.user_id !== userId) {
                throw new Error('订单不存在');
            }
            if (order.pay_status === 1) {
                throw new Error('订单已支付');
            }

            const formData = new AlipayFormData();
            formData.setMethod('get');

            formData.addField('bizContent', {
                outTradeNo: order.order_no,
                productCode: 'FAST_INSTANT_TRADE_PAY',
                totalAmount: order.total_price.toString(),
                subject: `小帮手服务订单: ${order.service_name}`,
            });

            // 回跳地址（前端页面）
            formData.addField('returnUrl', process.env.ALIPAY_RETURN_URL || 'http://localhost:5173/pay-success');
            // 异步通知地址（后端接口，需公网可访问）
            formData.addField('notifyUrl', process.env.ALIPAY_NOTIFY_URL);

            const result = await alipaySdk.exec(
                'alipay.trade.page.pay',
                {},
                { formData: formData }
            );

            return result;
        } catch (error) {
            logger.error('>> [AlipayService] createPaymentUrl Error:', error);
            throw error;
        }
    }

    /**
     * 处理支付宝异步通知
     */
    static async handleNotify(params) {
        try {
            // 1. 验签
            const isValid = alipaySdk.checkNotifySign(params);
            if (!isValid) {
                logger.error('>> [AlipayService] Notify Sign Invalid');
                return false;
            }

            // 2. 校验业务数据
            const { out_trade_no, trade_status, total_amount } = params;
            
            // 只有支付成功才处理
            if (trade_status !== 'TRADE_SUCCESS' && trade_status !== 'TRADE_FINISHED') {
                return true;
            }

            // 3. 更新订单状态
            // 注意：这里需要根据订单号找到订单并更新，建议在 OrderPaymentService 中实现具体逻辑
            // 为了不破坏原有逻辑，我们通过事件或直接调用 OrderPaymentService
            const OrderPaymentService = require('./OrderPaymentService');
            // 假设 OrderPaymentService 有一个处理第三方支付成功的方法
            // 如果没有，我们需要在 OrderPaymentService 中添加
            return { orderNo: out_trade_no, amount: total_amount };
        } catch (error) {
            logger.error('>> [AlipayService] handleNotify Error:', error);
            return false;
        }
    }
}

module.exports = AlipayService;
