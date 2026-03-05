const { emitToUser } = require('../utils/socket');

// 延迟加载，防止循环引用导致 notificationQueue 为 undefined
let queue = null;
const getQueue = () => {
    if (!queue) {
        queue = require('../utils/queue');
    }
    return queue;
};

// 消息模板定义 (集中管理文案)
const TEMPLATES = {
    // 订单相关
    NEW_ORDER: {
        title: '发现新订单',
        content: (data) => `项目：${data.serviceName}\n预计报酬：¥${data.totalPrice}`,
        type: 'order'
    },
    ORDER_ACCEPTED: {
        title: '订单已被接单',
        content: (data) => `您的订单[${data.serviceName}]已被接单，请关注服务动态`,
        type: 'order'
    },
    ORDER_ARRIVED: {
        title: '师傅已通过预约',
        content: (data) => `师傅已到达预约地点，准备开始服务`,
        type: 'order'
    },
    ORDER_COMPLETED: {
        title: '服务已完成',
        content: (data) => `师傅已提交服务完成，请确认满意并结算`,
        type: 'order'
    },
    CANCEL_REQUEST: {
        title: '订单取消申请',
        content: (data) => `用户申请取消订单：${data.serviceName}，请处理`,
        type: 'order'
    },
    CANCEL_AGREED: {
        title: '订单已成功取消',
        content: (data) => `师傅已同意您的取消申请，资金已退回原账户`,
        type: 'order'
    },
    CANCEL_REJECTED: {
        title: '取消申请被拒绝',
        content: (data) => `师傅拒绝了您的取消申请，请继续履行服务或联系客服`,
        type: 'order'
    },
    ORDER_CANCELLED: {
        title: '订单已取消',
        content: (data) => `您的订单[${data.serviceName}]已取消`,
        type: 'order'
    },
    ORDER_STARTED: {
        title: '师傅已开始服务',
        content: (data) => `师傅已对订单[${data.serviceName}]点击开始工作，正在服务中`,
        type: 'order'
    },
    ORDER_REVIEWED: {
        title: '收到新评价',
        content: (data) => `客户已对订单[${data.serviceName}]发表评价，快去看看吧`,
        type: 'order'
    },
    // 财务相关
    WALLET_SETTLED: {
        title: '订单资金已结算',
        content: (data) => `您的订单[${data.serviceName}]结算完成，¥${data.amount} 已转入余额`,
        type: 'wallet'
    },
    WITHDRAW_REVIEWED: {
        title: '提现状态更新',
        content: (data) => data.status === 1 ? '您的提现申请已通过审核' : `您的提现申请已被驳回：${data.reason}`,
        type: 'wallet'
    }
};

class NotificationService {
    /**
     * 统一发送通知入口
     * @param {number} userId 接收者用户ID
     * @param {string} templateKey 模板ID
     * @param {Object} data 模板填充数据
     * @param {Object} options 额外选项 (targetId, targetUrl, skipSocket等)
     */
    static async notify(userId, templateKey, data = {}, options = {}) {
        const template = TEMPLATES[templateKey];
        if (!template) {
            console.warn(`>> [Notification] Template ${templateKey} not found`);
            return;
        }

        const title = template.title;
        const content = typeof template.content === 'function' ? template.content(data) : template.content;
        const type = template.type;

        // 1. 异步推送到队列 (持久化到数据库通知中心)
        const { notificationQueue } = getQueue();
        if (notificationQueue && typeof notificationQueue.add === 'function') {
            await notificationQueue.add('send-notification', {
                userId,
                type,
                title,
                content,
                targetId: options.targetId || null,
                targetUrl: options.targetUrl || null
            });
        } else {
            console.warn('>> [Notification] notificationQueue is not available, skipping async push');
        }

        // 2. 实时 Socket 推送 (如果未指定跳过)
        if (!options.skipSocket) {
            emitToUser(userId, options.socketEvent || 'order_status_update', {
                orderId: options.targetId,
                status: options.newStatus,
                message: content,
                ...data
            });
        }

        console.log(`>> [Service] Notification [${templateKey}] sent to User ${userId}`);
    }
}

module.exports = NotificationService;
