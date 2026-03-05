const BaseRepository = require('./BaseRepository');

class WalletRepository extends BaseRepository {
    /**
     * 锁定获取用户余额
     */
    static async getBalanceForUpdate(userId, connection) {
        const sql = 'SELECT balance FROM users WHERE id = ? FOR UPDATE';
        const row = await this.first(sql, [userId], connection);
        return row ? parseFloat(row.balance) : 0;
    }

    /**
     * 更新用户余额
     */
    static async updateBalance(userId, balance, connection) {
        const sql = 'UPDATE users SET balance = ? WHERE id = ?';
        return await this.query(sql, [balance, userId], connection);
    }

    /**
     * 记录钱包流水
     */
    static async addRecord(data, connection) {
        const sql = `
      INSERT INTO wallet_records 
      (user_id, order_id, order_no, type, amount, balance_before, balance_after, remark, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        const params = [
            data.userId, data.orderId || null, data.orderNo || null,
            data.type, data.amount, data.balanceBefore, data.balanceAfter, data.remark || '', 1
        ];
        return await this.query(sql, params, connection);
    }

    /**
     * 创建提现记录
     */
    static async createWithdrawal(data, connection) {
        const sql = `
      INSERT INTO withdrawals 
      (user_id, amount, fee, actual_received, withdraw_type, bank_name, bank_card_no, real_name, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;
        const params = [
            data.userId, data.amount, data.fee, data.actualReceived,
            data.withdrawType, data.bankName || '', data.bankCardNo, data.realName
        ];
        const [result] = await this.query(sql, params, connection);
        return result.insertId;
    }
}

module.exports = WalletRepository;
