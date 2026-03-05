/**
 * OrderService - 订单服务门面
 * 
 * 重构说明：原 710 行代码已按职责拆分为 4 个子服务：
 * - OrderQueryService: 查询相关
 * - OrderCreationService: 创建相关
 * - OrderPaymentService: 支付相关
 * - OrderStatusService: 状态变更相关
 * 
 * 本文件作为门面 (Facade)，保持原有 API 不变，委托给子服务实现
 */

const OrderQueryService = require('./OrderQueryService');
const OrderCreationService = require('./OrderCreationService');
const OrderPaymentService = require('./OrderPaymentService');
const OrderStatusService = require('./OrderStatusService');

// 确保事件订阅者已加载（处理支付成功派单、接单通知等副作用）
require('../subscribers/orderSubscriber');

class OrderService {
    // ============ 策略方法 ============
    static getStrategy(serviceName, categoryName) {
        return OrderQueryService.getStrategy(serviceName, categoryName);
    }

    // ============ 查询类方法 ============
    static async getOrders(userId, query) {
        return OrderQueryService.getOrders(userId, query);
    }

    static async getOrderDetail(orderId, userId, role) {
        return OrderQueryService.getOrderDetail(orderId, userId, role);
    }

    // ============ 创建类方法 ============
    static async createOrder(userId, data) {
        return OrderCreationService.createOrder(userId, data);
    }

    // ============ 支付类方法 ============
    static async payOrder(userId, orderId) {
        return OrderPaymentService.payOrder(userId, orderId);
    }

    static async handleCancelResponse(providerUserId, orderId, action) {
        return OrderPaymentService.handleCancelResponse(providerUserId, orderId, action);
    }

    // ============ 状态变更类方法 ============
    static async acceptOrder(userId, orderId) {
        return OrderStatusService.acceptOrder(userId, orderId);
    }

    static async arriveOrder(userId, orderId) {
        return OrderStatusService.arriveOrder(userId, orderId);
    }

    static async updateStatus(orderId, operatorId, operatorRole, newStatus, params = {}) {
        return OrderStatusService.updateStatus(orderId, operatorId, operatorRole, newStatus, params);
    }

    static async reviewOrder(userId, orderId, reviewData) {
        return OrderStatusService.reviewOrder(userId, orderId, reviewData);
    }

    static async cancelOrder(userId, orderId) {
        return OrderStatusService.cancelOrder(userId, orderId);
    }

    static async requestCancel(userId, orderId) {
        return OrderStatusService.requestCancel(userId, orderId);
    }

    static async disputeOrder(userId, orderId, reason) {
        return OrderStatusService.disputeOrder(userId, orderId, reason);
    }

    static async deleteOrder(userId, orderId, status = 1) {
        return OrderStatusService.deleteOrder(userId, orderId, status);
    }

    static async updateOrderRemark(orderId, remark) {
        return OrderStatusService.updateOrderRemark(orderId, remark);
    }

    static async updateScheduleStatus(scheduleId, providerUserId, status, proofImages) {
        return OrderStatusService.updateScheduleStatus(scheduleId, providerUserId, status, proofImages);
    }
}

module.exports = OrderService;
