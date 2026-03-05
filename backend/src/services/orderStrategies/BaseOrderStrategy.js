/**
 * 订单业务策略基类
 */
class BaseOrderStrategy {
  /**
   * 业务特定校验
   */
  async validate(data, service) {
    return true;
  }

  /**
   * 业务特定价格计算 (在基础价和规格价之上的额外逻辑)
   */
  async calculateExtraPrice(data, service, options) {
    return 0;
  }

  /**
   * 专项扩展表写入
   */
  async afterCreate(orderId, data, connection) {
    // 由子类实现
  }

  /**
   * 详情数据组装
   */
  async extendDetail(order, connection) {
    return order;
  }
}

module.exports = BaseOrderStrategy;
