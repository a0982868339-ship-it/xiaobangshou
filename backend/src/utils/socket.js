const { Server } = require('socket.io');
const { verifyToken } = require('./jwt');
const logger = require('./logger');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true, // 核心：设为 true 自动允许当前请求的 origin，支持 credentials
      methods: ["GET", "POST"],
      credentials: true
    },
    pingInterval: 30000,
    pingTimeout: 20000
  });

  // 鉴权中间件 (增加异常捕获，防止净库状态下崩溃)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication error: Token missing'));
      
      const decoded = verifyToken(token);
      if (!decoded) return next(new Error('Authentication error: Invalid token'));
      
      socket.user = decoded;
      next();
    } catch (err) {
      logger.error('Socket Auth Error:', err.message);
      next(new Error('Internal server error during socket auth'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const roomName = `user_${userId}`;
    
    socket.join(roomName);
    logger.info(`Socket Connected: User ${userId} joined room ${roomName}`);

    socket.on('disconnect', () => {
      logger.info(`Socket Disconnected: User ${userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

/**
 * 向特定用户推送消息
 */
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

module.exports = { initSocket, getIO, emitToUser };
