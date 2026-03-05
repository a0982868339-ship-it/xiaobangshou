const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 管理员：发送系统通知 (广播逻辑)
 */
exports.sendSystemNotification = async (req, res) => {
  try {
    const { title, content, targetType } = req.body; 
    const type = Number(targetType); 

    // 1. 记录广播主指令
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, title, content, type, is_broadcast, target_type) VALUES (?, ?, ?, ?, ?, ?)',
      [null, title, content, 'system', 1, type]
    );
    const broadcastId = result.insertId;

    // 2. 根据目标类型分发到个人收件箱 (大厂异步逻辑：实际生产环境应进入消息队列)
    if (type === 1) {
      // 全平台用户 (这里仅演示逻辑，大量数据建议走独立表或延迟分发)
      const [users] = await db.query('SELECT id FROM users WHERE status = 1');
      for (let u of users) {
        await db.query(
          'INSERT INTO notifications (user_id, title, content, type, target_id) VALUES (?, ?, ?, ?, ?)', 
          [u.id, title, content, 'system', broadcastId]
        );
      }
    } else if (type === 2) {
      const [providers] = await db.query('SELECT user_id FROM providers WHERE verify_status = 1');
      for (let p of providers) {
        await db.query(
          'INSERT INTO notifications (user_id, title, content, type, target_id) VALUES (?, ?, ?, ?, ?)', 
          [p.user_id, title, content, 'system', broadcastId]
        );
      }
    } else if (type === 3) {
      const [users] = await db.query('SELECT id FROM users WHERE user_type = 1');
      for (let u of users) {
        await db.query(
          'INSERT INTO notifications (user_id, title, content, type, target_id) VALUES (?, ?, ?, ?, ?)', 
          [u.id, title, content, 'system', broadcastId]
        );
      }
    }

    sendSuccess(res, null, '通知指令已全量下发');
  } catch (error) {
    logger.error('>> [sendSystemNotification] Error:', error);
    sendError(res, '发送失败: ' + error.message);
  }
};

/**
 * 管理员：获取已发出的通知历史 (仅展示广播指令)
 */
exports.getNotificationHistory = async (req, res) => {
  try {
    const [list] = await db.query('SELECT * FROM notifications WHERE is_broadcast = 1 AND status = 1 ORDER BY created_at DESC');
    sendSuccess(res, list);
  } catch (e) { sendError(res, '获取失败'); }
};

/**
 * 管理员：撤回/删除通知
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    // 逻辑删除广播主指令
    await db.query('UPDATE notifications SET status = 0 WHERE id = ?', [id]);
    // 同时删除已分发到个人的通知 (防止用户还能看到)
    await db.query('DELETE FROM notifications WHERE target_id = ?', [id]);
    sendSuccess(res, null, '通知已撤回并删除');
  } catch (e) { sendError(res, '操作失败'); }
};
