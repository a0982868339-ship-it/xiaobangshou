<template>
  <div class="order-list-page">
    <div class="page-header">
      <div class="header-top">
        <div class="header-title">我的接单</div>
        <div class="header-right" @click="$router.push('/all-orders')">
          <div class="all-orders-btn">
            <van-icon name="notes-o" size="18" />
            <span>全部历史</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="sticky-tabs">
      <van-tabs v-model:active="activeTab" @change="onRefresh" color="#11998e" line-width="20px" class="minimal-tabs">
        <van-tab title="已接单" name="1" :badge="stats[1] > 0 ? stats[1] : null" />
        <van-tab title="已到达" name="11" :badge="stats[11] > 0 ? stats[11] : null" />
        <van-tab title="服务中" name="2" :badge="stats[2] > 0 ? stats[2] : null" />
        <van-tab title="待取消" name="12" :badge="stats[12] > 0 ? stats[12] : null" />
        <van-tab title="已完成" name="3" :badge="(Number(stats[3] || 0) + Number(stats[5] || 0)) > 0 ? (Number(stats[3] || 0) + Number(stats[5] || 0)) : null" />
      </van-tabs>
    </div>

    <div class="list-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list 
          v-model:loading="loading" 
          :finished="finished" 
          finished-text="没有更多订单了" 
          @load="onLoad"
          :immediate-check="false"
        >
          <div 
            v-for="item in orders" 
            :key="item.id" 
            class="premium-card"
            @click="handleOrderClick(item)"
          >
            <div class="card-top">
              <div class="order-no">#{{ item.order_no.slice(-8) }}</div>
              <div class="status-indicator" :class="'status-' + item.status">
                {{ getStatusText(item.status) }}
              </div>
            </div>
            
            <div class="card-middle">
              <div class="service-info">
                <div class="service-name">{{ item.service_name }}</div>
                <div class="price-box">
                  <span class="currency">¥</span>
                  <span class="amount">{{ ((item.total_price || 0) - (item.platform_fee || 0)).toFixed(2) }}</span>
                </div>
              </div>
              
              <div class="details-box">
                <div class="detail-item">
                  <van-icon :name="item.hospital_name ? 'hospital-o' : 'location'" class="item-icon" />
                  <span class="item-text">{{ item.hospital_name || item.service_address }}</span>
                </div>
                <div class="detail-item">
                  <van-icon name="clock" class="item-icon" />
                  <span class="item-text">{{ formatDate(item.service_time) }}</span>
                </div>
              </div>

              <!-- 实时状态条 (仅限进行中的遛狗) -->
              <div v-if="item.status === 2 && item.service_name.includes('遛狗')" class="live-glass-bar">
                <div class="live-info">
                  <span class="pulse-dot"></span>
                  <span class="live-label">进行中</span>
                  <span class="live-timer">{{ getOrderDurationText(item) }}</span>
                </div>
                <div class="live-stat">
                  <van-icon name="guide-o" />
                  <span>{{ getDistanceText(item) }} km</span>
                </div>
              </div>
            </div>

            <div class="card-bottom" @click.stop>
              <div class="action-buttons">
                <van-button v-if="item.status === 1 || item.status === 2" size="small" round class="btn-chat" @click="goToChat(item)">
                  <template #icon><van-icon name="chat-o" /></template>
                  联系用户
                </van-button>
                
                <van-button v-if="item.status === 1 && !item.is_arrived" type="warning" size="small" round class="btn-arrive" @click="handleArrive(item)">确认到达</van-button>
                <van-button v-if="(item.status === 1 && item.is_arrived) || item.status === 11" type="primary" size="small" round class="btn-start" @click="handleStatus(item.id, 2)">开始服务</van-button>
                
                <van-button 
                  v-if="item.status === 2 && item.service_name.includes('遛狗')" 
                  :type="(isTracking && activeTrackingOrderId === item.id) ? 'warning' : (item.is_walking === 1 ? 'success' : 'primary')" 
                  size="small" 
                  round 
                  class="btn-track"
                  @click="toggleTracking(item)"
                >
                  {{ (isTracking && activeTrackingOrderId === item.id) ? '停止遛狗' : (item.is_walking === 1 ? '恢复追踪' : '开始遛狗') }}
                </van-button>
                
                <van-button v-if="item.status === 2 && (!item.need_shopping || item.grocery_status === 3)" type="success" size="small" round class="btn-complete" @click="openCompletePopup(item)">完成服务</van-button>
              </div>
            </div>
          </div>
        </van-list>
        <!-- 物理占位符 -->
        <div class="bottom-spacer"></div>
      </van-pull-refresh>
      
      <div v-if="orders.length === 0 && !loading" class="empty-state">
        <van-empty description="暂无待办订单" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import request, { getMyOrders, updateOrderStatus } from '../api'
