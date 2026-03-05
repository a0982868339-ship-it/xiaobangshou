<template>
  <div class="login-page">
    <!-- 背景装饰：高光渐变圆 -->
    <div class="bg-decoration-1"></div>
    <div class="bg-decoration-2"></div>
    
    <div class="nav-back" @click="$router.back()">
      <van-icon name="arrow-left" />
    </div>
    
    <div class="login-container">
      <!-- 1. Logo & 标题区域 -->
      <div class="header-section">
        <div class="logo-wrapper shadow-premium">
          <div class="logo-inner">
            <span class="logo-text">帮</span>
            <div class="logo-dot"></div>
          </div>
        </div>
        <h1 class="welcome-title">服务者登录</h1>
        <p class="welcome-subtitle">加入小帮手，开启您的专业服务之旅</p>
      </div>

      <!-- 2. 登录表单 -->
      <div class="form-section glass-card">
        <van-form @submit="onSubmit">
          <div class="input-group">
            <div class="input-item">
              <label class="i-label">手机号</label>
              <van-field
                v-model="phone"
                name="phone"
                placeholder="请输入您的手机号"
                :border="false"
                class="premium-input"
                :rules="[{ required: true, message: '请填写手机号' }]"
              >
                <template #left-icon>
                  <van-icon name="phone-o" />
                </template>
              </van-field>
            </div>

            <div class="input-item mt-20">
              <label class="i-label">验证码</label>
              <van-field
                v-model="sms"
                center
                clearable
                placeholder="6位数字验证码"
                :border="false"
                class="premium-input"
                :rules="[{ required: true, message: '请填写验证码' }]"
              >
                <template #left-icon>
                  <van-icon name="shield-o" />
                </template>
                <template #button>
                  <van-button 
                    size="small" 
                    plain 
                    round 
                    type="primary" 
                    class="btn-send-sms"
                    :disabled="counting" 
                    @click.stop="handleSmsClick"
                  >
                    {{ counting ? `${countdown}s` : '获取验证码' }}
                  </van-button>
                </template>
              </van-field>
            </div>
          </div>

          <!-- 3. 协议勾选 -->
          <div class="agreement-check mt-24">
            <van-checkbox v-model="agreed" icon-size="16px" checked-color="#11998e">
              <span class="agree-text">
                我已阅读并同意 <span class="link">《服务协议》</span> 和 <span class="link">《隐私政策》</span>
              </span>
            </van-checkbox>
          </div>

          <div class="submit-action">
            <van-button 
              round 
              block 
              class="btn-login-premium" 
              native-type="submit"
              :loading="loading"
            >
              登录 / 注册
            </van-button>
          </div>
        </van-form>
      </div>

      <!-- 4. 底部提示 -->
      <div class="footer-tips">
        <div class="notice-pill">
          <van-icon name="info-o" />
          <span>首次登录需完成实名认证方可接单</span>
        </div>
      </div>
    </div>

    <!-- 5. 阿里云验证码 (智能验证) -->
    <div id="captcha-element"></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { sendSms, login } from '../api'

const router = useRouter()
const route = useRoute()
const phone = ref('')
const sms = ref('')
const agreed = ref(false)
const counting = ref(false)
const countdown = ref(60)
const loading = ref(false)

// 阿里云验证码逻辑
let captcha = null
let captchaConfig = {
  sceneId: 'yscsrjxn',
  prefix: '1i1u6q',
  region: 'cn'
}

