const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/auth');
const validate = require('../middlewares/validator');

router.post('/sms/send',
  [
    body('phone').isMobilePhone('zh-CN').withMessage('请输入正确的手机号')
  ],
  validate,
  authController.sendSmsCode
);

router.post('/login/phone',
  [
    body('phone').isMobilePhone('zh-CN').withMessage('请输入正确的手机号'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('请输入6位验证码')
  ],
  validate,
  authController.loginWithPhone
);

router.post('/login/password',
  [
    body('phone').isMobilePhone('zh-CN').withMessage('请输入正确的手机号'),
    body('password').isLength({ min: 6 }).withMessage('密码至少6位')
  ],
  validate,
  authController.loginWithPassword
);

router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
