const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middlewares/auth');

router.get('/', authMiddleware, notificationController.getNotifications);
router.get('/unread', authMiddleware, notificationController.getUnreadCount);
router.put('/:id/read', authMiddleware, notificationController.markAsRead);

module.exports = router;
