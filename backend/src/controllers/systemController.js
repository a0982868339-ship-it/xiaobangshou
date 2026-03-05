const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const imUtils = require('../utils/im');

/**
 * 获取管理后台大屏全量统计数据 (融资级增强版)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. 用户维度深度统计
    const [userStats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM users WHERE user_type = 2) as totalProviders,
        (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) as todayNewUsers,
        (SELECT COUNT(*) FROM users WHERE last_login_time >= NOW() - INTERVAL 1 DAY) as activeUsers24h
    `);

    // 2. 交易维度深度统计
    const [orderStats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders) as totalOrders,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) as todayOrders,
        (SELECT COUNT(*) FROM orders WHERE status = 0) as pendingOrders,
        (SELECT IFNULL(SUM(total_price), 0) FROM orders WHERE pay_status = 1) as totalGMV,
        (SELECT IFNULL(SUM(total_price), 0) FROM orders WHERE pay_status = 1 AND DATE(created_at) = CURDATE()) as todayGMV
    `);

    // 3. 服务品类分布 (从关联表实时计算)
    const [categoryStats] = await db.query(`
      SELECT 
        c.name as name, 
        COUNT(o.id) as value,
        SUM(o.total_price) as amount
      FROM orders o
      JOIN services s ON o.service_id = s.id
      JOIN service_categories c ON s.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY value DESC
    `);

    // 4. 最近 7 天趋势 (增长曲线数据)
    const [trendStats] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%m-%d') as date,
        COUNT(*) as orderCount,
        SUM(total_price) as dailyGMV
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE_FORMAT(created_at, '%m-%d')
      ORDER BY date ASC
    `);

    // 5. 实时系统负载与原子级连接状态 (真正的实时状态)
    const os = require('os');
    const [realTimeStats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM providers WHERE status = 1) as onlineProviders,
        (SELECT COUNT(*) FROM orders WHERE status IN (1, 2)) as activeOrders,
        (SELECT COUNT(*) FROM wallet_records WHERE DATE(created_at) = CURDATE() AND type = 4 AND status = 0) as pendingWithdrawals
    `);

    sendSuccess(res, {
      users: userStats[0],
      orders: orderStats[0],
      categories: categoryStats,
      trend: trendStats,
      system: {
        onlineProviders: realTimeStats[0].onlineProviders,
        activeOrders: realTimeStats[0].activeOrders,
        pendingWithdrawals: realTimeStats[0].pendingWithdrawals,
        memoryUsage: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + 'MB',
        uptime: Math.floor(process.uptime()),
        cpuLoad: (os.loadavg()[0]).toFixed(2)
      }
    });
  } catch (error) {
    logger.error('获取大屏统计失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 获取 IM 聊天签名
 */
exports.getIMSig = async (req, res) => {
  try {
    const userId = req.user.id;
    const userSig = await imUtils.generateUserSig(userId);
    const IM_CONFIG = await imUtils.getIMConfig();
    sendSuccess(res, { userSig, sdkAppID: IM_CONFIG.SDKAppID, userId: userId.toString() });
  } catch (error) { sendError(res, '生成聊天签名失败'); }
};

/**
 * 帮助中心列表
 */
exports.getArticles = async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT id, title, category, created_at FROM articles WHERE status = 1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY sort DESC, created_at DESC';
    const [list] = await db.query(sql, params);
    sendSuccess(res, list);
  } catch (error) { sendError(res, '获取文章失败'); }
};

/**
 * 文章详情
 */
exports.getArticleDetail = async (req, res) => {
  try {
    const [articles] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (articles.length === 0) return sendError(res, '文章不存在', 404);
    sendSuccess(res, articles[0]);
  } catch (error) { sendError(res, '获取详情失败'); }
};

/**
 * 提交反馈
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { type, content, contact } = req.body;
    const userId = req.user.id;
    await db.query('INSERT INTO feedbacks (user_id, type, content, contact) VALUES (?, ?, ?, ?)', [userId, type, content, contact]);
    sendSuccess(res, null, '反馈提交成功');
  } catch (error) { sendError(res, '提交失败'); }
};

/**
 * 获取我的反馈/工单列表
 */
