const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError, sendPage } = require('../utils/response');
const bcrypt = require('bcryptjs');

/**
 * 1. 服务者支付身份核验费 (9.9元)
 */
exports.payVerifyFee = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;

    // 检查是否已付过费
    const [providers] = await connection.query('SELECT id, verify_pay_status FROM providers WHERE user_id = ?', [userId]);
    if (providers.length > 0 && providers[0].verify_pay_status === 1) {
      return sendError(res, '您已支付过核验费用');
    }

    // 模拟支付逻辑：直接从余额扣除或标记为已付
    if (providers.length > 0) {
      await connection.query('UPDATE providers SET verify_pay_status = 1 WHERE user_id = ?', [userId]);
    } else {
      await connection.query(
        'INSERT INTO providers (user_id, verify_pay_status, verify_status) VALUES (?, 1, 0)',
        [userId]
      );
    }

    // 记录一笔系统流水 (增强版，包含余额记录)
    const [userRows] = await connection.query('SELECT balance FROM users WHERE id = ? FOR UPDATE', [userId]);
    let currentBalance = parseFloat(userRows[0].balance || 0);
    
    // [开发环境特权]：如果用户余额不足 10元，自动充值 1000元，方便测试入驻流程
    if (currentBalance < 9.9 && process.env.NODE_ENV === 'development') {
      await connection.query('UPDATE users SET balance = 1000.00 WHERE id = ?', [userId]);
      currentBalance = 1000.00;
      console.log(`>> [Dev Mode] 已为用户 ${userId} 自动充值 1000.00 元用于测试入驻`);
    }

    if (currentBalance < 9.9) {
      throw new Error('账户余额不足 (当前 ¥' + currentBalance.toFixed(2) + ')，请先前往个人中心充值');
    }

    const newBalance = currentBalance - 9.9;

    await connection.query(
      'INSERT INTO wallet_records (user_id, type, amount, balance_before, balance_after, description) VALUES (?, 2, -9.9, ?, ?, "支付入驻身份核验费")',
      [userId, currentBalance, newBalance]
    );

    // 同步更新用户余额
    await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);

    await connection.commit();
    sendSuccess(res, null, '支付成功，请开始身份核验');
  } catch (e) {
    await connection.rollback();
    logger.error('>> [payVerifyFee] Error:', e.message);
    sendError(res, e.message.includes('余额不足') ? e.message : '支付失败: ' + e.message);
  } finally {
    connection.release();
  }
};

/**
 * 2. 自动化身份核验 (先支付宝/微信实名，再人脸识别)
 */
exports.autoVerifyIdentity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { realName, idCard, verifyChannel, faceScore } = req.body;

    if (!realName || !idCard) return sendError(res, '请提供姓名和身份证号');

    // 1. 实时抓取后台配置的集成密钥
    const configLoader = require('../utils/config');
    const verifyAppId = await configLoader.get('ID_VERIFY_APP_ID');
    
    console.log(`>> [Verify] 触发原子级核验: 用户=${userId}, 渠道=${verifyChannel || 'Sandbox'}`);

    // 如果是服务者，必须先支付过费用
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (user[0].user_type === 2 || req.body.isProvider) {
      const [p] = await db.query('SELECT verify_pay_status FROM providers WHERE user_id = ?', [userId]);
      if (!p[0] || p[0].verify_pay_status !== 1) {
        return sendError(res, '请先支付核验费用', 402);
      }
    }

    // 模拟不同渠道的核验逻辑
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (verifyChannel === 'alipay' || verifyChannel === 'wechat') {
      // 模拟第三方回传成功
      console.log(`>> [Verify] 第三方实名回传成功: ${realName}`);
    }

    // 2. 人脸识别得分校验 (原子级严谨)
    if (faceScore !== undefined && parseFloat(faceScore) < 80) {
      return sendError(res, '人脸核验未通过，请确保光线充足且正对摄像头', 400);
    }

    // 3. 验证成功：同步更新用户表和服务者表
    await db.query(
      'UPDATE users SET real_name = ?, id_card = ?, id_card_verified = 1, is_id_verified = 1 WHERE id = ?',
      [realName, idCard, userId]
    );
    await db.query('UPDATE providers SET verify_status = 1 WHERE user_id = ?', [userId]);

    sendSuccess(res, null, '实名认证及人脸核验已通过');
  } catch (e) {
    logger.error('核验失败:', e);
    sendError(res, '核验服务请求超时，请稍后重试');
  }
};

/**
 * 3. 提交健康证 (保留人工审核)
 */
exports.submitHealthCert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { healthCertNo, expireDate, healthCertImage } = req.body;

    if (!healthCertImage) return sendError(res, '请上传健康证照片');

    await db.query(
      'UPDATE providers SET health_cert_no = ?, health_cert_expire = ?, health_cert_image = ?, health_cert_status = 1 WHERE user_id = ?',
      [healthCertNo, expireDate, healthCertImage, userId]
    );

    sendSuccess(res, null, '健康证已提交，请等待后台人工审核');
  } catch (e) {
    sendError(res, '提交失败');
  }
};

