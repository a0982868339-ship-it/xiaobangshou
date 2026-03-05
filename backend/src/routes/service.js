const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { optionalAuth, authMiddleware, roleCheck } = require('../middlewares/auth');

// 公开接口 (不需要登录)
router.get('/categories', serviceController.getCategories);
router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getServiceDetail);

// --- 管理接口 ---
const serviceAdmin = require('../controllers/serviceAdminController');
router.post('/', authMiddleware, roleCheck(['admin', 'operator']), serviceAdmin.createService);
router.put('/:id', authMiddleware, roleCheck(['admin', 'operator']), serviceAdmin.updateService);
router.delete('/:id', authMiddleware, roleCheck(['admin', 'operator']), serviceAdmin.deleteService);

// 分类管理
router.post('/categories', authMiddleware, roleCheck(['admin', 'operator']), serviceAdmin.createCategory);
router.put('/categories/:id', authMiddleware, roleCheck(['admin', 'operator']), serviceAdmin.updateCategory);
router.delete('/categories/:id', authMiddleware, roleCheck(['admin', 'operator']), serviceAdmin.deleteCategory);

module.exports = router;
