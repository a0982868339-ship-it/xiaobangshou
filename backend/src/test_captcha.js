
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Mock logger
const logger = {
    error: console.error,
    warn: console.warn,
    info: console.log
};

async function test() {
    const envPath = path.resolve(__dirname, '../.env');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    process.env.ALICAY_CAPTCHA_ACCESS_KEY_ID = envConfig.ALICAY_CAPTCHA_ACCESS_KEY_ID;
    process.env.ALICAY_CAPTCHA_ACCESS_KEY_SECRET = envConfig.ALICAY_CAPTCHA_ACCESS_KEY_SECRET;
    process.env.ALICAY_CAPTCHA_ENDPOINT = envConfig.ALICAY_CAPTCHA_ENDPOINT;

    const CaptchaService = require('./services/CaptchaService');
    
    console.log('Testing with AK:', process.env.ALICAY_CAPTCHA_ACCESS_KEY_ID.substring(0, 5) + '...');
    
    try {
        // This should fail with "Invalid Parameter" or similar, but NOT "Signature Mismatch" if keys are correct
        const result = await CaptchaService.verifyCaptcha('invalid_token');
        console.log('Result:', result);
    } catch (e) {
        console.error('Error during test:', e);
    }
}

test();
