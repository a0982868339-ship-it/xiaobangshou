const Captcha20230305 = require('@alicloud/captcha20230305');
const OpenApi = require('@alicloud/openapi-client');
const TeaUtil = require('@alicloud/tea-util');
const logger = require('../utils/logger');

class CaptchaService {
    /**
     * 初始化阿里云客户端
     */
    static createClient() {
        let accessKeyId = process.env.ALICAY_CAPTCHA_ACCESS_KEY_ID;
        let accessKeySecret = process.env.ALICAY_CAPTCHA_ACCESS_KEY_SECRET;
        let endpoint = process.env.ALICAY_CAPTCHA_ENDPOINT || 'captcha.cn-shanghai.aliyuncs.com';

        try {
            const dotenv = require('dotenv');
            const fs = require('fs');
            const path = require('path');
            const envPath = path.resolve(__dirname, '../../.env');
            if (fs.existsSync(envPath)) {
                const envConfig = dotenv.parse(fs.readFileSync(envPath));
                accessKeyId = envConfig.ALICAY_CAPTCHA_ACCESS_KEY_ID || accessKeyId;
                accessKeySecret = envConfig.ALICAY_CAPTCHA_ACCESS_KEY_SECRET || accessKeySecret;
                endpoint = envConfig.ALICAY_CAPTCHA_ENDPOINT || endpoint;
            }
        } catch (e) {
            logger.error('>> [CaptchaService] 读取 .env 失败:', e.message);
        }

        const config = new OpenApi.Config({
            accessKeyId,
            accessKeySecret,
            endpoint,
        });
        return new Captcha20230305.default(config);
    }

    /**
     * 校验验证码
     * @param {string} captchaVerifyParam 前端返回的校验参数
     */
    static async verifyCaptcha(captchaVerifyParam) {
        // 开发模式下如果未配置 Key，则跳过校验
        if (process.env.NODE_ENV === 'development' && !process.env.ALICAY_CAPTCHA_ACCESS_KEY_ID) {
            logger.warn('>> [CaptchaService] 开发模式且未配置阿里云 Key，跳过校验');
            return true;
        }

        try {
            const client = this.createClient();
            const verifyCaptchaRequest = new Captcha20230305.VerifyCaptchaRequest({
                captchaVerifyParam: captchaVerifyParam,
            });
            const runtime = new TeaUtil.RuntimeOptions({});
            
            const response = await client.verifyCaptchaWithOptions(verifyCaptchaRequest, runtime);
            
            if (response.body.result.verifyResult) {
                return true;
            } else {
                logger.error('>> [CaptchaService] 验证码校验失败:', response.body.result.verifyCode);
                return false;
            }
        } catch (error) {
            logger.error('>> [CaptchaService] 阿里云验证码服务异常:', error);
            // 如果服务异常，为了不影响业务，开发环境可以放行，生产环境建议拦截
            return process.env.NODE_ENV === 'development';
        }
    }
}

module.exports = CaptchaService;
