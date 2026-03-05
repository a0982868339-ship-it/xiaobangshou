const BaseOrderStrategy = require('./BaseOrderStrategy');

/**
 * 宠物特护策略 (核心逻辑：周期、轨迹与性格标签)
 */
class PetOrderStrategy extends BaseOrderStrategy {
  async calculateExtraPrice(data, service, options) {
    let extra = 0;

    // 注意：这里的额外计费逻辑仅处理不在 service.price_config 中的特殊字段。
    // 如果计费项（如“增加一只猫”）已经存在于 price_config 中，PricingEngine 会自动处理，
    // 这里不应重复计算，否则会导致订单金额翻倍。

    if (service?.name?.includes('遛狗')) {
      // 1. 狗狗数量加价 (这些标签通常不在规格项中，或作为业务逻辑单独计算)
      const extraLargeDogs = options['加一只大型犬'] || 0;
      extra += extraLargeDogs * 30;

      const extraSmallDogs = options['加一只中小型犬'] || 0;
      extra += extraSmallDogs * 15;

      // 2. 牵引绳加收 (不在 price_config 中)
      if (data.ownLeash === false || data.ownLeash === 'false' || options.ownLeash === false) {
        extra += 5;
      }

      // 3. 默认体型为大型犬的加收逻辑
      if (data.dogSize === '大型犬(25kg以上)' || options.dogSize === '大型犬(25kg以上)') {
        extra += 15;
      }
    }

    // 针对“猫咪上门喂养”：
    // “增加一只猫”已经存在于数据库的 price_config 中，
    // PricingEngine 会自动根据 options['增加一只猫'] * price 进行计算，
    // 因此这里不需要再手动累加，否则会出现 40 -> 45 或 45 -> 55 的翻倍报错。

    return extra;
  }

  async afterCreate(orderId, data, connection) {
    const serviceId = parseInt(data.serviceId);

    // 核心修复：从 serviceOptions 中解析出真正的结构化数据
    // 因为前端将所有专项数据都封装在 serviceOptions 这个 JSON 字符串中了
    const options = typeof data.serviceOptions === 'string' ? JSON.parse(data.serviceOptions) : (data.serviceOptions || {});

    const petProfile = {
      dogSize: options.dogSize || data.dogSize,
      personalityTags: options.personalityTags || data.personalityTags || [],
      healthStatus: options.healthStatus || data.healthStatus,
      keyHandover: options.keyHandover || data.keyHandover,
      specialInstructions: options.specialInstructions || data.specialInstructions || [],
      hasCamera: options.hasCamera !== undefined ? options.hasCamera : data.hasCamera,
      needTrash: options.needTrash !== undefined ? options.needTrash : data.needTrash,
      catCount: options.catCount || data.catCount || 1
    };

    // 存入 orders 表的 remark 字段 (由于 order_ext_pet 暂无 remark 字段，借用主表)
    // 核心修复：由于数据库 orders 表缺少 service_options 字段，我们将结构化数据统一存入 remark 字段
    // 增加日志，确保数据写入前结构正确
    console.log('>> [PetStrategy] Saving Pet Profile to Remark:', JSON.stringify(petProfile));
    await connection.query('UPDATE orders SET remark = ? WHERE id = ?', [JSON.stringify(petProfile), orderId]);

    // 2. 专项详情表写入
    await connection.query(
      'INSERT INTO order_ext_pet (order_id, service_frequency, service_track) VALUES (?, ?, ?)',
      [
        orderId,
        data.orderType === 1 ? '定期' : '单次',
        serviceId === 36 ? '[]' : null // 遛狗单预留轨迹字段
      ]
    );
  }

  async extendDetail(order, connection) {
    // 修复：遛狗相关字段 (is_walking, walking_start_at, live_track 等) 在 orders 表中
    // 从 orders 表获取遛狗状态，从 order_ext_pet 获取其他扩展信息
    const [ext] = await connection.query(`SELECT * FROM order_ext_pet WHERE order_id = ?`, [order.id]);
    const [main] = await connection.query(`
      SELECT remark, is_walking, walking_start_at, walking_duration, live_track, service_track,
             IF(is_walking = 1, TIMESTAMPDIFF(SECOND, walking_start_at, NOW()), walking_duration) as current_walking_duration 
      FROM orders WHERE id = ?`, [order.id]);

    // 合并扩展表数据和主表数据（遛狗相关字段在主表）
    const merged = { ...order, ...ext[0], ...main[0] };
    const actualRemark = main[0]?.remark || merged.remark;

    // 1. 标签还原：强制从最新的 remark 字段解析，确保详情接口数据闭环
    if (actualRemark && actualRemark.includes('{')) {
      try {
        merged.pet_info = JSON.parse(actualRemark);
      } catch (e) {
        merged.pet_info = null;
      }
    }

    // 2. 兼容性补全：将 completion_tags 和 proof_images 映射到前端期望的字段
    // 确保在 ResultDashboard.vue 中 tags 和 images 能正确获取
    // 增加对 JSON 字符串的兼容解析
    const parseTags = (tags) => {
      if (!tags) return [];
      if (typeof tags === 'string') {
        try { return JSON.parse(tags); } catch (e) { return []; }
      }
      return Array.isArray(tags) ? tags : [];
    };

    const cTags = parseTags(merged.completion_tags);
    if (cTags.length > 0 && (!merged.report_tags || merged.report_tags.length === 0)) {
      merged.report_tags = cTags;
    }
    
    const pImages = parseTags(merged.proof_images);
    if (pImages.length > 0 && (!merged.report_images || merged.report_images.length === 0)) {
      merged.report_images = pImages;
    }

    return merged;
  }

  /**
   * 更新额外资料
   */
  async updateExtra(orderId, params, connection) {
    const { serviceTrack } = params;
    if (serviceTrack !== undefined) {
      await connection.query('UPDATE order_ext_pet SET service_track = ? WHERE order_id = ?', [JSON.stringify(serviceTrack), orderId]);
    }
  }
}

module.exports = new PetOrderStrategy();
