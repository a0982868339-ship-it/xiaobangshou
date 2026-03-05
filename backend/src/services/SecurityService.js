const db = require('../config/database');
const redis = require('../config/redis');

const CaptchaService = require('./CaptchaService');

/**
 * 安全与认证服务：负责由于验证码、实名审核、隐私掩码相关的业务逻辑
 */
class SecurityService {
    /**
     * 发送并存储验证码
     */
    static async sendSmsCode(phone, captchaVerifyParam) {
        // 1. 验证码校验
        if (captchaVerifyParam) {
            const isCaptchaValid = await CaptchaService.verifyCaptcha(captchaVerifyParam);
            if (!isCaptchaValid) {
                throw new Error('安全验证未通过');
            }
        } else if (process.env.NODE_ENV !== 'development') {
            throw new Error('请先完成安全验证');
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 开发模式直接返回
        if (process.env.NODE_ENV === 'development') {
            return code;
        }

        // 存储到 Redis
        await redis.setEx(`sms:${phone}`, 300, code);
        // 此处可扩展调用阿里云短信 API
        return code;
    }

    /**
     * 验证短信验证码
     */
    static async verifySmsCode(phone, code) {
        if (process.env.NODE_ENV === 'development') return true;

        const savedCode = await redis.get(`sms:${phone}`);
        if (!savedCode || savedCode !== code) {
            return false;
        }
        await redis.del(`sms:${phone}`);
        return true;
    }

    /**
     * 更新用户实名状态
     */
    static async updateRealNameStatus(userId, status, connection = db) {
        await connection.query(
            'UPDATE users SET id_card_verified = ? WHERE id = ?',
            [status, userId]
        );
    }

    /**
     * 记录积分流水
     */
    static async recordPoints(userId, type, amount, source, remark, connection = db) {
        await connection.query(
            'INSERT INTO points_records (user_id, type, amount, source, remark) VALUES (?, ?, ?, ?, ?)',
            [userId, type, amount, source, remark]
        );
    }
}

module.exports = SecurityService;
