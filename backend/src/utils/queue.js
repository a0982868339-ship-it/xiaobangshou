const { Queue, Worker } = require('bullmq');
const redis = require('./redis');

const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
};

// 1. 订单超时处理队列
const orderTimeoutQueue = new Queue('order-timeout', { connection });

// 2. 通知异步队列
const notificationQueue = new Queue('notification', { connection });

module.exports = {
    orderTimeoutQueue,
    notificationQueue,
    connection
};
