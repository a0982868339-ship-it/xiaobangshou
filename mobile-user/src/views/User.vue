<template>
  <div class="user-page">
    <!-- 1. 沉浸式尊享头部 (升级渐变与排版) -->
    <div class="premium-header">
      <div class="header-main" @click="goEditProfile">
        <div class="avatar-wrapper">
          <div class="avatar-box" :class="{ 'is-verified': userInfo.id_card_verified === 1 }">
            <div class="avatar-inner">{{ getAvatarText() }}</div>
          </div>
          <div v-if="isLogin" class="gender-tag" :class="userInfo.gender === 1 ? 'male' : 'female'">
            <van-icon :name="userInfo.gender === 1 ? 'male' : 'female'" />
          </div>
        </div>
        <div class="user-meta">
          <div class="name-box">
            <span class="display-name">{{ isLogin ? (userInfo.nickname || userInfo.real_name) : '即刻开启服务' }}</span>
            <div v-if="userInfo.user_type === 2" class="provider-chip">
              <van-icon name="medal-o" />
              <span>服务者</span>
            </div>
          </div>
          <div class="sub-text">{{ isLogin ? hidePhone(userInfo.phone) : '登录享受个性化生活助手' }}</div>
        </div>
        <div class="header-action">
          <van-icon name="arrow" />
        </div>
      </div>
    </div>

    <!-- 2. 核心资产区 (极简质感升级版) -->
    <div class="asset-grid shadow-premium">
      <div class="asset-block" @click="$router.push('/wallet')">
        <div class="asset-val-wrap">
          <span class="asset-val">{{ formatMoney(userInfo.balance || 0).split('.')[0] }}</span>
          <span class="asset-decimal">.{{ formatMoney(userInfo.balance || 0).split('.')[1] }}</span>
        </div>
        <div class="asset-lab">账户余额</div>
      </div>
      <div class="asset-sep"></div>
      <div class="asset-block" @click="$router.push('/coupon')">
        <div class="asset-val-wrap">
          <span class="asset-val">3</span>
        </div>
        <div class="asset-lab">优惠券</div>
      </div>
      <div class="asset-sep"></div>
      <div class="asset-block" @click="$router.push('/points')">
        <div class="asset-val-wrap">
          <span class="asset-val">{{ userInfo.points || 0 }}</span>
        </div>
        <div class="asset-lab">我的积分</div>
      </div>
    </div>

    <!-- 3. 我的订单状态墙 (原子级交互升级) -->
    <div class="glass-section shadow-premium">
      <div class="section-top">
        <span class="section-title">我的服务订单</span>
        <div class="entry-all" @click="$router.push('/all-orders')">
          <span>全部订单</span>
          <van-icon name="arrow" />
        </div>
      </div>
      <div class="status-flex">
        <div class="status-node" @click="$router.push('/order?status=10')">
          <div class="icon-wrap"><van-icon name="pending-payment" :badge="stats[10] > 0 ? stats[10] : null" /></div>
          <span class="node-label">待付款</span>
        </div>
        <div class="status-node" @click="$router.push('/order?status=0')">
          <div class="icon-wrap"><van-icon name="logistics" :badge="stats[0] > 0 ? stats[0] : null" /></div>
          <span class="node-label">待接单</span>
        </div>
        <div class="status-node" @click="$router.push('/order?status=1,2')">
          <div class="icon-wrap active"><van-icon name="play-circle-o" :badge="(Number(stats[1]||0)+Number(stats[2]||0)) > 0 ? (Number(stats[1]||0)+Number(stats[2]||0)) : null" /></div>
          <span class="node-label">执行中</span>
        </div>
        <div class="status-node" @click="$router.push('/order?status=3,5')">
          <div class="icon-wrap"><van-icon name="comment-o" :badge="(Number(stats[3]||0)+Number(stats[5]||0)) > 0 ? (Number(stats[3]||0)+Number(stats[5]||0)) : null" /></div>
          <span class="node-label">已完成</span>
        </div>
      </div>
    </div>

    <!-- 4. 功能菜单流 (极简卡片化) -->
    <div class="menu-container">
      <div class="menu-card shadow-premium">
        <div class="menu-header">我的服务</div>
        <van-cell title="陪诊预约管理" icon="medal-o" is-link to="/patient-profile" class="minimal-cell" />
        <van-cell title="我的收藏" icon="star-o" is-link @click="showToast('敬请期待')" class="minimal-cell" />
      </div>

      <div class="menu-card shadow-premium">
        <div class="menu-header">互动与支持</div>
        <van-cell title="在线客服" icon="chat-o" is-link @click="goToSupport" class="minimal-cell" />
        <van-cell title="我的工单" icon="notes-o" is-link to="/work-order" class="minimal-cell" />
        <van-cell title="帮助中心" icon="question-o" is-link to="/help" class="minimal-cell" />
        <van-cell title="关于小帮手" icon="info-o" is-link to="/about" class="minimal-cell" />
      </div>

      <div class="menu-card shadow-premium">
        <div class="menu-header">账户管理</div>
        <van-cell title="我的地址" icon="location-o" is-link to="/address" class="minimal-cell" />
        <van-cell title="订单回收站" icon="delete-o" is-link to="/order-recycle" class="minimal-cell" />
        <van-cell title="账户安全" icon="shield-o" is-link to="/settings/security" class="minimal-cell" />
        <van-cell title="更多设置" icon="setting-o" is-link to="/settings" class="minimal-cell" />
      </div>
    </div>

    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api'
