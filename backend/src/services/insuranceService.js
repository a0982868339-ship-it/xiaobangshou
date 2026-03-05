/**
 * InsuranceService - 平台自动化投保服务
 * 对接外部保险接口，为高价值或特定类型订单提供安全保障
 */
class InsuranceService {
  /**
   * 为订单发起在线投保
   * @param {Object} order 订单信息 (主表数据)
   */
  static async createPolicy(order) {
    console.log(`>> [Insurance] 为订单 ${order.order_no} ({${order.service_name}}) 发起投保...`);

    try {
      // 真实环境下此处应调用外部 API
      // const res = await axios.post('...', { orderNo: order.order_no, amount: order.total_price });

      // 模拟投保逻辑
      const policyNo = 'POL' + Date.now() + Math.floor(Math.random() * 100);

      return {
        policyNo: policyNo,
        status: 'active',
        effectiveDate: new Date()
      };
    } catch (err) {
      console.error('>> [Insurance] 投保失败:', err.message);
      return {
        status: 'failed',
        error: err.message
      };
    }
  }

  /**
   * 获取保单信息 (模拟同步)
   */
  static async getPolicyInfo(policyNo) {
    if (!policyNo) return null;
    return {
      policyNo,
      provider: '平安家政责任险',
      coverage: '最高100,000元',
      status: '保障中'
    };
  }
}

module.exports = InsuranceService;