/**
 * 获取积分流水
 */
exports.getPointsRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const [records] = await db.query(
      'SELECT * FROM points_records WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    sendSuccess(res, records);
  } catch (error) {
    sendError(res, '获取失败');
  }
};

/**
 * 每日签到
 */
exports.checkIn = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;

    // 1. 检查今日是否已签到
    const [rows] = await connection.query(
      'SELECT id FROM points_records WHERE user_id = ? AND source = "checkin" AND TO_DAYS(created_at) = TO_DAYS(NOW())',
      [userId]
    );
    if (rows.length > 0) throw new Error('今日已完成签到');

    // 2. 增加积分 (阶梯式签到或固定积分，这里暂定固定 10 积分)
    const pointsToAdd = 10;
    await connection.query(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [pointsToAdd, userId]
    );

    // 3. 记录流水
    await connection.query(
      'INSERT INTO points_records (user_id, type, amount, source, remark) VALUES (?, 1, ?, "checkin", "每日签到奖励")',
      [userId, pointsToAdd]
    );

    await connection.commit();
    sendSuccess(res, { points: pointsToAdd }, `签到成功，获得 ${pointsToAdd} 积分`);
  } catch (error) {
    await connection.rollback();
    sendError(res, error.message);
  } finally {
    connection.release();
  }
};

const { maskPhone, maskIdCard, maskName } = require('../utils/masking');

/**
 * 获取用户列表（带筛选和分页，含脱敏）
 */
/**
 * 实名认证：初始化支付宝人脸识别 (Mock版)
 */
exports.initAlipayVerify = async (req, res) => {
  try {
    const { realName, idCard } = req.body;
    if (!realName || !idCard) return sendError(res, '姓名和身份证号不能为空');

    // 生产环境应在此调用支付宝 SDK: alipay.user.certify.open.initialize
    // 模拟返回 certify_id 和跳转链接
    const mockCertifyId = 'ALIPAY_VERIFY_' + Date.now();
    const mockJumpUrl = `https://mock.alipay.com/certify?id=${mockCertifyId}`;

    // 记录流水号到数据库
    await db.query(
      'UPDATE users SET real_name = ?, id_card = ?, alipay_certify_id = ?, verify_method = 1, id_card_verified = 2 WHERE id = ?',
      [realName, idCard, mockCertifyId, req.user.id]
    );

    sendSuccess(res, { certifyId: mockCertifyId, jumpUrl: mockJumpUrl });
  } catch (error) {
    logger.error('初始化支付宝认证失败:', error);
    sendError(res, '认证服务启动失败');
  }
};

/**
 * 实名认证：查询支付宝认证结果
 */
exports.queryAlipayResult = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await db.query('SELECT alipay_certify_id, real_name, id_card FROM users WHERE id = ?', [userId]);
    if (users.length === 0 || !users[0].alipay_certify_id) return sendError(res, '未找到认证记录');

    // 模拟查询结果 (实际应调用 alipay.user.certify.open.query)
    const success = true; 

    if (success) {
      await db.query(
        'UPDATE users SET id_card_verified = 1, user_type = 2 WHERE id = ?',
        [userId]
      );
      sendSuccess(res, { status: 1 }, '身份核验通过');
    } else {
      sendSuccess(res, { status: 0 }, '核验尚未完成或失败');
    }
  } catch (error) {
    sendError(res, '查询失败');
  }
};

/**
 * 实名认证：提交人工审核申请
 */
exports.submitManualVerify = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;
    const { realName, idCard, frontImage, backImage, handheldImage } = req.body;
    
    if (!realName || !idCard || !frontImage || !backImage || !handheldImage) {
      return sendError(res, '所有信息和照片均为必填项');
    }

    // 1. 更新用户表信息
    await connection.query(
      `UPDATE users SET 
        real_name = ?, id_card = ?, 
        id_card_front = ?, id_card_back = ?, id_card_handheld = ?, 
        id_card_verified = 2, verify_method = 2 
       WHERE id = ?`,
      [realName, idCard, frontImage, backImage, handheldImage, userId]
    );

    // 2. 核心修复：同步确保 providers 表中有待审核记录
    const [providers] = await connection.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
    if (providers.length > 0) {
      await connection.query('UPDATE providers SET verify_status = 0 WHERE user_id = ?', [userId]);
    } else {
      await connection.query(
        'INSERT INTO providers (user_id, verify_status, status) VALUES (?, 0, 0)',
        [userId]
      );
    }

    await connection.commit();
    sendSuccess(res, null, '人工审核申请已提交，请等待处理');
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('提交人工审核失败:', error);
    sendError(res, '提交失败');
  } finally {
    if (connection) connection.release();
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, keyword = '', userType = '', isVerified = '', status = '' } = req.query;
    let sql = 'SELECT id, phone, nickname, avatar, gender, real_name, id_card, id_card_verified, balance, points, user_type, status, last_login_time, created_at FROM users WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    const countParams = [];

    const filterSql = [];
    if (keyword) {
      filterSql.push(' AND (phone LIKE ? OR nickname LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (userType) {
      filterSql.push(' AND user_type = ?');
      params.push(userType);
      countParams.push(userType);
    }
    if (isVerified !== '') {
      filterSql.push(' AND id_card_verified = ?');
      params.push(isVerified);
      countParams.push(isVerified);
    }
    if (status !== '') {
      filterSql.push(' AND status = ?');
      params.push(status);
      countParams.push(status);
    }

    const whereClause = filterSql.join('');
    sql += whereClause;
    countSql += whereClause;

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (page - 1) * pageSize);

    const [users] = await db.query(sql, params);
    const [countResult] = await db.query(countSql, countParams);

    // 列表查询强制脱敏
    const maskedUsers = users.map(u => ({
      ...u,
      phone: maskPhone(u.phone),
      real_name: maskName(u.real_name),
      id_card: maskIdCard(u.id_card)
    }));

    sendPage(res, maskedUsers, countResult[0].total, page, pageSize);
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    sendError(res, '获取用户列表失败');
  }
};

