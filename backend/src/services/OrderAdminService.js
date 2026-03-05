/**
 * OrderAdminService - 订单管理后台服务
 * 处理管理员专属的查询逻辑，从 Controller 层数据库访问迁移而来
 */
const { ORDER_STATUS } = require('../config/constants');
const db = require('../config/database');
const logger = require('../utils/logger');

class OrderAdminService {
    /**
     * 管理员获取所有订单 (含分页与多条件筛选)
     */
    static async getAllOrders(query) {
        const { status, orderNo, phone, startTime, endTime, page = 1, limit = 10 } = query;
        const offset = (page - 1) * limit;
        const params = [];

        let sql = `
            SELECT o.*, 
                   u.phone as user_phone, 
                   u.nickname as user_nickname, 
                   u.avatar as user_avatar, 
                   uu.phone as provider_phone, 
                   uu.real_name as provider_real_name, 
                   up.rating as provider_rating, 
                   uu.nickname as provider_nickname, 
                   uu.avatar as provider_avatar, 
                   c.name as cat_name 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            LEFT JOIN providers up ON o.provider_id = up.id 
            LEFT JOIN users uu ON up.user_id = uu.id 
            LEFT JOIN services s ON o.service_id = s.id 
            LEFT JOIN service_categories c ON s.category_id = c.id 
            WHERE 1=1 
        `;

        if (status) { sql += ' AND o.status = ?'; params.push(status); }
        if (orderNo) { sql += ' AND o.order_no LIKE ?'; params.push(`%${orderNo}%`); }
        if (phone) { sql += ' AND (u.phone LIKE ? OR uu.phone LIKE ?)'; params.push(`%${phone}%`, `%${phone}%`); }
        if (startTime) { sql += ' AND o.created_at >= ?'; params.push(startTime); }
        if (endTime) { sql += ' AND o.created_at <= ?'; params.push(endTime); }

        sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [orders] = await db.query(sql, params);
        return orders;
    }

    /**
     * 获取服务地图数据 (LBS)
     */
    static async getServiceMapData() {
        const sql = `
            SELECT o.id, o.order_no, o.status, o.service_name, o.total_price, 
                   o.service_latitude as lat, o.service_longitude as lng, o.created_at, 
                   p.lat as provider_lat, p.lng as provider_lng, p.id as provider_id 
            FROM orders o 
            LEFT JOIN providers p ON o.provider_id = p.id 
            WHERE o.status IN (${ORDER_STATUS.WAIT_ACCEPT}, ${ORDER_STATUS.ACCEPTED}, ${ORDER_STATUS.IN_SERVICE}) 
              AND o.service_latitude IS NOT NULL 
              AND o.service_longitude IS NOT NULL
        `;

        const [list] = await db.query(sql);
        return list;
    }

    /**
     * 获取订单统计 (用户/服务者)
     */
    static async getOrderStats(userId, role) {
        let sql = '';
        let params = [userId];

        if (role === 'provider') {
            const [pRows] = await db.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
            if (pRows.length === 0) return {};
            const providerId = pRows[0].id;
            sql = 'SELECT status, COUNT(*) as count FROM orders WHERE provider_id = ? GROUP BY status';
            params = [providerId];
        } else {
            sql = 'SELECT status, COUNT(*) as count FROM orders WHERE user_id = ? AND user_delete_status = 0 GROUP BY status';
        }

        const [rows] = await db.query(sql, params);
        const stats = {};
        [0, 1, 2, 3, 4, 5, 10, 11, 12].forEach(s => stats[s] = 0);
        rows.forEach(r => stats[r.status] = r.count);
        return stats;
    }

    /**
     * 获取聊天伙伴 ID
     */
    static async getChatPartners(userId, role) {
        let sql = '';

        if (role === 'provider') {
            const [pRows] = await db.query('SELECT id FROM providers WHERE user_id = ?', [userId]);
            if (pRows.length === 0) return [];
            const providerId = pRows[0].id;
            sql = `SELECT DISTINCT user_id as partnerId FROM orders WHERE provider_id = ? AND status IN (${ORDER_STATUS.ACCEPTED}, ${ORDER_STATUS.IN_SERVICE})`;
            const [rows] = await db.query(sql, [providerId]);
            return rows;
        } else {
            sql = `SELECT DISTINCT p.user_id as partnerId FROM orders o JOIN providers p ON o.provider_id = p.id WHERE o.user_id = ? AND o.status IN (${ORDER_STATUS.ACCEPTED}, ${ORDER_STATUS.IN_SERVICE})`;
            const [rows] = await db.query(sql, [userId]);
            return rows;
        }
    }

