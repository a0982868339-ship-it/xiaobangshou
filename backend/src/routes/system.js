const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const imCallbackController = require('../controllers/imCallbackController');
const privacyController = require('../controllers/privacyController');
const auditController = require('../controllers/auditController');
const bannerController = require('../controllers/bannerController');
const messageController = require('../controllers/messageController');
const adminController = require('../controllers/adminController');
const { authMiddleware, roleCheck, optionalAuth } = require('../middlewares/auth');

// --- 公开接口 ---
router.get('/articles', systemController.getArticles);
router.get('/articles/:id', systemController.getArticleDetail);
router.get('/check-update', systemController.checkUpdate);
router.get('/configs/public', systemController.getPublicConfigs);
router.get('/area/center', systemController.getAreaCenter);
router.get('/regions', systemController.getRegions); // 新增：获取行政区划
router.get('/regions/tree', systemController.getRegionTree); // 新增：获取树状行政区划
router.post('/im/callback', imCallbackController.beforeSendMsg);
router.post('/im/callback/after-send', imCallbackController.afterSendMsg); // 消息送达后回调
router.get('/banners', bannerController.getAppBanners);

// --- 开发测试接口（仅用于调试，生产环境应移除）---
if (process.env.NODE_ENV !== 'production') {
    router.post('/test/push-message', authMiddleware, async (req, res) => {
        try {
            const { toUserId, message } = req.body;
            const { emitToUser } = require('../utils/socket');
            const db = require('../config/database');

            // 获取当前用户信息
            const [userRows] = await db.query('SELECT id, nickname, avatar FROM users WHERE id = ?', [req.user.id]);
            const user = userRows[0] || { id: req.user.id, nickname: '测试用户', avatar: '' };

            // 推送消息
            emitToUser(toUserId, 'NEW_MESSAGE', {
                fromUserId: user.id,
                fromNickname: user.nickname,
                fromAvatar: user.avatar,
                content: message,
                msgType: 'text',
                timestamp: Math.floor(Date.now() / 1000),
                messageId: `test_${Date.now()}`
            });

            console.log(`[TEST] 手动推送消息: ${user.id} -> ${toUserId}`);
            res.json({ success: true, message: '推送成功' });
        } catch (error) {
            console.error('[TEST] 推送失败:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
}

// --- 需要登录的通用接口 ---
router.post('/feedback', authMiddleware, systemController.submitFeedback);
router.get('/feedback/me', authMiddleware, systemController.getMyFeedbacks);
router.get('/im-sig', authMiddleware, systemController.getIMSig);
router.get('/support/agent', optionalAuth, systemController.getSupportAgent); // 智能客服调度接口

// --- 管理员权限接口 ---
// 区域管理
router.get('/admin/regions', authMiddleware, roleCheck(['admin', 'operator']), systemController.getAdminRegions);
router.put('/admin/regions/:code/toggle', authMiddleware, roleCheck(['admin']), systemController.toggleRegionStatus);
router.put('/admin/regions/:code/sort', authMiddleware, roleCheck(['admin']), systemController.updateRegionSort);

// 工单与反馈管理
router.get('/admin/feedbacks', authMiddleware, roleCheck(['admin', 'support', 'operator']), systemController.getAdminFeedbacks);
router.put('/admin/tickets/:id/assign', authMiddleware, roleCheck(['admin', 'support']), systemController.assignTicket);
router.put('/admin/tickets/:id/reply', authMiddleware, roleCheck(['admin', 'support']), systemController.replyTicket);
router.get('/admin/tickets/:id/logs', authMiddleware, roleCheck(['admin', 'support']), systemController.getTicketLogs);

// 大屏统计
router.get('/admin/dashboard-stats', authMiddleware, roleCheck(['admin', 'support', 'finance', 'operator']), systemController.getDashboardStats);

// 帮助中心管理
router.get('/admin/articles', authMiddleware, roleCheck(['admin', 'operator', 'support']), systemController.getArticles);
router.post('/admin/articles', authMiddleware, roleCheck(['admin', 'operator']), systemController.adminCreateArticle);
router.put('/admin/articles/:id', authMiddleware, roleCheck(['admin', 'operator']), systemController.adminUpdateArticle);
router.delete('/admin/articles/:id', authMiddleware, roleCheck(['admin', 'operator']), systemController.adminDeleteArticle);

// 虚拟号池管理
router.get('/admin/privacy/pool', authMiddleware, roleCheck(['admin']), privacyController.getNumberPool);
router.post('/admin/privacy/numbers', authMiddleware, roleCheck(['admin']), privacyController.addVirtualNumbersBatch);
router.put('/admin/privacy/numbers/:id', authMiddleware, roleCheck(['admin']), privacyController.updateNumberStatus);
router.delete('/admin/privacy/numbers/:id', authMiddleware, roleCheck(['admin']), privacyController.deleteNumber);

// 消息审计管理
router.get('/admin/audit/keywords', authMiddleware, roleCheck(['admin']), auditController.getBannedKeywords);
router.post('/admin/audit/keywords', authMiddleware, roleCheck(['admin']), auditController.addBannedKeyword);
router.delete('/admin/audit/keywords/:id', authMiddleware, roleCheck(['admin']), auditController.deleteBannedKeyword);
router.get('/admin/audit/logs', authMiddleware, roleCheck(['admin']), auditController.getAuditLogs);

// 全局策略配置
router.get('/admin/configs', authMiddleware, roleCheck(['admin']), systemController.getAllConfigs);
router.post('/admin/configs', authMiddleware, roleCheck(['admin']), systemController.updateConfig);
router.get('/configs/:key', systemController.getConfigByKey);

// Banner 管理
router.get('/admin/banners', authMiddleware, roleCheck(['admin']), bannerController.getAllBanners);
router.post('/admin/banners', authMiddleware, roleCheck(['admin']), bannerController.saveBanner);
router.delete('/admin/banners/:id', authMiddleware, roleCheck(['admin']), bannerController.deleteBanner);

// 通知中心管理
router.get('/admin/notifications', authMiddleware, roleCheck(['admin', 'operator']), messageController.getNotificationHistory);
router.post('/admin/notifications', authMiddleware, roleCheck(['admin', 'operator']), messageController.sendSystemNotification);
router.delete('/admin/notifications/:id', authMiddleware, roleCheck(['admin']), messageController.deleteNotification);

// 后台管理员/权限管理
router.get('/admin/users', authMiddleware, roleCheck(['admin']), adminController.getAdminUsers);
router.post('/admin/users', authMiddleware, roleCheck(['admin']), adminController.saveAdminUser);
router.delete('/admin/users/:id', authMiddleware, roleCheck(['admin']), adminController.deleteAdminUser);

module.exports = router;
