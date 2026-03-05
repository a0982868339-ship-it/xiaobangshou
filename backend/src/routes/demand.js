const express = require('express');
const router = express.Router();
const demandController = require('../controllers/demandController');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');

// 橱窗查询 (Mode 2)
router.get('/skills', optionalAuth, demandController.getProviderSkills);

// 服务者管理自己的橱窗 (Mode 2)
router.post('/my-skill', authMiddleware, demandController.updateMySkill);

// 用户发布自定义需求 (Mode 1 变体)
router.post('/custom', authMiddleware, demandController.createCustomDemand);

module.exports = router;

