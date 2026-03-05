<template>
  <div class="login-container min-h-screen flex items-center justify-center p-6 lg:p-10">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <div class="login-card w-full max-w-5xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] grid grid-cols-1 lg:grid-cols-2 overflow-hidden animate-fade-in-up">
      <!-- 左侧装饰区 -->
      <div class="p-8 lg:p-12 flex flex-col justify-between bg-slate-50/50 border-b lg:border-b-0 lg:border-r border-slate-200/60">
        <div class="space-y-8">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-blue-200">🤝</div>
            <div>
              <div class="text-2xl font-bold tracking-tight text-slate-900">小帮手</div>
              <div class="text-xs font-semibold text-blue-600 uppercase tracking-widest">Management System</div>
            </div>
          </div>
          
          <div class="space-y-4">
            <h1 class="text-4xl font-bold text-slate-900 leading-tight">
              高效管理<br/>
              <span class="text-blue-600">成就卓越服务</span>
            </h1>
            <p class="text-slate-500 text-sm leading-relaxed max-w-xs">
              欢迎登录小帮手管理后台。在这里，我们为您提供全方位的运营支撑与数据决策能力。
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">系统状态</div>
              <div class="flex items-center gap-2">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span class="text-sm font-bold text-slate-700">运行良好</span>
              </div>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">安全等级</div>
              <div class="flex items-center gap-2 text-amber-500">
                <el-icon><Lock /></el-icon>
                <span class="text-sm font-bold text-slate-700">高强度加密</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden group">
          <div class="relative z-10 space-y-1">
            <div class="text-[10px] uppercase tracking-widest text-slate-400">安全审计</div>
            <div class="text-sm font-medium">所有操作行为均受系统实时审计</div>
          </div>
          <div class="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <el-icon :size="80"><Monitor /></el-icon>
          </div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="p-8 lg:p-12 flex flex-col justify-center">
        <div class="mb-10 text-center lg:text-left">
          <h2 class="text-3xl font-bold tracking-tight text-slate-900 mb-2">欢迎回来</h2>
          <p class="text-slate-500">请验证您的管理员权限以继续</p>
        </div>

        <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" label-position="top" class="space-y-6">
          <el-form-item label="管理员账号" prop="username">
            <el-input 
              v-model="loginForm.username" 
              placeholder="请输入账号" 
              class="custom-input"
            >
              <template #prefix>
                <el-icon class="el-input__icon"><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          
          <el-form-item label="安全密码" prop="password">
            <el-input 
              v-model="loginForm.password" 
              type="password" 
              placeholder="请输入密码" 
              show-password
              class="custom-input"
            >
              <template #prefix>
                <el-icon class="el-input__icon"><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="验证码" prop="captcha">
            <div class="flex items-center gap-4">
              <el-input 
                v-model="loginForm.captcha" 
                placeholder="请输入验证码" 
                class="custom-input flex-1"
                @keyup.enter="handleLogin"
              >
                <template #prefix>
                  <el-icon class="el-input__icon"><Check /></el-icon>
                </template>
              </el-input>
              <div class="captcha-box" @click="refreshCaptcha" title="点击刷新验证码">
                <canvas ref="captchaCanvas" width="120" height="44"></canvas>
              </div>
            </div>
          </el-form-item>

          <div class="pt-2">
            <el-button 
              type="primary" 
              class="login-btn"
              :loading="loading" 
              @click="handleLogin"
            >
              立即进入系统
            </el-button>
          </div>
        </el-form>

        <div class="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
          <span>© 2024 小帮手管理后台</span>
          <div class="flex gap-4">
            <a href="#" class="hover:text-blue-600 transition-colors">技术支持</a>
            <a href="#" class="hover:text-blue-600 transition-colors">隐私政策</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../utils/request'
import { ElMessage } from 'element-plus'
import { User, Lock, Check, Monitor } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(false)
const loginFormRef = ref(null)
const captchaCanvas = ref(null)
const generatedCaptcha = ref('')

const loginForm = reactive({
  username: '',
  password: '',
  captcha: ''
})

const loginRules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入安全密码', trigger: 'blur' }],
  captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

// 验证码逻辑
const refreshCaptcha = () => {
  const canvas = captchaCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const chars = '0123456789ABCDEF'
  let code = ''
  
  // 背景
  ctx.fillStyle = "#f8fafc"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // 噪点
  for(let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(37, 99, 235, ${Math.random() * 0.1})`
    ctx.beginPath()
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2)
    ctx.fill()
  }

  // 干扰线
  for(let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(37, 99, 235, 0.1)`
    ctx.beginPath()
    ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.stroke()
  }
  
  // 字符
  for (let i = 0; i < 4; i++) {
    const char = chars[Math.floor(Math.random() * chars.length)]
    code += char
    ctx.font = 'bold 24px "Inter", system-ui, sans-serif'
    ctx.fillStyle = "#1e40af"
    ctx.save()
    ctx.translate(25 * i + 20, 32)
    ctx.rotate((Math.random() * 20 - 10) * Math.PI / 180)
    ctx.fillText(char, 0, 0)
    ctx.restore()
  }
  generatedCaptcha.value = code.toLowerCase()
}

onMounted(() => {
  refreshCaptcha()
})

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      if (loginForm.captcha.toLowerCase() !== generatedCaptcha.value) {
        ElMessage.error('验证码错误，请重新输入')
        refreshCaptcha()
        return
      }

      loading.value = true
      try {
        const res = await request.post('/admin/auth/login', {
          username: loginForm.username,
          password: loginForm.password
        })
        const data = res.data || res
        localStorage.setItem('token', data.token)
        localStorage.setItem('admin_user', JSON.stringify(data.user))
        localStorage.setItem('admin_role', data.user.role)
        ElMessage.success('登录成功，欢迎回来')
        router.push('/')
      } catch (e) {
        refreshCaptcha()
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  background-color: #f8fafc;
  position: relative;
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
}

.blob {
  position: absolute;
  filter: blur(80px);
  border-radius: 100%;
  opacity: 0.4;
}

.blob-1 {
  width: 500px;
  height: 500px;
  background: #dbeafe;
  top: -100px;
  right: -100px;
  animation: float 20s infinite alternate;
}

.blob-2 {
  width: 400px;
  height: 400px;
  background: #fef3c7;
  bottom: -50px;
  left: -50px;
  animation: float 15s infinite alternate-reverse;
}

.blob-3 {
  width: 300px;
  height: 300px;
  background: #fae8ff;
  top: 20%;
  left: 10%;
  animation: float 25s infinite alternate;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 50px) scale(1.1); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.captcha-box {
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  background: #f8fafc;
}

.captcha-box:hover {
  border-color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
}

.custom-input :deep(.el-input__wrapper) {
  background-color: #f8fafc;
  box-shadow: none !important;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 16px;
  transition: all 0.2s;
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  background-color: #fff;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
}

.custom-input :deep(.el-input__inner) {
  font-weight: 500;
  color: #1e293b;
}

.login-btn {
  width: 100%;
  height: 52px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  box-shadow: 0 8px 20px -6px rgba(37, 99, 235, 0.5);
  transition: all 0.3s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -6px rgba(37, 99, 235, 0.6);
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
}

.login-btn:active {
  transform: translateY(0);
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #475569;
  font-size: 13px;
  margin-bottom: 6px !important;
}
</style>
