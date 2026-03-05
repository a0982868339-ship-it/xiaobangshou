<template>
  <div class="user-page">
    <!-- 1. 高级感沉浸式头部 -->
    <div class="premium-header">
      <div class="header-content">
        <div class="user-main" @click="goEditProfile">
          <div class="avatar-ring" :class="{ 'verified': userInfo.id_card_verified === 1 }">
            <div class="avatar-text">{{ getAvatarText() }}</div>
          </div>
          <div class="user-info">
            <div class="name-line">
              <span class="user-name">{{ isLogin ? (userInfo.real_name || userInfo.nickname) : '点击登录' }}</span>
              <van-tag v-if="userInfo.id_card_verified === 1" round type="success" size="small">
                <van-icon name="passed" /> 已实名
              </van-tag>
            </div>
            <div class="user-meta" v-if="isLogin">
              <span>⭐ {{ userInfo.rating || '5.0' }}分</span>
              <span class="divider">|</span>
              <span>服务 {{ userInfo.order_count || 0 }} 次</span>
            </div>
          </div>
          <van-icon name="arrow" color="rgba(255,255,255,0.7)" />
        </div>

        <!-- 预览名片快捷入口 -->
        <div class="preview-card-btn" @click="$router.push('/my-card')">
          <div class="btn-left">
            <van-icon name="contact-outline" />
            <span>我的专业服务名片</span>
          </div>
          <van-icon name="arrow" />
        </div>
      </div>
    </div>

    <!-- 2. 核心资产区 (新增) -->
    <div class="asset-card shadow-card">
      <div class="asset-item" @click="$router.push('/earnings')">
        <div class="asset-val">{{ formatMoney(userInfo.balance || 0) }}</div>
        <div class="asset-lab">账户余额</div>
      </div>
      <div class="v-divider"></div>
      <div class="asset-item" @click="showToast('当前信用极好')">
        <div class="asset-val">{{ userInfo.credit_score || 100 }}</div>
        <div class="asset-lab">信用评分</div>
      </div>
      <div class="v-divider"></div>
      <div class="asset-item" @click="$router.push('/reviews')">
        <div class="asset-val">{{ userInfo.order_count || 0 }}</div>
        <div class="asset-lab">收获评价</div>
      </div>
    </div>

    <!-- 3. 基础准入认证墙 -->
    <div class="section-container shadow-card">
      <div class="section-title">
        <span>服务者基础准入认证</span>
      </div>
      <div class="badge-grid">
        <div class="badge-item" :class="{ 'active': userInfo.id_card_verified === 1 }" @click="goVerify">
          <div class="badge-icon"><van-icon name="user-circle-o" /></div>
          <span>实名认证</span>
        </div>
        <div class="badge-item" :class="{ 'active': userInfo.id_card_verified === 1 }" @click="goVerify">
          <div class="badge-icon"><van-icon name="shield-o" /></div>
          <span>人脸识别</span>
        </div>
        <div class="badge-item" :class="{ 'active': userInfo.health_cert_status === 1 }" @click="goVerify">
          <div class="badge-icon"><van-icon name="certificate" /></div>
          <span>健康证明</span>
        </div>
        <div class="badge-item" :class="{ 'active': userInfo.id_card_verified === 1 }" @click="goVerify">
          <div class="badge-icon"><van-icon name="shield-o" /></div>
          <span>背景调查</span>
        </div>
      </div>
    </div>

    <!-- 4. 功能菜单组 -->
    <!-- A. 服务管理 -->
    <van-cell-group inset class="menu-group shadow-card">
      <div class="group-header">业务管理</div>
      <van-cell title="全部接单历史" icon="notes-o" is-link @click="$router.push('/all-orders')" />
      <van-cell title="服务设置" icon="setting-o" is-link @click="$router.push('/service-settings')" />
      <van-cell title="服务区域" icon="location-o" is-link @click="$router.push('/service-area')" />
      <van-cell title="健康证管理" icon="certificate" is-link @click="$router.push('/health-cert')">
        <template #value>
          <van-tag :type="getHealthTagType()">{{ getHealthStatusText() }}</van-tag>
        </template>
      </van-cell>
      <van-cell title="专业资质管理" icon="medal-o" is-link @click="$router.push('/certification')" />
      <van-cell title="银行卡管理" icon="balance-o" is-link @click="$router.push('/bank-card')" />
    </van-cell-group>

    <!-- B. 系统与支持 -->
    <van-cell-group inset class="menu-group shadow-card">
      <div class="group-header">系统与支持</div>
      <van-cell title="我的工单" icon="notes-o" is-link @click="$router.push('/work-order')" />
      <van-cell title="联系客服" icon="chat-o" is-link @click="goToSupport" />
      <van-cell title="账户安全" icon="shield-o" is-link @click="$router.push('/settings/security')" />
      <van-cell title="帮助中心" icon="question-o" is-link @click="$router.push('/help')" />
      <van-cell title="更多设置" icon="setting-o" is-link @click="$router.push('/settings')" />
    </van-cell-group>

    <!-- 底部占位 -->
    <div class="footer-spacer"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import request from '../api'

