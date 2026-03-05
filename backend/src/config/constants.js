/**
 * 订单全局常量定义 (SSOT)
 * 确保前后端状态码、类型定义镜像对齐
 */

const ORDER_STATUS = {
  WAIT_PAY: 10,      // 待支付 (下单初始状态)
  WAIT_ACCEPT: 0,    // 待接单 (支付成功后)
  ACCEPTED: 1,       // 已接单 (服务者已抢单)
  ARRIVED: 11,       // 已到达 (服务者点击到达)
  IN_SERVICE: 2,     // 服务中 (服务者点击开始)
  COMPLETED: 3,      // 已完成 (服务结束)
  CANCELLED: 4,      // 已取消
  REVIEWED: 5,        // 已评价
  CANCEL_NEGOTIATING: 12 // 协商取消中
};

const PAY_STATUS = {
  UNPAID: 0,
  PAID: 1,
  REFUNDED: 2
};

const ORDER_TYPE = {
  NORMAL: 0,    // 单次订单
  PERIODIC: 1   // 周期订单
};

module.exports = {
  ORDER_STATUS,
  PAY_STATUS,
  ORDER_TYPE
};