import { showToast } from 'vant'

const router = useRouter()
const userInfo = ref({})
const unreadCount = ref(0)
const stats = ref({})
const isLogin = computed(() => !!localStorage.getItem('token'))

const formatMoney = (val) => Number(val).toFixed(2)
const hidePhone = (p) => p ? p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : ''

const getAvatarText = () => {
  if (!isLogin.value) return '?'
  return userInfo.value.nickname ? userInfo.value.nickname.charAt(0).toUpperCase() : '👤'
}

const loadData = async () => {
  if (!isLogin.value) return
  try {
    const [uRes, nRes, sRes] = await Promise.all([
      request.get('/auth/me'),
      request.get('/notifications/unread'),
      request.get('/orders/stats')
    ])
    const data = uRes.data || uRes
    // 商业化防御逻辑：确保余额和积分永远不显示负数
    if (data.balance < 0) data.balance = 0
    if (data.points < 0) data.points = 0
    
    userInfo.value = data
    unreadCount.value = nRes.data || nRes
    stats.value = sRes.data || sRes
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
  } catch (e) {}
}

const goEditProfile = () => {
  if (!isLogin.value) return router.push('/login')
  router.push('/settings/profile')
}

const goToSupport = async () => {
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

onMounted(() => {
  const cached = localStorage.getItem('userInfo')
  if (cached) userInfo.value = JSON.parse(cached)
  loadData()
})
</script>

<style scoped>
.user-page { min-height: 100vh; background: #f8fafc; }

/* 1. 沉浸式头部升级 */
.premium-header {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 70px 24px 80px;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;
  color: white;
  position: relative;
  box-shadow: 0 10px 30px rgba(17, 153, 142, 0.15);
}

.header-main { display: flex; align-items: center; gap: 20px; }

.avatar-wrapper { position: relative; }
.avatar-box {
  width: 72px; height: 72px; border-radius: 24px; padding: 4px;
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(10px);
}
.avatar-box.is-verified { background: linear-gradient(to bottom, #fff, rgba(255,255,255,0.4)); }
.avatar-inner {
  width: 100%; height: 100%; background: white; border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; color: #11998e; font-weight: 900;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

.gender-tag {
  position: absolute; bottom: -4px; right: -4px; width: 24px; height: 24px;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; border: 2.5px solid white; color: white;
}
.gender-tag.male { background: #0ea5e9; }
.gender-tag.female { background: #f43f5e; }

.user-meta { flex: 1; }
.name-box { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.display-name { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
.provider-chip {
  background: rgba(255,255,255,0.15); backdrop-filter: blur(5px);
  padding: 2px 10px; border-radius: 100px; display: flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; border: 1px solid rgba(255,255,255,0.2);
}
.sub-text { font-size: 13px; opacity: 0.85; font-weight: 500; }
.header-action { font-size: 20px; opacity: 0.6; }

/* 2. 资产卡片升级 */
.asset-grid {
  margin: -45px 20px 20px;
  display: flex; align-items: center; padding: 28px 0;
  background: white; border-radius: 28px;
  z-index: 10; position: relative;
}
.asset-block { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.asset-val-wrap { display: flex; align-items: baseline; color: #1a1a1a; margin-bottom: 6px; }
.asset-val { font-size: 22px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; }
.asset-decimal { font-size: 13px; font-weight: 600; color: #94a3b8; }
.asset-lab { font-size: 12px; color: #64748b; font-weight: 500; }
.asset-sep { width: 1px; height: 20px; background: #f1f5f9; }

/* 3. 订单墙升级 */
.glass-section { margin: 0 20px 20px; padding: 24px 20px; background: white; border-radius: 28px; }
.section-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.section-title { font-size: 17px; font-weight: 900; color: #1e293b; }
.entry-all { font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 2px; font-weight: 700; }

.status-flex { display: flex; justify-content: space-between; padding: 0 4px; }
.status-node { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.icon-wrap { 
  width: 52px; height: 52px; background: #f8fafc; border-radius: 18px;
  display: flex; align-items: center; justify-content: center; font-size: 24px; color: #475569;
}
.icon-wrap.active { background: #eefaf8; color: #11998e; }
.node-label { font-size: 12px; color: #64748b; font-weight: 700; }

/* 4. 菜单组升级 */
.menu-container { padding: 0 20px; }
.menu-card { background: white; border-radius: 28px; margin-bottom: 20px; overflow: hidden; }
.menu-header { padding: 20px 20px 8px; font-size: 13px; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }

.minimal-cell { padding: 14px 20px !important; }
.minimal-cell :deep(.van-cell__title) { font-weight: 700; color: #334155; }
.minimal-cell :deep(.van-cell__left-icon) { font-size: 22px; color: #11998e; opacity: 0.8; }

.shadow-premium { 
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.02); 
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.bottom-spacer { height: 120px; }
</style>
