/**
 * OrderRepository Unit Tests
 */

const { mockDb, mockQuery, cleanup, testFixtures } = require('../setup');

// Mock database module
jest.mock('../../src/config/database', () => mockDb);

const OrderRepository = require('../../src/repositories/OrderRepository');

describe('OrderRepository', () => {
    afterEach(() => {
        cleanup();
    });

    describe('findById', () => {
        it('should return order when found', async () => {
            mockQuery.mockResolvedValueOnce([[testFixtures.order]]);

            const result = await OrderRepository.findById(1);

            expect(result).toEqual(testFixtures.order);
            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT * FROM orders WHERE id = ? ',
                [1]
            );
        });

        it('should return null when order not found', async () => {
            mockQuery.mockResolvedValueOnce([[]]);

            const result = await OrderRepository.findById(999);

            expect(result).toBeNull();
        });

        it('should use FOR UPDATE when lock is true', async () => {
            mockQuery.mockResolvedValueOnce([[testFixtures.order]]);
            const mockConnection = { query: mockQuery };

            await OrderRepository.findById(1, mockConnection, true);

            expect(mockQuery).toHaveBeenCalledWith(
                'SELECT * FROM orders WHERE id = ? FOR UPDATE',
                [1]
            );
        });
    });

    describe('create', () => {
        it('should insert order and return insertId', async () => {
            const newOrderData = {
                order_no: 'TEST123',
                user_id: 1,
                service_id: 1,
                total_price: 100,
                status: 0
            };

            mockQuery.mockResolvedValueOnce([{ insertId: 5 }]);

            const orderId = await OrderRepository.create(newOrderData);

            expect(orderId).toBe(5);
            expect(mockQuery).toHaveBeenCalled();
        });
    });

    describe('logStatus', () => {
        it('should insert status log', async () => {
            const logData = {
                orderId: 1,
                oldStatus: 0,
                newStatus: 1,
                operatorId: 1,
                operatorRole: 'user',
                remark: 'test log'
            };

            mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

            await OrderRepository.logStatus(logData);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO order_status_logs'),
                expect.arrayContaining([1, 0, 1, 1, 'user', 'test log'])
            );
        });
    });
});
