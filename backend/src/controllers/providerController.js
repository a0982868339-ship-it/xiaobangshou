const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const SecurityService = require('../services/SecurityService');

/**
 * 切换接单状态
 */
exports.toggleStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body; // 0-休息中, 1-接单中

    // 检查是否是服务者
    const [providers] = await db.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return sendError(res, '您还不是服务者', 400);
    }

    // 更新状态
    await db.query('UPDATE providers SET status = ? WHERE user_id = ?', [status, userId]);

    sendSuccess(res, null, status === 1 ? '已开启接单' : '已关闭接单');
  } catch (error) {
    logger.error('切换状态失败:', error);
    sendError(res, '操作失败: ' + error.message);
  }
};

/**
 * 获取服务者状态
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const [providers] = await db.query('SELECT status, work_status, verify_status FROM providers WHERE user_id = ?', [userId]);
    if (providers.length === 0) {
      return sendError(res, '您还不是服务者', 400);
    }

    sendSuccess(res, providers[0]);
  } catch (error) {
    logger.error('获取状态失败:', error);
    sendError(res, '获取失败: ' + error.message);
  }
};

/**
 * 更新工作状态 (原子级接单开关)
 */
exports.updateWorkStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workStatus } = req.body; // 1-接单中, 0-休息中

    if (String(workStatus) === '1') {
      // 核心合规校验：开启接单前必须完成实名和健康证
      const [statusRows] = await db.query(`
        SELECT u.id_card_verified, p.health_cert_status 
        FROM users u 
        JOIN providers p ON u.id = p.user_id 
        WHERE u.id = ?
      `, [userId]);

      if (statusRows.length === 0) return sendError(res, '服务者资料异常', 400);
      
      const { id_card_verified, health_cert_status } = statusRows[0];
      if (id_card_verified !== 1) {
        return sendError(res, '实名认证未通过，无法开启接单', 403);
      }
      if (health_cert_status !== 1) {
        return sendError(res, '健康证审核未通过，无法开启接单', 403);
      }
    }

    await db.query('UPDATE providers SET work_status = ? WHERE user_id = ?', [workStatus, userId]);

    sendSuccess(res, null, workStatus === 1 ? '已开启接单模式' : '已进入休息模式');
  } catch (error) {
    logger.error('更新工作状态失败:', error);
    sendError(res, '操作失败: ' + error.message);
  }
};

/**
 * 更新服务类型
 */
exports.updateServiceTypes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceTypes, cuisineTags } = req.body;

    if (!Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      return sendError(res, '请至少选择一个服务类型', 400);
    }

    await db.query(
      'UPDATE providers SET service_types = ?, cuisine_tags = ? WHERE user_id = ?',
      [JSON.stringify(serviceTypes), JSON.stringify(cuisineTags || []), userId]
    );

    sendSuccess(res, null, '服务配置更新成功');
  } catch (error) {
    logger.error('更新服务类型失败:', error);
    sendError(res, '更新失败: ' + error.message);
  }
};

/**
 * 更新服务区域
 */
exports.updateServiceAreas = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceAreas } = req.body;

    await db.query(
      'UPDATE providers SET service_areas = ? WHERE user_id = ?',
      [JSON.stringify(serviceAreas), userId]
    );

    sendSuccess(res, null, '服务区域更新成功');
  } catch (error) {
    logger.error('更新服务区域失败:', error);
    sendError(res, '更新失败: ' + error.message);
  }
};

/**
 * 更新服务者熟悉的医院
 */
exports.updateHospitals = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const userId = req.user.id;
    const { hospitalIds } = req.body; // 数组: [1, 2, 3]

    // 获取服务者ID
    const [providers] = await connection.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
    if (providers.length === 0) throw new Error('您还不是服务者');
    const providerId = providers[0].id;

    // 1. 先删除旧的关联
    await connection.query('DELETE FROM provider_hospitals WHERE provider_id = ?', [providerId]);

    // 2. 插入新的关联
    if (hospitalIds && hospitalIds.length > 0) {
      const values = hospitalIds.map(hId => [providerId, hId]);
      await connection.query(
        'INSERT INTO provider_hospitals (provider_id, hospital_id) VALUES ?',
        [values]
      );
    }

    await connection.commit();
    sendSuccess(res, null, '熟悉医院设置成功');
  } catch (error) {
    await connection.rollback();
    sendError(res, '设置失败: ' + error.message);
  } finally {
    connection.release();
  }
};

