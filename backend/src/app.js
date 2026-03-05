const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const { sendError } = require('./utils/response');
const db = require('./config/database');
const runAutoClearing = require('./services/settlementEngine');
const runOrderEngine = require('./services/orderEngine');

// 导入消息队列 Worker (自动启动)
require('./workers/orderWorker');
require('./workers/notificationWorker');

const http = require('http');
const https = require('https');
const fs = require('fs');
const { initSocket } = require('./utils/socket');

const app = express();

// --- HTTPS 安全配置 ---
let server;
const isProd = process.env.NODE_ENV === 'production';

if (isProd && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  try {
    const options = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    };
    server = https.createServer(options, app);
    logger.info('>> [Server] 启动 HTTPS 安全服务器 (WSS 模式已开启)');
  } catch (e) {
    logger.error('>> [Server] SSL 证书加载失败，降级为 HTTP:', e.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  logger.info('>> [Server] 启动 HTTP 开发服务器');
}

// 初始化 Socket.io 并挂载到全局
const io = initSocket(server);
app.set('socketio', io);

// --- 平台治理引擎挂载 ---
// 每 1 小时自动扫描并结算一次到期订单 (作为 BullMQ 的补充兜底)
setInterval(runAutoClearing, 60 * 60 * 1000);

// 启动时立即运行一次兜底扫描
setTimeout(() => {
  runAutoClearing();
  runOrderEngine(); // 启动时清理一次存量超时订单
}, 5000);
// -----------------------

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.amap.com", "lib.baomitu.com", "*.alicdn.com", "*.aliyuncs.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "*.amap.com", "*.alicdn.com"],
      imgSrc: ["'self'", "data:", "blob:", "*.amap.com", "*.myqcloud.com", "*.aliyuncs.com", "*.alicdn.com"],
      connectSrc: ["'self'", "*.amap.com", "*.aliyuncs.com", "*.alicdn.com"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 5000, // 提高上限到 5000 次请求，防止自动补全配置时触发频控
  message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

// 核心防御：针对敏感接口的严苛频控
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'development' ? 1000 : 10, // 开发模式放宽到 1000 次
  message: '登录尝试过于频繁，请 15 分钟后再试'
});
const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // 开发模式放宽到 1000 次，生产环境 5 次
  message: '短信验证码发送频繁，请 1 小时后再试'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/sms', smsLimiter);
app.use('/api/admin/auth/login', authLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), uptime: process.uptime() });
});

// 允许公开访问的路由 (放在鉴权中间件之前或通过中间件逻辑内部放行)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin/auth', require('./routes/adminAuth'));
app.use('/api/services', require('./routes/service'));
app.use('/api/users', require('./routes/user'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/alipay', require('./routes/alipay'));
app.use('/api/address', require('./routes/address'));
app.use('/api/demands', require('./routes/demand'));
app.use('/api/providers', require('./routes/provider'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/bank-cards', require('./routes/bankCard'));
app.use('/api/system', require('./routes/system'));
app.use('/api/hospitals', require('./routes/hospital'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/patient-profiles', require('./routes/patientProfile'));

// 周期订单独立路由（完全不影响现有订单系统）
app.use('/api/recurring', require('./routes/recurring'));

// --- 公共数据接口 ---
app.get('/api/common/captcha-sdk.js', async (req, res) => {
  try {
    const axios = require('axios');
    const urls = [
      'https://g.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js',
      'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js'
    ];
    
    let response;
    for (const url of urls) {
      try {
        response = await axios.get(url, { timeout: 5000 });
        if (response.status === 200) break;
      } catch (e) {}
    }

    if (!response) throw new Error('CDN 抓取失败');
    
    res.setHeader('Content-Type', 'application/javascript');
    res.send(response.data);
  } catch (e) {
    logger.error('>> [CaptchaProxy] 抓取阿里云SDK失败:', e.message);
    res.status(500).send('console.error("阿里云验证码脚本加载失败");');
  }
});

app.get('/api/common/captcha-config', (req, res) => {
  try {
    const dotenv = require('dotenv');
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(__dirname, '../.env');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    
    res.json({
      success: true,
      data: {
        sceneId: envConfig.ALICAY_CAPTCHA_SCENE_CODE || process.env.ALICAY_CAPTCHA_SCENE_CODE || '',
        prefix: envConfig.ALICAY_CAPTCHA_PREFIX || process.env.ALICAY_CAPTCHA_PREFIX || '',
        region: envConfig.ALICAY_CAPTCHA_REGION || process.env.ALICAY_CAPTCHA_REGION || 'cn'
      }
    });
  } catch (e) {
    res.json({
      success: true,
      data: {
        sceneId: process.env.ALICAY_CAPTCHA_SCENE_CODE || '',
        prefix: process.env.ALICAY_CAPTCHA_PREFIX || '',
        region: process.env.ALICAY_CAPTCHA_REGION || 'cn'
      }
    });
  }
});

app.get('/api/common/hospitals', async (req, res) => {
  const { city } = req.query;
  console.log('>> [Common/Hospitals] Query city:', city);
  try {
    const pureCity = city ? city.replace('市', '') : '';
    const [list] = await db.query(
      "SELECT id, name, level FROM hospitals WHERE city LIKE ?",
      [`%${pureCity}%`]
    );
    res.json({ success: true, data: list });
  } catch (e) {
    console.error('>> [Common/Hospitals] Error:', e);
    res.status(500).json({ success: false, message: '获取医院失败: ' + e.message });
  }
});

app.use((req, res) => {
  sendError(res, '接口不存在', 404);
});

app.use((err, req, res, next) => {
  console.error('>> [Global Error Handler]:', err);
  logger.error(`错误: ${err.message}`, err);
  if (err.name === 'ValidationError') return sendError(res, err.message, 400);
  if (err.name === 'UnauthorizedError') return sendError(res, '未授权访问', 401);
  sendError(res, process.env.NODE_ENV === 'development' ? `${err.message}\n${err.stack}` : '服务器内部错误', 500);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  const protocol = isProd && process.env.SSL_KEY_PATH ? 'https' : 'http';
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║      🚀 小帮手后端服务已启动           ║
║                                       ║
║      环境: ${process.env.NODE_ENV || 'development'}                  ║
║      端口: ${PORT}                         ║
║      地址: ${protocol}://localhost:${PORT}      ║
║                                       ║
╚═══════════════════════════════════════╝
  `);
  logger.info(`服务器运行在端口 ${PORT} (${protocol.toUpperCase()} 模式)`);
});

process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，准备关闭服务器');
  process.exit(0);
});

module.exports = app;
