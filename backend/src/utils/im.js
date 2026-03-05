const TLSSigAPIv2 = require('tls-sig-api-v2');
const configLoader = require('./config');

/**
 * 获取实时 IM 配置
 */
const getIMConfig = async () => {
  return {
    SDKAppID: await configLoader.getNumber('TENCENT_IM_SDKAPPID', 1600123393),
    SecretKey: await configLoader.get('TENCENT_IM_SECRET', '29f11b7cc4fad055c583d21fd1a1cb3da7ea25a3ce537d268b3d819b47b3037d'),
    EXPIRE_TIME: 86400 * 7
  };
};

const axios = require('axios');
const crypto = require('crypto');

/**
 * 自动导入账号到腾讯云
 */
const importAccount = async (userId, nickname) => {
  const IM_CONFIG = await getIMConfig();
  if (!IM_CONFIG.SDKAppID || !IM_CONFIG.SecretKey) return;
  
  const api = new TLSSigAPIv2.Api(IM_CONFIG.SDKAppID, IM_CONFIG.SecretKey);
  const adminSig = api.genUserSig('admin', 3600);
  
  const random = crypto.randomInt(0, 4294967295);
  const url = `https://console.tim.qq.com/v4/im_open_login_svc/account_import?sdkappid=${IM_CONFIG.SDKAppID}&identifier=admin&usersig=${adminSig}&random=${random}&contenttype=json`;

  try {
    await axios.post(url, {
      "UserID": userId.toString(),
      "Nick": nickname || `User_${userId}`
    });
    console.log(`>> [IM] 账号 ${userId} 已同步至云端`);
  } catch (e) {
    console.error(`>> [IM] 账号同步失败:`, e.message);
  }
};

/**
 * 生成腾讯云 IM 用户签名 (UserSig)
 */
exports.generateUserSig = async (userId, nickname) => {
  const IM_CONFIG = await getIMConfig();
  if (!IM_CONFIG.SDKAppID || !IM_CONFIG.SecretKey) {
    console.warn('⚠️ 腾讯云 IM 参数未配置');
    return '';
  }
  
  importAccount(userId, nickname);
  
  const api = new TLSSigAPIv2.Api(IM_CONFIG.SDKAppID, IM_CONFIG.SecretKey);
  return api.genUserSig(userId.toString(), IM_CONFIG.EXPIRE_TIME);
};

// 为了兼容旧代码，这里导出一个能获取最新配置的对象
exports.getIMConfig = getIMConfig;
