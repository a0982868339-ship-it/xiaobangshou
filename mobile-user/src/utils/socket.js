import { io } from 'socket.io-client';
import { showSuccessToast } from 'vant';

let socket;
const processedMessages = new Set(); // 幂等性记录器：记录已处理的消息ID

export const initSocket = (token) => {
  if (socket) return socket;

  // 核心：智能识别连接地址，解决 dev 环境端口冲突问题
  const isProd = import.meta.env.MODE === 'production';
  let socketUrl = import.meta.env.VITE_SOCKET_URL;
  
  if (!socketUrl) {
    // 优先使用当前源 (走 Vite 代理或 Nginx)，不再硬编码 3000
    socketUrl = window.location.origin;
  }
  
  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'], // 优先使用 websocket
    secure: isProd,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000, // 增加最大延迟
    timeout: 20000,
    randomizationFactor: 0.5 // 增加随机因子实现指数退避
  });

  socket.on('connect', () => {
    console.log('>> [Socket] 已连接/重连成功');
    // 核心：重连后自动触发全局刷新，同步离线期间的状态
    window.dispatchEvent(new CustomEvent('order-refresh', { 
      detail: { isReconnect: true, message: '连接已恢复，正在同步状态...' } 
    }));
  });

  socket.on('connect_error', (err) => {
    console.error('Socket Connection Error:', err.message);
  });

  socket.on('order_status_update', (data) => {
    // 1. 幂等性校验：防止重复推送导致的重复弹窗
    const msgKey = `${data.orderId}_${data.status}_${data.newStatus}`;
    if (processedMessages.has(msgKey)) return;
    
    processedMessages.add(msgKey);
    // 限制缓存大小，防止内存溢出
    if (processedMessages.size > 100) {
      const firstKey = processedMessages.values().next().value;
      processedMessages.delete(firstKey);
    }

    console.log('Order Status Update:', data);
    // showSuccessToast(data.message); // 移除 Toast，通知由 App.vue 统一处理
    
    // 2. 触发全局事件 (用于通知显示)
    window.dispatchEvent(new CustomEvent('order_status_update_global', { detail: data }));
    // 3. 触发局部刷新事件 (用于详情页自动刷新)
    window.dispatchEvent(new CustomEvent('order-refresh', { detail: data }));
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
