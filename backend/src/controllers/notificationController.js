const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 获取通知列表
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const [list] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND status = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, parseInt(pageSize), offset]
    );

    const [stats] = await db.query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND status = 1',
      [userId]
    );

    sendSuccess(res, {
      list,
      total: stats[0].total
    });
  } catch (error) {
    sendError(res, '获取通知失败');
  }
};

/**
 * 获取未读通知数
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status = 1 AND is_read = 0',
      [userId]
    );
    sendSuccess(res, rows[0].count);
  } catch (error) {
    sendError(res, '获取未读数失败');
  }
};

/**
 * 标记通知为已读
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (id === 'all') {
      await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND status = 1', [userId]);
    } else {
      await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ? AND status = 1', [id, userId]);
    }

    sendSuccess(res, null, '操作成功');
  } catch (error) {
    sendError(res, '操作失败');
  }
};

const { notificationQueue } = require('../utils/queue');

/**
 * 内部辅助函数：发送通知 (异步解耦版)
 */
exports.sendNotify = async (userId, data) => {
  try {
    const { type, title, content, targetId, targetUrl } = data;

    // 将通知任务投递到消息队列
    await notificationQueue.add('send-notification', {
      userId, type, title, content, targetId, targetUrl
    });

    console.log(`>> [Queue] Notification queued for User ${userId}`);
    return true;
  } catch (error) {
    logger.error('发送通知队列投递失败:', error);
    // 兜底：如果队列挂了，暂时同步写入一次重要通知 (可选)
    return false;
  }
};
