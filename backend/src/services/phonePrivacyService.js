const Core = require('@alicloud/pop-core');

// 阿里云配置
const client = new Core({
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || 'YOUR_ACCESS_KEY_ID',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || 'YOUR_ACCESS_KEY_SECRET',
  endpoint: 'https://dyplsapi.aliyuncs.com',
  apiVersion: '2017-05-25'
});

/**
 * 虚拟号绑定服务 (AXB 模式)
 * @param {string} userPhone 用户真实手机号
 * @param {string} providerPhone 服务者真实手机号
 * @param {number} expireSeconds 有效期（建议设置为订单过期时间）
 */
exports.bindAXB = async (userPhone, providerPhone, expireSeconds = 3600 * 2) => {
  const params = {
    "RegionId": "cn-hangzhou",
    "PoolKey": "FC123456", // 阿里云后台申请的号池Key
    "PhoneNoA": userPhone,
    "PhoneNoB": providerPhone,
    "Expiration": new Date(Date.now() + expireSeconds * 1000).toISOString(),
    "ExpectCity": "杭州" // 尽量匹配本地号码，提高接听率
  };

  try {
    const response = await client.request('BindAxb', params, { method: 'POST' });
    if (response.Code === 'OK') {
      // 返回分配给这笔订单的虚拟号 X
      return response.SecretBindDto.SecretNo;
    }
    throw new Error(response.Message);
  } catch (err) {
    console.error('虚拟号绑定失败:', err);
    return null;
  }
};

/**
 * 订单完成后手动解绑
 */
exports.unbindAXB = async (subsId) => {
  // 阿里云通常会自动到时解绑，但也可以手动调 UnbindSubscription 提前释放资源
};