const router = useRouter()
const userInfo = ref({})
const unreadCount = ref(0)

const isLogin = computed(() => !!localStorage.getItem('provider_token'))

const getHealthStatusText = () => {
  const status = userInfo.value.health_cert_status
  if (status === 1) return '已认证'
  if (status === 3) return '审核中'
  if (status === 2) return '被驳回'
  return '未上传'
}

const getHealthTagType = () => {
  const status = userInfo.value.health_cert_status
  if (status === 1) return 'success'
  if (status === 3) return 'primary'
  if (status === 2) return 'danger'
  return 'default'
}

const goEditProfile = () => {
  if (!isLogin.value) return router.push('/login')
  router.push('/settings/profile')
}

const goVerify = () => {
  if (!isLogin.value) return router.push('/login')
  // 如果已经全部认证通过，提示用户
  if (userInfo.value.id_card_verified === 1 && userInfo.value.health_cert_status === 1) {
    return showToast('您已完成全部准入认证')
  }
  router.push('/verify')
}

const goToSupport = async () => {
  if (!isLogin.value) return router.push('/login')
  try {
    const res = await request.get('/system/support/agent');
    const data = res.data || res;
    router.push({
      path: '/chat',
      query: { targetId: data.agentId, targetName: `客服-${data.agentName}`, isSupport: 1 }
    });
  } catch (e) {
    showToast('客服暂不在线');
  }
}

const getAvatarText = () => {
  if (!isLogin.value) return '?'
  const name = userInfo.value.real_name || userInfo.value.nickname || ''
  return name ? name.charAt(0).toUpperCase() : '👤'
}

const formatMoney = (val) => Number(val).toFixed(2)

const loadUserInfo = async () => {
  if (!isLogin.value) return
  try {
    const [uRes, nRes] = await Promise.all([
      request.get('/auth/me'),
      request.get('/notifications/unread')
    ])
    const data = uRes.data || uRes
    // 商业化防御逻辑：确保余额永远不显示负数
    if (data.balance < 0) data.balance = 0
    
    userInfo.value = data
    unreadCount.value = nRes.data || nRes
    localStorage.setItem('provider_userInfo', JSON.stringify(userInfo.value))
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

onMounted(() => {
  if (isLogin.value) {
    const cached = localStorage.getItem('provider_userInfo')
    if (cached) userInfo.value = JSON.parse(cached)
    // 页面挂载时强制刷新一次，防止显示过期的硬编码或旧数据
    loadUserInfo()
  }
})

// 监听路由进入，确保数据同步
onActivated(() => {
  if (isLogin.value) {
    loadUserInfo()
  }
})
</script>

<style scoped>
.user-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

/* 1. 高级头部样式 */
.premium-header {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 60px 20px 40px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  color: white;
}

.user-main {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
}

.avatar-ring {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  padding: 3px;
  background: rgba(255,255,255,0.3);
}
.avatar-ring.verified {
  background: linear-gradient(to bottom, #fff, rgba(255,255,255,0.2));
}

.avatar-text {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #11998e;
  font-weight: bold;
}

.user-info {
  flex: 1;
}
.name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.user-name {
  font-size: 22px;
  font-weight: bold;
}
.user-meta {
  font-size: 13px;
  opacity: 0.9;
  display: flex;
  align-items: center;
}
.user-meta .divider { margin: 0 8px; opacity: 0.5; }

.preview-card-btn {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  border: 1px solid rgba(255,255,255,0.1);
}
.btn-left { display: flex; align-items: center; gap: 8px; }

/* 2. 资产卡片 */
.asset-card {
  margin: -20px 16px 16px;
  display: flex;
  align-items: center;
  padding: 20px 0;
  z-index: 10;
  position: relative;
}
.asset-item {
  flex: 1;
  text-align: center;
}
.asset-val { font-size: 20px; font-weight: 800; color: #323233; margin-bottom: 4px; }
.asset-lab { font-size: 12px; color: #969799; }
.v-divider { width: 1px; height: 30px; background: #eee; }

/* 3. 勋章墙 */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 10px 0;
}
.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  filter: grayscale(1);
  opacity: 0.5;
  transition: all 0.3s;
}
.badge-item.active {
  filter: grayscale(0);
  opacity: 1;
}
.badge-icon {
  width: 44px;
  height: 44px;
  background: #f7f8fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #11998e;
}
.badge-item.active .badge-icon {
  background: #eefaf5;
  color: #52c41a;
  box-shadow: 0 4px 10px rgba(82, 196, 26, 0.15);
}
.badge-item span { font-size: 11px; color: #646566; }

/* 4. 通用样式 */
.shadow-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}
.section-container {
  margin: 16px;
  padding: 16px;
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 16px;
}

.menu-group {
  margin: 16px !important;
  overflow: hidden;
}
.group-header {
  padding: 16px 16px 8px;
  font-size: 13px;
  color: #969799;
  font-weight: 500;
}

.footer-spacer { height: 100px; }

:deep(.van-cell) {
  padding: 14px 16px;
}
:deep(.van-cell__left-icon) {
  font-size: 20px;
  margin-right: 12px;
  color: #11998e;
}
</style>
