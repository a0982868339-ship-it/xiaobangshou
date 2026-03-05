const db = require('../config/database');
const walletController = require('../controllers/walletController');

/**
 * 核心财务清算引擎：处理所有已到期的自动结算订单
 * 建议运行频率：每小时运行一次
 */
const runAutoClearing = async () => {
  console.log(`[${new Date().toLocaleString()}] 🚀 启动全自动财务清算引擎...`);
  
  const connection = await db.getConnection();
  try {
    // 1. 扫描所有【已完成(3)】或【已评价(5)】且【已到期】且【未结算】的订单
    const [pendingOrders] = await connection.query(`
      SELECT id, order_no FROM orders 
      WHERE status IN (3, 5) 
      AND settlement_status = 0 
      AND (settle_at <= NOW() OR settle_at IS NULL)
    `);

    if (pendingOrders.length === 0) {
      console.log('>> 暂无到期订单需结算。');
      return;
    }

    console.log(`>> 发现 ${pendingOrders.length} 笔到期订单，正在执行原子级拨付...`);

    // 2. 逐笔执行结算 (使用之前已实现的 manualSettleOrder 逻辑)
    for (const order of pendingOrders) {
      try {
        // 这里的 manualSettleOrder 内部已包含事务，非常安全
        await walletController.manualSettleOrder({ params: { id: order.id } }, { 
          // 模拟 res 对象
          status: () => ({ json: () => {} }),
          send: () => {} 
        });
        console.log(`✓ 订单 ${order.order_no} 自动结算完成`);
      } catch (err) {
        console.error(`✗ 订单 ${order.order_no} 结算失败:`, err.message);
      }
    }

    console.log('>> 全自动清算任务结束。');
  } catch (error) {
    console.error('!! 结算引擎崩溃:', error);
  } finally {
    connection.release();
  }
};

module.exports = runAutoClearing;
