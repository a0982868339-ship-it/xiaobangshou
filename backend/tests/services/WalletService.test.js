/**
 * WalletService 单元测试
 * 测试钱包核心业务逻辑
 */
const WalletService = require('../../src/services/WalletService');
const WalletRepository = require('../../src/repositories/WalletRepository');
const db = require('../../src/config/database');

// Mock 依赖
jest.mock('../../src/config/database');
jest.mock('../../src/repositories/WalletRepository');
jest.mock('../../src/services/LockService', () => ({
    wrap: jest.fn((key, fn, timeout) => fn())
}));
jest.mock('../../src/services/NotificationService', () => ({
    notify: jest.fn()
}));

describe('WalletService', () => {
    let mockConnection;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConnection = {
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
            query: jest.fn()
        };
        db.getConnection.mockResolvedValue(mockConnection);
    });

    describe('recharge', () => {
        const userId = 1;

        it('should recharge successfully', async () => {
            const amount = 100;
            const balanceBefore = 50;

            WalletRepository.getBalanceForUpdate.mockResolvedValue(balanceBefore);
            WalletRepository.updateBalance.mockResolvedValue(true);
            WalletRepository.addRecord.mockResolvedValue(true);

            const result = await WalletService.recharge(userId, amount);

            expect(WalletRepository.updateBalance).toHaveBeenCalledWith(
                userId,
                balanceBefore + amount,
                mockConnection
            );
            expect(result.balance).toBe(150);
        });

        it('should throw error for invalid amount', async () => {
            await expect(WalletService.recharge(userId, 0))
                .rejects.toThrow('充值金额无效');

            await expect(WalletService.recharge(userId, -10))
                .rejects.toThrow('充值金额无效');
        });

        it('should rollback on error', async () => {
            WalletRepository.getBalanceForUpdate.mockRejectedValue(new Error('DB Error'));

            await expect(WalletService.recharge(userId, 100))
                .rejects.toThrow('DB Error');

            expect(mockConnection.rollback).toHaveBeenCalled();
            expect(mockConnection.release).toHaveBeenCalled();
        });
    });

    describe('getWithdrawConfig', () => {
        it('should return default config', async () => {
            const config = await WalletService.getWithdrawConfig();

            expect(config).toHaveProperty('minAmount');
            expect(config).toHaveProperty('feeRate');
            expect(typeof config.minAmount).toBe('number');
            expect(typeof config.feeRate).toBe('number');
        });
    });

    describe('requestWithdraw', () => {
        const userId = 1;

        it('should throw error for insufficient balance', async () => {
            const data = { amount: 1000, withdrawType: 'alipay' };

            WalletRepository.getBalanceForUpdate.mockResolvedValue(50);

            await expect(WalletService.requestWithdraw(userId, data))
                .rejects.toThrow('账户余额不足');
        });

        it('should throw error for amount below minimum', async () => {
            const data = { amount: 1, withdrawType: 'alipay' };

            await expect(WalletService.requestWithdraw(userId, data))
                .rejects.toThrow('最小提现金额');
        });
    });
});
