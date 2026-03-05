const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { ORDER_STATUS, ORDER_TYPE } = require('../config/constants');
const { matchedData } = require('express-validator');
const { orderTimeoutQueue } = require('../utils/queue');
const OrderService = require('../services/OrderService');
const OrderAdminService = require('../services/OrderAdminService');
const logger = require('../utils/logger');

// 导入业务策略
const homeStrategy = require('../services/orderStrategies/HomeOrderStrategy');
const petStrategy = require('../services/orderStrategies/PetOrderStrategy');
const medicalStrategy = require('../services/orderStrategies/MedicalOrderStrategy');
const BaseOrderStrategy = require('../services/orderStrategies/BaseOrderStrategy');
const baseStrategy = new BaseOrderStrategy();

const getStrategy = (serviceName, categoryName) => {
  if (categoryName?.includes('居家') || serviceName?.includes('做饭')) return homeStrategy;
  if (categoryName?.includes('宠物')) return petStrategy;
  if (categoryName?.includes('陪诊')) return medicalStrategy;
  if (categoryName?.includes('陪伴') || categoryName?.includes('陪护') || categoryName?.includes('养老') || serviceName?.includes('探访')) return baseStrategy;
  return null;
};

/**
 * 用户/服务者获取订单列表 (Service重构版)
 */
exports.getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await OrderService.getOrders(userId, req.query);

    // 兼容 ServiceResult 和普通返回值
    const orders = result?.data ? result.data : result;

    const maskedOrders = orders.map(o => {
      // 2. 标签还原 (Service 返回的数据已经过 PrivacyService 角色脱敏)
      if (o.category_name?.includes('宠物') || [36, 37].includes(o.service_id)) {
        try {
          o.pet_info = typeof o.remark === 'string' ? JSON.parse(o.remark) : null;
        } catch (e) {
          o.pet_info = null;
        }
      }
      return o;
    });

    sendSuccess(res, maskedOrders);
  } catch (error) {
    logger.error('>> [Controller] getOrders Error:', error);
    sendError(res, '获取订单失败');
  }
};

/**
 * 创建订单 (Service重构版)
 */
