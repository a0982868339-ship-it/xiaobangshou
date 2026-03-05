const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 获取敏感词列表
 */
exports.getBannedKeywords = async (req, res) => {
  try {
    const [list] = await db.query('SELECT * FROM banned_keywords ORDER BY created_at DESC');
    sendSuccess(res, list);
  } catch (e) { sendError(res, '获取失败'); }
};

/**
 * 添加敏感词
 */
exports.addBannedKeyword = async (req, res) => {
  try {
    const { word, riskLevel } = req.body;
    if (!word) return sendError(res, '词条不能为空');
    
    await db.query(
      'INSERT INTO banned_keywords (word, risk_level) VALUES (?, ?)',
      [word, riskLevel || 2]
    );
    sendSuccess(res, null, '词条已加入风控库');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return sendError(res, '词条已存在');
    sendError(res, '添加失败');
  }
};

/**
 * 删除敏感词
 */
exports.deleteBannedKeyword = async (req, res) => {
  try {
    await db.query('DELETE FROM banned_keywords WHERE id = ?', [req.params.id]);
    sendSuccess(res, null, '词条已下架');
  } catch (e) { sendError(res, '移除失败'); }
};

/**
 * 获取拦截日志
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const [list] = await db.query(`
      SELECT l.*, u.nickname, u.phone 
      FROM audit_logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      ORDER BY l.created_at DESC 
      LIMIT 100
    `);
    sendSuccess(res, list);
  } catch (e) { sendError(res, '获取日志失败'); }
};
