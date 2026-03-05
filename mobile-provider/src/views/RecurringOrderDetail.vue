<template>
  <div class="recurring-order-page">
    <van-nav-bar title="周期订单详情" left-arrow @click-left="$router.back()" fixed placeholder class="minimal-nav" />

    <div v-if="loading" class="loading-container">
      <van-loading size="24px" vertical>加载中...</van-loading>
    </div>

    <div v-else-if="order" class="content">
      <!-- 1. 品牌感状态头部 (沉浸式渐变) -->
      <div class="brand-hero" :style="heroStyle">
        <div class="hero-content">
          <div v-if="order.assignment_type === 2 && order.status === 0" class="assigned-banner">
            <van-icon name="star" />
            <span>该订单为客户指名，请优先处理</span>
          </div>
          <div class="status-row">
          <div class="status-main">
              <div class="status-title-group">
                <van-icon :name="getHeaderIcon()" class="status-icon-anim" />
                <span class="status-text">{{ getHeaderStatusText() }}</span>
              </div>
              <div class="status-sub">{{ getHeaderSubText() }}</div>
            </div>
            <!-- 右侧：累计收入 -->
            <div class="header-reward-box">
              <div class="reward-label">累计收入</div>
              <div class="reward-value">
                <span class="symbol">¥</span>
                <span class="number">{{ getTotalIncome() }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-arc"></div>
      </div>

      <!-- 日程概览内容 -->
      <div class="floating-container">
        <!-- 今日待办快捷入口 -->
        <div v-if="todaySession" class="detail-white-card today-duty-card" @click="handleSessionClick(todaySession)">
          <div class="td-header">
            <div class="td-title-group">
              <van-icon name="clock-o" />
              <span>今日服务待办</span>
            </div>
            <van-tag type="danger" pulse-anim>今日必做</van-tag>
          </div>
          <div class="td-content">
            <div class="td-info">
              <div class="td-date">第 {{ todaySession.index + 1 }} 次 · {{ todaySession.service_time }}</div>
              <div class="td-status">{{ getSessionStatusText(todaySession) }}</div>
            </div>
            <van-button round type="primary" size="small" class="td-btn">立即前往执行</van-button>
          </div>
        </div>

        <!-- 核心服务卡片 -->
        <div class="detail-white-card main-info-card">
          <div class="info-row">
            <div class="info-left">
              <div class="info-label">预约服务项目</div>
              <div class="info-value">{{ order.service_name }}</div>
            </div>
            <div class="info-right">
              <div class="info-label">单次收入</div>
              <div class="price-value">¥{{ order.session_price }}</div>
            </div>
          </div>
          
          <div class="address-section" @click="handleNavigation">
            <van-icon name="location" class="loc-icon" />
            <div class="addr-text">{{ order.address }}</div>
            <div class="nav-btn">
              <span>导航</span>
              <van-icon name="arrow" />
            </div>
          </div>
        </div>

        <!-- 服务日程列表 -->
        <div class="section-header">
          <div class="section-title">服务日程</div>
          <van-tag type="primary" plain round>周期单</van-tag>
        </div>
        
        <div class="session-list">
          <div
            v-for="(session, index) in order.sessions"
            :key="session.id"
            class="session-card"
            :class="getSessionCardClass(session)"
            @click="router.push(`/order/${session.id}?type=recurring`)"
          >
            <div class="session-card-main">
              <div class="session-card-left">
                <div class="session-index">第{{ index + 1 }}次</div>
                <div class="session-info">
                  <div class="session-date">{{ formatDate(session.session_date) }}</div>
                  <div class="session-time">{{ session.service_time }}</div>
                </div>
              </div>
              
              <div class="session-card-right">
                <div class="session-status-tag" :class="getSessionStatusClass(session)">
                  {{ getSessionStatusText(session) }}
                </div>
                <van-icon name="arrow" class="arrow-icon" />
              </div>
            </div>
            
            <!-- 单场次取消申请处理 (紧凑型设计) -->
            <div v-if="session.status === 'cancel_pending'" class="session-cancel-pending" @click.stop>
              <div class="cancel-divider"></div>
              <div class="cancel-content">
                <div class="cancel-hint">
                  <van-icon name="warning" color="#ff6b6b" />
                  <span>用户申请取消当日服务</span>
                </div>
                <div class="cancel-btns">
                  <van-button size="mini" round plain class="c-btn-sm" @click.stop="handleRejectSessionCancel(session)">拒绝</van-button>
                  <van-button size="mini" round type="danger" class="c-btn-sm" @click.stop="handleAcceptSessionCancel(session)">同意</van-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 协商取消处理 -->
        <div v-if="order.cancel_status === 'pending'" class="detail-white-card cancel-card">
          <div class="cancel-header">
            <van-icon name="warning" color="#ff6b6b" size="20" />
            <span class="cancel-title">用户申请取消周期单</span>
          </div>
          <div class="cancel-summary">
            <div class="summary-row">
              <span>退款给用户</span>
              <span class="refund-val">¥{{ calculateRefund() }}</span>
            </div>
            <div class="summary-row">
              <span>您将获得</span>
              <span class="income-val">¥{{ calculateProviderIncome() }}</span>
            </div>
          </div>
          <div class="cancel-actions">
            <van-button round block class="btn-cancel-reject" @click="showRejectPopup = true">拒绝</van-button>
            <van-button round block type="danger" class="btn-cancel-accept" @click="handleAcceptCancel" :loading="acceptingCancel">同意取消</van-button>
          </div>
        </div>

        <!-- 订单基础信息 (折叠) -->
        <div class="meta-section">
          <div class="meta-toggle" @click="showOrderMeta = !showOrderMeta">
            <span>{{ showOrderMeta ? '收起订单详情' : '查看更多订单信息' }}</span>
            <van-icon :name="showOrderMeta ? 'arrow-up' : 'arrow-down'" />
          </div>
          <transition name="van-fade">
            <div v-if="showOrderMeta" class="meta-content">
              <div class="meta-item">
                <span>订单编号</span>
                <span class="copyable" @click="copyOrderNo">{{ order.order_no }} <van-icon name="description" /></span>
              </div>
              <div class="meta-item">
                <span>联系电话</span>
                <span>{{ order.contact_phone }}</span>
              </div>
              <div class="meta-item">
                <span>联系人</span>
                <span>{{ order.contact_name || '下单客户' }}</span>
              </div>
              <div class="meta-item">
                <span>下单时间</span>
                <span>{{ formatDateFull(order.created_at) }}</span>
              </div>
              <div class="meta-item">
                <span>服务地址</span>
                <span class="addr-val">{{ order.address }}</span>
              </div>
              <div class="meta-item" v-if="order.remark && !order.remark.includes('{')">
                <span>客户备注</span>
                <span class="remark-val">{{ order.remark }}</span>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 弹窗组件 -->
    <van-popup v-model:show="showRejectPopup" position="bottom" round class="premium-popup">
      <div class="p-header">
        <div class="p-title">拒绝取消申请</div>
        <div class="p-close" @click="showRejectPopup = false"><van-icon name="cross" /></div>
      </div>
      <div class="p-body">
        <van-field v-model="rejectReason" rows="4" autosize type="textarea" placeholder="请填写拒绝理由..." maxlength="200" show-word-limit class="p-field" />
        <van-button type="primary" block round class="p-submit" :loading="rejectingCancel" @click="handleRejectCancel">确认拒绝</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../api'
import { showToast, showLoadingToast, closeToast, showConfirmDialog, showSuccessToast } from 'vant'
import { getSocket } from '../utils/socket'

const route = useRoute()
const router = useRouter()
const orderId = route.params.id

const loading = ref(true)
const order = ref(null)
const showOrderMeta = ref(false)

// 取消相关
const showRejectPopup = ref(false)
const rejectReason = ref('')
const acceptingCancel = ref(false)
const rejectingCancel = ref(false)

// 样式与统计
const heroStyle = computed(() => ({
  background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  padding: '60px 24px 80px',
  position: 'relative'
}))

const completedCount = computed(() => {
  if (!order.value?.sessions) return 0
  return order.value.sessions.filter(s => s.status === 3 || s.status === 'settled').length
})

const todaySession = computed(() => {
  if (!order.value?.sessions) return null
  const today = new Date().toISOString().split('T')[0]
  // 查找今天的场次，且状态未完成
  const session = order.value.sessions.find(s => {
    const sDate = new Date(s.session_date).toISOString().split('T')[0]
    return sDate === today && (s.status !== 3 && s.status !== 'settled' && s.status !== 4 && s.status !== 'cancelled')
  })
  if (session) {
    return {
      ...session,
      index: order.value.sessions.indexOf(session)
    }
  }
  return null
})

// 数据加载
const loadOrderDetail = async () => {
  try {
    loading.value = true
    const res = await request.get(`/recurring/${orderId}`)
    order.value = res.data || res
  } catch (error) {
    showToast(error.message || '加载失败')
    router.back()
  } finally {
    loading.value = false
  }
}

// 核心业务逻辑
const getTotalIncome = () => {
  if (!order.value) return '0.00'
  return (completedCount.value * parseFloat(order.value.session_price)).toFixed(2)
}

const formatDate = (d) => d ? `${new Date(d).getMonth() + 1}月${new Date(d).getDate()}日` : ''
const formatDateFull = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
const copyOrderNo = () => { showToast('订单号已复制') }
const handleNavigation = () => showToast({ message: '正在启动地图...', icon: 'guide-o' })

const handleSessionClick = (session) => {
  router.push(`/order/${session.id}?type=recurring`)
}

// 头部状态动态判断
const getHeaderIcon = () => {
  if (!order.value) return 'clock-o'
  if (completedCount.value === 0) return 'todo-list-o'
  if (completedCount.value >= order.value.sessions?.length) return 'checked'
  return 'clock-o'
}

const getHeaderStatusText = () => {
  if (!order.value) return '加载中'
  if (completedCount.value === 0) return '待开始服务'
  if (completedCount.value >= order.value.sessions?.length) return '服务已完结'
  return '服务进行中'
}

const getHeaderSubText = () => {
  if (!order.value) return ''
  const total = order.value.sessions?.length || 0
  if (completedCount.value === 0) return `共 ${total} 次服务 · 等待执行`
  if (completedCount.value >= total) return `全部 ${total} 次已完成 · 感谢您的服务`
  return `已完成 ${completedCount.value}/${total} 次 · 准时到达`
}

// 状态映射
const getSessionCardClass = (s) => (s.status === 3 || s.status === 'settled') ? 'completed' : (s.status === 2 ? 'in-progress' : (s.status === 11 ? 'arrived' : 'pending'))
const getSessionStatusClass = (s) => (s.status === 3 || s.status === 'settled') ? 'completed' : (s.status === 2 || s.status === 11 ? 'in-progress' : 'pending')
const getSessionStatusText = (s) => (s.status === 3 || s.status === 'settled') ? '已完成' : (s.status === 2 ? '服务中' : (s.status === 11 ? '已到达' : '待服务'))

const calculateRefund = () => (order.value.sessions.filter(s => s.status === 0 || s.status === 11 || s.status === 'pending').length * parseFloat(order.value.session_price)).toFixed(2)
const calculateProviderIncome = () => (completedCount.value * parseFloat(order.value.session_price)).toFixed(2)

const handleAcceptCancel = async () => {
  showConfirmDialog({ title: '同意取消', message: '同意后剩余费用将退还用户，确定吗？' }).then(async () => {
    try { acceptingCancel.value = true; await request.post(`/recurring/${orderId}/accept-cancel`); showSuccessToast('已处理'); loadOrderDetail() }
    catch { showToast('处理失败') } finally { acceptingCancel.value = false }
  })
}

const handleRejectCancel = async () => {
  if (!rejectReason.value.trim()) return showToast('理由不能为空')
  try { rejectingCancel.value = true; await request.post(`/recurring/${orderId}/reject-cancel`, { rejectReason: rejectReason.value }); showSuccessToast('已拒绝'); showRejectPopup.value = false; loadOrderDetail() }
  catch { showToast('提交失败') } finally { rejectingCancel.value = false }
}

// 单场次取消处理
const handleAcceptSessionCancel = async (session) => {
  showConfirmDialog({ 
    title: '同意取消', 
    message: `同意后该日服务 (${formatDate(session.session_date)}) 费用将退还用户，确定吗？` 
  }).then(async () => {
    try {
      await request.post(`/recurring/session/${session.id}/accept-cancel`)
      showSuccessToast('已同意取消')
      loadOrderDetail()
    } catch (e) {
      showToast(e.message || '处理失败')
    }
  })
}

const handleRejectSessionCancel = async (session) => {
  showConfirmDialog({ 
    title: '拒绝取消', 
    message: '确认拒绝该日服务的取消申请？' 
  }).then(async () => {
    try {
      await request.post(`/recurring/session/${session.id}/reject-cancel`, { rejectReason: '' })
      showSuccessToast('已拒绝取消')
      loadOrderDetail()
    } catch (e) {
      showToast(e.message || '处理失败')
    }
  })
}

// Socket 实时监听
onMounted(() => {
  loadOrderDetail()
  const socket = getSocket()
  if (socket) {
    socket.on('recurring_order_status_change', () => { loadOrderDetail() })
    socket.on('SESSION_CANCEL_REQUEST', () => { loadOrderDetail() })
  }
})

onUnmounted(() => {
  const socket = getSocket()
  if (socket) {
    socket.off('recurring_order_status_change')
    socket.off('SESSION_CANCEL_REQUEST')
  }
})
</script>

<style scoped>
.recurring-order-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 100px; }
.minimal-nav { background: #fff !important; }
.loading-container { display: flex; justify-content: center; align-items: center; min-height: 60vh; }

/* 1. 品牌头部 */
.brand-hero { color: white; transition: all 0.3s; }
.hero-content { position: relative; z-index: 2; }
.assigned-banner {
  background: rgba(124, 58, 237, 0.9);
  color: #fff;
  padding: 8px 14px;
  border-radius: 12px;
  margin: 0 24px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  backdrop-filter: blur(8px);
}
.status-row { display: flex; justify-content: space-between; align-items: center; padding: 0 24px; }
.status-title-group { display: flex; align-items: center; gap: 8px; }
.status-icon-anim { font-size: 24px; }
.status-text { font-size: 28px; font-weight: 900; }
.status-sub { font-size: 13px; opacity: 0.8; margin-top: 4px; padding-left: 32px; }

.header-reward-box { background: rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 16px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); text-align: right; }
.reward-label { font-size: 11px; font-weight: 700; opacity: 0.9; margin-bottom: 2px; }
.reward-value { display: flex; align-items: baseline; justify-content: flex-end; gap: 2px; }
.reward-value .symbol { font-size: 16px; font-weight: 800; }
.reward-value .number { font-size: 32px; font-weight: 900; font-family: 'DIN Alternate'; line-height: 1; }
.hero-arc { position: absolute; bottom: 0; left: 0; right: 0; height: 24px; background: #f8f9fa; border-radius: 24px 24px 0 0; }

/* 2. 悬浮布局 */
.floating-container { padding: 0 16px; margin-top: -40px; position: relative; z-index: 5; }
.detail-white-card { background: #fff; border-radius: 24px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }

/* 今日待办卡片样式 */
.today-duty-card {
  border: 2px solid #ff4d4f;
  background: linear-gradient(to right, #fffcfc 0%, #ffffff 100%);
  position: relative;
  overflow: hidden;
}
.td-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.td-title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 900;
  color: #1e293b;
}
.td-title-group i {
  color: #ff4d4f;
  font-size: 18px;
}
.td-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.td-info {
  flex: 1;
}
.td-date {
  font-size: 16px;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 4px;
}
.td-status {
  font-size: 12px;
  color: #ff4d4f;
  font-weight: 700;
}
.td-btn {
  padding: 0 16px;
  height: 36px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.2);
}

.info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.info-label { font-size: 12px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
.info-value { font-size: 18px; font-weight: 900; color: #1e293b; }
.price-value { font-size: 16px; font-weight: 800; color: #7c3aed; }

.address-section { display: flex; align-items: center; gap: 10px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.loc-icon { font-size: 18px; color: #94a3b8; }
.addr-text { flex: 1; font-size: 14px; color: #475569; font-weight: 600; line-height: 1.4; }
.nav-btn { display: flex; align-items: center; gap: 4px; background: #f1f5f9; padding: 6px 10px; border-radius: 10px; font-size: 12px; color: #475569; font-weight: 700; }

/* 3. 服务日程卡片 */
.section-header { display: flex; justify-content: space-between; align-items: center; margin: 24px 0 12px; }
.section-title { font-size: 16px; font-weight: 900; color: #1e293b; }
.session-list { display: flex; flex-direction: column; gap: 12px; }
.session-card { background: #fff; padding: 16px; border-radius: 20px; border: 2px solid transparent; transition: all 0.2s; display: flex; flex-direction: column; }
.session-card:active { transform: scale(0.98); }
.session-card.completed { border-color: #e6f9f7; background: #fdfdfd; }
.session-card.in-progress { border-color: #fff7e6; box-shadow: 0 4px 12px rgba(255,169,64,0.1); }
.session-card-main { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.session-card-left { display: flex; align-items: center; gap: 12px; }
.session-index { background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; }
.session-date { font-size: 15px; font-weight: 800; color: #1e293b; }
.session-time { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.session-card-right { display: flex; align-items: center; gap: 8px; }
.session-status-tag { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; line-height: 1.2; display: flex; align-items: center; }
.session-status-tag.completed { background: #e6f9f7; color: #11998e; }
.session-status-tag.in-progress { background: #fff7e6; color: #ffa940; }
.session-status-tag.pending { background: #f1f5f9; color: #94a3b8; }
.arrow-icon { font-size: 14px; color: #cbd5e1; height: 14px; line-height: 14px; }

/* 单日取消申请样式 */
.session-cancel-pending { margin-top: 12px; }
.cancel-divider { height: 1px; background: #f1f5f9; border: none; margin-bottom: 12px; }
.cancel-content { display: flex; justify-content: space-between; align-items: center; }
.cancel-hint { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #ff6b6b; font-weight: 700; }
.cancel-btns { display: flex; gap: 6px; }
.c-btn-sm { font-size: 11px !important; height: 24px !important; padding: 0 10px !important; font-weight: 800 !important; }

/* 弹窗 */
.premium-popup { padding: 24px 20px 40px; border-radius: 32px 32px 0 0 !important; }
.p-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.p-title { font-size: 22px; font-weight: 900; color: #1e293b; }
.p-close { width: 36px; height: 36px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
.p-field { background: #f8fafc !important; border-radius: 20px !important; padding: 16px !important; }
.p-submit { height: 58px; font-weight: 900; border-radius: 20px !important; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; margin-top: 20px; font-size: 17px; border: none !important; color: white !important; }

/* 元数据 */
.meta-section { margin-top: 32px; padding-bottom: 40px; }
.meta-toggle { display: flex; justify-content: center; align-items: center; gap: 6px; color: #94a3b8; font-size: 12px; font-weight: 700; }
.meta-content { margin-top: 16px; background: #fff; padding: 20px; border-radius: 20px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; color: #64748b; }
.meta-item { display: flex; justify-content: space-between; align-items: flex-start; }
.copyable { color: #1e293b; font-weight: 800; display: flex; align-items: center; gap: 4px; }
.remark-val { color: #ef4444; font-weight: 800; text-align: right; flex: 1; margin-left: 20px; }

.cancel-card { border: 2px solid #ffe6e6; }
.cancel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
.cancel-title { font-size: 16px; font-weight: 900; color: #ff6b6b; }
.cancel-summary { background: #fffcfc; padding: 16px; border-radius: 16px; margin-bottom: 20px; }
.summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #64748b; font-weight: 700; }
.refund-val { color: #ff6b6b; font-weight: 900; }
.income-val { color: #11998e; font-weight: 900; }
.cancel-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn-cancel-reject { background: #f1f5f9 !important; color: #64748b !important; border: none !important; font-weight: 800; height: 48px; }
.btn-cancel-accept { font-weight: 800; height: 48px; box-shadow: 0 4px 12px rgba(255,77,79,0.2); }
</style>
