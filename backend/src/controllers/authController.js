const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { generateToken } = require('../utils/jwt');
const SecurityService = require('../services/SecurityService');

exports.sendSmsCode = async (req, res) => {
  try {
    const { phone, captchaVerifyParam } = req.body;
    const code = await SecurityService.sendSmsCode(phone, captchaVerifyParam);

    if (process.env.NODE_ENV === 'development') {
      return sendSuccess(res, { code }, '验证码发送成功（开发模式）');
    }

    sendSuccess(res, null, '验证码发送成功');
  } catch (error) {
    logger.error('发送验证码失败:', error);
    sendError(res, '发送验证码失败');
  }
};

exports.loginWithPhone = async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (process.env.NODE_ENV !== 'development') {
      const isValid = await SecurityService.verifySmsCode(phone, code);
      if (!isValid) {
        return sendError(res, '验证码错误或已过期');
      }
    }

    const [users] = await db.query(
      'SELECT * FROM users WHERE phone = ? AND status = 1',
      [phone]
    );

    let user;
    if (users.length === 0) {
      // 开启事务
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        // 核心升级：新用户注册赠送 100 积分
        const [result] = await conn.query(
          'INSERT INTO users (phone, nickname, user_type, points) VALUES (?, ?, ?, 100)',
          [phone, `用户${phone.substr(-4)}`, 1]
        );
        user = {
          id: result.insertId,
          phone,
          nickname: `用户${phone.substr(-4)}`,
          user_type: 1,
          points: 100
        };

        // 记录积分流水 (委托给 Service)
        await SecurityService.recordPoints(user.id, 1, 100, 'signup', '新用户注册奖励', conn);

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      user = users[0];
    }

    await db.query(
      'UPDATE users SET last_login_time = NOW(), last_login_ip = ? WHERE id = ?',
      [req.ip, user.id]
    );

    const token = generateToken({
      id: user.id,
      phone: user.phone,
      userType: user.user_type
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        userType: user.user_type,
        balance: user.balance
      }
    }, '登录成功');

  } catch (error) {
    logger.error('登录失败:', error);
    sendError(res, '登录失败');
  }
};

exports.loginWithPassword = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const [users] = await db.query(
      'SELECT * FROM users WHERE phone = ? AND status = 1',
      [phone]
    );
    if (users.length === 0) return sendError(res, '手机号或密码错误');
    const user = users[0];
    if (!user.password) return sendError(res, '请使用验证码登录');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return sendError(res, '手机号或密码错误');

    await db.query(
      'UPDATE users SET last_login_time = NOW(), last_login_ip = ? WHERE id = ?',
      [req.ip, user.id]
    );

    const token = generateToken({
      id: user.id,
      phone: user.phone,
      userType: user.user_type
    });

    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        userType: user.user_type,
        balance: user.balance
      }
    }, '登录成功');

  } catch (error) {
    logger.error('登录失败:', error);
    sendError(res, '登录失败');
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.phone, u.nickname, u.avatar, u.gender, u.real_name, u.id_card_verified, 
              u.balance, u.points, u.user_type, u.created_at,
              p.rating, p.order_count, p.verify_status as provider_verify_status,
              p.verify_reason, p.service_types, p.status as provider_status,
              p.introduction,
              p.health_cert_status, p.health_cert_no, p.health_cert_expire, p.health_cert_reason,
              p.health_cert_image,
              p.cuisine_tags
       FROM users u
       LEFT JOIN providers p ON u.id = p.user_id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (users.length === 0) return sendError(res, '用户不存在', 404);

    const user = users[0];
    // 如果没有 provider 记录但 user_type 是服务者，补全默认状态
    if (user.provider_verify_status === null) {
      user.provider_verify_status = 0;
    }

    // 如果是服务者，获取已通过的专业资质
    if (user.user_type === 2) {
      const [certs] = await db.query(
        'SELECT type, name, certificate_no FROM provider_certifications WHERE provider_id = (SELECT id FROM providers WHERE user_id = ?) AND status = 1',
        [req.user.id]
      );
      user.certifications = certs;
    }

    sendSuccess(res, user);
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    sendError(res, '获取用户信息失败');
  }
};
