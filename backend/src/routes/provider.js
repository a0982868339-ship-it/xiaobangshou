const express = require('express');
const router = express.Router();
const providerController = require('../controllers/providerController');
const { authMiddleware, roleCheck } = require('../middlewares/auth');

// --- 服务者个人接口 ---

// 切换接单状态
router.put('/toggle-status', authMiddleware, providerController.toggleStatus);
router.put('/work-status', authMiddleware, providerController.updateWorkStatus);

// 获取接单状态
router.get('/status', authMiddleware, providerController.getStatus);

// 获取我的评价
router.get('/reviews/me', authMiddleware, providerController.getProviderReviews);

// 资质认证相关
router.get('/certifications/me', authMiddleware, providerController.getMyCertifications);
router.post('/certifications', authMiddleware, providerController.submitCertification);

// 更新服务类型
router.put('/service-types', authMiddleware, providerController.updateServiceTypes);

// 更新服务区域
router.put('/service-areas', authMiddleware, providerController.updateServiceAreas);

// 管理熟悉的医院
router.get('/my-hospitals', authMiddleware, providerController.getMyHospitals);
router.put('/hospitals', authMiddleware, providerController.updateHospitals);

// 健康证管理
router.post('/health-cert', authMiddleware, providerController.submitHealthCert);

// 实时定位更新
router.put('/location', authMiddleware, providerController.updateLocation);

// 更新个人资料/地址
router.put('/profile', authMiddleware, providerController.updateProfile);

// 获取服务者详情 (用于聊天页查看头像/资料)
router.get('/:id', authMiddleware, providerController.getProviderDetail);

// 获取适用于宠物服务的可用服务者 (新)
router.get('/match/pet', authMiddleware, providerController.getAvailableProvidersForPet);

// --- 管理员接口 ---
router.get('/admin/map-data', authMiddleware, roleCheck(['admin', 'support']), providerController.getProvidersMapData);
router.get('/map-data', authMiddleware, roleCheck(['admin', 'support']), providerController.getProvidersMapData); // 兼容旧版前端
router.get('/admin/all', authMiddleware, roleCheck(['admin', 'auditor', 'support']), providerController.getAllProvidersAdmin);
router.put('/admin/:id/audit', authMiddleware, roleCheck(['admin', 'auditor']), providerController.auditProvider);
router.put('/admin/:id/audit-health', authMiddleware, roleCheck(['admin', 'auditor']), providerController.auditHealthCert);

// 资质证书审核
router.get('/admin/certifications/all', authMiddleware, roleCheck(['admin', 'auditor']), providerController.getAllCertificationsAdmin);
router.put('/admin/certifications/:id/audit', authMiddleware, roleCheck(['admin', 'auditor']), providerController.auditCertification);

// 信用管理
router.get('/admin/credit/logs', authMiddleware, roleCheck(['admin', 'auditor', 'support']), providerController.getProviderCreditLogs);
router.put('/admin/:id/credit', authMiddleware, roleCheck(['admin']), providerController.updateProviderCredit);

module.exports = router;
