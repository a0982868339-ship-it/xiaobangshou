const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 获取就诊人档案列表
 */
exports.getProfiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT * FROM patient_profiles WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    sendSuccess(res, rows);
  } catch (error) {
    logger.error('获取就诊人档案失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 获取档案详情
 */
exports.getProfileDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM patient_profiles WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) return sendError(res, '档案不存在', 404);
    sendSuccess(res, rows[0]);
  } catch (error) {
    sendError(res, '获取失败');
  }
};

/**
 * 创建档案
 */
exports.createProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, age, gender, hospital_name, tags, remarks, is_default } = req.body;

    if (!name) return sendError(res, '姓名不能为空');

    // 如果设为默认，先取消其他的默认
    if (is_default === 1) {
      await db.query('UPDATE patient_profiles SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    const [result] = await db.query(
      `INSERT INTO patient_profiles (user_id, name, age, gender, hospital_name, tags, remarks, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, age || null, gender || 0, hospital_name || null, JSON.stringify(tags || []), remarks || null, is_default || 0]
    );

    sendSuccess(res, { id: result.insertId }, '档案创建成功');
  } catch (error) {
    logger.error('创建档案失败:', error);
    sendError(res, '创建失败');
  }
};

/**
 * 更新档案
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, age, gender, hospital_name, tags, remarks, is_default } = req.body;

    const [existing] = await db.query('SELECT id FROM patient_profiles WHERE id = ? AND user_id = ?', [id, userId]);
    if (existing.length === 0) return sendError(res, '档案不存在');

    if (is_default === 1) {
      await db.query('UPDATE patient_profiles SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    await db.query(
      `UPDATE patient_profiles SET name=?, age=?, gender=?, hospital_name=?, tags=?, remarks=?, is_default=?
       WHERE id=? AND user_id=?`,
      [name, age || null, gender || 0, hospital_name || null, JSON.stringify(tags || []), remarks || null, is_default || 0, id, userId]
    );

    sendSuccess(res, null, '更新成功');
  } catch (error) {
    sendError(res, '更新失败');
  }
};

/**
 * 删除档案
 */
exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await db.query('DELETE FROM patient_profiles WHERE id = ? AND user_id = ?', [id, userId]);
    sendSuccess(res, null, '删除成功');
  } catch (error) {
    sendError(res, '删除失败');
  }
};
