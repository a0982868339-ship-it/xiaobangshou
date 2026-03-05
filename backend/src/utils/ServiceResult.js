/**
 * ServiceResult - 统一服务层返回结果封装
 * 用于标准化 Service 层的成功/失败状态传递
 */
class ServiceResult {
    constructor(success, data = null, code = null, message = '') {
        this.success = success;
        this.data = data;
        this.code = code;
        this.message = message;
    }

    /**
     * 创建成功结果
     * @param {*} data 返回数据
     * @param {string} message 可选的成功消息
     */
    static success(data = null, message = '') {
        return new ServiceResult(true, data, null, message);
    }

    /**
     * 创建失败结果（业务错误）
     * @param {string} code 错误码
     * @param {string} message 错误描述
     * @param {*} data 可选的附加数据
     */
    static fail(code, message, data = null) {
        return new ServiceResult(false, data, code, message);
    }

    /**
     * 快捷方法：从异常创建失败结果
     * @param {Error} error 
     * @param {string} defaultCode 默认错误码
     */
    static fromError(error, defaultCode = 'UNKNOWN_ERROR') {
        return new ServiceResult(false, null, defaultCode, error.message || '未知错误');
    }
}

module.exports = ServiceResult;
