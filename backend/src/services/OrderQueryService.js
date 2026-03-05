/**
 * OrderQueryService - 订单查询服务
 * 从 OrderService 拆分，专注于订单查询逻辑
 */
const { ORDER_STATUS } = require('../config/constants');
const OrderRepository = require('../repositories/OrderRepository');
const PrivacyService = require('./PrivacyService');
const ServiceResult = require('../utils/ServiceResult');
const ErrorCodes = require('../config/ErrorCodes');
const configLoader = require('../utils/config');
const db = require('../config/database');

class OrderQueryService {
    /**
     * 获取业务策略 (静态方法)
     */
    static getStrategy(serviceName, categoryName) {
        const homeStrategy = require('./orderStrategies/HomeOrderStrategy');
        const petStrategy = require('./orderStrategies/PetOrderStrategy');
        const medicalStrategy = require('./orderStrategies/MedicalOrderStrategy');
        const BaseOrderStrategy = require('./orderStrategies/BaseOrderStrategy');
        const baseStrategy = new BaseOrderStrategy();

        if (categoryName?.includes('居家') || serviceName?.includes('做饭')) return homeStrategy;
        if (categoryName?.includes('宠物')) return petStrategy;
        if (categoryName?.includes('陪诊')) return medicalStrategy;
        if (categoryName?.includes('陪伴') || categoryName?.includes('陪护') || categoryName?.includes('养老') || serviceName?.includes('探访')) return baseStrategy;
        return null;
    }

