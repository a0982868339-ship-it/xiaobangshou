const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/response');
const RecurringOrderService = require('../services/RecurringOrderService');

/**
 * 周期订单控制器
 * 完全独立的API端点
 */

/**
 * 创建周期订单
 */
exports.createRecurringOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = req.body;

        const result = await RecurringOrderService.createRecurringOrder(userId, data);
        sendSuccess(res, result, '周期订单创建成功');
    } catch (error) {
        logger.error('>> [RecurringOrder] Create Error:', error);
        sendError(res, error.message || '创建失败');
    }
};

/**
 * 支付周期订单（一次性托管支付）
 */
exports.payRecurringOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await RecurringOrderService.payRecurringOrder(userId, id);
        sendSuccess(res, null, '支付成功');
    } catch (error) {
        logger.error('>> [RecurringOrder] Pay Error:', error);
        sendError(res, error.message || '支付失败');
    }
};

/**
 * 获取周期订单单次场次详情
 */
exports.getRecurringSessionDetail = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role || 'user';
        const { sessionId } = req.params;

        const session = await RecurringOrderService.getRecurringSessionDetail(sessionId, userId, userRole);
        sendSuccess(res, session);
    } catch (error) {
        logger.error('>> [RecurringOrder] GetSessionDetail Error:', error);
        sendError(res, error.message || '获取详情失败');
    }
};

/**
 * 获取周期订单详情
 */
exports.getRecurringOrderDetail = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role || 'user';
        const { id } = req.params;

        const order = await RecurringOrderService.getRecurringOrderDetail(id, userId, userRole);
        sendSuccess(res, order);
    } catch (error) {
        logger.error('>> [RecurringOrder] GetDetail Error:', error);
        sendError(res, error.message || '获取详情失败');
    }
};

/**
 * 师傅标记已到达（新增）
 */
exports.markSessionArrived = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { sessionId } = req.params;

        await RecurringOrderService.markSessionArrived(providerId, sessionId);
        sendSuccess(res, null, '已标记到达');
    } catch (error) {
        logger.error('>> [RecurringOrder] MarkArrived Error:', error);
        sendError(res, error.message || '标记到达失败');
    }
};

/**
 * 师傅开始服务（新增）
 */
exports.startSessionService = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { sessionId } = req.params;

        await RecurringOrderService.startSessionService(providerId, sessionId);
        sendSuccess(res, null, '服务已开始');
    } catch (error) {
        logger.error('>> [RecurringOrder] StartService Error:', error);
        sendError(res, error.message || '开始服务失败');
    }
};

/**
 * 师傅完成服务并打卡（重命名）
 */
exports.completeSessionService = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { sessionId } = req.params;
        const reportData = req.body; // 包含 images, note, tags

        await RecurringOrderService.completeSessionService(providerId, sessionId, reportData);
        sendSuccess(res, null, '服务完成并打卡成功');
    } catch (error) {
        logger.error('>> [RecurringOrder] CompleteService Error:', error);
        sendError(res, error.message || '完成服务失败');
    }
};

/**
 * 服务者打卡（保留旧接口兼容性）
 */
exports.punchSession = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { sessionId } = req.params;
        const reportData = req.body;

        await RecurringOrderService.punchSession(providerId, sessionId, reportData);
        sendSuccess(res, null, '打卡成功');
    } catch (error) {
        logger.error('>> [RecurringOrder] Punch Error:', error);
        sendError(res, error.message || '打卡失败');
    }
};

/**
 * 用户确认服务完成
 */
exports.confirmSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

        await RecurringOrderService.confirmSession(userId, sessionId);
        sendSuccess(res, null, '确认成功');
    } catch (error) {
        logger.error('>> [RecurringOrder] Confirm Error:', error);
        sendError(res, error.message || '确认失败');
    }
};

/**
 * 完成服务清单项
 */
exports.completeChecklistItem = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { sessionId } = req.params;
        const { itemName } = req.body;

        await RecurringOrderService.completeChecklistItem(providerId, sessionId, itemName);
        sendSuccess(res, null, '已完成');
    } catch (error) {
        logger.error('>> [RecurringOrder] CompleteChecklistItem Error:', error);
        sendError(res, error.message || '操作失败');
    }
};

/**
 * 师傅拒绝取消请求（新增）
 */
exports.rejectCancellation = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { id } = req.params;
        const { rejectReason } = req.body;

        if (!rejectReason) {
            return sendError(res, '请填写拒绝理由');
        }

        await RecurringOrderService.rejectCancellation(providerId, id, rejectReason);
        sendSuccess(res, null, '已拒绝取消请求');
    } catch (error) {
        logger.error('>> [RecurringOrder] RejectCancellation Error:', error);
        sendError(res, error.message || '操作失败');
    }
};

/**
 * 师傅同意部分取消（新增）
 */
exports.acceptCancellation = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { id } = req.params;

        const result = await RecurringOrderService.acceptPartialCancellation(providerId, id);
        sendSuccess(res, result, '已同意取消');
    } catch (error) {
        logger.error('>> [RecurringOrder] AcceptCancellation Error:', error);
        sendError(res, error.message || '操作失败');
    }
};

/**
 * 用户申请取消单场次（新增）
 */
exports.requestSessionCancel = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;

        await RecurringOrderService.requestSessionCancel(userId, sessionId);
        sendSuccess(res, null, '取消申请已提交');
    } catch (error) {
        logger.error('>> [RecurringOrder] RequestSessionCancel Error:', error);
        sendError(res, error.message || '申请失败');
    }
};

/**
 * 师傅同意取消单场次（新增）
 */
exports.acceptSessionCancel = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { sessionId } = req.params;

        await RecurringOrderService.acceptSessionCancel(providerId, sessionId);
        sendSuccess(res, null, '已同意取消该场次');
    } catch (error) {
        logger.error('>> [RecurringOrder] AcceptSessionCancel Error:', error);
        sendError(res, error.message || '操作失败');
    }
};

/**
 * 师傅拒绝取消单场次（新增）
 */
exports.rejectSessionCancel = async (req, res) => {
    try {
        const providerId = req.user.id;
        const { sessionId } = req.params;
        const { rejectReason } = req.body;

        await RecurringOrderService.rejectSessionCancel(providerId, sessionId, rejectReason);
        sendSuccess(res, null, '已拒绝取消该场次');
    } catch (error) {
        logger.error('>> [RecurringOrder] RejectSessionCancel Error:', error);
        sendError(res, error.message || '操作失败');
    }
};
