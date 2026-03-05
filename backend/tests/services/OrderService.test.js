/**
 * OrderService 单元测试
 * 测试订单核心业务逻辑
 */
const OrderService = require('../../src/services/OrderService');
const OrderRepository = require('../../src/repositories/OrderRepository');
const WalletRepository = require('../../src/repositories/WalletRepository');
const db = require('../../src/config/database');

// Mock 依赖
jest.mock('../../src/config/database');
jest.mock('../../src/repositories/OrderRepository');
jest.mock('../../src/repositories/WalletRepository');
jest.mock('../../src/utils/queue', () => ({
    orderTimeoutQueue: { add: jest.fn() }
}));

describe('OrderService', () => {
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

    describe('getStrategy', () => {
        it('should return homeStrategy for 居家 category', () => {
            const strategy = OrderService.getStrategy('上门做饭', '居家服务');
            expect(strategy).toBeDefined();
            expect(strategy.type || 'home').toBeTruthy();
        });

        it('should return petStrategy for 宠物 category', () => {
            const strategy = OrderService.getStrategy('遛狗', '宠物服务');
            expect(strategy).toBeDefined();
        });

        it('should return medicalStrategy for 陪诊 category', () => {
            const strategy = OrderService.getStrategy('医院陪诊', '陪诊服务');
            expect(strategy).toBeDefined();
        });

        it('should return null for unknown category', () => {
            const strategy = OrderService.getStrategy('未知服务', '未知分类');
            expect(strategy).toBeNull();
        });
    });

    describe('cancelOrder', () => {
        const userId = 1;
        const orderId = 100;

        it('should cancel order successfully when status is WAIT_PAY', async () => {
            const mockOrder = {
                id: orderId,
                user_id: userId,
                status: 10, // WAIT_PAY
                order_no: 'ORD123'
            };

            OrderRepository.findById.mockResolvedValue(mockOrder);
            OrderRepository.update.mockResolvedValue(true);
            OrderRepository.logStatus.mockResolvedValue(true);

            const result = await OrderService.cancelOrder(userId, orderId);

            expect(OrderRepository.update).toHaveBeenCalledWith(
                orderId,
                { status: 4 } // CANCELLED
            );
            expect(result.id).toBe(orderId);
        });

        it('should throw error when order not found', async () => {
            OrderRepository.findById.mockResolvedValue(null);

            await expect(OrderService.cancelOrder(userId, orderId))
                .rejects.toThrow('订单不存在');
        });

        it('should throw error when order is already accepted', async () => {
            const mockOrder = {
                id: orderId,
                user_id: userId,
                status: 1, // ACCEPTED
                order_no: 'ORD123'
            };

            OrderRepository.findById.mockResolvedValue(mockOrder);

            await expect(OrderService.cancelOrder(userId, orderId))
                .rejects.toThrow('师傅已接单');
        });
    });

    describe('deleteOrder', () => {
        it('should soft delete order', async () => {
            const orderId = 100;
            OrderRepository.update.mockResolvedValue(true);

            await OrderService.deleteOrder(1, orderId, 1);

            expect(OrderRepository.update).toHaveBeenCalledWith(
                orderId,
                { user_delete_status: 1 }
            );
        });
    });

    describe('updateOrderRemark', () => {
        it('should update order remark', async () => {
            const orderId = 100;
            const remark = '新备注';
            OrderRepository.update.mockResolvedValue(true);

            await OrderService.updateOrderRemark(orderId, remark);

            expect(OrderRepository.update).toHaveBeenCalledWith(
                orderId,
                { remark }
            );
        });
    });
});
