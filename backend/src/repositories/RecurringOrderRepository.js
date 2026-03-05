const BaseRepository = require('./BaseRepository');

/**
 * 周期订单数据访问层
 * 完全独立，不影响现有OrderRepository
 */
class RecurringOrderRepository extends BaseRepository {
    /**
     * 创建周期订单母订单
     */
    static async createRecurringOrder(data, connection) {
        const sql = `
            INSERT INTO recurring_orders 
            (order_no, user_id, provider_id, service_id, service_name, 
             total_sessions, session_interval, start_date, 
             total_price, session_price, frozen_amount,
             address, contact_phone, service_time, remark, status, pay_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.orderNo, data.userId, data.providerId || null, data.serviceId, data.serviceName,
            data.totalSessions, data.sessionInterval || 1, data.startDate,
            data.totalPrice, data.sessionPrice, data.totalPrice, // frozen_amount初始等于总价
            data.address, data.contactPhone, data.serviceTime, data.remark || null,
            0, 0 // status=待支付, pay_status=未支付
        ];
        const [result] = await this.query(sql, params, connection);
        return result.insertId;
    }

    /**
     * 创建服务场次
     */
    static async createSession(data, connection) {
        const sql = `
            INSERT INTO recurring_sessions 
            (recurring_order_id, session_index, session_date, service_time, price, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `;
        const params = [
            data.recurringOrderId, data.sessionIndex, data.sessionDate,
            data.serviceTime, data.price
        ];
        const [result] = await this.query(sql, params, connection);
        return result.insertId;
    }

    /**
     * 创建服务清单项
     */
    static async createChecklistItem(sessionId, itemName, connection) {
        const sql = `
            INSERT INTO recurring_checklist_logs (session_id, checklist_item, completed)
            VALUES (?, ?, FALSE)
        `;
        await this.query(sql, [sessionId, itemName], connection);
    }

    /**
     * 根据ID查询周期订单（含场次和清单）
     */
    static async findByIdWithSessions(recurringOrderId, connection = null) {
        // 查询母订单
        const orderSql = 'SELECT * FROM recurring_orders WHERE id = ?';
        const order = await this.first(orderSql, [recurringOrderId], connection);
        if (!order) return null;

        // 查询所有场次 (重构：从 orders 表查询关联的子订单)
        const sessionsSql = `
            SELECT id, order_no, status, service_time, session_index, 
                   pay_status, arrived_at, started_at, complete_time
            FROM orders 
            WHERE parent_recurring_id = ? 
            ORDER BY session_index ASC
        `;
        const sessions = await this.query(sessionsSql, [recurringOrderId], connection);

        // 为每个场次查询清单 (保持兼容性，清单依然在独立表，但 sessionId 现在是 order_id)
        for (let session of sessions) {
            const checklistSql = `
                SELECT * FROM recurring_checklist_logs 
                WHERE session_id = ?
            `;
            session.checklist = await this.query(checklistSql, [session.id], connection);

            // 为了保持与原有前端代码兼容，映射一些核心字段
            session.session_date = session.service_time.split(' ')[0];
            session.service_time_only = session.service_time.split(' ')[1];
        }

        order.sessions = sessions;
        return order;
    }

    /**
     * 根据场次ID查询场次详情
     */
    static async findSessionById(sessionId, connection = null) {
        const sql = 'SELECT * FROM recurring_sessions WHERE id = ?';
        return await this.first(sql, [sessionId], connection);
    }

    /**
     * 更新周期订单
     */
    static async updateRecurringOrder(id, data, connection) {
        const fields = [];
        const params = [];

        if (data.status !== undefined) {
            fields.push('status = ?');
            params.push(data.status);
        }
        if (data.payStatus !== undefined) {
            fields.push('pay_status = ?');
            params.push(data.payStatus);
        }
        if (data.payTime !== undefined) {
            fields.push('pay_time = ?');
            params.push(data.payTime);
        }
        if (data.frozenAmount !== undefined) {
            fields.push('frozen_amount = ?');
            params.push(data.frozenAmount);
        }
        if (data.completedSessions !== undefined) {
            fields.push('completed_sessions = ?');
            params.push(data.completedSessions);
        }
        if (data.totalSessions !== undefined) {
            fields.push('total_sessions = ?');
            params.push(data.totalSessions);
        }
        if (data.providerId !== undefined) {
            fields.push('provider_id = ?');
            params.push(data.providerId);
        }
        if (data.cancelStatus !== undefined) {
            fields.push('cancel_status = ?');
            params.push(data.cancelStatus);
        }
        if (data.cancelRejectReason !== undefined) {
            fields.push('cancel_reject_reason = ?');
            params.push(data.cancelRejectReason);
        }
        if (data.cancelRejectTime !== undefined) {
            fields.push('cancel_reject_time = ?');
            params.push(data.cancelRejectTime);
        }
        if (data.cancelAcceptTime !== undefined) {
            fields.push('cancel_accept_time = ?');
            params.push(data.cancelAcceptTime);
        }

        if (fields.length === 0) return;

        params.push(id);
        const sql = `UPDATE recurring_orders SET ${fields.join(', ')} WHERE id = ?`;
        return await this.query(sql, params, connection);
    }

    /**
     * 更新场次状态
     */
    static async updateSession(sessionId, data, connection) {
        const fields = [];
        const params = [];

        if (data.status !== undefined) {
            fields.push('status = ?');
            params.push(data.status);
        }
        if (data.arrivedAt !== undefined) {
            fields.push('arrived_at = ?');
            params.push(data.arrivedAt);
        }
        if (data.startedAt !== undefined) {
            fields.push('started_at = ?');
            params.push(data.startedAt);
        }
        if (data.completedAt !== undefined) {
            fields.push('completed_at = ?');
            params.push(data.completedAt);
        }
        if (data.cancelledAt !== undefined) {
            fields.push('cancelled_at = ?');
            params.push(data.cancelledAt);
        }
        if (data.punchTime !== undefined) {
            fields.push('punch_time = ?');
            params.push(data.punchTime);
        }
        if (data.confirmedTime !== undefined) {
            fields.push('confirmed_time = ?');
            params.push(data.confirmedTime);
        }
        if (data.settledTime !== undefined) {
            fields.push('settled_time = ?');
            params.push(data.settledTime);
        }
        if (data.checklistComplete !== undefined) {
            fields.push('checklist_complete = ?');
            params.push(data.checklistComplete);
        }
        if (data.reportImages !== undefined) {
            fields.push('report_images = ?');
            params.push(data.reportImages);
        }
        if (data.reportNote !== undefined) {
            fields.push('report_note = ?');
            params.push(data.reportNote);
        }
        if (data.reportTags !== undefined) {
            fields.push('report_tags = ?');
            params.push(data.reportTags);
        }

        if (fields.length === 0) return;

        params.push(sessionId);
        const sql = `UPDATE recurring_sessions SET ${fields.join(', ')} WHERE id = ?`;
        return await this.query(sql, params, connection);
    }

    /**
     * 完成清单项
     */
    static async completeChecklistItem(sessionId, itemName, connection) {
        const sql = `
            UPDATE recurring_checklist_logs 
            SET completed = TRUE, completed_at = NOW() 
            WHERE session_id = ? AND checklist_item = ?
        `;
        return await this.query(sql, [sessionId, itemName], connection);
    }

    /**
     * 检查场次的清单是否全部完成
     */
    static async isChecklistComplete(sessionId, connection = null) {
        const sql = `
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END) as completed
            FROM recurring_checklist_logs
            WHERE session_id = ?
        `;
        const result = await this.first(sql, [sessionId], connection);
        return result.total > 0 && result.total === result.completed;
    }

    /**
     * 查询用户的周期订单列表
     */
    static async findByUserId(userId, connection = null) {
        const sql = `
            SELECT * FROM recurring_orders 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `;
        return await this.query(sql, [userId], connection);
    }

    /**
     * 查询服务者的周期订单列表
     */
    static async findByProviderId(providerId, connection = null) {
        const sql = `
            SELECT * FROM recurring_orders 
            WHERE provider_id = ? 
            ORDER BY created_at DESC
        `;
        return await this.query(sql, [providerId], connection);
    }
}

module.exports = RecurringOrderRepository;
