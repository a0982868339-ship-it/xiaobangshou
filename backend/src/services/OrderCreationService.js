/**
 * OrderCreationService - 订单创建服务
 * 从 OrderService 拆分，专注于订单创建逻辑
 */
const { ORDER_STATUS } = require('../config/constants');
const { orderTimeoutQueue } = require('../utils/queue');
const PricingEngine = require('./PricingEngine');
const configLoader = require('../utils/config');
const OrderRepository = require('../repositories/OrderRepository');
const db = require('../config/database');

class OrderCreationService {
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
     * 创建订单核心逻辑
     */
    static async createOrder(userId, data) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const {
                serviceId, serviceTime, addressId, remark, contactName, contactPhone,
                city, serviceLatitude, serviceLongitude, orderType, serviceDays,
                patientName, patientGender, patientAge, patientTags, hospitalName, patientProfileId,
                medicalNotes, providerId, assignmentType
            } = data;

            // 1. 获取基础服务信息
            const [services] = await connection.query(`
        SELECT s.*, c.name as category_name, c.commission_rate 
        FROM services s 
        JOIN service_categories c ON s.category_id = c.id 
        WHERE s.id = ? FOR SHARE
      `, [serviceId]);

            if (!services || services.length === 0) throw new Error('服务项目不存在或已下架');
            const service = services[0];

            // 2. 策略匹配与验证
            const strategy = OrderCreationService.getStrategy(service.name, service.category_name);
            if (!strategy) throw new Error('未识别的服务业务类型');
            await strategy.validate(data, service);

            // 3. 计价引擎重算
            const pricingResult = await PricingEngine.calculatePrice({
                ...data,
                clientPrice: data.totalPrice // 映射前端传来的 totalPrice 到计价引擎的 clientPrice
            }, service, strategy);
            const { totalCalculatedPrice, platformFee, totalCount } = pricingResult;

            // 4. LBS 坐标与地址信息补全
            let finalLat = serviceLatitude;
            let finalLng = serviceLongitude;
            let finalAddress = '地址加载中...';
            let finalContactName = contactName;
            let finalContactPhone = contactPhone;

            if (addressId) {
                const [addresses] = await connection.query(
                    'SELECT contact_name, contact_phone, province, city, district, address, latitude, longitude FROM user_addresses WHERE id = ? AND user_id = ?',
                    [addressId, userId]
                );
                if (addresses?.length > 0) {
                    const addr = addresses[0];
                    if (!finalLat) finalLat = addr.latitude;
                    if (!finalLng) finalLng = addr.longitude;
                    finalAddress = `${addr.province || ''}${addr.city || ''}${addr.district || ''}${addr.address || ''}`;
                    if (!finalContactName) finalContactName = addr.contact_name;
                    if (!finalContactPhone) finalContactPhone = addr.contact_phone;
                }
            } else if (data.hospitalName) {
                // 陪诊专项：若未选家庭地址，直接使用医院作为服务地址
                finalAddress = data.hospitalName;
                console.log(`>> [OrderCreation] Medical order using hospital as address: ${finalAddress}`);
            }

            // 5. 插入订单主表
            const orderNo = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
            const isPeriod = parseInt(orderType) === 1;
            let finalServiceTime = serviceTime;
            if (isPeriod && Array.isArray(serviceDays) && serviceDays.length > 0) finalServiceTime = serviceDays[0];

            // 如果指定了服务者，校验其可用性
            if (providerId) {
                const startTime = new Date(new Date(finalServiceTime).getTime() - 60 * 60 * 1000);
                const endTime = new Date(new Date(finalServiceTime).getTime() + 60 * 60 * 1000);
                
                const [conflicts] = await connection.query(`
                    SELECT id FROM provider_schedules 
                    WHERE provider_id = ? 
                    AND (
                        (start_time <= ? AND end_time >= ?) OR
                        (start_time <= ? AND end_time >= ?)
                    )
                `, [providerId, startTime, startTime, endTime, endTime]);

                if (conflicts.length > 0) {
                    throw new Error('该服务人员在选定时间段已有预约，请重新选择');
                }
            }

            const orderId = await OrderRepository.create({
                order_no: orderNo,
                order_type: orderType || 0,
                total_count: totalCount,
                user_id: userId,
                service_id: serviceId,
                service_name: service.name,
                category_name: service.category_name,
                service_time: finalServiceTime,
                service_days: isPeriod ? JSON.stringify(serviceDays) : null,
                service_address: finalAddress,
                city,
                service_longitude: finalLng,
                service_latitude: finalLat,
                contact_name: finalContactName,
                contact_phone: finalContactPhone,
                remark,
                service_options: typeof data.serviceOptions === 'string' ? data.serviceOptions : JSON.stringify(data.serviceOptions || {}),
                hospital_name: hospitalName,
                patient_name: patientName,
                patient_gender: patientGender || 0,
                patient_age: patientAge,
                patient_tags: typeof patientTags === 'string' ? patientTags : JSON.stringify(patientTags || []),
                service_price: service.base_price,
                platform_fee: platformFee,
                total_price: totalCalculatedPrice,
                status: ORDER_STATUS.WAIT_PAY,
                provider_id: providerId || null
            }, connection);

            // 如果指定了服务者，记录排班锁定
            if (providerId) {
                const startTime = new Date(new Date(finalServiceTime).getTime() - 60 * 60 * 1000);
                const endTime = new Date(new Date(finalServiceTime).getTime() + 60 * 60 * 1000);
                await connection.query(`
                    INSERT INTO provider_schedules (provider_id, order_id, start_time, end_time, type)
                    VALUES (?, ?, ?, ?, 1)
                `, [providerId, orderId, startTime, endTime]);
            }

            // 6. 调用策略写入专项扩展表
            await strategy.afterCreate(orderId, data, connection);

            // 7. 处理周期单排期
            if (isPeriod && Array.isArray(serviceDays)) {
                const scheduleValues = serviceDays.map(dayStr => [orderId, dayStr.split(' ')[0], dayStr.split(' ')[1] || '10:00', 0]);
                await connection.query('INSERT INTO order_schedules (order_id, service_date, service_time, status) VALUES ?', [scheduleValues]);
            }

            // 8. 记录状态变更日志
            await OrderRepository.logStatus({
                orderId, oldStatus: -1, newStatus: ORDER_STATUS.WAIT_PAY,
                operatorId: userId, operatorRole: 'user', remark: '架构精进：下单成功',
                lat: finalLat, lng: finalLng
            }, connection);

            // 9. 投递消息队列：关单任务
            const timeoutMins = await configLoader.getNumber('ORDER_AUTO_CANCEL_MINUTES', 15);
            await orderTimeoutQueue.add('timeout-check', { orderId }, { delay: timeoutMins * 60 * 1000 });

            await connection.commit();
            return { orderId, orderNo, totalPrice: totalCalculatedPrice.toFixed(2) };
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = OrderCreationService;