    /**
     * 获取服务者财务统计
     */
    static async getProviderFinance(userId) {
        // 1. 获取服务者基本信息
        const [pRows] = await db.query('SELECT id, rating FROM providers WHERE user_id = ?', [userId]);
        
        // 核心修复：如果服务者记录不存在，不抛出异常，而是返回全零的初始状态
        if (pRows.length === 0) {
            const [userRows] = await db.query('SELECT balance FROM users WHERE id = ?', [userId]);
            const availableBalance = parseFloat(userRows[0]?.balance || 0);
            return {
                frozenBalance: 0,
                totalBalance: availableBalance,
                availableBalance: availableBalance,
                orderStats: { total: 0, completed: 0, positiveRate: '100%', rating: '5.0' },
                earnings: { today: 0, week: 0, month: 0, total: 0 },
                records: []
            };
        }

        const providerId = pRows[0].id;

        // 2. 获取真实可用余额 (从 users 表获取)
        const [userRows] = await db.query('SELECT balance FROM users WHERE id = ?', [userId]);
        const realAvailableBalance = parseFloat(userRows[0]?.balance || 0);

        // 3. 获取公示期冻结金额 (未结算的已完成/已评价订单)
        const [frozenRows] = await db.query(
            `SELECT IFNULL(SUM(total_price - IFNULL(platform_fee, 0)), 0) as frozenBalance 
             FROM orders WHERE provider_id = ? AND status IN (${ORDER_STATUS.COMPLETED}, ${ORDER_STATUS.REVIEWED}) AND settlement_status = 0`,
            [providerId]
        );
        const frozenBalance = parseFloat(frozenRows[0].frozenBalance);

        // 4. 统计收益数据 (今日、本周、本月、累计)
        // 注意：使用 complete_time 字段进行统计
        const [earningRows] = await db.query(
            `SELECT 
                IFNULL(SUM(CASE WHEN TO_DAYS(complete_time) = TO_DAYS(NOW()) THEN (total_price - IFNULL(platform_fee, 0)) ELSE 0 END), 0) as today,
                IFNULL(SUM(CASE WHEN YEARWEEK(complete_time, 1) = YEARWEEK(NOW(), 1) THEN (total_price - IFNULL(platform_fee, 0)) ELSE 0 END), 0) as week,
                IFNULL(SUM(CASE WHEN DATE_FORMAT(complete_time, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') THEN (total_price - IFNULL(platform_fee, 0)) ELSE 0 END), 0) as month,
                IFNULL(SUM(total_price - IFNULL(platform_fee, 0)), 0) as total 
             FROM orders WHERE provider_id = ? AND status IN (${ORDER_STATUS.COMPLETED}, ${ORDER_STATUS.REVIEWED})`,
            [providerId]
        );

        // 5. 组装返回数据
        const earnings = earningRows[0] || { today: 0, week: 0, month: 0, total: 0 };
        const orderStats = {
            total: 0,
            completed: 0,
            positiveRate: '100%',
            rating: parseFloat(pRows[0].rating || 5.0).toFixed(1)
        };

        // 补充完成订单数统计
        const [statRows] = await db.query(
            `SELECT COUNT(*) as total, SUM(CASE WHEN status IN (${ORDER_STATUS.COMPLETED}, ${ORDER_STATUS.REVIEWED}) THEN 1 ELSE 0 END) as completed 
             FROM orders WHERE provider_id = ?`,
            [providerId]
        );
        if (statRows[0]) {
            orderStats.total = statRows[0].total || 0;
            orderStats.completed = statRows[0].completed || 0;
        }

        // 6. 获取最近 20 条流水记录
        const [records] = await db.query(
            `SELECT 1 as source_type, id, (total_price - IFNULL(platform_fee, 0)) as amount, 
                    CONCAT('服务收益: ', service_name) as description, 
                    complete_time as created_at, settlement_status 
             FROM orders 
             WHERE provider_id = ? AND status IN (${ORDER_STATUS.COMPLETED}, ${ORDER_STATUS.REVIEWED}) 
             ORDER BY complete_time DESC LIMIT 20`,
            [providerId]
        );

        return {
            frozenBalance,
            totalBalance: realAvailableBalance + frozenBalance,
            availableBalance: realAvailableBalance,
            orderStats,
            earnings,
            records: records || []
        };
    }
}

module.exports = OrderAdminService;
