import { io } from 'socket.io-client'

let socket = null
const processedMessages = new Set() // 幂等性记录器

export const initSocket = (token) => {
  if (socket?.connected) return socket

  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  // 移除 /api 后缀作为 socketUrl
  const socketURL = baseURL.replace('/api', '')

  socket = io(socketURL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true
  })

  socket.on('connect', () => {
    console.log('>> [Provider/Socket] Connected:', socket.id)
  })

  socket.on('connect_error', (err) => {
    console.error('>> [Provider/Socket] Connection Error:', err.message)
  })

  // 统一处理订单状态更新
  socket.on('order_status_update', (data) => {
    // 1. 幂等性校验
    const msgKey = `${data.orderId}_${data.status}_${data.message}`;
    if (processedMessages.has(msgKey)) return;
    
    processedMessages.add(msgKey);
    if (processedMessages.size > 100) {
      const firstKey = processedMessages.values().next().value;
      processedMessages.delete(firstKey);
    }

    console.log('>> [Provider/Socket] Order Update:', data);
    
    // 2. 触发全局 DOM 事件
    window.dispatchEvent(new CustomEvent('order_status_update_global', { detail: data }));
    // 3. 触发局部刷新事件
    window.dispatchEvent(new CustomEvent('order-refresh', { detail: data }));
  });

  // 处理取消申请事件，触发刷新
  socket.on('CANCEL_REQUEST', (data) => {
    console.log('>> [Provider/Socket] Cancel Request Received:', data);
    window.dispatchEvent(new CustomEvent('order-refresh', { detail: data }));
  });

  return socket
}

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('provider_token')
    if (token) return initSocket(token)
  }
  return socket
}

export const closeSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