exports.createOrder = async (req, res) => {
  try {
    const data = matchedData(req);
    const userId = req.user.id;

    const result = await OrderService.createOrder(userId, {
      ...data,
      serviceOptions: req.body.serviceOptions
    });

    sendSuccess(res, result, '下单成功');
  } catch (error) {
    logger.error('>> [Controller] createOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 订单详情 (Service重构版)
 */
exports.getOrderDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const orderId = req.params.id;

    const result = await OrderService.getOrderDetail(orderId, userId, userRole);
    const order = result?.data ? result.data : result;

    sendSuccess(res, order);
  } catch (error) {
    logger.error('>> [Controller] getOrderDetail Error:', error);
    sendError(res, error.message || '获取详情失败');
  }
};

/**
 * 订单支付 (Service重构版)
 */
exports.payOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await OrderService.payOrder(userId, id);
    sendSuccess(res, null, '支付成功');
  } catch (error) {
    logger.error('>> [Controller] payOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 管理员获取所有订单 (含分页与多条件筛选)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await OrderAdminService.getAllOrders(req.query);
    sendSuccess(res, orders);
  } catch (error) {
    logger.error('[Controller] getAllOrders Error:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 确认满意并结算 (Service重构版)
 */
exports.confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 委托给 OrderService 处理状态变更与结算标记
    await OrderService.updateStatus(id, userId, 'user', ORDER_STATUS.COMPLETED, {
      confirmSatisfaction: true
    });

    sendSuccess(res, null, '确认成功，已进入结算流程');
  } catch (error) {
    logger.error('>> [Controller] confirmOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 评价订单 (Service重构版)
 */
exports.reviewOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await OrderService.reviewOrder(userId, id, req.body);
    sendSuccess(res, null, '评价成功');
  } catch (error) {
    logger.error('>> [Controller] reviewOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 申请争议 (Service重构版)
 */
exports.disputeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    await OrderService.disputeOrder(userId, id, reason);

    sendSuccess(res, null, '争议已提交，客服将介入处理');
  } catch (error) {
    logger.error('>> [Controller] disputeOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 获取服务地图 (LBS)
 */
exports.getServiceMap = async (req, res) => {
  try {
    const list = await OrderAdminService.getServiceMapData();
    sendSuccess(res, list);
  } catch (error) {
    logger.error('[Controller] getServiceMap Error:', error);
    sendError(res, '获取地图数据失败');
  }
};

/**
 * 删除订单 (Service重构版)
 */
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    await OrderService.deleteOrder(userId, id, status);

    sendSuccess(res, null, '操作成功');
  } catch (error) {
    logger.error('>> [Controller] deleteOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 取消订单 (支付前/抢单前) (Service重构版)
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await OrderService.cancelOrder(userId, id);
    sendSuccess(res, null, '订单已取消');
  } catch (error) {
    logger.error('>> [Controller] cancelOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 服务者抢单 (Service重构版)
 */
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await OrderService.acceptOrder(userId, id);
    sendSuccess(res, null, '抢单成功');
  } catch (error) {
    logger.error('>> [Controller] acceptOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 用户发起取消申请 (协商取消) (Service重构版)
 */
exports.requestCancel = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await OrderService.requestCancel(userId, id);

    sendSuccess(res, null, '取消申请已提交，请等待师傅确认');
  } catch (error) {
    logger.error('>> [Controller] requestCancel Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 服务者响应取消申请 (Service重构版)
 */
exports.handleCancelResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const userId = req.user.id;

    await OrderService.handleCancelResponse(userId, id, action);

    sendSuccess(res, null, '操作成功');
  } catch (error) {
    logger.error('>> [Controller] handleCancelResponse Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 服务者确认到达 (Service重构版)
 */
exports.arriveOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await OrderService.arriveOrder(userId, id);

    sendSuccess(res, null, '到达状态已记录');
  } catch (error) {
    logger.error('>> [Controller] arriveOrder Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 更新订单资料与状态 (Service重构版)
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status } = req.body;

    // 将复杂逻辑委托给 OrderService
    await OrderService.updateStatus(id, userId, 'provider', status, req.body);

    sendSuccess(res, null, '更新成功');
  } catch (error) {
    logger.error('>> [Controller] updateStatus Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 同步轨迹 (宠物特护专项)
 * 修复：遛狗相关字段 (is_walking, walking_start_at, live_track) 在 orders 表中，不在 order_ext_pet 表
 */
exports.syncTrack = async (req, res) => {
  try {
    const { id } = req.params;
    const { points, isWalking } = req.body;
    const [orderRows] = await db.query('SELECT service_name FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0 || (!orderRows[0].service_name.includes('遛狗') && !orderRows[0].service_name.includes('宠物'))) {
      return sendError(res, '该服务不支持轨迹同步', 403);
    }

    // 修复：更新 orders 表而不是 order_ext_pet 表
    let updateSql = 'UPDATE orders SET ';
    const params = [];
    const fields = [];

    if (points) { fields.push('live_track = ?'); params.push(JSON.stringify(points)); }
    if (isWalking !== undefined) {
      fields.push('is_walking = ?');
      params.push(isWalking ? 1 : 0);
      if (isWalking) fields.push('walking_start_at = IFNULL(walking_start_at, NOW())');
      else fields.push('walking_duration = TIMESTAMPDIFF(SECOND, walking_start_at, NOW())');
    }

    if (fields.length === 0) return sendSuccess(res, null, '无需更新');

    updateSql += fields.join(', ') + ' WHERE id = ?';
    params.push(id);

    await db.query(updateSql, params);
    // 修复：从 orders 表查询最新数据
    const [freshOrder] = await db.query('SELECT walking_start_at, TIMESTAMPDIFF(SECOND, walking_start_at, NOW()) as current_walking_duration FROM orders WHERE id = ?', [id]);
    sendSuccess(res, freshOrder[0], '轨迹同步成功');
  } catch (error) {
    logger.error('syncTrack Error:', error);
    sendError(res, '同步失败');
  }
};

/**
 * 更新周期单打卡状态 (Service重构版)
 */
exports.updateScheduleStatus = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { status, proofImages } = req.body;
    const userId = req.user.id;

    await OrderService.updateScheduleStatus(scheduleId, userId, status, proofImages);

    sendSuccess(res, null, '打卡成功');
  } catch (error) {
    logger.error('>> [Controller] updateScheduleStatus Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 更新订单备注 (Service重构版)
 */
exports.updateOrderRemark = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    await OrderService.updateOrderRemark(id, remark);
    sendSuccess(res, null, '备注更新成功');
  } catch (error) {
    logger.error('>> [Controller] updateOrderRemark Error:', error);
    sendError(res, error.message);
  }
};

/**
 * 获取聊天伙伴 ID
 */
exports.getChatPartner = async (req, res) => {
  try {
    const { role } = req.query;
    const userId = req.user.id;
    const rows = await OrderAdminService.getChatPartners(userId, role);
    sendSuccess(res, rows);
  } catch (error) {
    logger.error('[Controller] getChatPartner Error:', error);
    sendError(res, '获取失败');
  }
};

/**
 * 获取订单统计
 */
exports.getOrderStats = async (req, res) => {
  try {
    const { role } = req.query;
    const userId = req.user.id;
    const stats = await OrderAdminService.getOrderStats(userId, role);
    sendSuccess(res, stats);
  } catch (error) {
    logger.error('[Controller] getOrderStats Error:', error);
    sendError(res, '获取统计失败');
  }
};

/**
 * 获取服务者财务统计
 */
exports.getProviderFinance = async (req, res) => {
  try {
    const userId = req.user.id;
    const financeData = await OrderAdminService.getProviderFinance(userId);
    sendSuccess(res, financeData);
  } catch (error) {
    logger.error('[Controller] getProviderFinance Error:', error.message, error.stack);
    // 关键：将真实的报错信息通过接口透传出来，方便定位
    sendError(res, `财务统计异常: ${error.message}`);
  }
};

// --- API 协议兼容性别名 (确保不改变原有 API 协议) ---
exports.getActiveChatPartners = exports.getChatPartner;
exports.getProviderEarnings = exports.getProviderFinance;
exports.getOrdersMapData = exports.getServiceMap;
exports.getAllOrdersAdmin = exports.getAllOrders;
exports.updateDeleteStatus = exports.deleteOrder;
exports.arriveAtOrder = exports.arriveOrder;
exports.submitReview = exports.reviewOrder;
exports.updateServiceRecords = exports.updateStatus;
