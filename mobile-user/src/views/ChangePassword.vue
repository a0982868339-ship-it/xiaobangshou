<template>
  <div class="change-password-page">
    <van-nav-bar title="修改密码" fixed placeholder left-arrow @click-left="$router.back()" class="custom-nav" />

    <div class="page-content">
      <!-- 1. 安全状态顶栏 -->
      <div class="security-status-card">
        <div class="status-icon-wrap">
          <van-icon name="shield-check" class="shield-icon" />
        </div>
        <div class="status-text-content">
          <div class="status-title">安全保障中</div>
          <div class="status-desc">为了您的账户安全，修改密码时请避开生日或连续数字。</div>
        </div>
      </div>

      <van-form @submit="onSubmit">
        <!-- 2. 修改表单卡片 -->
        <div class="form-card shadow-card">
          <van-field
            v-model="form.oldPassword"
            :type="showOld ? 'text' : 'password'"
            placeholder="输入旧密码验证身份"
            :rules="[{ required: true, message: '请填写旧密码' }]"
            class="premium-field"
            @click-right-icon="showOld = !showOld"
          >
            <template #label>
              <span class="required-dot">*</span>当前密码
            </template>
            <template #right-icon>
              <van-icon :name="showOld ? 'eye-o' : 'closed-eye'" />
            </template>
          </van-field>
          
          <van-field
            v-model="form.newPassword"
            :type="showNew ? 'text' : 'password'"
            placeholder="至少6位数字与字母"
            :rules="[
              { required: true, message: '请填写新密码' },
              { min: 6, message: '密码至少6位' }
            ]"
            class="premium-field"
            @click-right-icon="showNew = !showNew"
          >
            <template #label>
              <span class="required-dot">*</span>设置新密码
            </template>
            <template #right-icon>
              <van-icon :name="showNew ? 'eye-o' : 'closed-eye'" />
            </template>
          </van-field>
          
          <van-field
            v-model="form.confirmPassword"
            :type="showConfirm ? 'text' : 'password'"
            placeholder="再次输入以确认"
            :rules="[
              { required: true, message: '请确认新密码' },
              { validator: validateConfirm, message: '两次密码不一致' }
            ]"
            class="premium-field no-border"
            @click-right-icon="showConfirm = !showConfirm"
          >
            <template #label>
              <span class="required-dot">*</span>确认新密码
            </template>
            <template #right-icon>
              <van-icon :name="showConfirm ? 'eye-o' : 'closed-eye'" />
            </template>
          </van-field>
        </div>

        <!-- 3. 安全建议区 -->
        <div class="security-suggestions">
          <div class="suggestion-title">密码安全建议：</div>
          <div class="suggestion-item">· 使用字母、数字和符号的组合</div>
          <div class="suggestion-item">· 定期更换密码提升安全等级</div>
          <div class="suggestion-item">· 不要将密码告知他人或在非安全设备登录</div>
        </div>

        <!-- 4. 提交按钮 -->
        <div class="footer-btn">
          <van-button 
            block 
            round 
            type="primary" 
            native-type="submit" 
            :loading="loading" 
            class="update-btn"
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

const showOld = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirm = (val) => {
  return val === form.newPassword
}

const onSubmit = async () => {
  if (loading.value) return
  loading.value = true
  
  try {
    await request.put('/users/change-password', {
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    })
    
    showSuccessToast('密码已更新')
    
    // 清除登录信息并引导重新登录
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    
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

/* 1. 安全卡片样式 */
.security-status-card {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 16px;
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.15);
}

.status-icon-wrap {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shield-icon {
  font-size: 28px;
  color: white;
}

.status-text-content {
  flex: 1;
}

.status-title {
  font-size: 18px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
}

.status-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
}

/* 2. 表单卡片样式 */
.form-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 24px;
}

.premium-field {
  padding: 20px;
}

.premium-field :deep(.van-field__label) {
  font-weight: 600;
  color: #323233;
  width: 90px;
}

.required-dot {
  color: #ee0a24;
  margin-right: 4px;
}

.no-border::after {
  display: none !important;
}

/* 3. 安全建议样式 */
.security-suggestions {
  padding: 0 10px;
  margin-bottom: 40px;
}

.suggestion-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 12px;
}

.suggestion-item {
  font-size: 12px;
  color: #969799;
  margin-bottom: 8px;
  line-height: 1.4;
}

/* 4. 底部按钮样式 */
.update-btn {
  height: 52px;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
  border: none !important;
  box-shadow: 0 8px 16px rgba(17, 153, 142, 0.2);
}

.shadow-card {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.custom-nav :deep(.van-nav-bar__title) {
  font-weight: 700;
}
</style>
