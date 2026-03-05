const express = require('express');
const router = express.Router();
const controller = require('../controllers/patientProfileController');
const { authMiddleware } = require('../middlewares/auth');

router.use(authMiddleware); // 所有接口均需登录

router.get('/', controller.getProfiles);
router.get('/:id', controller.getProfileDetail);
router.post('/', controller.createProfile);
router.put('/:id', controller.updateProfile);
router.delete('/:id', controller.deleteProfile);

module.exports = router;
