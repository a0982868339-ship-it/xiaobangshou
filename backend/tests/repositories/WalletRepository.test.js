/**
 * WalletRepository Unit Tests
 */

const { mockDb, mockQuery, cleanup, testFixtures } = require('../setup');

jest.mock('../../src/config/database', () => mockDb);

const WalletRepository = require('../../src/repositories/WalletRepository');

describe('WalletRepository', () => {
    afterEach(() => {
        cleanup();
    });

    describe('getBalanceForUpdate', () => {
        it('should return user balance with FOR UPDATE lock', async () => {
            mockQuery.mockResolvedValueOnce([[{ balance: 1000.50 }]]);
            const mockConnection = { query: mockQuery };

            const balance = await WalletRepository.getBalanceForUpdate(1, mockConnection);

            expect(balance).toBe(1000.50);
            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT balance FROM users WHERE id = ? FOR UPDATE',
                [1]
            );
        });

        it('should return 0 if user not found', async () => {
            mockQuery.mockResolvedValueOnce([[]]);
            const mockConnection = { query: mockQuery };

            const balance = await WalletRepository.getBalanceForUpdate(999, mockConnection);

            expect(balance).toBe(0);
        });
    });

    describe('updateBalance', () => {
        it('should update user balance', async () => {
            mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
            const mockConnection = { query: mockQuery };

            await WalletRepository.updateBalance(1, 500.00, mockConnection);

            expect(mockQuery).toHaveBeenCalledWith(
                'UPDATE users SET balance = ? WHERE id = ?',
                [500.00, 1]
            );
        });
    });

    describe('addRecord', () => {
        it('should insert wallet record', async () => {
            const recordData = {
                userId: 1,
                type: 1,
                amount: 100,
                balanceBefore: 1000,
                balanceAfter: 1100,
                remark: '充值'
            };

            mockQuery.mockResolvedValueOnce([{ insertId: 10 }]);
            const mockConnection = { query: mockQuery };

            await WalletRepository.addRecord(recordData, mockConnection);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO wallet_records'),
                expect.arrayContaining([1, 1, 100, 1000, 1100, '充值', 1])
            );
        });
    });
});
