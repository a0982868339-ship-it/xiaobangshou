<template>
  <div class="security-page">
    <van-nav-bar title="账户安全" fixed placeholder left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <div class="security-header shadow-card">
        <div class="shield-icon">
          <van-icon name="shield-o" />
        </div>
        <div class="security-status">
          <div class="status-title">您的账户安全等级：高</div>
          <div class="status-desc">系统已开启多重安全验证，实时保障资金与数据隐私</div>
        </div>
      </div>

      <div class="section-card shadow-card">
        <van-cell-group :border="false">
          <van-cell title="修改登录密码" is-link to="/settings/change-password" label="定期更换密码保障账户安全" />
          <van-cell title="账号实名认证" label="已完成实名认证" center>
            <template #value>
              <van-tag type="success" plain round>已实名</van-tag>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <div class="section-card shadow-card danger-zone">
        <van-cell title="注销账号" is-link @click="handleDeleteAccount" label="账号注销后数据将无法恢复" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showDialog } from 'vant'
import request from '../api'

const router = useRouter()
const userInfo = ref({})

onMounted(() => {
  const saved = localStorage.getItem('provider_userInfo')
  if (saved) userInfo.value = JSON.parse(saved)
})

const handleDeleteAccount = async () => {
  try {
    await request.get('/users/cancel-check')
    
    showConfirmDialog({
      title: '账户注销提醒',
      message: '注销后，您的身份信息、历史订单、钱包余额都将被永久清空。确定要继续吗？',
      confirmButtonText: '确定注销',
      confirmButtonColor: '#ee0a24',
      cancelButtonText: '我再想想'
    }).then(async () => {
      await request.post('/users/cancel')
      showToast('账号已注销')
      localStorage.clear()
      setTimeout(() => router.replace('/login'), 1500)
    }).catch(() => {})
    
  } catch (error) {
    showDialog({
      title: '暂时无法注销',
      message: error.message || '账户内尚有余额或未完成订单，请处理后再试。',
      confirmButtonText: '去处理'
    })
  }
}
</script>

<style scoped>
.security-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

.security-header {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  margin-bottom: 16px;
}

.shield-icon {
  width: 50px; height: 50px; background: rgba(255,255,255,0.2);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 30px;
}

.status-title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
.status-desc { font-size: 11px; opacity: 0.8; line-height: 1.4; }

.section-card {
  background: white;
  border-radius: 16px;
  padding: 8px 0;
  margin-bottom: 16px;
  overflow: hidden;
}

.danger-zone :deep(.van-cell__title) { color: #ee0a24; }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
