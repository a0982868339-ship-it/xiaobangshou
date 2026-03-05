const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { authMiddleware } = require('../middlewares/auth');

// 管理员登录
router.post('/login', adminAuthController.login);

// 获取个人信息
router.get('/me', authMiddleware, adminAuthController.getMe);

// 修改密码
router.post('/change-password', authMiddleware, adminAuthController.changePassword);

module.exports = router;
