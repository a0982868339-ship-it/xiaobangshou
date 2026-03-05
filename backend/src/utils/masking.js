/**
 * 敏感数据脱敏工具类
 * 实现金融级隐私保护
 */

/**
 * 手机号脱敏: 13812345678 -> 138****5678
 */
const maskPhone = (phone) => {
  if (!phone || phone.length < 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * 身份证脱敏: 230101199001011234 -> 2301**********1234
 */
const maskIdCard = (idCard) => {
  if (!idCard || idCard.length < 18) return idCard;
  return idCard.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2');
};

/**
 * 姓名脱敏: 张三 -> 张* / 欧阳锋 -> 欧**
 */
const maskName = (name) => {
  if (!name) return name;
  if (name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
};

/**
 * 地址脱敏: 浙江省杭州市西湖区某某路1号 -> 浙江省杭州市西湖区***
 */
const maskAddress = (address) => {
  if (!address || address.length < 6) return address;
  // 保留前6位（通常是省市区），后面脱敏
  return address.substring(0, 6) + '***';
};

module.exports = {
  maskPhone,
  maskIdCard,
  maskName,
  maskAddress
};