exports.getMyFeedbacks = async (req, res) => {
  try {
    const userId = req.user.id;
    const [list] = await db.query(
      'SELECT id, title, category, content, status, reply, created_at FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    // 处理工单号逻辑：WO + ID (补足6位)
    const processedList = list.map(item => ({
      ...item,
      order_no: `WO${item.id.toString().padStart(6, '0')}`
    }));
    sendSuccess(res, processedList);
  } catch (error) {
    sendError(res, '获取工单列表失败');
  }
};

/**
 * 检查更新
 */
exports.checkUpdate = async (req, res) => {
  try {
    const { platform = 'h5' } = req.query;
    const [versions] = await db.query('SELECT * FROM app_versions WHERE platform = ? ORDER BY id DESC LIMIT 1', [platform]);
    sendSuccess(res, versions[0] || null);
  } catch (error) { sendError(res, '检查更新失败'); }
};

/**
 * 管理员：获取反馈列表 (升级为工单展示)
 */
exports.getAdminFeedbacks = async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    let sql = `
      SELECT f.*, u.phone, u.nickname, a.real_name as admin_name 
      FROM feedbacks f 
      JOIN users u ON f.user_id = u.id 
      LEFT JOIN admin_users a ON f.admin_id = a.id 
      WHERE 1=1
    `;
    const params = [];
    if (status !== undefined && status !== '') { sql += ' AND f.status = ?'; params.push(status); }
    if (priority) { sql += ' AND f.priority = ?'; params.push(priority); }
    if (category) { sql += ' AND f.category = ?'; params.push(category); }
    
    sql += ' ORDER BY f.priority DESC, f.created_at DESC';
    const [list] = await db.query(sql, params);
    sendSuccess(res, list);
  } catch (error) { sendError(res, '获取工单失败'); }
};

/**
 * 管理员：接单/指派工单
 */
exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    await db.query('UPDATE feedbacks SET admin_id = ?, status = 1 WHERE id = ?', [adminId, id]);
    
    // 记录日志
    await db.query('INSERT INTO ticket_logs (ticket_id, operator_id, operator_name, action_type, content) VALUES (?, ?, ?, ?, ?)', 
      [id, adminId, req.user.realName || req.user.nickname, 'ASSIGN', '管理员接手处理工单']);
      
    sendSuccess(res, null, '已接手该工单');
  } catch (error) { sendError(res, '操作失败'); }
};

/**
 * 管理员：回复并解决工单
 */
exports.replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply, status = 2 } = req.body; // 2-已解决, 3-已关闭
    const adminId = req.user.id;
    
    await db.query('UPDATE feedbacks SET reply = ?, status = ?, updated_at = NOW(), closed_at = ? WHERE id = ?', 
      [reply, status, status === 3 ? new Date() : null, id]);
    
    // 记录日志
    await db.query('INSERT INTO ticket_logs (ticket_id, operator_id, operator_name, action_type, content) VALUES (?, ?, ?, ?, ?)', 
      [id, adminId, req.user.realName || req.user.nickname, 'REPLY', `答复内容: ${reply}`]);
      
    sendSuccess(res, null, '答复已提交');
  } catch (error) { sendError(res, '回复失败'); }
};

/**
 * 获取工单流转日志
 */
exports.getTicketLogs = async (req, res) => {
  try {
    const [list] = await db.query('SELECT * FROM ticket_logs WHERE ticket_id = ? ORDER BY created_at DESC', [req.params.id]);
    sendSuccess(res, list);
  } catch (error) { sendError(res, '获取日志失败'); }
};

/**
 * 管理员：文章管理
 */
exports.adminCreateArticle = async (req, res) => {
  try {
    const { title, content, category, sort } = req.body;
    await db.query('INSERT INTO articles (title, content, category, sort) VALUES (?, ?, ?, ?)', [title, content, category, sort]);
    sendSuccess(res, null, '发布成功');
  } catch (error) { sendError(res, '发布失败'); }
};

exports.adminUpdateArticle = async (req, res) => {
  try {
    const { title, content, category, sort, status } = req.body;
    await db.query('UPDATE articles SET title=?, content=?, category=?, sort=?, status=? WHERE id=?', [title, content, category, sort, status, req.params.id]);
    sendSuccess(res, null, '更新成功');
  } catch (error) { sendError(res, '更新失败'); }
};

/**
 * 管理员：获取所有系统配置
 */
exports.getAllConfigs = async (req, res) => {
  try {
    const [list] = await db.query('SELECT * FROM system_configs');
    sendSuccess(res, list);
  } catch (error) {
    sendError(res, '获取配置失败');
  }
};

/**
 * 管理员：更新或保存系统配置
 */
