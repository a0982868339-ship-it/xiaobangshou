const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`
      : `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
      silent: process.env.NODE_ENV === 'production' // 生产环境控制台静默
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
      // 核心防御：生产环境过滤 SQL 日志
      format: winston.format.combine(
        winston.format((info) => {
          if (process.env.NODE_ENV === 'production' && info.message?.includes('SELECT') || info.message?.includes('UPDATE') || info.message?.includes('INSERT') || info.message?.includes('DELETE')) {
            return false;
          }
          return info;
        })(),
        logFormat
      )
    })
  ]
});

module.exports = logger;
