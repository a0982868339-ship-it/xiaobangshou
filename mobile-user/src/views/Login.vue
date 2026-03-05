<template>
  <div class="login-page">
    <!-- 1. 背景装饰：极简流光 -->
    <div class="bg-glow"></div>
    
    <div class="login-content">
      <!-- 2. Logo & 欢迎语 -->
      <div class="header-section">
        <div class="logo-wrapper">
          <span class="logo-emoji">🤝</span>
        </div>
        <h1 class="welcome-title">欢迎使用小帮手</h1>
        <p class="welcome-subtitle">为您提供专业、可靠、温暖的陪诊与宠物照顾服务</p>
      </div>

      <!-- 3. 登录表单卡片 (一体化质感) -->
      <div class="form-container shadow-premium">
        <van-form @submit="onSubmit">
          <div class="input-section">
            <div class="input-item">
              <label class="i-label">手机号</label>
              <van-field
                v-model="phone"
                type="tel"
                maxlength="11"
                placeholder="请输入您的手机号"
                :border="false"
                class="minimal-field"
              >
                <template #left-icon>
                  <van-icon name="phone-o" />
                </template>
              </van-field>
            </div>

            <div class="input-item mt-24">
              <label class="i-label">验证码</label>
              <van-field
                v-model="sms"
                type="digit"
                maxlength="6"
                placeholder="请输入验证码"
                :border="false"
                class="minimal-field"
              >
                <template #left-icon>
                  <van-icon name="shield-o" />
                </template>
                <template #button>
                  <van-button
                    size="small"
                    plain
                    round
                    class="btn-send-code"
                    :disabled="counting"
                    @click.stop="handleSmsClick"
                  >
                    {{ counting ? `${countdown}s` : '获取验证码' }}
                  </van-button>
                </template>
              </van-field>
            </div>
          </div>

          <div class="submit-action">
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              class="btn-login-main"
              :loading="loading"
            >
              登录 / 注册
            </van-button>
          </div>
        </van-form>

        <!-- 其他方式 -->
        <div class="other-methods">
          <div class="method-divider">
            <span class="line"></span>
            <span class="text">其他登录方式</span>
            <span class="line"></span>
          </div>
          
          <div class="social-grid">
            <div class="social-btn wechat">
              <van-icon name="wechat" />
            </div>
            <div class="social-btn alipay">
              <van-icon name="alipay" />
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 底部协议 -->
      <div class="agreement-footer">
        <van-checkbox v-model="agreed" icon-size="16px" checked-color="#11998e">
          <span class="agree-text">
            登录即代表您已同意
            <span class="link">《用户协议》</span> 与 <span class="link">《隐私政策》</span>
          </span>
        </van-checkbox>
      </div>
    </div>

    <!-- 5. 阿里云验证码 (智能验证) -->
    <div id="captcha-element"></div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { sendSms, login } from '../api'

const router = useRouter()
const phone = ref('')
const sms = ref('')
const agreed = ref(true)
const counting = ref(false)
const countdown = ref(60)
const loading = ref(false)

// 阿里云验证码逻辑
let captcha = null
let captchaConfig = {
  sceneId: 'yscsrjxn',
  prefix: 'u11u6q',
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
        console.log('>> [Captcha] 尝试加载 SDK:', url)
        await loadScript(url)
        if (window.initAliyunCaptcha) {
          console.log('>> [Captcha] SDK 加载成功:', url)
          return resolve()
        }
      } catch (e) {
        console.warn('>> [Captcha] SDK 加载失败:', url, e)
      }
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
    // 如果阿里云加载失败，为了不影响测试，开发环境下可以提供一个降级提示
    if (process.env.NODE_ENV === 'development') {
      console.warn('>> [Captcha] 开发环境跳过验证码初始化')
    }
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
  if (!agreed.value) return showToast('请先勾选同意协议')
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
    showLoadingToast({ message: '正在发送...', forbidClick: true })
    const data = await sendSms(phone.value, captchaVerifyParam)
    closeToast()
    
    if (data.code) {
      sms.value = data.code
      showToast('验证码已自动填充 (演示模式)')
    } else {
      showToast('验证码已发送')
    }
    
    counting.value = true
    countdown.value = 60
    timer = setInterval(() => {
      if (countdown.value > 0) {
        countdown.value--
      } else {
        clearInterval(timer)
        counting.value = false
      }
    }, 1000)
  } catch (e) {
    closeToast()
  }
}

const onSubmit = async () => {
  if (!agreed.value) return showToast('请先勾选同意协议')
  if (!phone.value || !sms.value) return showToast('请填写完整信息')
  
  try {
    loading.value = true
    const data = await login({ phone: phone.value, code: sms.value })
    localStorage.setItem('token', data.token)
    localStorage.setItem('userInfo', JSON.stringify(data.user))
    showToast({ message: '登录成功', type: 'success' })
    setTimeout(() => {
      router.push('/user')
    }, 500)
  } catch (error) {
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #ffffff;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 极简流光背景 */
.bg-glow {
  position: absolute;
  top: -10%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(17, 153, 142, 0.08) 0%, rgba(255, 255, 255, 0) 70%);
  border-radius: 50%;
  z-index: 0;
}

.login-content {
  position: relative;
  z-index: 1;
  padding: 80px 28px 40px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Logo 区域 */
.header-section {
  margin-bottom: 48px;
}

.logo-wrapper {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.2);
}

.logo-emoji {
  font-size: 32px;
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
  line-height: 1.6;
}

/* 表单卡片 */
.form-container {
  background: white;
  border-radius: 32px;
  padding: 32px 24px;
  border: 1px solid #f1f5f9;
}

.shadow-premium {
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.04);
}

.i-label {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 12px;
  padding-left: 4px;
}

.minimal-field {
  background: #f8fafc;
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid transparent;
  transition: all 0.3s;
}

.minimal-field:focus-within {
  background: white;
  border-color: #11998e;
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.05);
}

.minimal-field :deep(.van-field__left-icon) {
  margin-right: 12px;
  color: #11998e;
}

.btn-send-code {
  border: none !important;
  color: #11998e !important;
  font-weight: 700;
  background: transparent !important;
}

.submit-action {
  margin-top: 40px;
}

.btn-login-main {
  height: 56px;
  background: #1a1a1a !important; /* 采用极致深色提升质感 */
  border: none !important;
  font-size: 16px;
  font-weight: 800;
  color: white !important;
  border-radius: 18px !important;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.btn-login-main:active {
  transform: translateY(2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

/* 其他登录方式 */
.other-methods {
  margin-top: 40px;
}

.method-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.method-divider .line {
  flex: 1;
  height: 1px;
  background: #f1f5f9;
}

.method-divider .text {
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 500;
}

.social-grid {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.social-btn {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: #f8fafc;
  color: #94a3b8;
  border: 1px solid #f1f5f9;
  transition: all 0.2s;
}

.social-btn.wechat:active { color: #07c160; border-color: #07c160; background: #f0fdf4; }
.social-btn.alipay:active { color: #1677ff; border-color: #1677ff; background: #f0f7ff; }

/* 协议底部 */
.agreement-footer {
  margin-top: auto;
  padding-bottom: 20px;
}

.agree-text {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
}

.link {
  color: #11998e;
  font-weight: 600;
}

/* 验证码弹窗样式 */
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
  transition: left 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  border: 1px solid #e2e8f0;
}

.slider-handle.no-transition {
  transition: none !important;
}

.mt-24 { margin-top: 24px; }
</style>