import { showConfirmDialog, showSuccessToast, showToast, showLoadingToast, closeToast } from 'vant'
import { getSocket, initSocket } from '../utils/socket'

const router = useRouter()
const orders = ref([])
// ... (保留其他)

// 移除重复的生命周期钩子
const activeTab = ref('1')
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const stats = ref({})

// 轨迹追踪相关
const isTracking = ref(false)
const trackPoints = ref([])
const activeTrackingOrderId = ref(null)
const trackingDuration = ref(0)
let watchId = null
let syncTimer = null
let durationTimer = null

const loadStats = async () => {
  try {
    const res = await request.get('/orders/stats?role=provider')
    stats.value = res.data || res
  } catch (e) {}
}

const getOrderDurationText = (item) => {
  const seconds = (isTracking.value && activeTrackingOrderId.value === item.id) 
    ? trackingDuration.value 
    : (item.walking_duration || item.current_walking_duration || 0)
  
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const getDistanceText = (item) => {
  const pointsCount = (item.id === activeTrackingOrderId.value ? trackPoints.value.length : parseJSON(item.live_track || '[]').length)
  return (pointsCount * 0.02).toFixed(2)
}

const onLoad = async () => {
  if (loading.value || finished.value) return
  loading.value = true
  try {
    const statusParam = activeTab.value === '3' ? '3,5' : activeTab.value
    const data = await getMyOrders({ status: statusParam })
    orders.value = data || []
    
    // 校准逻辑
    const activeOrder = orders.value.find(o => (o.id === activeTrackingOrderId.value || o.is_walking === 1) && o.status === 2)
    if (activeOrder && activeOrder.is_walking === 1 && !isTracking.value) {
      activeTrackingOrderId.value = activeOrder.id
    }
    
    finished.value = true
  } catch (e) {
    console.error('>> [OrderList] Load Error:', e)
    finished.value = true
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onRefresh = () => {
  finished.value = false
  loadStats()
  onLoad()
}

const handleStatus = (id, status) => {
  showConfirmDialog({
    title: '确认更新',
    message: status === 2 ? '确定要开始服务吗？' : '确认订单状态变更？',
    confirmButtonColor: '#11998e'
  }).then(async () => {
    await updateOrderStatus(id, status)
    showSuccessToast('操作成功')
    onRefresh()
  })
}

const handleOrderClick = (item) => {
  console.log('>> [OrderList] Clicked:', item.id, item.order_type, item.recurring_order_id)
  // 根据订单特征判断跳转
  // 1. 优先判断 order_type (1: 周期单)
  // 2. 其次通过 category_name 或 service_name 辅助判断
  if (item.order_type == 1 || item.service_name?.includes('周期') || item.category_name?.includes('周期')) {
    // 兼容逻辑：如果 recurring_order_id 存在则使用，否则使用 item.id (针对旧数据或单次转周期的特殊情况)
    const targetId = item.recurring_order_id || item.id
    router.push(`/recurring-order/${targetId}`)
  } else {
    router.push(`/order/${item.id}`)
  }
}

const handleArrive = async (item) => {
  showConfirmDialog({
    title: '确认到达',
    message: '确认已到达服务地点？系统将记录您的位置。',
    confirmButtonColor: '#11998e'
  }).then(async () => {
    showLoadingToast({ message: '正在记录位置...', forbidClick: true })
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await request.put(`/orders/${item.id}/arrive`, { lat: pos.coords.latitude, lng: pos.coords.longitude })
      showSuccessToast('已确认到达')
      onRefresh()
    }, async () => {
      await request.put(`/orders/${item.id}/arrive`, { lat: null, lng: null })
      showSuccessToast('已确认到达')
      onRefresh()
    })
  })
}

const toggleTracking = async (item) => {
  if (isTracking.value && activeTrackingOrderId.value === item.id) {
    // 停止追踪
    showConfirmDialog({ message: '确定要停止遛狗吗？' }).then(async () => {
      stopGpsTracking(item.id)
    })
  } else {
    // 开始/恢复追踪
    startGpsTracking(item.id)
  }
}

const startGpsTracking = (orderId) => {
  activeTrackingOrderId.value = orderId
  isTracking.value = true
  trackPoints.value = []
  trackingDuration.value = 0

  // 1. 开启计时器
  if (durationTimer) clearInterval(durationTimer)
  durationTimer = setInterval(() => {
    trackingDuration.value++
  }, 1000)

  // 2. 开启同步计时器 (每30秒同步一次位置)
  if (syncTimer) clearInterval(syncTimer)
  syncTimer = setInterval(async () => {
    if (trackPoints.value.length > 0) {
      await request.put(`/orders/${orderId}/sync-track`, {
        points: trackPoints.value,
        isWalking: true
      })
    }
  }, 30000)

  // 3. 开启 GPS 监听
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition((pos) => {
      const point = [pos.coords.longitude, pos.coords.latitude]
      trackPoints.value.push(point)
    }, (err) => {
      console.error('GPS Error:', err)
    }, {
      enableHighAccuracy: true,
      distanceFilter: 10
    })
  }

  // 初始通知后台开始
  request.put(`/orders/${orderId}/sync-track`, { isWalking: true })
}

