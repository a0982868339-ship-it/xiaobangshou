const { AlipaySdk } = require('alipay-sdk');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

/**
 * 支付宝 SDK 配置
 * 
 * 注意：
 * 1. APP_ID, PRIVATE_KEY, ALIPAY_PUBLIC_KEY 需在 .env 中配置
 * 2. 沙盒环境网关为 https://openapi-sandbox.dl.alipaydev.com/gateway.do
 */
const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
  signType: 'RSA2',
});

module.exports = alipaySdk;