const loadCaptchaSDK = () => {
  const loadScript = (url) => new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  return new Promise(async (resolve, reject) => {
    if (window.initAliyunCaptcha) return resolve()

    const baseUrl = import.meta.env.VITE_API_URL || ''
    const apiBase = baseUrl ? (baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`) : '/api'
    try {
      const resp = await fetch(`${apiBase}/common/captcha-config`)
      if (resp.ok) {
        const json = await resp.json()
        const data = json.data || json
        captchaConfig = {
          ...captchaConfig,
          ...data
        }
      }
    } catch (e) {}

    window.AliyunCaptchaConfig = {
      region: captchaConfig.region || 'cn',
      prefix: captchaConfig.prefix || 'u11u6q'
    }
    const urls = [
      `${apiBase}/common/captcha-sdk.js`,
      'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js',
      'https://g.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js'
    ]

    for (const url of urls) {
      try {
        console.log('>> [Captcha] 正在加载 SDK:', url)
        await loadScript(url)
        if (window.initAliyunCaptcha) return resolve()
      } catch (e) {}
    }
    reject(new Error('阿里云SDK加载失败'))
  })
}

const initCaptcha = async () => {
  console.log('>> [Captcha] 正在初始化...')
  try {
    await loadCaptchaSDK()
    console.log('>> [Captcha] SDK 加载成功')
    
    if (!window.initAliyunCaptcha) {
      throw new Error('window.initAliyunCaptcha 未定义')
    }

    console.log('>> [Captcha] Final Config:', {
      SceneId: captchaConfig.sceneId || 'yscsrjxn',
      prefix: window.AliyunCaptchaConfig.prefix
    })
    window.initAliyunCaptcha({
      SceneId: captchaConfig.sceneId || 'yscsrjxn',
      button: '#captcha-element', // 绑定一个隐藏元素，通过代码触发
      captchaVerifyCallback: captchaVerifyCallback,
      onBizResultCallback: onBizResultCallback,
      getInstance: (instance) => {
        console.log('>> [Captcha] 实例获取成功')
        captcha = instance
      },
      slideStyle: {
        width: 320,
        height: 40,
      },
      language: 'cn',
      immediate: false,
    })
  } catch (error) {
    console.error('>> [Captcha] 初始化失败:', error)
  }
}

// 验证码校验回调
async function captchaVerifyCallback(captchaVerifyParam) {
  try {
    // 验证码通过后，直接触发发送短信
    await sendCode(captchaVerifyParam)
    return {
      captchaResult: true,
      bizResult: true,
    }
  } catch (error) {
    return {
      captchaResult: false,
      bizResult: false,
    }
  }
}

function onBizResultCallback(bizResult) {
  console.log('>> [Captcha] Biz Result:', bizResult)
}

// 移除动态加载，改为直接初始化
onMounted(() => {
  initCaptcha()
})

onUnmounted(() => {
  if (captcha) {
    captcha.destroy()
  }
})

const handleSmsClick = () => {
  if (!agreed.value) return showToast('请先阅读并同意服务协议')
  if (!phone.value) return showToast('请输入手机号')
  if (!/^1[3-9]\d{9}$/.test(phone.value)) return showToast('手机号格式不正确')
  
  if (captcha) {
    captcha.show() // 唤起阿里云验证码
  } else {
    // 降级处理：如果阿里云 SDK 加载失败，开发环境下允许直接发送
    console.warn('>> [Captcha] 验证码组件未就绪，开发环境自动降级')
    sendCode()
  }
}

let timer = null

const sendCode = async (captchaVerifyParam) => {
  try {
    showLoadingToast({ message: '发送中...', forbidClick: true })
    const data = await sendSms(phone.value, captchaVerifyParam)
    closeToast()
    
    if (data.code) {
      sms.value = data.code
    }
    showToast('验证码已发送')
    
    counting.value = true
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
        counting.value = false
        countdown.value = 60
      }
    }, 1000)
  } catch (error) {
    closeToast()
  }
}

const onSubmit = async () => {
  if (!agreed.value) return showToast('请先阅读并同意服务协议')
  if (!sms.value) return showToast('请输入验证码')
  
  try {
    loading.value = true
    const data = await login({ phone: phone.value, code: sms.value })
    localStorage.setItem('provider_token', data.token)
    localStorage.setItem('provider_userInfo', JSON.stringify(data.user))
    showToast({ message: '登录成功', type: 'success' })
    
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (error) {
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f8fafc;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 背景装饰 */
.bg-decoration-1 {
  position: absolute;
  top: -100px;
  right: -50px;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(17, 153, 142, 0.15) 0%, rgba(17, 153, 142, 0) 70%);
  border-radius: 50%;
  z-index: 1;
}

.bg-decoration-2 {
  position: absolute;
  bottom: -50px;
  left: -100px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(56, 239, 125, 0.1) 0%, rgba(56, 239, 125, 0) 70%);
  border-radius: 50%;
  z-index: 1;
}

.nav-back {
  position: fixed;
  top: 40px;
  left: 20px;
  z-index: 100;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  color: #1e293b;
}

.login-container {
  padding: 100px 32px 40px;
  position: relative;
  z-index: 10;
  flex: 1;
}

/* Logo 区域优化 */
.header-section {
  margin-bottom: 48px;
}

.logo-wrapper {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  position: relative;
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.logo-inner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 26px;
  font-weight: bold;
  color: white;
  font-family: "PingFang SC", "STHeiti", sans-serif;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
  display: block;
  transform: translateY(1px);
}

.logo-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(255,255,255,0.6);
}

.welcome-title {
  font-size: 28px;
  font-weight: 900;
  color: #1e293b;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.welcome-subtitle {
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.5;
}

/* 表单卡片 */
.form-section {
  padding: 32px 24px;
  margin-bottom: 40px;
}

.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.03);
}

.i-label {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 12px;
  padding-left: 4px;
}

.premium-input {
  background: #f1f5f9;
  border-radius: 16px;
  padding: 12px 16px;
}

.premium-input :deep(.van-field__left-icon) {
  margin-right: 12px;
  color: #11998e;
  font-size: 18px;
}

.btn-send-sms {
  height: 32px;
  border-color: #11998e;
  color: #11998e;
  font-weight: 700;
  font-size: 12px;
  background: white;
}

/* 协议勾选 */
.agreement-check {
  padding-left: 4px;
}

.agree-text {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.6;
}

.link {
  color: #11998e;
  font-weight: 700;
}

.submit-action {
  margin-top: 40px;
}

.btn-login-premium {
  height: 56px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
  border: none !important;
  font-size: 16px;
  font-weight: 800;
  color: white !important;
  box-shadow: 0 12px 24px rgba(17, 153, 142, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 底部区域 */
.footer-tips {
  text-align: center;
}

.notice-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #eefaf8;
  color: #11998e;
  padding: 8px 20px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
}

/* 验证码弹窗 */
.captcha-popup {
  width: 320px;
  background: white;
  padding: 24px;
}

.captcha-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.ch-title {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}

.cb-tips {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 20px;
}

.captcha-image-mock {
  width: 100%;
  height: 140px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-radius: 12px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.mock-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: radial-gradient(#11998e 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.1;
}

.mock-puzzle-piece {
  position: absolute;
  top: 40px;
  width: 44px;
  height: 44px;
  background: #11998e;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
  z-index: 5;
  transition: left 0.1s linear;
}

.mock-target-slot {
  position: absolute;
  top: 40px;
  right: 10px;
  width: 44px;
  height: 44px;
  background: rgba(0, 0, 0, 0.05);
  border: 2px dashed #94a3b8;
  border-radius: 10px;
}

.slider-track {
  height: 50px;
  background: #f1f5f9;
  border-radius: 25px;
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.slider-bg {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(17, 153, 142, 0.1);
  transition: width 0.1s linear;
}

.slider-text {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #94a3b8;
  font-weight: 600;
  pointer-events: none;
  transition: opacity 0.2s;
}

.slider-handle {
  width: 50px;
  height: 50px;
  background: white;
  border-radius: 50%;
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #11998e;
  cursor: grab;
  z-index: 10;
  transition: left 0.1s linear;
  border: 1px solid #e2e8f0;
}

.slider-handle:active {
  cursor: grabbing;
}

.shadow-premium {
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.2);
}

.mt-20 { margin-top: 20px; }
.mt-24 { margin-top: 24px; }
</style>