/**
 * 更新用户状态（禁用/启用）
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    sendSuccess(res, null, '状态更新成功');
  } catch (error) {
    sendError(res, '更新失败');
  }
};

/**
 * 获取统计数据
 */
exports.getStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURDATE()) as newUsers,
        (SELECT COUNT(*) FROM services WHERE status = 1) as services,
        (SELECT COUNT(*) FROM providers WHERE verify_status = 1) as providers,
        (SELECT COUNT(*) FROM providers WHERE verify_status = 0) as pendingProviders,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM orders WHERE created_at >= CURDATE()) as todayOrders,
        (SELECT IFNULL(SUM(total_price), 0) FROM orders WHERE status = 3) as totalRevenue,
        (SELECT IFNULL(SUM(total_price), 0) FROM orders WHERE status = 3 AND created_at >= CURDATE()) as todayRevenue
    `);
    
    const [trend] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%m-%d') as date, COUNT(*) as count 
      FROM orders 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY date
      ORDER BY date ASC
    `);

    sendSuccess(res, { ...stats[0], trend });
  } catch (error) {
    sendError(res, '获取统计失败');
  }
};

/**
 * 修改密码
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    if (user.password && !(await bcrypt.compare(oldPassword, user.password))) return sendError(res, '原密码错误');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    sendSuccess(res, null, '成功');
  } catch (error) {
    sendError(res, '失败');
  }
};

/**
 * 更新个人资料
 */
exports.updateProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { nickname, avatar, gender, introduction } = req.body;
    const userId = req.user.id;

    // 1. 更新 users 表基础信息
    await connection.query(
      'UPDATE users SET nickname = COALESCE(?, nickname), avatar = COALESCE(?, avatar), gender = COALESCE(?, gender) WHERE id = ?',
      [nickname, avatar, gender, userId]
    );

    // 2. 如果提供了简介且用户是服务者，同步更新 providers 表
    if (introduction !== undefined) {
      await connection.query(
        'UPDATE providers SET introduction = ? WHERE user_id = ?',
        [introduction, userId]
      );
    }

    await connection.commit();
    sendSuccess(res, null, '个人资料更新成功');
  } catch (error) {
    await connection.rollback();
    logger.error('更新个人资料失败:', error);
    sendError(res, '保存失败');
  } finally {
    connection.release();
  }
};

/**
 * 检查是否可以注销账号
 */
exports.checkCancelAccount = async (req, res) => {
  try {
    sendSuccess(res, { canCancel: true });
  } catch (error) {
    sendError(res, '失败');
  }
};

/**
 * 注销账号
 */
exports.cancelAccount = async (req, res) => {
  try {
    await db.query('UPDATE users SET status = 0 WHERE id = ?', [req.user.id]);
    sendSuccess(res, null, '成功');
  } catch (error) {
    sendError(res, '失败');
  }
};

/**
 * 获取单个用户详情
 */
exports.getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [users] = await db.query('SELECT id, nickname as name, nickname, avatar FROM users WHERE id = ?', [id]);
    if (users.length === 0) return sendError(res, '用户不存在', 404);
    sendSuccess(res, users[0]);
  } catch (error) {
    sendError(res, '获取失败');
  }
};

/**
 * 管理员：获取用户业务快照 (用于客服侧边栏)
 */
exports.getUserSnapshot = async (req, res) => {
  try {
    const { id } = req.params;
    const [data] = await db.query(`
      SELECT 
        u.id, u.phone, u.nickname, u.user_type, u.created_at,
        IFNULL(SUM(o.total_price), 0) as total_spent,
        COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.pay_status = 1
      WHERE u.id = ?
      GROUP BY u.id
    `, [id]);

    if (data.length === 0) return sendError(res, '用户不存在');

    const [orders] = await db.query(
      'SELECT id, order_no, service_name, status, total_price, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 3',
      [id]
    );

    sendSuccess(res, {
      profile: data[0],
      recentOrders: orders
    });
  } catch (e) {
    sendError(res, '获取快照失败');
  }
};
