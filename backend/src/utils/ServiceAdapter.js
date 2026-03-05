const ServiceResult = require('./ServiceResult');
const ErrorCodes = require('../config/ErrorCodes');

/**
 * ServiceAdapter - 适配器模式
 * 允许 Controller 统一处理 ServiceResult 和传统异常模式
 */
class ServiceAdapter {
    /**
     * 包装 Service 调用，统一转换为 ServiceResult
     * @param {Function} serviceMethod Service 方法
     * @param {Array} args 参数列表
     */
    static async execute(serviceMethod, ...args) {
        try {
            const result = await serviceMethod(...args);

            // 如果已经返回 ServiceResult，直接返回
            if (result instanceof ServiceResult || (result && result.success !== undefined)) {
                return result;
            }

            // 否则包装为成功结果
            return ServiceResult.success(result);
        } catch (error) {
            // 捕获业务异常，转换为失败 Result
            let errorCode = ErrorCodes.UNKNOWN_ERROR;

            // 根据错误消息推断错误码
            const message = error.message || '';
            if (message.includes('不存在')) errorCode = ErrorCodes.ORDER_NOT_FOUND;
            else if (message.includes('已支付')) errorCode = ErrorCodes.ORDER_ALREADY_PAID;
            else if (message.includes('余额不足')) errorCode = ErrorCodes.INSUFFICIENT_BALANCE;
            else if (message.includes('无权操作')) errorCode = ErrorCodes.PERMISSION_DENIED;
            else if (message.includes('已取消')) errorCode = ErrorCodes.ORDER_ALREADY_CANCELLED;

            return ServiceResult.fail(errorCode, message);
        }
    }
}

module.exports = ServiceAdapter;
