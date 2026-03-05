const router = require('express').Router();
const { authMiddleware } = require('../middlewares/auth');
const recurringOrderController = require('../controllers/recurringOrderController');

/**
 * 周期订单独立路由
 * 路径: /api/recurring/*
 */

// 创建周期订单
router.post('/create', authMiddleware, recurringOrderController.createRecurringOrder);

// 支付周期订单（一次性托管支付）
router.post('/:id/pay', authMiddleware, recurringOrderController.payRecurringOrder);

// 获取周期订单详情
router.get('/:id', authMiddleware, recurringOrderController.getRecurringOrderDetail);

// 获取单次场次详情 (新增)
router.get('/session/:sessionId', authMiddleware, recurringOrderController.getRecurringSessionDetail);

// 师傅标记已到达（新增）
router.post('/session/:sessionId/arrive', authMiddleware, recurringOrderController.markSessionArrived);

// 师傅开始服务（新增）
router.post('/session/:sessionId/start', authMiddleware, recurringOrderController.startSessionService);

// 师傅完成服务并打卡（新增）
router.post('/session/:sessionId/complete', authMiddleware, recurringOrderController.completeSessionService);

// 服务者打卡（旧接口，保留兼容）
router.post('/session/:sessionId/punch', authMiddleware, recurringOrderController.punchSession);

// 用户确认服务完成
router.post('/session/:sessionId/confirm', authMiddleware, recurringOrderController.confirmSession);

// 完成服务清单项
router.post('/session/:sessionId/checklist', authMiddleware, recurringOrderController.completeChecklistItem);

// 师傅拒绝取消请求（新增）
router.post('/:id/reject-cancel', authMiddleware, recurringOrderController.rejectCancellation);

// 师傅同意部分取消（新增）
router.post('/:id/accept-cancel', authMiddleware, recurringOrderController.acceptCancellation);

// 用户申请取消单场次（新增）
router.post('/session/:sessionId/request-cancel', authMiddleware, recurringOrderController.requestSessionCancel);

// 师傅同意取消单场次（新增）
router.post('/session/:sessionId/accept-cancel', authMiddleware, recurringOrderController.acceptSessionCancel);

// 师傅拒绝取消单场次（新增）
router.post('/session/:sessionId/reject-cancel', authMiddleware, recurringOrderController.rejectSessionCancel);

module.exports = router;
