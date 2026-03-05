const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined
});

client.connect()
  .then(() => {
    console.log('✅ Redis连接成功');
  })
  .catch(err => {
    console.error('⚠️  Redis连接失败:', err.message);
  });

client.on('error', (err) => {
  console.error('Redis错误:', err);
});

module.exports = client;
