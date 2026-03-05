const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { authMiddleware, roleCheck } = require('../middlewares/auth');

// 管理员权限：增删改查
router.get('/', authMiddleware, hospitalController.getHospitals);
router.post('/', authMiddleware, roleCheck(['admin']), hospitalController.createHospital);
router.put('/:id', authMiddleware, roleCheck(['admin']), hospitalController.updateHospital);
router.delete('/:id', authMiddleware, roleCheck(['admin']), hospitalController.deleteHospital);

module.exports = router;