exports.updateConfig = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key) return sendError(res, '键名不能为空');

    await db.query(
      'INSERT INTO system_configs (config_key, config_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_value = ?, description = ?',
      [key, value, description, value, description]
    );
    
    sendSuccess(res, null, '系统策略已同步生效');
  } catch (error) {
    logger.error('更新配置失败:', error);
    sendError(res, '保存失败');
  }
};

/**
 * 公开/通用：按键获取配置
 */
exports.getConfigByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const [rows] = await db.query('SELECT config_value FROM system_configs WHERE config_key = ?', [key]);
    sendSuccess(res, rows[0] || null);
  } catch (error) {
    sendError(res, '获取失败');
  }
};

/**
 * 获取公开配置集合 (AMAP_KEY_WEB 等)
 */
exports.getPublicConfigs = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT config_key, config_value FROM system_configs WHERE config_key IN ("AMAP_KEY_WEB", "AMAP_SECRET_WEB", "AMAP_FALCON_SID", "INGREDIENT_BUYING_FEE_PER_DISH")');
    const configs = {};
    rows.forEach(row => {
      configs[row.config_key] = row.config_value;
    });
    sendSuccess(res, configs);
  } catch (error) {
    logger.error('获取公开配置失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 获取行政区划中心点坐标 (大厂级：带自动抓取与持久化缓存逻辑)
 */
exports.getAreaCenter = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return sendError(res, '名称不能为空');
    
    // 1. 首先尝试从本地数据库读取
    const [rows] = await db.query(
      'SELECT lng, lat FROM area_centers WHERE name = ? OR name LIKE ? LIMIT 1',
      [name, `%${name}%`]
    );
    
    if (rows.length > 0) {
      return sendSuccess(res, rows[0]);
    }

    // 2. 如果本地没有，则调用高德服务端接口进行“学习”
    console.log(`>> [GeoLearning] 正在自动学习新区域坐标: ${name}`);
    const configLoader = require('../utils/config');
    const serverKey = await configLoader.get('AMAP_KEY_SERVER');
    
    if (!serverKey) {
      // 如果没配 Key，返回兜底北京坐标
      return sendSuccess(res, { lng: 116.407526, lat: 39.90403 });
    }

    const axios = require('axios');
    const geoRes = await axios.get('https://restapi.amap.com/v3/geocode/geo', {
      params: { address: name, key: serverKey },
      timeout: 3000 // 增加 3s 超时，防止阻塞
    });

    if (geoRes.data.status === '1' && geoRes.data.geocodes.length > 0) {
      const location = geoRes.data.geocodes[0].location.split(',');
      const lng = parseFloat(location[0]);
      const lat = parseFloat(location[1]);

      // 3. 将学习到的坐标沉淀到数据库，下次直接秒开
      await db.query(
        'INSERT IGNORE INTO area_centers (name, lng, lat, level) VALUES (?, ?, ?, ?)',
        [name, lng, lat, name.endsWith('区') ? 3 : 2]
      );

      sendSuccess(res, { lng, lat });
    } else {
      sendSuccess(res, { lng: 116.407526, lat: 39.90403 });
    }
  } catch (error) {
    logger.error('>> [GeoLearning] 自动抓取坐标失败:', error.message);
    sendSuccess(res, { lng: 116.407526, lat: 39.90403 });
  }
};

/**
 * 智能客服分发引擎 (高性能版)
 */
exports.getSupportAgent = async (req, res) => {
  try {
    // 开发模式特权
    if (process.env.NODE_ENV === 'development') {
      return sendSuccess(res, { agentId: '3', agentName: '客服小美' });
    }

    // 1. 获取在线客服列表 (通过查询数据库中特定角色的账号)
    // 这里的 SQL 执行很快，且频率比 IM 回调低得多，暂时不强制加缓存
    const [agents] = await db.query(
      "SELECT id, real_name FROM admin_users WHERE role IN ('support', 'operator', 'admin') AND status = 1"
    );

    if (agents.length === 0) {
      return sendSuccess(res, { agentId: '4', agentName: '系统客服' });
    }

    // 2. 简单的负载均衡：随机分配 (后续可升级为按接待量分配)
    const selectedAgent = agents[Math.floor(Math.random() * agents.length)];

    sendSuccess(res, {
      agentId: selectedAgent.id.toString(),
      agentName: selectedAgent.real_name
    });
  } catch (error) {
    sendError(res, '调度客服资源失败');
  }
};

/**
 * 获取行政区划列表
 */
