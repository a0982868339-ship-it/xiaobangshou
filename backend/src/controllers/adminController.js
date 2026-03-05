const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const bcrypt = require('bcryptjs');

/**
 * 获取所有后台管理员
 */
exports.getAdminUsers = async (req, res) => {
  try {
    const [list] = await db.query('SELECT id, username, real_name, role, status, created_at FROM admin_users');
    sendSuccess(res, list);
  } catch (e) { sendError(res, '获取失败'); }
};

/**
 * 创建或更新管理员（分配角色）
 */
exports.saveAdminUser = async (req, res) => {
  try {
    const { id, username, password, realName, role, status } = req.body;
    if (id) {
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
          'UPDATE admin_users SET real_name=?, role=?, status=?, password=? WHERE id=?',
          [realName, role, status, hashedPassword, id]
        );
      } else {
        await db.query(
          'UPDATE admin_users SET real_name=?, role=?, status=? WHERE id=?',
          [realName, role, status, id]
        );
      }
    } else {
      if (!password) return sendError(res, '新管理员必须设置密码');
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'INSERT INTO admin_users (username, password, real_name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, realName, role]
      );
    }
    sendSuccess(res, null, '管理员配置已更新');
  } catch (e) { sendError(res, '操作失败'); }
};

/**
 * 删除管理员 (含权限防御)
 */
exports.deleteAdminUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    const operatorId = req.user.id;
    const operatorRole = req.user.role;

    // 1. 禁止删除自己
    if (String(targetId) === String(operatorId)) {
      return sendError(res, '不能删除当前登录的账号');
    }

    // 2. 权限检查：只有 super_admin 可以删除其他管理员
    if (operatorRole !== 'super_admin') {
      return sendError(res, '权限不足，仅超级管理员可执行此操作', 403);
    }

    await db.query('DELETE FROM admin_users WHERE id = ?', [targetId]);
    sendSuccess(res, null, '管理员已移除');
  } catch (e) { 
    logger.error('删除管理员失败:', e);
    sendError(res, '移除失败'); 
  }
};