    /**
     * 获取订单列表 (含 LBS 与 脱敏逻辑)
     */
    static async getOrders(userId, query) {
        try {
            const { status, role, lat, lng, deleteStatus = 0 } = query;

            // A. 获取服务者信息 (如果有)
            let pRows = [];
            try {
                const [rows] = await db.query(`
                    SELECT p.id, p.lat, p.lng, p.max_service_radius, p.service_types, p.service_areas, p.credit_score, p.work_status, p.health_cert_status,
                           u.id_card_verified
                    FROM providers p 
                    JOIN users u ON p.user_id = u.id
                    WHERE p.user_id = ?
                `, [userId]);
                pRows = rows;
            } catch (e) {
                const [rows] = await db.query(`
                    SELECT p.id, p.service_types, p.service_areas, p.status as work_status,
                           u.id_card_verified
                    FROM providers p 
                    JOIN users u ON p.user_id = u.id
                    WHERE p.user_id = ?
                `, [userId]);
                pRows = rows;
            }
            const providerId = pRows?.length > 0 ? pRows[0].id : null;

            let orders = [];
            if (role === 'provider') {
                if (String(status) === String(ORDER_STATUS.WAIT_ACCEPT)) {
                    const geo = require('../utils/geo');
                    if (!providerId) return ServiceResult.success([]);

                    const pInfo = pRows[0];
                    const workStatus = pInfo.work_status ?? pInfo.status ?? 1;
                    const healthStatus = pInfo.health_cert_status ?? 1;
                    const creditScore = pInfo.credit_score ?? 100;
                    const maxServiceRadius = pInfo.max_service_radius ?? null;

                    // [核心防御升级] 如果未实名或未通过健康证审核，不返回任何待接订单
                    if (pInfo.id_card_verified !== 1 || healthStatus !== 1) {
                        return ServiceResult.success([]);
                    }

                    let serviceAreas = {};
                    if (typeof pInfo.service_areas === 'string') {
                        try {
                            serviceAreas = JSON.parse(pInfo.service_areas || '{}');
                        } catch (e) {
                            serviceAreas = {};
                        }
                    } else {
                        serviceAreas = pInfo.service_areas || {};
                    }

                    // [核心修复] 如果服务者处于休息状态 (work_status = 0)，不返回任何待接订单
                    if (workStatus === 0) {
                        return ServiceResult.success([]);
                    }

                    const currentLat = lat || pInfo.lat || null;
                    const currentLng = lng || pInfo.lng || null;

                    const globalRadius = await configLoader.getNumber('ORDER_SEARCH_RADIUS_KM', 10);
                    const searchRadius = maxServiceRadius || globalRadius;
                    const escortRadius = serviceAreas.maxEscortDistance || searchRadius; // 陪诊专项距离，默认取通用距离

                    let types = pInfo.service_types;
                    if (typeof types === 'string') {
                        try { types = JSON.parse(types); } catch (e) { types = []; }
                    }

                    let distSql = '0';
                    let hasGeo = currentLat !== null && currentLng !== null && currentLat !== undefined && currentLng !== undefined;
                    if (hasGeo) {
                        distSql = geo.getSqlDistance(currentLat, currentLng, 'service_latitude', 'service_longitude');
                    }

                    // 定义陪诊类目 ID 数组 (需与数据库 service_categories 表一致)
                    // 1-专业陪诊, 8-代办买药, 9-报告代取
                    const medicalCategoryIds = [1, 8, 9];

                    let sql = `
          SELECT o.*, s.category_id,
          IFNULL(${distSql}, 0) AS distance,
          ( (1 / (IFNULL(${distSql}, 0.1) + 1)) * 60 + (${creditScore} / 100) * 40 ) as smart_weight
          FROM orders o
          JOIN services s ON o.service_id = s.id
          WHERE o.status = ${ORDER_STATUS.WAIT_ACCEPT} AND o.pay_status = 1
        `;
                    const params = [];
                    sql += ' AND (o.provider_id IS NULL OR o.provider_id = ?) ';
                    params.push(providerId);

                    if (types && Array.isArray(types) && types.length > 0) {
                        sql += ' AND s.category_id IN (?) ';
                        params.push(types);
                    }

                    if (hasGeo) {
                        // 核心业务逻辑：双重距离过滤
                        // 1. 如果是陪诊订单 (category_id in medicalCategoryIds)，则使用 escortRadius (测量到医院距离)
                        // 2. 如果是常规订单，则使用 searchRadius (测量到服务地址距离)
                        sql += ` 
                            AND (
                                o.service_latitude IS NULL 
                                OR (s.category_id IN (?) AND ${distSql} <= ?)
                                OR (s.category_id NOT IN (?) AND ${distSql} <= ?)
                            ) 
                        `;
                        params.push(medicalCategoryIds, escortRadius, medicalCategoryIds, searchRadius);
                        sql += ' ORDER BY smart_weight DESC, o.created_at DESC';
                    } else {
                        sql += ' ORDER BY o.created_at DESC';
                    }

                    try {
                        orders = await OrderRepository.findList(sql, params);
                    } catch (e) {
                        let fallbackSql = `
          SELECT o.*, s.category_id
          FROM orders o
          JOIN services s ON o.service_id = s.id
          WHERE o.status = ${ORDER_STATUS.WAIT_ACCEPT} AND o.pay_status = 1
        `;
                        const fallbackParams = [];
                        fallbackSql += ' AND (o.provider_id IS NULL OR o.provider_id = ?) ';
                        fallbackParams.push(providerId);
                        if (types && Array.isArray(types) && types.length > 0) {
                            fallbackSql += ' AND s.category_id IN (?) ';
                            fallbackParams.push(types);
                        }
                        fallbackSql += ' ORDER BY o.created_at DESC';
                        orders = await OrderRepository.findList(fallbackSql, fallbackParams);
                    }
                } else {
                    if (!providerId) return ServiceResult.success([]);
                    // 修复：walking_start_at 字段在 orders 表中，不是 order_ext_pet 表
                    let sql = `
          SELECT o.*, 
                 IF(o.is_walking = 1, TIMESTAMPDIFF(SECOND, o.walking_start_at, NOW()), o.walking_duration) as current_walking_duration 
          FROM orders o 
          WHERE o.provider_id = ? 
        `;
                    const params = [providerId];
                    if (status !== undefined && status !== '-1' && status !== '') {
                        if (String(status).includes(',')) {
                            const statusList = String(status).split(',');
                            sql += `AND status IN (${statusList.map(() => '?').join(',')}) `;
                            params.push(...statusList);
                        } else {
                            sql += 'AND status = ? ';
                            params.push(status);
                        }
                    }
                    sql += 'ORDER BY created_at DESC';
                    try {
                        orders = await OrderRepository.findList(sql, params);
                    } catch (e) {
                        let fallbackSql = `
          SELECT o.* 
          FROM orders o 
          WHERE o.provider_id = ? 
        `;
                        const fallbackParams = [providerId];
                        if (status !== undefined && status !== '-1' && status !== '') {
                            if (String(status).includes(',')) {
                                const statusList = String(status).split(',');
                                fallbackSql += `AND status IN (${statusList.map(() => '?').join(',')}) `;
                                fallbackParams.push(...statusList);
                            } else {
                                fallbackSql += 'AND status = ? ';
                                fallbackParams.push(status);
                            }
                        }
                        fallbackSql += 'ORDER BY created_at DESC';
                        orders = await OrderRepository.findList(fallbackSql, fallbackParams);
                    }
                }
            } else {
                let sql = `SELECT *, TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(created_at, INTERVAL 30 MINUTE)) as pay_remaining_seconds FROM orders WHERE user_id = ? AND user_delete_status = ? `;
                const params = [userId, deleteStatus];
                if (status !== undefined && status !== '-1' && status !== '') {
                    if (String(status).includes(',')) {
                        const statusList = String(status).split(',');
                        sql += ` AND status IN (${statusList.map(() => '?').join(',')}) `;
                        params.push(...statusList);
                    } else {
                        sql += ' AND status = ? ';
                        params.push(status);
                    }
                }
                sql += ' ORDER BY created_at DESC';
                try {
                    orders = await OrderRepository.findList(sql, params);
                } catch (e) {
                    let fallbackSql = `SELECT * FROM orders WHERE user_id = ? AND user_delete_status = ? `;
                    const fallbackParams = [userId, deleteStatus];
                    if (status !== undefined && status !== '-1' && status !== '') {
                        if (String(status).includes(',')) {
                            const statusList = String(status).split(',');
                            fallbackSql += ` AND status IN (${statusList.map(() => '?').join(',')}) `;
                            fallbackParams.push(...statusList);
                        } else {
                            fallbackSql += ' AND status = ? ';
                            fallbackParams.push(status);
                        }
                    }
                    fallbackSql += ' ORDER BY created_at DESC';
                    orders = await OrderRepository.findList(fallbackSql, fallbackParams);
                }
            }

            // 统一脱敏处理
            const maskedOrders = orders.map(o => PrivacyService.handleOrderPrivacy(o, role, userId));
            return ServiceResult.success(maskedOrders);
        } catch (error) {
            throw error;
        }
    }

