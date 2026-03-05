const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, roleCheck } = require('../middlewares/auth');

// 管理员接口
router.get('/', authMiddleware, roleCheck(['admin', 'support']), userController.getUsers);
router.get('/stats', authMiddleware, roleCheck(['admin', 'support']), userController.getStats);
router.get('/:id/snapshot', authMiddleware, roleCheck(['admin', 'support']), userController.getUserSnapshot);
router.put('/:id/status', authMiddleware, roleCheck(['admin']), userController.updateUserStatus);

// 实名认证双轨制
router.post('/verify/alipay/init', authMiddleware, userController.initAlipayVerify); // 支付宝初始化
router.get('/verify/alipay/query', authMiddleware, userController.queryAlipayResult); // 支付宝结果查询
router.post('/verify/manual/submit', authMiddleware, userController.submitManualVerify); // 人工审核提交

// 自动化实名流程 (保留旧的供参考或逐步迁移)
router.post('/pay-verify-fee', authMiddleware, userController.payVerifyFee);
router.post('/auto-verify', authMiddleware, userController.autoVerifyIdentity);
router.post('/submit-health-cert', authMiddleware, userController.submitHealthCert);

// 积分相关
router.get('/points/records', authMiddleware, userController.getPointsRecords);
router.post('/points/checkin', authMiddleware, userController.checkIn);

// 个人资料
router.put('/profile', authMiddleware, userController.updateProfile);

// 获取单个用户详情 (用于聊天页查看头像)
router.get('/:id', authMiddleware, userController.getUserDetail);

// 注销
router.get('/cancel-check', authMiddleware, userController.checkCancelAccount);
router.post('/cancel', authMiddleware, userController.cancelAccount);

module.exports = router;