exports.getRegions = async (req, res) => {
  try {
    const { parentCode, level, isOpen } = req.query;
    let sql = 'SELECT code, name, parent_code as parentCode, level, is_open as isOpen FROM sys_regions WHERE 1=1';
    const params = [];

    if (level) {
      sql += ' AND level = ?';
      params.push(level);
    }
    if (parentCode) {
      sql += ' AND parent_code = ?';
      params.push(parentCode);
    } else if (level === '1') {
      sql += ' AND parent_code IS NULL';
    }
    
    if (isOpen !== undefined) {
      sql += ' AND is_open = ?';
      params.push(isOpen === 'true' || isOpen === '1' ? 1 : 0);
    }

    sql += ' ORDER BY sort DESC, code ASC';
    const [list] = await db.query(sql, params);
    sendSuccess(res, list);
  } catch (error) {
    logger.error('获取行政区划失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 获取树状行政区划 (通常用于前端级联选择器)
 */
exports.getRegionTree = async (req, res) => {
  try {
    // 建议增加缓存，因为这部分数据几乎不怎么变
    const [rows] = await db.query('SELECT code, name, parent_code as parentCode, level FROM sys_regions ORDER BY level ASC, sort DESC, code ASC');
    
    const tree = [];
    const map = {};

    rows.forEach(row => {
      const node = { ...row, children: [] };
      map[row.code] = node;
      if (row.level === 1) {
        tree.push(node);
      } else {
        const parent = map[row.parentCode];
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    sendSuccess(res, tree);
  } catch (error) {
    logger.error('获取行政区划树失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 管理员：获取行政区划列表 (带真分页和搜索)
 */
exports.getAdminRegions = async (req, res) => {
  try {
    const { parentCode, level, name, isOpen, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let whereSql = ' WHERE 1=1';
    const params = [];

    if (level) {
      whereSql += ' AND level = ?';
      params.push(level);
    }
    if (parentCode) {
      whereSql += ' AND parent_code = ?';
      params.push(parentCode);
    }
    if (name) {
      whereSql += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }
    if (isOpen !== undefined && isOpen !== '') {
      whereSql += ' AND is_open = ?';
      params.push(isOpen === 'true' || isOpen === '1' ? 1 : 0);
    }

    // 1. 获取总数
    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM sys_regions ${whereSql}`, params);
    const total = countRows[0].total;

    // 2. 获取分页数据
    let dataSql = `SELECT * FROM sys_regions ${whereSql} ORDER BY level ASC, sort DESC, code ASC LIMIT ? OFFSET ?`;
    const [list] = await db.query(dataSql, [...params, limit, offset]);

    sendSuccess(res, {
      list,
      total,
      page: parseInt(page),
      pageSize: limit
    });
  } catch (error) {
    logger.error('管理员获取区域失败:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 管理员：切换区域开通状态
 */
exports.toggleRegionStatus = async (req, res) => {
  try {
    const { code } = req.params;
    const { isOpen, cascade = false } = req.body;
    
    // 1. 更新当前区域
    await db.query('UPDATE sys_regions SET is_open = ? WHERE code = ?', [isOpen ? 1 : 0, code]);
    
    // 2. 如果开启了级联更新，则同步更新所有下级
    if (cascade) {
      // 获取当前区域信息以确定层级
      const [current] = await db.query('SELECT code, level FROM sys_regions WHERE code = ?', [code]);
      if (current.length > 0) {
        const { code: currentCode, level } = current[0];
        let prefix = '';
        if (level === 1) prefix = currentCode.substring(0, 2);
        else if (level === 2) prefix = currentCode.substring(0, 4);

        if (prefix) {
          await db.query('UPDATE sys_regions SET is_open = ? WHERE code LIKE ?', [isOpen ? 1 : 0, `${prefix}%`]);
        }
      }
    }
    
    sendSuccess(res, null, cascade ? '区域及其下属区域状态已同步' : (isOpen ? '区域已开通' : '区域已关闭'));
  } catch (error) {
    logger.error('切换区域状态失败:', error);
    sendError(res, '操作失败');
  }
};

/**
 * 管理员：更新区域排序权重
 */
exports.updateRegionSort = async (req, res) => {
  try {
    const { code } = req.params;
    const { sort } = req.body;
    await db.query('UPDATE sys_regions SET sort = ? WHERE code = ?', [sort, code]);
    sendSuccess(res, null, '排序已更新');
  } catch (error) {
    sendError(res, '更新失败');
  }
};

exports.adminDeleteArticle = async (req, res) => {
  try {
    await db.query('DELETE FROM articles WHERE id=?', [req.params.id]);
    sendSuccess(res, null, '删除成功');
  } catch (error) { sendError(res, '删除失败'); }
};