/**
 * 获取服务者已绑定的医院
 */
exports.getMyHospitals = async (req, res) => {
  try {
    const userId = req.user.id;
    const [hospitals] = await db.query(
      `SELECT h.id, h.name, h.level 
       FROM hospitals h 
       JOIN provider_hospitals ph ON h.id = ph.hospital_id 
       JOIN providers p ON ph.provider_id = p.id 
       WHERE p.user_id = ?`,
      [userId]
    );
    sendSuccess(res, hospitals);
  } catch (error) {
    sendError(res, '获取失败');
  }
};

/**
 * 更新服务者实时地理位置
 */
exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { lat, lng, city } = req.body;

    if (!lat || !lng) return sendError(res, '坐标无效');

    await db.query(
      'UPDATE providers SET lat = ?, lng = ?, city = ?, updated_at = NOW() WHERE user_id = ?',
      [lat, lng, city || null, userId]
    );

    sendSuccess(res, null, '位置已同步');
  } catch (error) {
    sendError(res, '更新位置失败');
  }
};

/**
 * 更新服务者资料 (地址、坐标、简介等)
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { service_address, lat, lng, introduction, city } = req.body;

    const fields = [];
    const params = [];

    if (service_address !== undefined) { fields.push('service_address = ?'); params.push(service_address); }
    if (lat !== undefined) { fields.push('lat = ?'); params.push(lat); }
    if (lng !== undefined) { fields.push('lng = ?'); params.push(lng); }
    if (introduction !== undefined) { fields.push('introduction = ?'); params.push(introduction); }
    if (city !== undefined) { fields.push('city = ?'); params.push(city); }

    if (fields.length === 0) return sendError(res, '没有要更新的内容');

    params.push(userId);
    const sql = `UPDATE providers SET ${fields.join(', ')}, updated_at = NOW() WHERE user_id = ?`;

    const [result] = await db.query(sql, params);
    if (result.affectedRows === 0) return sendError(res, '更新失败，请重试');

    sendSuccess(res, null, '资料更新成功');
  } catch (error) {
    logger.error('更新资料失败:', error);
    sendError(res, '系统错误');
  }
};

/**
 * 管理员：获取所有服务者列表 (带审核状态和核验方式筛选)
 */
