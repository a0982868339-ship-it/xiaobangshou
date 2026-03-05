const BaseRepository = require('./BaseRepository');

class OrderRepository extends BaseRepository {
    /**
     * 获取基础订单信息 (含锁)
     */
    static async findById(id, connection = null, lock = false) {
        const sql = `SELECT * FROM orders WHERE id = ? ${lock ? 'FOR UPDATE' : ''}`;
        return await this.first(sql, [id], connection);
    }

    /**
     * 获取完整详情 (含用户、服务者、评价)
     */
    static async findDetail(id, connection = null) {
        const sql = `
      SELECT o.*, o.proof_data,
             TIMESTAMPDIFF(SECOND, o.started_at, NOW()) as current_total_duration,
             IF(o.is_walking = 1, TIMESTAMPDIFF(SECOND, o.walking_start_at, NOW()), o.walking_duration) as current_walking_duration,
             TIMESTAMPDIFF(SECOND, NOW(), DATE_ADD(o.created_at, INTERVAL 15 MINUTE)) as pay_remaining_seconds,
             u.nickname as user_nickname, u.avatar as user_avatar, u.phone as user_phone,
             up.user_id as provider_user_id, uu.nickname as provider_nickname, uu.avatar as provider_avatar, uu.phone as provider_phone,
             r.rating as review_rating, r.content as review_content, r.tags as review_tags, r.created_at as review_time
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN providers up ON o.provider_id = up.id 
      LEFT JOIN users uu ON up.user_id = uu.id
      LEFT JOIN order_reviews r ON o.id = r.order_id
      WHERE o.id = ?
    `;
        return await this.first(sql, [id], connection);
    }

    /**
     * 通用列表查询 (由 Service 构建复杂 SQL，Repository 负责执行)
     */
    static async findList(sql, params, connection = null) {
        const [rows] = await this.query(sql, params, connection);
        return rows || [];
    }

    /**
     * 创建订单
     */
    static async create(data, connection = null) {
        const fields = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const sql = `INSERT INTO orders (${fields}) VALUES (${placeholders})`;
        const [result] = await this.query(sql, Object.values(data), connection);
        return result.insertId;
    }

    /**
     * 状态/数据更新
     */
    static async update(id, data, connection = null) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const sql = `UPDATE orders SET ${setClause}, updated_at = NOW() WHERE id = ?`;
        return await this.query(sql, [...Object.values(data), id], connection);
    }

    /**
     * 记录状态日志
     */
    static async logStatus(data, connection = null) {
        const sql = `INSERT INTO order_status_logs (order_id, old_status, new_status, operator_id, operator_role, remark, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
            data.orderId, data.oldStatus, data.newStatus, data.operatorId,
            data.operatorRole, data.remark || '', data.lat || null, data.lng || null
        ];
        return await this.query(sql, params, connection);
    }
}

module.exports = OrderRepository;