const stopGpsTracking = async (orderId) => {
  if (watchId) navigator.geolocation.clearWatch(watchId)
  if (syncTimer) clearInterval(syncTimer)
  if (durationTimer) clearInterval(durationTimer)
  
  isTracking.value = false
  
  // 最终同步
  await request.put(`/orders/${orderId}/sync-track`, {
    points: trackPoints.value,
    isWalking: false
  })
  
  showSuccessToast('已停止追踪')
  onRefresh()
}

const openCompletePopup = (item) => {
  showConfirmDialog({
    title: '完成服务',
    message: '确认已完成所有服务内容并提交？',
    confirmButtonColor: '#11998e'
  }).then(async () => {
    try {
      showLoadingToast({ message: '提交中...', forbidClick: true })
      await updateOrderStatus(item.id, 3)
      showSuccessToast('服务已完成')
      onRefresh()
    } catch (e) {
      showToast('提交失败')
    }
  })
}

const goToChat = (order) => {
  router.push({ path: '/chat', query: { targetId: order.user_id, targetName: order.contact_name || '客户', orderId: order.id } })
}

const getStatusText = (status) => ({ 
  0: '待接单', 
  1: '已接单', 
  2: '服务中', 
  3: '已完成', 
  4: '已取消', 
  5: '已完成',
  11: '已到达',
  12: '协商取消中'
}[status] || '未知')
const formatDate = (date) => new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
const parseJSON = (str) => { try { return typeof str === 'string' ? JSON.parse(str) : str } catch(e) { return [] } }

onMounted(() => {
  loadStats()
  onLoad()

  // 监听 WebSocket 触发的刷新事件
  window.addEventListener('order-refresh', onRefresh)

  // Socket 实时监听
  const token = localStorage.getItem('provider_token')
  if (token) {
    const socket = initSocket(token)
    
    // 监听用户申请取消
    socket.on('CANCEL_REQUEST', (data) => {
      console.log('>> [Socket] Cancel Request:', data)
      showToast({
        message: `用户申请取消订单 ${data.orderNo || ''}`,
        icon: 'warning-o'
      })
      onRefresh() // 刷新列表
    })
  }
})

