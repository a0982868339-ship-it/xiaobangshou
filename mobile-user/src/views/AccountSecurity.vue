<template>
  <div class="security-page">
    <van-nav-bar title="账户安全" fixed placeholder left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <!-- 安全头部 -->
      <div class="security-header shadow-card">
        <div class="shield-icon">
          <van-icon name="shield-o" />
        </div>
        <div class="status-info">
          <div class="s-title">账户安全等级：高</div>
          <div class="s-desc">建议定期更换密码，保障资金与隐私安全</div>
        </div>
      </div>

      <!-- 设置项卡片 -->
      <div class="menu-card shadow-card">
        <van-cell-group :border="false">
          <van-cell title="实名认证" is-link @click="handleVerifyClick">
            <template #value>
              <van-tag v-if="userInfo.id_card_verified === 1" type="success" plain round>已认证</van-tag>
              <van-tag v-else-if="userInfo.id_card_verified === 2" type="warning" plain round>审核中</van-tag>
              <span v-else>未认证</span>
            </template>
          </van-cell>
          <van-cell title="修改登录密码" is-link to="/settings/change-password" label="保护您的账户免受未经授权的访问" />
          <van-cell title="支付安全设置" is-link @click="showToast('功能筹备中')" label="管理您的支付密码和免密支付" />
        </van-cell-group>
      </div>

      <!-- 危险区域 -->
      <div class="danger-card shadow-card">
        <van-cell title="注销账号" is-link @click="handleDeleteAccount">
          <template #label>
            <span class="danger-text">注销后您的所有资料、优惠券等将被清除且无法恢复</span>
          </template>
        </van-cell>
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

const handleVerifyClick = () => {
  if (userInfo.value.id_card_verified === 1) {
    showToast('您已完成实名认证')
    return
  }
  router.push('/verify')
}

onMounted(() => {
  const saved = localStorage.getItem('userInfo')
  if (saved) userInfo.value = JSON.parse(saved)
})

const handleDeleteAccount = async () => {
  try {
    await request.get('/users/cancel-check')
    
    showConfirmDialog({
      title: '账户注销提醒',
      message: '确定要注销账号吗？注销后您的订单记录、优惠券及余额将永久清空。',
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
      message: error.message || '由于账户内有余额或未完成订单，请处理后再试。',
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
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: white;
  margin-bottom: 20px;
}
.shield-icon {
  width: 50px; height: 50px; background: rgba(255,255,255,0.2);
  border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px;
}
.s-title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
.s-desc { font-size: 11px; opacity: 0.8; line-height: 1.4; }

.menu-card, .danger-card { background: white; border-radius: 20px; padding: 8px 0; margin-bottom: 16px; overflow: hidden; }
.danger-text { color: #ee0a24; font-size: 12px; }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
