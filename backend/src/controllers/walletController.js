const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const WalletService = require('../services/WalletService');
const NotificationService = require('../services/NotificationService');

/**
 * 获取钱包流水列表
 */
exports.getWalletRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, page = 1, pageSize = 20 } = req.query;

    let sql = 'SELECT * FROM wallet_records WHERE user_id = ?';
    const params = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;
    params.push(limit, offset);

    const [records] = await db.query(sql, params);
    sendSuccess(res, records);
  } catch (error) {
    sendError(res, '获取账单失败');
  }
};

/**
 * 模拟充值 (原子级)
 */
exports.recharge = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const result = await WalletService.recharge(userId, amount);
    sendSuccess(res, result, '充值成功');
  } catch (error) {
    logger.error('>> [Controller] recharge Error:', error);
    sendError(res, '充值失败: ' + error.message);
  }
};

/**
 * 发起提现申请 (原子级：直接扣除余额并冻结)
 */
exports.requestWithdraw = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await WalletService.requestWithdraw(userId, req.body);
    sendSuccess(res, result, '提现申请已提交，余额已转入冻结');
  } catch (error) {
    logger.error('>> [Controller] requestWithdraw Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 管理员：获取提现列表
 */
exports.getWithdrawalList = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT w.*, u.phone, u.nickname FROM withdrawals w JOIN users u ON w.user_id = u.id';
    const params = [];

    if (status !== undefined && status !== '') {
      sql += ' WHERE w.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY w.created_at DESC';
    const [list] = await db.query(sql, params);
    sendSuccess(res, list);
  } catch (error) {
    sendError(res, '获取列表失败');
  }
};

/**
 * 管理员：审核提现 (原子级：成功则结单，失败则退款)
 */
exports.reviewWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    await WalletService.reviewWithdrawal(id, status, remark);
    sendSuccess(res, null, status === 1 || status === '1' ? '提现审核通过，请手动转账' : '已驳回申请并退还金额');
  } catch (error) {
    logger.error('>> [Controller] reviewWithdrawal Error:', error);
    sendError(res, '处理失败: ' + error.message);
  }
};

/**
 * 管理员：切换订单结算锁定状态
 */
exports.toggleOrderSettlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 0-正常自动, 1-人工冻结

    await db.query(
      'UPDATE orders SET settlement_status = ? WHERE id = ?',
      [status, id]
    );

    sendSuccess(res, null, status === 1 ? '订单结算已冻结' : '已恢复自动结算');
  } catch (error) {
    sendError(res, '操作失败');
  }
};

/**
 * 管理员：手动结算订单
 */
exports.manualSettleOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await WalletService.manualSettleOrder(id);

    // 发送结算通知给服务者 (统一使用 NotificationService)
    await NotificationService.notify(result.providerUserId, 'WALLET_SETTLED', {
      serviceName: result.order.service_name,
      amount: result.providerIncome.toFixed(2)
    }, { targetId: id, targetUrl: '/earnings' });

    sendSuccess(res, null, '手动结算拨付成功');
  } catch (error) {
    logger.error('>> [Controller] manualSettleOrder Error:', error);
    sendError(res, '结算失败: ' + error.message);
  }
};

/**
 * 管理员：获取财务总览统计
 */
exports.getFinanceStats = async (req, res) => {
  try {
    // 1. 总流水、总收益（平台抽成）、待结算、已结算
    const [revenueStats] = await db.query(`
      SELECT 
        IFNULL(SUM(total_price), 0) as totalVolume,
        IFNULL(SUM(platform_fee), 0) as totalCommission,
        IFNULL(SUM(CASE WHEN pay_status = 1 THEN total_price ELSE 0 END), 0) as paidVolume
      FROM orders
    `);

    // 2. 提现统计
    const [withdrawalStats] = await db.query(`
      SELECT 
        IFNULL(SUM(CASE WHEN status = 0 THEN amount ELSE 0 END), 0) as pendingWithdrawal,
        IFNULL(SUM(CASE WHEN status = 1 THEN amount ELSE 0 END), 0) as completedWithdrawal
      FROM withdrawals
    `);

    // 3. 统计最近7天的收入趋势
    const [trendStats] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') as date,
        IFNULL(SUM(total_price), 0) as volume,
        IFNULL(SUM(platform_fee), 0) as commission
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    sendSuccess(res, {
      summary: {
        ...revenueStats[0],
        ...withdrawalStats[0],
        platformBalance: parseFloat(revenueStats[0].totalCommission) - parseFloat(withdrawalStats[0].completedWithdrawal) // 粗略估算平台留存
      },
      trend: trendStats
    });
  } catch (error) {
    logger.error('获取财务统计失败:', error);
    sendError(res, '获取财务统计失败');
  }
};