onUnmounted(() => {
  if (watchId) navigator.geolocation.clearWatch(watchId)
  if (syncTimer) clearInterval(syncTimer)
  if (durationTimer) clearInterval(durationTimer)
  window.removeEventListener('order-refresh', onRefresh)
  
  const socket = getSocket()
  if (socket) socket.off('CANCEL_REQUEST')
})
</script>

<style scoped>
.order-list-page { min-height: 100vh; background: #f8fafc; }

.bottom-spacer {
  height: 70px;
  width: 100%;
}

.page-header { padding: 24px 20px 10px; background: #fff; }
.header-top { display: flex; justify-content: space-between; align-items: center; }
.header-title { font-size: 24px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; }

.all-orders-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f1f5f9;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  transition: all 0.2s;
}

.all-orders-btn.is-active {
  background: #eefaf8;
  color: #11998e;
}

.header-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }

.sticky-tabs { position: sticky; top: 0; z-index: 100; background: #fff; padding-bottom: 4px; }
.minimal-tabs :deep(.van-tabs__nav) { background: transparent; }
.minimal-tabs :deep(.van-tab) { font-weight: 600; font-size: 15px; color: #94a3b8; }
.minimal-tabs :deep(.van-tab--active) { color: #11998e; }

.list-content { padding: 16px; }

.premium-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.premium-card:active { transform: translateY(2px); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.01); }

.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.order-no { font-family: 'DIN Alternate', monospace; font-size: 13px; color: #94a3b8; letter-spacing: 0.5px; }
.status-indicator { font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 100px; text-transform: uppercase; }
.status-0 { background: #fee2e2; color: #ef4444; }
.status-1 { background: #e0f2fe; color: #0ea5e9; }
.status-2 { background: #fef3c7; color: #d97706; }
.status-12 { background: #fee2e2; color: #ef4444; }
.status-11 { background: #dcfce7; color: #16a34a; }
.status-3, .status-5 { background: #f0fdf4; color: #22c55e; }

.card-middle { margin-bottom: 20px; }
.service-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.service-name { font-size: 19px; font-weight: 900; color: #1e293b; flex: 1; margin-right: 12px; }
.price-box { display: flex; align-items: baseline; color: #ef4444; }
.price-box .currency { font-size: 14px; font-weight: 700; margin-right: 2px; }
.price-box .amount { font-family: 'DIN Alternate', sans-serif; font-size: 24px; font-weight: 900; }

.details-box { display: flex; flex-direction: column; gap: 8px; }
.detail-item { display: flex; align-items: center; gap: 8px; color: #64748b; }
.item-icon { font-size: 16px; color: #cbd5e1; }
.item-text { font-size: 14px; font-weight: 500; }

.live-glass-bar {
  margin-top: 16px;
  background: rgba(17, 153, 142, 0.05);
  border: 1px solid rgba(17, 153, 142, 0.1);
  border-radius: 16px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.live-info { display: flex; align-items: center; gap: 8px; }
.pulse-dot { width: 8px; height: 8px; background: #11998e; border-radius: 50%; box-shadow: 0 0 0 rgba(17, 153, 142, 0.4); animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(17, 153, 142, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(17, 153, 142, 0); } 100% { box-shadow: 0 0 0 0 rgba(17, 153, 142, 0); } }
.live-label { font-size: 13px; font-weight: 800; color: #11998e; }
.live-timer { font-family: 'DIN Alternate', sans-serif; font-size: 15px; font-weight: 700; color: #11998e; }
.live-stat { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748b; font-weight: 600; }

.card-bottom { border-top: 1px solid #f1f5f9; padding-top: 16px; }
.action-buttons { display: flex; justify-content: flex-end; gap: 10px; }

:deep(.van-button) { border: none !important; font-weight: 700; }
.btn-chat { background: #f1f5f9 !important; color: #475569 !important; }
.btn-arrive { background: #fef3c7 !important; color: #d97706 !important; }
.btn-start { background: #e0f2fe !important; color: #0ea5e9 !important; }
.btn-track { box-shadow: 0 4px 12px rgba(17, 153, 142, 0.15); }
.btn-complete { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; color: #fff !important; }

.empty-state { padding-top: 100px; }
</style>
