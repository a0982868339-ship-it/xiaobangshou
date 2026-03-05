const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 获取号池列表
 */
exports.getNumberPool = async (req, res) => {
  try {
    const [list] = await db.query('SELECT * FROM virtual_number_pool ORDER BY created_at DESC');
    sendSuccess(res, list);
  } catch (e) { sendError(res, '获取失败'); }
};

/**
 * 批量添加虚拟号 (扩容)
 */
exports.addVirtualNumbersBatch = async (req, res) => {
  try {
    const { phoneNumbers, city, provider } = req.body; // phoneNumbers 为字符串，每行一个
    if (!phoneNumbers) return sendError(res, '请提供号码列表');

    const numbers = phoneNumbers.split(/[\n,，]+/).map(n => n.trim()).filter(n => n);
    if (numbers.length === 0) return sendError(res, '未检测到有效号码');

    const values = numbers.map(n => [n, city || '全国', provider || 'Aliyun']);
    
    await db.query(
      'INSERT IGNORE INTO virtual_number_pool (phone_number, city, provider) VALUES ?',
      [values]
    );
    
    sendSuccess(res, { count: numbers.length }, '批量扩容成功，已过滤重复号码');
  } catch (e) {
    logger.error('批量添加失败:', e);
    sendError(res, '添加失败: ' + e.message);
  }
};

/**
 * 修改号码状态
 */
exports.updateNumberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 0-启用, 2-停用
    await db.query('UPDATE virtual_number_pool SET status = ? WHERE id = ?', [status, id]);
    sendSuccess(res, null, '状态已更新');
  } catch (e) { sendError(res, '操作失败'); }
};

/**
 * 删除号码
 */
exports.deleteNumber = async (req, res) => {
  try {
    await db.query('DELETE FROM virtual_number_pool WHERE id = ?', [req.params.id]);
    sendSuccess(res, null, '号码已从池中移除');
  } catch (e) { sendError(res, '移除失败'); }
};
