/**
 * Socket.io 实时消息监听工具
 * 用于监听来自后端的 Socket 事件并触发前端通知
 * 使用方式：在 App.vue 或 main.js 中调用 initSocketListener()
 */

import io from 'socket.io-client';

let socket = null;

/**
 * 初始化 Socket 监听器
 * @param {Object} config 配置对象
 * @param {String} config.serverUrl Socket 服务器地址
 * @param {String} config.token 用户认证 Token
 * @param {Function} config.onNewMessage 收到新消息时的回调
 * @param {Function} config.onUnreadUpdate 未读计数更新时的回调
 */
export function initSocketListener(config) {
    const { serverUrl, token, onNewMessage, onUnreadUpdate } = config;

    if (!token) {
        console.warn('[Socket] 未提供 token，跳过 Socket 连接');
        return;
    }

    // 如果已存在连接，先断开
    if (socket) {
        socket.disconnect();
    }

    // 创建新的 Socket 连接
    socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    // 连接成功
    socket.on('connect', () => {
        console.log('[Socket] 已连接到消息服务器');
    });

    // 连接失败
    socket.on('connect_error', (error) => {
        console.error('[Socket] 连接失败:', error.message);
    });

    // 监听新消息事件
    socket.on('NEW_MESSAGE', (data) => {
        console.log('[Socket] 收到新消息:', data);

        // 调用用户提供的回调函数
        if (typeof onNewMessage === 'function') {
            onNewMessage(data);
        }
    });

    // 监听未读计数更新
    socket.on('UNREAD_COUNT_UPDATE', (data) => {
        console.log('[Socket] 未读计数更新:', data);

        // 调用用户提供的回调函数
        if (typeof onUnreadUpdate === 'function') {
            onUnreadUpdate(data);
        }
    });

    // 断开连接
    socket.on('disconnect', (reason) => {
        console.log('[Socket] 连接断开:', reason);
    });

    return socket;
}

/**
 * 断开 Socket 连接
 */
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[Socket] 已手动断开连接');
    }
}

/**
 * 获取当前 Socket 实例
 */
export function getSocket() {
    return socket;
}
