/**
 * Test Setup Utilities
 * Mock数据库连接与测试数据生成
 */

// Mock MySQL2 连接池
const mockQuery = jest.fn();
const mockGetConnection = jest.fn(() => ({
    query: mockQuery,
    execute: mockQuery,
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
}));

const mockDb = {
    query: mockQuery,
    getConnection: mockGetConnection
};

// 测试数据 Fixtures
const testFixtures = {
    user: {
        id: 1,
        nickname: '测试用户',
        phone: '13800138000',
        balance: 1000.00
    },

    provider: {
        id: 1,
        user_id: 2,
        level: 1,
        order_count: 0,
        lat: 39.9042,
        lng: 116.4074
    },

    order: {
        id: 1,
        order_no: 'ORD1234567890',
        user_id: 1,
        provider_id: null,
        service_id: 1,
        service_name: '家政服务',
        category_name: '居家清洁',
        total_price: 100.00,
        status: 0, // WAIT_PAY
        pay_status: 0
    }
};

// 清理函数
const cleanup = () => {
    mockQuery.mockClear();
    mockGetConnection.mockClear();
};

module.exports = {
    mockDb,
    mockQuery,
    mockGetConnection,
    testFixtures,
    cleanup
};
