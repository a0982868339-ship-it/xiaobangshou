const { Worker } = require('bullmq');
const db = require('../config/database');
const { connection } = require('../utils/queue');

/**
 * 通用通知处理 Worker
 */
const notificationWorker = new Worker('notification', async (job) => {
    const { userId, type, title, content, targetId, targetUrl } = job.data;
    console.log(`>> [Worker] Sending notification to User ${userId}: ${title}`);

    const conn = await db.getConnection();
    try {
        // 插入通知表
        await conn.query(
            'INSERT INTO notifications (user_id, type, title, content, target_id, target_url, is_broadcast) VALUES (?, ?, ?, ?, ?, ?, 0)',
            [userId, type || 'system', title, content, targetId || null, targetUrl || null]
        );

        // 备注：此处可扩展发送推送、邮件、短信等逻辑

        return { success: true };
    } catch (err) {
        console.error(`>> [Worker] Error sending notification to User ${userId}:`, err);
        throw err;
    } finally {
        conn.release();
    }
}, { connection });

module.exports = notificationWorker;
