const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, roleCheck } = require('../middlewares/auth');
const { validateCreateOrder } = require('../middlewares/orderValidator');
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
};

router.post('/', authMiddleware, validateCreateOrder, validate, orderController.createOrder);
router.get('/', authMiddleware, orderController.getOrders);
router.get('/stats', authMiddleware, orderController.getOrderStats);
router.get('/active-chat-partners', authMiddleware, orderController.getActiveChatPartners);

// 重要：特定路径必须放在参数路径 (/:id) 之前
router.get('/earnings', authMiddleware, orderController.getProviderEarnings);
router.get('/admin/map-data', authMiddleware, roleCheck(['admin', 'support']), orderController.getOrdersMapData);
router.get('/map-data', authMiddleware, roleCheck(['admin', 'support']), orderController.getOrdersMapData); // 兼容旧版前端
router.get('/admin/all', authMiddleware, roleCheck(['admin', 'agent', 'support', 'finance', 'auditor', 'operator']), orderController.getAllOrdersAdmin);

router.get('/:id', authMiddleware, orderController.getOrderDetail);
router.put('/:id/confirm', authMiddleware, orderController.confirmOrder);
router.put('/:id/delete-status', authMiddleware, orderController.updateDeleteStatus);
router.put('/:id/dispute', authMiddleware, orderController.disputeOrder);
router.put('/:id/cancel', authMiddleware, orderController.cancelOrder);
router.put('/:id/accept', authMiddleware, orderController.acceptOrder);
router.put('/:id/pay', authMiddleware, orderController.payOrder);
router.put('/:id/request-cancel', authMiddleware, orderController.requestCancel);
router.put('/:id/handle-cancel-response', authMiddleware, orderController.handleCancelResponse);
router.put('/:id/arrive', authMiddleware, orderController.arriveAtOrder);
router.put('/schedule/:scheduleId/status', authMiddleware, orderController.updateScheduleStatus);
router.put('/:id/status', authMiddleware, orderController.updateStatus);
router.put('/:id/service-records', authMiddleware, orderController.updateServiceRecords);
router.put('/:id/sync-track', authMiddleware, orderController.syncTrack);
router.post('/:id/review', authMiddleware, orderController.submitReview);

module.exports = router;
