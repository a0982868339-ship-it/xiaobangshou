<template>
  <div class="change-password-page">
    <van-nav-bar 
      title="修改密码" 
      fixed 
      placeholder 
      left-arrow 
      @click-left="$router.back()"
      class="custom-nav"
    />

    <div class="page-content">
      <!-- 1. 安全提示头部 -->
      <div class="security-banner shadow-card">
        <div class="icon-box">
          <van-icon name="lock" />
        </div>
        <div class="banner-text">
          <div class="b-title">安全保障中</div>
          <div class="b-desc">为了您的账户安全，修改密码时请避开生日或连续数字。</div>
        </div>
      </div>

      <van-form @submit="onSubmit">
        <!-- 2. 密码输入卡片 -->
        <div class="form-card shadow-card">
          <van-cell-group :border="false">
            <van-field
              v-model="form.oldPassword"
              :type="oldPasswordVisible ? 'text' : 'password'"
              label="当前密码"
              placeholder="输入旧密码验证身份"
              :right-icon="oldPasswordVisible ? 'eye-o' : 'closed-eye'"
              @click-right-icon="oldPasswordVisible = !oldPasswordVisible"
              required
              clearable
            />
            
            <van-field
              v-model="form.newPassword"
              :type="newPasswordVisible ? 'text' : 'password'"
              label="设置新密码"
              placeholder="至少6位数字与字母"
              :right-icon="newPasswordVisible ? 'eye-o' : 'closed-eye'"
              @click-right-icon="newPasswordVisible = !newPasswordVisible"
              required
              clearable
              :rules="[{ min: 6, message: '新密码不能少于6位' }]"
            />
            
            <van-field
              v-model="form.confirmPassword"
              :type="confirmPasswordVisible ? 'text' : 'password'"
              label="确认新密码"
              placeholder="再次输入以确认"
              :right-icon="confirmPasswordVisible ? 'eye-o' : 'closed-eye'"
              @click-right-icon="confirmPasswordVisible = !confirmPasswordVisible"
              required
              clearable
              :rules="[{ validator: validateConfirm, message: '两次输入不一致' }]"
            />
          </van-cell-group>
        </div>

        <!-- 3. 安全建议 -->
        <div class="security-tips">
          <div class="tip-header">密码安全建议：</div>
          <div class="tip-item">· 使用字母、数字和符号的组合</div>
          <div class="tip-item">· 定期更换密码提升安全等级</div>
          <div class="tip-item">· 不要将密码告知他人或在非安全设备登录</div>
        </div>

        <!-- 4. 提交按钮 -->
        <div class="footer-btn">
          <van-button 
            type="primary" 
            block 
            round 
            native-type="submit" 
            :loading="loading"
            class="save-btn"
          >
            立即更新密码
          </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import request from '../api'

const router = useRouter()
const loading = ref(false)

const oldPasswordVisible = ref(false)
const newPasswordVisible = ref(false)
const confirmPasswordVisible = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirm = (val) => val === form.newPassword

const onSubmit = async () => {
  loading.value = true
  try {
    await request.post('/users/change-password', {
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    })
    
    showSuccessToast('密码修改成功')
    
    // 清除登录信息并引导重新登录
    localStorage.removeItem('provider_token')
    localStorage.removeItem('provider_userInfo')
    
    setTimeout(() => {
      router.replace('/login')
    }, 1500)
  } catch (error) {
    console.error('修改密码失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.change-password-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.page-content {
  padding: 20px 16px;
}

.shadow-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* 1. 头部 Banner */
.security-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  margin-bottom: 20px;
}

.icon-box {
  width: 48px;
  height: 48px;
  background: rgba(255,255,255,0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.b-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}
.b-desc {
  font-size: 12px;
  opacity: 0.85;
  line-height: 1.4;
}

/* 2. 表单卡片 */
.form-card {
  margin-bottom: 24px;
  padding: 8px 0;
}

/* 3. 安全建议 */
.security-tips {
  padding: 0 12px;
  margin-bottom: 40px;
}
.tip-header {
  font-size: 13px;
  color: #323233;
  font-weight: bold;
  margin-bottom: 10px;
}
.tip-item {
  font-size: 12px;
  color: #969799;
  margin-bottom: 6px;
  line-height: 1.5;
}

/* 4. 按钮 */
.save-btn {
  height: 50px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border: none;
  box-shadow: 0 8px 16px rgba(17, 153, 142, 0.2);
}

:deep(.van-field__label) {
  color: #646566;
  font-weight: 500;
}
</style>
