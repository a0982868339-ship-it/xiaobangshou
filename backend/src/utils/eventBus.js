const EventEmitter = require('events');

/**
 * EventBus - 内部业务事件总线
 */
class EventBus extends EventEmitter { }

// 导出单例
const eventBus = new EventBus();

// 事件名称常量定义
const EVENTS = {
    ORDER: {
        CREATED: 'order.created',
        PAID: 'order.paid',
        ACCEPTED: 'order.accepted',
        ARRIVED: 'order.arrived',
        IN_SERVICE: 'order.in_service',
        COMPLETED: 'order.completed',
        CANCEL_REQUESTED: 'order.cancel_requested',
        CANCEL_REJECTED: 'order.cancel_rejected',
        CANCELLED: 'order.cancelled',
        REVIEWED: 'order.reviewed'
    },
    WALLET: {
        RECHARGED: 'wallet.recharged',
        WITHDRAW_STRATED: 'wallet.withdraw_started'
    }
};

module.exports = {
    eventBus,
    EVENTS
};
