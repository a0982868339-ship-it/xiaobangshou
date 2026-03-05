const BaseOrderStrategy = require('./BaseOrderStrategy');

/**
 * 陪护陪诊策略 (核心逻辑：就诊人档案)
 */
class MedicalOrderStrategy extends BaseOrderStrategy {
  async validate(data, service) {
    if (!data.patientProfileId) {
      throw new Error('请选择就诊人信息');
    }

    const moment = require('moment');
    const serviceTime = moment(data.serviceTime);
    const now = moment();
    const serviceId = parseInt(data.serviceId);

    // 2. 垂直业务专项：预约时序控制

    // 半天陪诊 (ID 16)
    if (serviceId === 16) {
      const hour = serviceTime.hour();
      // 如果是上午场 (定义为 12:00 以前开始)
      if (hour < 12) {
        const preDay22 = serviceTime.clone().subtract(1, 'days').hour(22).minute(0).second(0);
        if (now.isAfter(preDay22)) {
          throw new Error('抱歉，上午场次需提前一天 22:00 前预约。');
        }
      }
    }

    // 全天陪诊 (ID 17)
    if (serviceId === 17) {
      // 禁止预约“当天”服务
      if (serviceTime.isSame(now, 'day')) {
        throw new Error('全天服务需提前一天预约，请选择明天或之后的日期。');
      }
    }

    // 单纯代办 (ID 18)
    if (serviceId === 18) {
      // 以“12:00”为当日截止线
      if (now.hour() >= 12 && serviceTime.isSame(now, 'day')) {
        throw new Error('今日代办预约已截止，请选择明天或之后的日期。');
      }
    }

    return true;
  }

  async afterCreate(orderId, data, connection) {
    // 自动拉取档案中的患者信息同步到扩展表，保留原始业务快照逻辑
    const [profiles] = await connection.query('SELECT * FROM patient_profiles WHERE id = ?', [data.patientProfileId]);
    const p = profiles[0] || {};

    await connection.query(
      `INSERT INTO order_ext_medical (
        order_id, hospital_name, patient_profile_id, medical_notes, medical_advice_text
      ) VALUES (?, ?, ?, ?, ?)`,
      [orderId, data.hospitalName, data.patientProfileId, data.medicalNotes || null, null]
    );
  }

  async extendDetail(order, connection) {
    const [ext] = await connection.query('SELECT * FROM order_ext_medical WHERE order_id = ?', [order.id]);
    return { ...order, ...ext[0] };
  }

  /**
   * 更新额外资料
   */
  async updateExtra(orderId, params, connection) {
    const {
      medicalNotes, medicalAdviceText, medicalAdviceImages,
      billImages, medicationReminderText, medicationReminderImages
    } = params;

    const extMedFields = [];
    const extMedParams = [];
    if (medicalNotes !== undefined) { extMedFields.push('medical_notes = ?'); extMedParams.push(medicalNotes); }
    if (medicalAdviceText !== undefined) { extMedFields.push('medical_advice_text = ?'); extMedParams.push(medicalAdviceText); }
    if (medicalAdviceImages !== undefined) { extMedFields.push('medical_advice_images = ?'); extMedParams.push(JSON.stringify(medicalAdviceImages)); }
    if (billImages !== undefined) { extMedFields.push('bill_images = ?'); extMedParams.push(JSON.stringify(billImages)); }
    if (medicationReminderText !== undefined) { extMedFields.push('medication_reminder_text = ?'); extMedParams.push(medicationReminderText); }
    if (medicationReminderImages !== undefined) { extMedFields.push('medication_reminder_images = ?'); extMedParams.push(JSON.stringify(medicationReminderImages)); }

    if (extMedFields.length > 0) {
      await connection.query(`UPDATE order_ext_medical SET ${extMedFields.join(', ')} WHERE order_id = ?`, [...extMedParams, orderId]);
    }
  }
}

module.exports = new MedicalOrderStrategy();