exports.getAllProvidersAdmin = async (req, res) => {
  try {
    const { verifyStatus, verifyMethod } = req.query;
    let sql = `
      SELECT p.*, u.phone, u.nickname, u.real_name, u.id_card, u.id_card_verified, 
             u.id_card_front, u.id_card_back, u.id_card_handheld, u.verify_method, u.alipay_certify_id
      FROM providers p 
      JOIN users u ON p.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    if (verifyStatus !== undefined && verifyStatus !== '') {
      sql += ' AND p.verify_status = ?';
      params.push(verifyStatus);
    }

    if (verifyMethod !== undefined && verifyMethod !== '') {
      sql += ' AND u.verify_method = ?';
      params.push(verifyMethod);
    }

    sql += ' ORDER BY p.created_at DESC';
    const [list] = await db.query(sql, params);
    sendSuccess(res, list);
  } catch (error) {
    logger.error('获取服务者列表失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 管理员：审核服务者
 */
exports.auditProvider = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { status, reason } = req.body; // 1-通过, 2-拒绝

    // 1. 获取用户ID
    const [providers] = await connection.query('SELECT user_id FROM providers WHERE id = ?', [id]);
    if (providers.length === 0) throw new Error('服务者不存在');
    const userId = providers[0].user_id;

    const configLoader = require('../utils/config');
    const defaultScore = await configLoader.getNumber('CREDIT_DEFAULT_SCORE', 100);

    // 2. 更新服务者表状态
    await connection.query(
      'UPDATE providers SET verify_status = ?, verify_reason = ?, credit_score = ?, updated_at = NOW() WHERE id = ?',
      [status, reason || null, defaultScore, id]
    );

    // 3. 联动更新用户表 (委托给 Service)
    if (String(status) === '1') {
      // 审核通过：提升类型为服务者 (2)，标记实名已核实 (1)
      await connection.query('UPDATE users SET user_type = 2 WHERE id = ?', [userId]);
      await SecurityService.updateRealNameStatus(userId, 1, connection);
    } else if (String(status) === '2') {
      // 审核驳回：标记实名状态为“已驳回” (3)
      await SecurityService.updateRealNameStatus(userId, 3, connection);
    }

    await connection.commit();
    sendSuccess(res, null, '审核操作成功，已同步更新实名状态');
  } catch (error) {
    await connection.rollback();
    logger.error('审核失败:', error);
    sendError(res, '审核操作失败: ' + error.message);
  } finally {
    connection.release();
  }
};

/**
 * 管理员：审核健康证
 */
exports.auditHealthCert = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body; // 1-通过, 2-驳回

    await db.query(
      'UPDATE providers SET health_cert_status = ?, health_cert_reason = ? WHERE id = ?',
      [status, reason || null, id]
    );

    sendSuccess(res, null, '健康证审核完成');
  } catch (error) {
    logger.error('健康证审核失败:', error);
    sendError(res, '审核失败');
  }
};

/**
 * 后端：服务者提交健康证
 */
exports.submitHealthCert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { healthCertNo, expireDate, healthCertImage } = req.body;

    await db.query(
      'UPDATE providers SET health_cert_no = ?, health_cert_expire = ?, health_cert_image = ?, health_cert_status = 3 WHERE user_id = ?',
      [healthCertNo, expireDate, healthCertImage, userId]
    );

    sendSuccess(res, null, '健康证已提交审核');
  } catch (error) {
    sendError(res, '提交失败');
  }
};

/**
 * 管理员：获取所有服务者的地图数据
 */
exports.getProvidersMapData = async (req, res) => {
  try {
    const [list] = await db.query(`
      SELECT p.id, p.lat, p.lng, p.status, p.city, u.nickname, u.phone, 
             (SELECT COUNT(*) FROM orders WHERE provider_id = p.id AND status = 2) as serving_count
      FROM providers p
      JOIN users u ON p.user_id = u.id
      WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
      AND p.verify_status = 1
    `);

    sendSuccess(res, list);
  } catch (error) {
    logger.error('获取地图数据失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 管理员：获取信用变更日志
 */
exports.getProviderCreditLogs = async (req, res) => {
  try {
    const { providerId } = req.query;
    if (!providerId) return sendError(res, '参数缺失');

    const [logs] = await db.query(
      'SELECT * FROM provider_credit_logs WHERE provider_id = ? ORDER BY created_at DESC',
      [providerId]
    );
    sendSuccess(res, logs);
  } catch (error) {
    sendError(res, '获取日志失败');
  }
};

/**
 * 管理员：调整信用分
 */
exports.updateProviderCredit = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { amount, reasonType, remark, orderId } = req.body;

    // 1. 获取当前分值
    const [providers] = await connection.query('SELECT credit_score FROM providers WHERE id = ?', [id]);
    if (providers.length === 0) throw new Error('服务者不存在');
    const oldScore = providers[0].credit_score;
    const newScore = oldScore + parseInt(amount);

    // 2. 更新分值
    await connection.query('UPDATE providers SET credit_score = ? WHERE id = ?', [newScore, id]);

    // 3. 记录日志
    await connection.query(
      'INSERT INTO provider_credit_logs (provider_id, order_id, change_amount, current_score, reason_type, remark) VALUES (?, ?, ?, ?, ?, ?)',
      [id, orderId || null, amount, newScore, reasonType, remark]
    );

    await connection.commit();
    sendSuccess(res, { newScore }, '信用分调整成功');
  } catch (error) {
    await connection.rollback();
    sendError(res, '调整失败: ' + error.message);
  } finally {
    connection.release();
  }
};

/**
 * 获取单个服务者详情
 */
exports.getProviderDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. 获取基础信息和认证状态
    const [providers] = await db.query(`
      SELECT 
        p.id, p.user_id, p.rating, p.order_count as completedCount,
        p.introduction as description, u.nickname as name, u.avatar,
        p.verify_status, p.health_cert_status,
        p.created_at, p.cuisine_tags
      FROM providers p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ? OR p.user_id = ?
    `, [id, id]);

    if (providers.length === 0) {
      return sendError(res, '服务者不存在', 404);
    }

    const provider = providers[0];

    // 1.5 获取已通过的资质认证
    const [certs] = await db.query(
      'SELECT type, name, certificate_no FROM provider_certifications WHERE provider_id = ? AND status = 1',
      [provider.id]
    );
    provider.certifications = certs;

    // 2. 清洗个人简介：强制过滤隐私信息 (增强版)
    if (provider.description) {
      // 匹配：1. "紧急联系人..." 2. "姓名(11位数字)" 3. 任何11位连续数字
      provider.description = provider.description
        .replace(/紧急联系人[:：].*?(\d{11})?(\))?/g, '')
        .replace(/.*?\(\d{11}\)/g, '') // 匹配 姓名(178...)
        .replace(/\d{11}/g, '')        // 匹配 纯11位数字
        .replace(/[()（）]/g, '')      // 清理残留括号
        .replace(/\n\n+/g, '\n')
        .trim();

      if (!provider.description || provider.description === 'undefined' || provider.description.length < 2) {
        provider.description = '这位服务者很神秘，还没来得及写简介。';
      }
    }

    // 3. 计算从业经验 (根据创建时间)
    const years = Math.max(1, new Date().getFullYear() - new Date(provider.created_at).getFullYear());
    provider.experienceYears = years;

    // 3. 模拟标签数据 (滴滴风格)
    // 实际项目中这里应该从评价表统计，目前先提供一套精选标签
    provider.tags = [
      { label: '准时到达', count: 128, type: 'success' },
      { label: '专业熟练', count: 95, type: 'primary' },
      { label: '态度极好', count: 210, type: 'warning' },
      { label: '细心负责', count: 64, type: 'primary' },
      { label: '穿着整洁', count: 42, type: 'default' }
    ];

    sendSuccess(res, provider);
  } catch (error) {
    logger.error('获取服务者详情失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 获取适用于宠物服务的可用服务者列表 (遛狗/喂猫)
 */
exports.getAvailableProvidersForPet = async (req, res) => {
  try {
    const { serviceId, serviceTime, lat, lng } = req.query;
    
    // 1. 基础过滤：必须是审核通过(1)、开启接单(1)、且服务类型(JSON)包含该serviceId的服务者
    // 同时关联用户表获取昵称、头像
    let sql = `
      SELECT 
        p.id, p.user_id, p.rating, p.order_count, p.introduction,
        u.nickname, u.avatar, p.lat, p.lng,
        (6371 * acos(cos(radians(?)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(?)) + sin(radians(?)) * sin(radians(p.lat)))) AS distance
      FROM providers p
      JOIN users u ON p.user_id = u.id
      WHERE p.verify_status = 1 
        AND p.work_status = 1
        AND JSON_CONTAINS(p.service_types, ?)
    `;
    
    const params = [lat || 0, lng || 0, lat || 0, JSON.stringify(String(serviceId))];

    // 2. 排除在预约时间段已有冲突订单的服务者
    // 假设每个订单占用 2 小时 (前后各1小时缓冲)
    if (serviceTime) {
      sql += `
        AND p.id NOT IN (
          SELECT provider_id FROM provider_schedules 
          WHERE provider_id IS NOT NULL 
          AND (
            (start_time <= ? AND end_time >= ?) OR
            (start_time <= ? AND end_time >= ?)
          )
        )
      `;
      const startTime = new Date(new Date(serviceTime).getTime() - 60 * 60 * 1000); // 提前1小时
      const endTime = new Date(new Date(serviceTime).getTime() + 60 * 60 * 1000);   // 延后1小时
      params.push(startTime, startTime, endTime, endTime);
    }

    // 3. 排序：距离优先，其次评分
    sql += ` ORDER BY distance ASC, p.rating DESC LIMIT 20`;

    const [providers] = await db.query(sql, params);
    
    // 清洗数据
    const list = providers.map(p => ({
      ...p,
      distance: p.distance ? p.distance.toFixed(2) : null,
      rating: parseFloat(p.rating)
    }));

    sendSuccess(res, list);
  } catch (error) {
    logger.error('获取宠物服务可用人员失败:', error);
    sendError(res, '获取列表失败');
  }
};

/**
 * 获取服务者的评价列表
 */
exports.getProviderReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    // 获取服务者ID
    const [pRows] = await db.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
    if (pRows.length === 0) return sendError(res, '您还不是服务者', 400);
    const providerId = pRows[0].id;

    const [reviews] = await db.query(`
      SELECT r.*, u.nickname as user_nickname, u.avatar as user_avatar, o.service_name
      FROM order_reviews r
      JOIN users u ON r.user_id = u.id
      JOIN orders o ON r.order_id = o.id
      WHERE r.provider_id = ?
      ORDER BY r.created_at DESC
    `, [providerId]);

    sendSuccess(res, reviews);
  } catch (error) {
    logger.error('获取评价列表失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 提交资质认证
 */
exports.submitCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, name, certificateNo, expireDate, images } = req.body;

    const [providers] = await db.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
    if (providers.length === 0) return sendError(res, '您还不是服务者', 400);
    const providerId = providers[0].id;

    await db.query(
      'INSERT INTO provider_certifications (provider_id, type, name, certificate_no, expire_date, images, status) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [providerId, type, name, certificateNo || null, expireDate || null, JSON.stringify(images || [])]
    );

    sendSuccess(res, null, '资质证件已提交，请等待平台审核');
  } catch (error) {
    logger.error('提交资质认证失败:', error);
    sendError(res, '提交失败');
  }
};

/**
 * 获取我的资质认证列表
 */
exports.getMyCertifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const [providers] = await db.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
    if (providers.length === 0) return sendError(res, '您还不是服务者', 400);
    const providerId = providers[0].id;

    const [list] = await db.query(
      'SELECT * FROM provider_certifications WHERE provider_id = ? ORDER BY created_at DESC',
      [providerId]
    );

    sendSuccess(res, list);
  } catch (error) {
    sendError(res, '获取失败');
  }
};

/**
 * 管理员：获取所有待审核或已审核资质列表
 */
exports.getAllCertificationsAdmin = async (req, res) => {
  try {
    const { status, type } = req.query;
    let sql = `
      SELECT c.*, u.real_name as provider_real_name, u.phone as provider_phone, u.nickname as provider_nickname
      FROM provider_certifications c
      JOIN providers p ON c.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (status !== undefined && status !== '') {
      sql += ' AND c.status = ?';
      params.push(status);
    }
    if (type !== undefined && type !== '') {
      sql += ' AND c.type = ?';
      params.push(type);
    }
    sql += ' ORDER BY c.created_at DESC';

    const [list] = await db.query(sql, params);
    sendSuccess(res, list);
  } catch (error) {
    sendError(res, '获取列表失败');
  }
};

/**
 * 管理员：审核资质证件
 */
exports.auditCertification = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body; // 1-通过, 2-拒绝

    await db.query(
      'UPDATE provider_certifications SET status = ?, reject_reason = ?, updated_at = NOW() WHERE id = ?',
      [status, reason || null, id]
    );

    sendSuccess(res, null, '审核操作成功');
  } catch (error) {
    sendError(res, '审核失败');
  }
};

module.exports = exports;
