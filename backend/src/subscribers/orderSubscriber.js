const { eventBus, EVENTS } = require('../utils/eventBus');
const NotificationService = require('../services/NotificationService');
const InsuranceService = require('../services/insuranceService');
const db = require('../config/database');

/**
 * OrderSubscriber - 处理订单相关副作用
 */

// 1. 支付成功后的副作用 (派单广播 + 自动化投保)
eventBus.on(EVENTS.ORDER.PAID, async ({ order, connection }) => {
    console.log(`>> [Event] Handling ${EVENTS.ORDER.PAID} for Order: ${order.order_no}`);

    // A. 自动化投保
    try {
        const policyResult = await InsuranceService.createPolicy(order);
        if (policyResult && policyResult.status === 'active') {
            await db.query('UPDATE orders SET insurance_policy_no = ?, insurance_status = ? WHERE id = ?',
                [policyResult.policyNo, policyResult.status, order.id]);
        }
    } catch (err) {
        console.error('>> [Event] Auto Insurance Error:', err);
    }

    // B. LBS 广播通知 (派单)
    try {
        let providers = [];
        const hasGeo = order.service_latitude && order.service_longitude;
        const isMedical = order.category_name?.includes('陪诊') || order.service_name?.includes('陪诊');

        if (isMedical) {
            // 陪诊业务：全市广播给所有正在接单的服务者，不限制距离
            const [rows] = await db.query(`
                SELECT p.user_id, 0 as distance 
                FROM providers p 
                WHERE p.work_status = 1
            `);
            providers = rows;
            console.log(`>> [Event] Medical Order ${order.id} - City-wide broadcasting to ${providers.length} providers.`);
        } else if (hasGeo) {
            // 普通业务且有坐标：按 5km 半径精准派单
            const [rows] = await db.query(`
                SELECT p.user_id, 
                (6371 * acos(cos(radians(?)) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(?)) + sin(radians(?)) * sin(radians(p.lat)))) AS distance 
                FROM providers p
                WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL AND p.work_status = 1
                HAVING distance <= 5
            `, [order.service_latitude, order.service_longitude, order.service_latitude]);
            providers = rows;
        } else {
            // 无坐标订单兜底：全市广播
            const [rows] = await db.query(`
                SELECT p.user_id, 0 as distance 
                FROM providers p 
                WHERE p.work_status = 1
            `);
            providers = rows;
        }

        providers.forEach(p => {
            NotificationService.notify(p.user_id, 'NEW_ORDER', {
                serviceName: order.service_name,
                totalPrice: parseFloat(order.total_price - (order.platform_fee || 0)).toFixed(2),
                distance: (isMedical || !hasGeo) ? '全市' : p.distance.toFixed(1)
            }, {
                targetId: order.id,
                socketEvent: 'NEW_ORDER'
            });
        });
    } catch (err) {
        console.error('>> [Event] Broadcast NEW_ORDER Error:', err);
    }
});

// 2. 接单成功通知
eventBus.on(EVENTS.ORDER.ACCEPTED, async ({ order }) => {
    await NotificationService.notify(order.user_id, 'ORDER_ACCEPTED', {
        serviceName: order.service_name
    }, { targetId: order.id, newStatus: 1 }); // 1 = ACCEPTED
});

// 4. 确认到达通知
eventBus.on(EVENTS.ORDER.ARRIVED, async ({ order }) => {
    await NotificationService.notify(order.user_id, 'ORDER_ARRIVED', {}, {
        targetId: order.id,
        newStatus: 11 // 11 = ARRIVED
    });
});

// 5. 开始服务通知
eventBus.on(EVENTS.ORDER.IN_SERVICE, async ({ order }) => {
    await NotificationService.notify(order.user_id, 'ORDER_STARTED', {
        serviceName: order.service_name
    }, {
        targetId: order.id,
        newStatus: 2 // 2 = IN_SERVICE
    });
});

// 6. 服务完成通知
eventBus.on(EVENTS.ORDER.COMPLETED, async ({ order }) => {
    // A. 通知用户
    await NotificationService.notify(order.user_id, 'ORDER_COMPLETED', {
        serviceName: order.service_name
    }, {
        targetId: order.id,
        newStatus: 3 // 3 = COMPLETED
    });

    // B. [新增] 通知服务者：用户已确认完成，资金已进入结算
    const [providers] = await db.query('SELECT user_id FROM providers WHERE id = ?', [order.provider_id]);
    if (providers.length > 0) {
        await NotificationService.notify(providers[0].user_id, 'WALLET_SETTLED', {
            serviceName: order.service_name,
            amount: parseFloat(order.total_price - (order.platform_fee || 0)).toFixed(2)
        }, {
            targetId: order.id,
            newStatus: 3
        });
    }
});

// 5. 取消申请通知
eventBus.on(EVENTS.ORDER.CANCEL_REQUESTED, async ({ order, providerUserId }) => {
    await NotificationService.notify(providerUserId, 'CANCEL_REQUEST', {
        serviceName: order.service_name,
        orderNo: order.order_no,
        orderId: order.id
    }, {
        targetId: order.id,
        socketEvent: 'CANCEL_REQUEST'
    });
});

// 8. 订单取消通知
eventBus.on(EVENTS.ORDER.CANCELLED, async ({ order, reason }) => {
    if (reason === 'provider_agreed') {
        // 通知用户：师傅同意了取消
        await NotificationService.notify(order.user_id, 'CANCEL_AGREED', {
            serviceName: order.service_name
        }, {
            targetId: order.id,
            newStatus: 4 // 4 = CANCELLED
        });
    } else {
        // 通用取消通知 (比如支付超时)
        await NotificationService.notify(order.user_id, 'ORDER_CANCELLED', {
            serviceName: order.service_name
        }, {
            targetId: order.id,
            newStatus: 4
        });
    }
});

// 9. 取消拒绝通知
eventBus.on(EVENTS.ORDER.CANCEL_REJECTED, async ({ order }) => {
    await NotificationService.notify(order.user_id, 'CANCEL_REJECTED', {
        serviceName: order.service_name
    }, {
        targetId: order.id,
        newStatus: 1 // 1 = ACCEPTED (恢复原状态)
    });
});

// 7. 评价完成通知
eventBus.on(EVENTS.ORDER.REVIEWED, async ({ order }) => {
    // 获取服务者 user_id
    const [providers] = await db.query('SELECT user_id FROM providers WHERE id = ?', [order.provider_id]);
    if (providers.length > 0) {
        await NotificationService.notify(providers[0].user_id, 'ORDER_REVIEWED', {
            serviceName: order.service_name
        }, {
            targetId: order.id,
            newStatus: 5 // 5 = REVIEWED
        });
    }
});

module.exports = { name: 'OrderSubscriber' };
