/**
 * 订单全局常量定义 (SSOT)
 * 镜像对齐后端 backend/src/config/constants.js
 */

export const ORDER_STATUS = {
  WAIT_PAY: 10,
  WAIT_ACCEPT: 0,
  ACCEPTED: 1,
  ARRIVED: 11,
  IN_SERVICE: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  REVIEWED: 5,
  CANCEL_NEGOTIATING: 12
};

export const PAY_STATUS = {
  UNPAID: 0,
  PAID: 1,
  REFUNDED: 2
};

export const ORDER_TYPE = {
  NORMAL: 0,
  PERIODIC: 1
};

// 状态文本映射
export const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.WAIT_PAY]: '待支付',
  [ORDER_STATUS.WAIT_ACCEPT]: '待接单',
  [ORDER_STATUS.ACCEPTED]: '已接单',
  [ORDER_STATUS.ARRIVED]: '已到达',
  [ORDER_STATUS.IN_SERVICE]: '服务中',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REVIEWED]: '已评价'
};
