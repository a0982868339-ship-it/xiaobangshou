const db = require('../config/database');
const configLoader = require('../utils/config');

/**
 * 核心订单治理引擎
 * 实现：处理超时未支付订单自动取消、超时自动完成等
 */
const runOrderEngine = async () => {
  console.log(`[${new Date().toLocaleString()}] ⚙️ 启动订单治理引擎...`);

  const connection = await db.getConnection();
  try {
    // 1. 获取动态配置：未支付订单自动取消时长
    const autoCancelMins = await configLoader.getNumber('ORDER_AUTO_CANCEL_MINUTES', 15);

    // 2. 扫描并取消超时未支付订单 (status=0 代表待接单，假设 0 同时也涵盖了未支付状态，或者根据 pay_status 判断)
    // 这里以 status=10 且创建时间超过配置时长的订单为例
    const [timeoutOrders] = await connection.query(`
      SELECT id, order_no FROM orders 
      WHERE status = 10 
      AND pay_status = 0
      AND created_at <= NOW() - INTERVAL ? MINUTE
    `, [autoCancelMins]);

    if (timeoutOrders.length > 0) {
      console.log(`>> 发现 ${timeoutOrders.length} 笔超时未支付订单，正在执行系统自动取消...`);
      for (const order of timeoutOrders) {
        await connection.query(
          'UPDATE orders SET status = 4, cancel_reason = "支付超时自动取消", cancel_by = 0 WHERE id = ?',
          [order.id]
        );
        console.log(`✓ 订单 ${order.order_no} 已自动取消`);
      }
    } else {
      console.log('>> 暂无超时订单需处理。');
    }

  } catch (error) {
    console.error('!! 订单引擎治理失败:', error.message);
  } finally {
    connection.release();
  }
};

module.exports = runOrderEngine;
