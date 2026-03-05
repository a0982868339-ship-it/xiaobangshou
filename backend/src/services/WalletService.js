const configLoader = require('../utils/config');
const NotificationService = require('./NotificationService');
const LockService = require('./LockService');
const WalletRepository = require('../repositories/WalletRepository');
const db = require('../config/database');

class WalletService {
    /**
     * 余额充值 (Repository 版)
     */
    static async recharge(userId, amount) {
        return await LockService.wrap(`recharge:${userId}`, async () => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const numAmount = parseFloat(amount);
                if (!numAmount || numAmount <= 0) throw new Error('充值金额无效');

                // 锁定获取当前余额
                const balanceBefore = await WalletRepository.getBalanceForUpdate(userId, connection);
                const balanceAfter = balanceBefore + numAmount;

                // 更新余额与流水
                await WalletRepository.updateBalance(userId, balanceAfter, connection);
                await WalletRepository.addRecord({
                    userId, type: 1, amount: numAmount,
                    balanceBefore, balanceAfter, remark: '用户在线充值'
                }, connection);

                await connection.commit();
                return { balance: balanceAfter };
            } catch (err) {
                if (connection) await connection.rollback();
                throw err;
            } finally {
                if (connection) connection.release();
            }
        }, 10000);
    }

    /**
     * 发起提现申请
     */
    static async requestWithdraw(userId, data) {
        return await LockService.wrap(`withdraw:${userId}`, async () => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();
                const { amount, withdrawType, bankName, bankCardNo, realName } = data;

                const numAmount = parseFloat(amount);
                if (!numAmount || numAmount <= 0) throw new Error('提现金额无效');

                // 1. 获取动态配置
                const { minAmount, feeRate } = await this.getWithdrawConfig();
                if (numAmount < minAmount) throw new Error(`最小提现金额为 ¥${minAmount}`);

                // 2. 锁定账户并校验余额
                const balanceBefore = await WalletRepository.getBalanceForUpdate(userId, connection);
                if (balanceBefore < numAmount) throw new Error('账户余额不足');

                const balanceAfter = balanceBefore - numAmount;
                const fee = (numAmount * feeRate).toFixed(2);
                const actualReceived = (numAmount - fee).toFixed(2);

                // 3. 扣除余额 (进入冻结)
                await WalletRepository.updateBalance(userId, balanceAfter, connection);

                // 4. 插入提现记录
                const withdrawId = await WalletRepository.createWithdrawal({
                    userId, amount: numAmount, fee, actualReceived,
                    withdrawType: withdrawType || 'alipay', bankName, bankCardNo, realName
                }, connection);

                // 5. 记录流水
                await WalletRepository.addRecord({
                    userId, withdrawalId: withdrawId, type: 4, amount: -numAmount,
                    balanceBefore, balanceAfter, remark: `申请提现 (已冻结): ${withdrawType === 'wechat' ? '微信' : '支付宝'}`
                }, connection);

                await connection.commit();
                return { id: withdrawId, balance: balanceAfter };
            } catch (err) {
                if (connection) await connection.rollback();
                throw err;
            } finally {
                if (connection) connection.release();
            }
        }, 10000);
    }

    /**
     * 辅助方法：获取提现配置
     */
    static async getWithdrawConfig() {
        const minAmount = await configLoader.getNumber('WITHDRAW_MIN_AMOUNT', 10);
        const feeRate = await configLoader.getNumber('WITHDRAW_FEE_RATE', 0.006);
        return { minAmount, feeRate };
    }

    /**
     * 审核提现
     */
    static async reviewWithdrawal(id, status, remark) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [withdrawals] = await connection.query('SELECT * FROM withdrawals WHERE id = ? FOR UPDATE', [id]);
            if (withdrawals.length === 0) throw new Error('提现申请不存在');
            const withdrawal = withdrawals[0];

            if (withdrawal.status !== 0) throw new Error('该申请已处理过');

            // 1. 更新申请状态
            await connection.query(
                'UPDATE withdrawals SET status = ?, remark = ?, reviewed_at = NOW() WHERE id = ?',
                [status, remark, id]
            );

            // 2. 如果审核驳回，退还余额并记录流水
            if (String(status) === '2') {
                const balanceBefore = await WalletRepository.getBalanceForUpdate(withdrawal.user_id, connection);
                const refundAmount = parseFloat(withdrawal.amount);
                const balanceAfter = balanceBefore + refundAmount;

                await WalletRepository.updateBalance(withdrawal.user_id, balanceAfter, connection);
                await WalletRepository.addRecord({
                    userId: withdrawal.user_id, withdrawalId: id, type: 5, amount: refundAmount,
                    balanceBefore, balanceAfter, remark: `提现申请被驳回，资金退回: ${remark || '未填写原因'}`
                }, connection);
            }

            await connection.commit();

            // 通知用户提现审核结果 (后续可改为事件监听)
            await NotificationService.notify(withdrawal.user_id, 'WITHDRAW_REVIEWED', {
                status: parseInt(status),
                reason: remark
            }, { skipSocket: false });

            return withdrawal;
        } catch (err) {
            if (connection) await connection.rollback();
            throw err;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * 手动结算订单
     */
    static async manualSettleOrder(orderId) {
        return await LockService.wrap(`settle:${orderId}`, async () => {
            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                const [orders] = await connection.query('SELECT * FROM orders WHERE id = ? AND status IN (3, 5) FOR UPDATE', [orderId]);
                if (orders.length === 0) throw new Error('订单不存在或未完成');
                const order = orders[0];

                if (order.settlement_status === 1) throw new Error('该订单已结算');

                const [providers] = await connection.query('SELECT * FROM providers WHERE id = ?', [order.provider_id]);
                if (providers.length === 0) throw new Error('服务者不存在');
                const provider = providers[0];

                const platformFeeRate = parseFloat(process.env.PLATFORM_FEE_RATE || 0.1);
                const platformFee = order.total_price * platformFeeRate;
                const providerIncome = order.total_price - platformFee;

                const balanceBefore = await WalletRepository.getBalanceForUpdate(provider.user_id, connection);
                const balanceAfter = balanceBefore + providerIncome;

                await WalletRepository.updateBalance(provider.user_id, balanceAfter, connection);
                await connection.query('UPDATE orders SET settlement_status = 1, platform_fee = ?, settle_time = NOW() WHERE id = ?', [platformFee, orderId]);

                await WalletRepository.addRecord({
                    userId: provider.user_id, orderId, type: 3, amount: providerIncome,
                    balanceBefore, balanceAfter, remark: `订单结算: ${order.service_name}`
                }, connection);

                await connection.commit();
                return { order, providerIncome, providerUserId: provider.user_id };
            } catch (err) {
                if (connection) await connection.rollback();
                throw err;
            } finally {
                if (connection) connection.release();
            }
        }, 15000);
    }
}

module.exports = WalletService;
