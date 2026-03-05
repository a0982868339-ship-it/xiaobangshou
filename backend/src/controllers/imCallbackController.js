const logger = require('../utils/logger');
const { sendSuccess } = require('../utils/response');
const db = require('../config/database');
const { emitToUser } = require('../utils/socket');

// --- 内存缓存：高性能白名单 ---
let agentCache = {
  ids: new Set(),
  lastUpdate: 0
};

/**
 * 刷新客服/管理员缓存（每分钟刷新一次）
 */
const refreshAgentCache = async () => {
  const now = Date.now();
  if (now - agentCache.lastUpdate < 60 * 1000 && agentCache.ids.size > 0) {
    return; // 缓存有效
  }

  try {
    const [agents] = await db.query(
      "SELECT id, username FROM admin_users WHERE role IN ('admin', 'support', 'operator', 'finance') AND status = 1"
    );
    const newIds = new Set();
    agents.forEach(a => {
      newIds.add(a.id.toString());
      newIds.add(a.username);
    });
    agentCache.ids = newIds;
    agentCache.lastUpdate = now;
    console.log(`[IM Cache] 客服白名单已刷新，共 ${agents.length} 位人员`);
  } catch (e) {
    logger.error('[IM Cache] 刷新失败:', e);
  }
};

/**
 * 腾讯云 IM 第三方回调：发消息前拦截 (高性能缓存版)
 */
exports.beforeSendMsg = async (req, res) => {
  const { MsgBody, From_Account, To_Account } = req.body;

  const textMsg = MsgBody.find(item => item.MsgType === 'TIMTextElem');
  if (!textMsg) {
    return res.json({ ActionStatus: 'OK', ErrorInfo: '', ErrorCode: 0 });
  }

  const content = textMsg.MsgContent.Text;

  // 1. 确保缓存是最新的
  await refreshAgentCache();

  // 2. 内存级匹配：如果是发给客服，直接放行 (O(1) 性能)
  if (agentCache.ids.has(To_Account.toString())) {
    return res.json({ ActionStatus: 'OK', ErrorInfo: '', ErrorCode: 0 });
  }

  // 3. 非客服消息，从数据库获取敏感词进行拦截
  // 注意：敏感词也可以做缓存优化，目前保持数据库查询以保证实时性
  const [bannedWords] = await db.query('SELECT word FROM banned_keywords WHERE risk_level >= 2');
  const wordList = bannedWords.map(b => b.word);

  const foundWord = wordList.find(word => content.includes(word));
  const PHONE_REGEX = /1[3-9]\d{9}/;
  const hasContactInfo = PHONE_REGEX.test(content);

  if (foundWord || hasContactInfo) {
    // 异步记录违规日志（不阻塞主流程）
    db.query('INSERT INTO audit_logs (user_id, content, reason) VALUES (?, ?, ?)',
      [From_Account, content, foundWord ? `匹配敏感词: ${foundWord}` : '包含联系方式']).catch(e => { });

    return res.json({
      ActionStatus: 'FAIL',
      ErrorInfo: '系统检测到敏感内容，禁止发送。',
      ErrorCode: 1
    });
  }

  res.json({ ActionStatus: 'OK', ErrorInfo: '', ErrorCode: 0 });
};

/**
 * 腾讯云 IM 第三方回调：消息送达后实时通知接收方
 */
exports.afterSendMsg = async (req, res) => {
  try {
    const { MsgBody, From_Account, To_Account, MsgSeq, MsgRandom, MsgTime } = req.body;

    // 1. 解析消息内容
    const textMsg = MsgBody.find(item => item.MsgType === 'TIMTextElem');
    const imageMsg = MsgBody.find(item => item.MsgType === 'TIMImageElem');

    let content = '[非文本消息]';
    let msgType = 'text';

    if (textMsg) {
      content = textMsg.MsgContent.Text;
      msgType = 'text';
    } else if (imageMsg) {
      content = '[图片]';
      msgType = 'image';
    }

    // 2. 获取发送者信息（用于前端显示）
    const [senderRows] = await db.query(
      'SELECT id, nickname, avatar FROM users WHERE id = ? OR CAST(id AS CHAR) = ?',
      [From_Account, From_Account]
    );
    const sender = senderRows[0] || {
      id: From_Account,
      nickname: '用户',
      avatar: ''
    };

    // 3. 存储到聊天消息表（离线消息支持）
    try {
      await db.query(`
        INSERT INTO chat_messages (from_user_id, to_user_id, content, msg_type, msg_seq, msg_time, is_read, status) 
        VALUES (?, ?, ?, ?, ?, ?, 0, 1)
      `, [From_Account, To_Account, content, msgType, MsgSeq, new Date(MsgTime * 1000)]);
    } catch (dbErr) {
      // 如果表不存在，仅记录日志，不阻断流程
      console.warn('[afterSendMsg] 消息存储失败（可能表未创建）:', dbErr.message);
    }

    // 4. 实时 Socket 推送给接收方
    emitToUser(To_Account, 'NEW_MESSAGE', {
      fromUserId: sender.id,
      fromNickname: sender.nickname,
      fromAvatar: sender.avatar,
      content: content,
      msgType: msgType,
      timestamp: MsgTime,
      messageId: `${MsgSeq}_${MsgRandom}`
    });

    // 5. 推送未读计数更新
    try {
      const [unreadResult] = await db.query(
        'SELECT COUNT(*) as count FROM chat_messages WHERE to_user_id = ? AND is_read = 0',
        [To_Account]
      );
      emitToUser(To_Account, 'UNREAD_COUNT_UPDATE', {
        count: unreadResult[0]?.count || 0
      });
    } catch (countErr) {
      console.warn('[afterSendMsg] 未读计数查询失败:', countErr.message);
    }

    console.log(`[IM] 消息推送成功: ${From_Account} -> ${To_Account}`);
    res.json({ ActionStatus: 'OK', ErrorCode: 0 });
  } catch (error) {
    logger.error('>> [afterSendMsg] Error:', error);
    // 即使发生错误也返回成功，不阻断 IM 消息流
    res.json({ ActionStatus: 'OK', ErrorCode: 0 });
  }
};
