const { body } = require('express-validator');
const moment = require('moment');

/**
 * 订单创建验证中间件
 * 严格遵循 API 契约
 */
const validateCreateOrder = [
  body('serviceId').isInt().withMessage('无效的服务ID'),
  body('serviceTime').custom((value, { req }) => {
    const serviceTime = moment(value);
    const now = moment();
    if (!serviceTime.isValid()) throw new Error('预约时间格式错误');

    // 1. 全业务通用：起订缓冲期 (Buffer Time)
    // 所有订单必须满足 当前时间 + 4小时 的硬性起订间隔
    const minBufferTime = now.clone().add(4, 'hours');
    if (serviceTime.isBefore(minBufferTime)) {
      throw new Error('师傅出发需要准备，请至少提前 4 小时预约服务。');
    }

    // 2. 宠物专项防线：严禁预约“当日”订单 (ID 36, 37)
    const serviceId = parseInt(req.body.serviceId);
    if ([36, 37].includes(serviceId)) {
      if (serviceTime.isSame(now, 'day')) {
        throw new Error('为了保障服务质量，宠物服务请至少提前一天预约。');
      }
    }

    return true;
  }),
  body('addressId').custom((value, { req }) => {
    const parseOptions = (v) => {
      if (!v) return {};
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch (e) { return {}; }
    };
    const options = parseOptions(req.body.serviceOptions);
    const isNursingVisit = (options.nursingHomeName || options.elderName || options.visitFocus || options.visitPackage);

    if (isNursingVisit) {
      if (!value || isNaN(parseInt(value))) {
        throw new Error('请选择服务地址');
      }
      return true;
    }
    // 核心差异：陪诊/代办业务由于涉及医院场景，不需要强制关联用户家庭地址
    // 判定逻辑：传了医院名称或就诊人姓名，视为医疗专项，addressId 可选
    if ((req.body.hospitalName || req.body.patientName) && !value) {
      return true;
    }
    if (!value || isNaN(parseInt(value))) {
      throw new Error('请选择服务地址');
    }
    return true;
  }),
  body('totalPrice').custom((value) => {
    // 强制要求最多两位小数，防止金融精度攻击 (如 10.55555)
    if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
      throw new Error('金额格式不正确 (最多两位小数)');
    }
    return true;
  }),
  body('city').isIn(['三亚市', '哈尔滨市']).withMessage('当前城市暂未开通服务'),
  body('serviceLatitude').optional({ nullable: true }).isFloat(),
  body('serviceLongitude').optional({ nullable: true }).isFloat(),
  
  // 周期订单校验
  body('orderType').optional().isIn([0, 1]),
  body('serviceDays').optional().isArray().custom((value, { req }) => {
    if (req.body.orderType === 1 && (!value || value.length === 0)) {
      throw new Error('周期订单必须选择服务日期');
    }
    return true;
  }),
  // 数组内容的原子校验：防止非法字符串注入，确保每一项都是合法的日期时间格式
  body('serviceDays.*').custom((value) => {
    if (!moment(value, 'YYYY-MM-DD HH:mm', true).isValid()) {
      throw new Error('非法的服务日期格式 (需为 YYYY-MM-DD HH:mm)');
    }
    return true;
  }),

  // 陪诊订单专项校验
  body('patientProfileId').optional({ nullable: true }).isInt(),
  body('patientName').optional().isString().trim(),
  body('hospitalName').optional().isString().trim(),
  body('patientGender').optional().isInt({ min: 0, max: 2 }),
  body('patientAge').optional().isInt({ min: 0, max: 120 }),
  body('patientTags').optional().isArray(),
  body('medicalNotes').optional().isString().trim(),
  
  // 业务规格字段校验 (SSOT 闭环)
  body('serviceOptions').optional().isString(),
  body('serviceOptions').custom((value) => {
    if (!value) return true;
    let options = {};
    try { options = typeof value === 'string' ? JSON.parse(value) : (value || {}); } catch (e) { options = {}; }
    const isNursingVisit = (options.nursingHomeName || options.elderName || options.visitFocus || options.visitPackage);
    if (!isNursingVisit) return true;
    if (!options.nursingHomeName || !options.elderName || !options.relation) {
      throw new Error('请填写养老院名称、老人姓名与关系');
    }
    return true;
  }),
  body('dishDetails').optional().isString(),
  body('needShopping').optional().isBoolean(),
  body('depositAmount').optional().isFloat({ min: 0 }),
  body('providerId').optional({ nullable: true }).isInt(),
  body('assignmentType').optional().isIn([1, 2])
];

module.exports = {
  validateCreateOrder
};
