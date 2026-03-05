const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 获取服务者技能橱窗列表
 */
exports.getProviderSkills = async (req, res) => {
  try {
    const { serviceId } = req.query;
    let sql = `
      SELECT s.*, p.rating, u.nickname, u.avatar 
      FROM provider_skills s
      JOIN providers p ON s.provider_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.status = 1
    `;
    const params = [];
    if (serviceId) {
      sql += ' AND s.service_id = ?';
      params.push(serviceId);
    }
    const [skills] = await db.query(sql, params);
    sendSuccess(res, skills);
  } catch (error) { sendError(res, '获取橱窗失败'); }
};

/**
 * 服务者发布/更新技能
 */
exports.updateMySkill = async (req, res) => {
  try {
    const { serviceId, title, description, price, unit } = req.body;
    const providerId = req.user.id; // 假设auth中间件已挂载
    
    // 检查是否已有该服务的技能
    const [exists] = await db.query('SELECT id FROM provider_skills WHERE provider_id = ? AND service_id = ?', [providerId, serviceId]);
    
    if (exists.length > 0) {
      await db.query(
        'UPDATE provider_skills SET title=?, description=?, price=?, unit=? WHERE id=?',
        [title, description, price, unit, exists[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO provider_skills (provider_id, service_id, title, description, price, unit) VALUES (?, ?, ?, ?, ?, ?)',
        [providerId, serviceId, title, description, price, unit]
      );
    }
    sendSuccess(res, null, '发布成功');
  } catch (error) { sendError(res, '操作失败'); }
};

/**
 * 用户发布自定义需求
 */
exports.createCustomDemand = async (req, res) => {
  try {
    const { title, description, price, serviceTime, address } = req.body;
    const userId = req.user.id;
    const orderNo = 'DEM' + Date.now();

    await db.query(
      `INSERT INTO orders (order_no, user_id, service_name, demand_desc, total_price, service_time, service_address, order_type, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 3, 0)`,
      [orderNo, userId, title, description, price, serviceTime, address]
    );
    sendSuccess(res, { orderNo }, '需求发布成功，请等待接单');
  } catch (error) { sendError(res, '发布失败'); }
};