    /**
     * 获取订单详情 (含扩展数据)
     */
    static async getOrderDetail(orderId, userId, role) {
        const connection = await db.getConnection();
        try {
            let order = await OrderRepository.findDetail(orderId, connection);

            // Fallback: 如果主表查不到，尝试从 RecurringOrderService 获取周期单场次详情 (兼容历史数据 ID)
            if (!order) {
                const RecurringOrderService = require('./RecurringOrderService');
                try {
                    order = await RecurringOrderService.getRecurringSessionDetail(orderId, userId, role);
                } catch (e) {
                    return ServiceResult.fail(ErrorCodes.ORDER_NOT_FOUND, '订单不存在');
                }
            }

            if (!order) return ServiceResult.fail(ErrorCodes.ORDER_NOT_FOUND, '订单不存在');

            // 权限校验与脱敏
            const maskedOrder = PrivacyService.handleOrderPrivacy(order, role, userId);

            // 策略扩展详情
            const strategy = OrderQueryService.getStrategy(maskedOrder.service_name, maskedOrder.category_name);
            if (strategy) {
                Object.assign(maskedOrder, await strategy.extendDetail(maskedOrder, connection));
            }

            // 周期单处理 (兼容母子订单模型与旧版排期模型)
            if (maskedOrder.order_type === 1 || maskedOrder.parent_recurring_id) {
                const motherId = maskedOrder.parent_recurring_id || maskedOrder.id;

                // A. 尝试获取新版“子订单”时间轴
                const [childOrders] = await connection.query(
                    `SELECT id, order_no, status, service_time as service_date, service_time, proof_images 
                     FROM orders WHERE parent_recurring_id = ? ORDER BY session_index ASC`,
                    [motherId]
                );

                if (childOrders && childOrders.length > 0) {
                    maskedOrder.schedules = childOrders.map(o => ({
                        ...o,
                        // 统一字段名映射供前端消费
                        proof_images: o.proof_images,
                        is_new_model: true
                    }));

                    // C. 同步母单进度信息到详情中 (如果是子单查看)
                    if (maskedOrder.parent_recurring_id) {
                        const [motherRows] = await connection.query('SELECT total_sessions, completed_sessions FROM recurring_orders WHERE id = ?', [motherId]);
                        if (motherRows.length > 0) {
                            maskedOrder.total_count = motherRows[0].total_sessions;
                            maskedOrder.completed_count = motherRows[0].completed_sessions;
                        }
                    }
                } else {
                    // B. 回退到旧版“排期表”逻辑
                    const [schedules] = await connection.query(
                        'SELECT * FROM order_schedules WHERE order_id = ? ORDER BY service_date ASC',
                        [motherId]
                    );
                    maskedOrder.schedules = schedules;
                }
            }

            // D. 加载当前订单的执行清单 (新旧模型通用，sessionId 即 orderId)
            const [checklist] = await connection.query(
                'SELECT * FROM recurring_checklist_logs WHERE session_id = ?',
                [maskedOrder.id]
            );
            maskedOrder.checklist = checklist || [];

            // 获取保险信息
            if (maskedOrder.insurance_policy_no) {
                const InsuranceService = require('./insuranceService');
                maskedOrder.insurance_info = await InsuranceService.getPolicyInfo(maskedOrder.insurance_policy_no);
            }

            // E. [最终兜底] 针对宠物服务，确保前端组件所需的所有字段都存在且格式正确
            const isPet = maskedOrder.category_name?.includes('宠物') || maskedOrder.service_name?.includes('猫') || maskedOrder.service_name?.includes('狗');
            if (isPet) {
                // 强制解析 JSON 字段，确保返回的是对象/数组而非字符串
                const forceParse = (val) => {
                    if (!val) return null;
                    if (typeof val === 'string') {
                        try { return JSON.parse(val); } catch (e) { return val; }
                    }
                    return val;
                };

                maskedOrder.proof_data = forceParse(maskedOrder.proof_data);
                maskedOrder.proof_images = forceParse(maskedOrder.proof_images);
                maskedOrder.completion_tags = forceParse(maskedOrder.completion_tags);

                // 确保 checklist 存在
                if (!maskedOrder.checklist || maskedOrder.checklist.length === 0) {
                    const RecurringOrderService = require('./RecurringOrderService');
                    const items = RecurringOrderService.getChecklistItems(maskedOrder.service_id, maskedOrder.service_name);
                    maskedOrder.checklist = items.map((item, idx) => ({
                        id: `auto_final_${idx}`,
                        checklist_item: item,
                        completed: [3, 5].includes(maskedOrder.status) ? 1 : 0
                    }));
                }
                
                // 确保 report_tags 和 report_images 存在 (兼容 ResultDashboard.vue)
                const parseJSON = (val) => {
                    if (!val) return [];
                    if (typeof val === 'string') {
                        try { return JSON.parse(val); } catch (e) { return []; }
                    }
                    return Array.isArray(val) ? val : [];
                };

                if (!maskedOrder.report_tags || maskedOrder.report_tags.length === 0) {
                    maskedOrder.report_tags = parseJSON(maskedOrder.completion_tags);
                }
                if (!maskedOrder.report_images || maskedOrder.report_images.length === 0) {
                    maskedOrder.report_images = parseJSON(maskedOrder.proof_images);
                }
            }

            return ServiceResult.success(maskedOrder);
        } catch (error) {
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = OrderQueryService;
