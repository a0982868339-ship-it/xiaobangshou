<template>
  <div class="order-list-page">
    <!-- 1. 页面头部 (升级为大厂极简风格) -->
    <div class="page-header">
      <div class="header-top">
        <div class="header-title">我的订单</div>
        <div class="header-right" @click="$router.push('/all-orders')">
          <div class="all-orders-btn">
            <van-icon name="notes-o" size="18" />
            <span>全部订单</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="sticky-tabs">
      <van-tabs v-model:active="activeTab" @change="onRefresh" color="#11998e" line-width="20px" class="minimal-tabs">
        <van-tab title="待付款" :name="String(ORDER_STATUS.WAIT_PAY)" :badge="Number(stats[ORDER_STATUS.WAIT_PAY]) > 0 ? Number(stats[ORDER_STATUS.WAIT_PAY]) : null" />
        <van-tab title="待接单" :name="String(ORDER_STATUS.WAIT_ACCEPT)" :badge="Number(stats[ORDER_STATUS.WAIT_ACCEPT]) > 0 ? Number(stats[ORDER_STATUS.WAIT_ACCEPT]) : null" />
        <van-tab title="执行中" :name="ORDER_STATUS.ACCEPTED + ',' + ORDER_STATUS.IN_SERVICE + ',' + ORDER_STATUS.ARRIVED" :badge="(Number(stats[ORDER_STATUS.ACCEPTED] || 0) + Number(stats[ORDER_STATUS.IN_SERVICE] || 0) + Number(stats[ORDER_STATUS.ARRIVED] || 0)) > 0 ? (Number(stats[ORDER_STATUS.ACCEPTED] || 0) + Number(stats[ORDER_STATUS.IN_SERVICE] || 0) + Number(stats[ORDER_STATUS.ARRIVED] || 0)) : null" />
        <van-tab title="待取消" :name="String(ORDER_STATUS.CANCEL_NEGOTIATING || 12)" :badge="Number(stats[ORDER_STATUS.CANCEL_NEGOTIATING || 12]) > 0 ? Number(stats[ORDER_STATUS.CANCEL_NEGOTIATING || 12]) : null" />
        <van-tab title="已完成" :name="ORDER_STATUS.COMPLETED + ',' + ORDER_STATUS.REVIEWED" :badge="(Number(stats[ORDER_STATUS.COMPLETED] || 0) + Number(stats[ORDER_STATUS.REVIEWED] || 0)) > 0 ? (Number(stats[ORDER_STATUS.COMPLETED] || 0) + Number(stats[ORDER_STATUS.REVIEWED] || 0)) : null" />
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
            @click="goDetail(item)"
          >
            <div class="card-top">
              <div class="order-no">#{{ item.order_no.slice(-8) }}</div>
              <div class="status-indicator" :class="'status-' + item.status">
                {{ getStatusText(item) }}
              </div>
            </div>
            
            <div class="card-middle">
              <div class="service-info">
                <div class="service-name">{{ item.service_name }}</div>
                <div class="price-box">
                  <span class="currency">¥</span>
                  <span class="amount">{{ item.total_price }}</span>
                </div>
              </div>
              
              <!-- 服务属性展示 -->
              <div class="service-attribute-bar">
                <div v-if="item.service_name.includes('陪诊')" class="attr-pill medical">
                  <van-icon name="hospital-o" />
                  <span>医疗陪护</span>
                </div>
                <div v-else-if="item.service_name.includes('遛狗')" class="attr-pill pet">
                  <van-icon name="guide-o" />
                  <span>宠物特护</span>
                </div>
                <div v-if="item.order_type === 1" class="attr-pill periodic">
                  <van-icon name="calendar-o" />
                  <span>周期单</span>
                </div>
              </div>
              
              <div class="details-box">
                <div class="detail-item">
                  <van-icon name="location" class="item-icon" />
                  <span class="item-text">{{ item.service_address }}</span>
                </div>
                <div class="detail-item">
                  <van-icon name="clock" class="item-icon" />
                  <span class="item-text">{{ formatDate(item.service_time) }}</span>
                </div>
              </div>

              <!-- 实时状态条 (仅限进行中的服务) -->
              <div v-if="item.status === ORDER_STATUS.IN_SERVICE" class="live-status-pill">
                <span class="pulse-dot"></span>
                <span class="live-text">师傅正在为您提供服务...</span>
              </div>

              <!-- 待付款倒计时 -->
              <div v-if="item.status === ORDER_STATUS.WAIT_PAY" class="pay-countdown-bar">
                <van-icon name="clock-o" />
                <span class="countdown-label">请在 {{ formatCountdown(item.pay_remaining_seconds) }} 内完成支付</span>
              </div>
            </div>

            <div class="card-bottom" @click.stop>
              <div class="footer-left-meta">
                <!-- 更多操作 (淘宝风格) -->
                <div class="popover-actions" v-if="item.status >= ORDER_STATUS.COMPLETED || item.status === ORDER_STATUS.CANCELLED">
                  <van-popover
                    v-model:show="item.showMore"
                    placement="top-start"
                    :actions="[{ text: '删除订单', icon: 'delete-o', value: 'delete' }]"
                    @select="(action) => action.value === 'delete' && handleDelete(item)"
                  >
                    <template #reference>
                      <div class="more-trigger">
                        <span>更多</span>
                        <van-icon name="arrow-down" />
                      </div>
                    </template>
                  </van-popover>
                </div>
              </div>
              <div class="action-buttons">
                <template v-if="item.status === ORDER_STATUS.WAIT_PAY">
                  <van-button size="small" round class="btn-cancel" @click="handleCancel(item)">取消</van-button>
                  <van-button size="small" type="primary" round class="btn-pay" @click="handlePay(item)">支付</van-button>
                </template>
                <van-button v-if="item.status === ORDER_STATUS.WAIT_ACCEPT" size="small" round class="btn-cancel" @click="handleCancel(item)">取消订单</van-button>
                <van-button v-if="item.status === ORDER_STATUS.COMPLETED && item.confirm_status === 0" size="small" type="primary" round @click="handleUserConfirm(item)">确认满意</van-button>
                <van-button v-if="item.status === ORDER_STATUS.COMPLETED && item.confirm_status === 1" size="small" type="primary" round class="btn-review" @click="goReview(item)">去评价</van-button>
                <van-button v-if="item.status === ORDER_STATUS.ACCEPTED || item.status === ORDER_STATUS.IN_SERVICE" size="small" type="primary" round class="btn-chat" @click="goToChat(item)">
                  <template #icon><van-icon name="chat-o" /></template>
                  联系师傅
                </van-button>
                <van-button size="small" round @click="goDetail(item)" class="btn-detail">详情</van-button>
              </div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
      
      <div v-if="orders.length === 0 && !loading" class="empty-placeholder">
        <van-empty description="暂无服务订单" />
      </div>
    </div>

    <!-- 评价弹窗 -->
    <van-popup v-model:show="showReviewPopup" round position="bottom" class="review-premium-popup">
      <div class="review-container">
        <div class="review-header">
          <div class="r-title">发表评价</div>
          <van-icon name="cross" @click="showReviewPopup = false" />
        </div>
        <div class="review-content">
          <div class="rate-box">
            <div class="r-label">整体满意度</div>
            <van-rate v-model="reviewForm.rating" size="28" color="#ffd21e" void-icon="star" void-color="#eee" />
          </div>
          <van-field
            v-model="reviewForm.content"
            rows="4"
            autosize
            type="textarea"
            maxlength="200"
            placeholder="师傅的服务如何？环境清理到位吗？分享您的真实感受..."
            show-word-limit
            class="review-input"
          />
          <div class="submit-action">
            <van-button type="primary" block round class="btn-submit" @click="submitReview" :loading="submitting">提交评价</van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 极简质感确认弹窗 (升级版) -->
    <van-popup v-model:show="confirmPopup.show" round position="center" class="premium-confirm-box">
      <div class="confirm-card-content">
        <div class="confirm-icon-wrap" :class="confirmPopup.type">
          <van-icon :name="confirmPopup.icon" />
        </div>
        <div class="confirm-title">{{ confirmPopup.title }}</div>
        <div class="confirm-desc" style="white-space: pre-wrap;">{{ confirmPopup.message }}</div>
        <div class="confirm-btns">
          <van-button class="c-btn-cancel" block round @click="confirmPopup.show = false">暂不处理</van-button>
          <van-button 
            class="c-btn-ok" 
            :class="confirmPopup.type" 
            block 
            round 
            @click="handleConfirmAction" 
            :loading="confirmPopup.loading"
          >
            {{ confirmPopup.okText }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getOrders, cancelOrder, updateOrderDeleteStatus, confirmOrder, getOrderStats } from '../api'
import { ORDER_STATUS } from '../utils/constants'
import { showToast } from 'vant'

const router = useRouter()
const route = useRoute()
const activeTab = ref(String(ORDER_STATUS.WAIT_PAY))
const orders = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const stats = ref({})

const loadStats = async () => {
  try {
    const res = await getOrderStats()
    // 确保数据响应格式正确处理
    stats.value = res.data || res
    console.log('>> [OrderStats] Raw Response:', res)
    console.log('>> [OrderStats] Processed Stats:', stats.value)
  } catch (e) {
    console.error('>> [OrderStats] Load Error:', e)
  }
}

const onLoad = async () => {
  if (loading.value || finished.value) return
  loading.value = true
  try {
    const data = await getOrders({ status: activeTab.value })
    orders.value = (data || []).map(item => ({ ...item, showMore: false }))
    // 强制先加载统计数据
    await loadStats()
    finished.value = true // 数据加载成功
  } catch (e) {
    console.error('>> [OrderList] Load Error:', e)
    finished.value = true // 出错也标记完成，防止 van-list 无限重试
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onRefresh = (event) => {
  if (event && event.detail) {
    const { orderId, isReconnect } = event.detail;
    console.log(`>> [Socket/UI] 触发实时刷新: ${isReconnect ? '重连同步' : '订单' + orderId}`);
  }
  finished.value = false;
  onLoad();
}

const goDetail = (item) => router.push(`/order/${item.id}`)
const goToChat = (order) => router.push({ path: '/chat', query: { targetId: order.provider_user_id, targetName: order.provider_nickname, orderId: order.id } })

const handleUserConfirm = (item) => {
  confirmPopup.title = '确认满意'
  confirmPopup.message = '确认后资金将立即打入师傅账户，您将进入评价环节。'
  confirmPopup.icon = 'passed'
  confirmPopup.type = 'success'
  confirmPopup.okText = '确认满意'
  confirmPopup.show = true
  confirmPopup.onConfirm = async () => {
    try {
      await confirmOrder(item.id)
      showToast('确认成功，快去评价吧')
      onRefresh()
    } catch (e) {}
  }
}

const handlePay = async (item) => {
  router.push(`/order/${item.id}?pay=1`)
}

const getStatusText = (item) => {
  const s = item.status
  const c = item.confirm_status
  if (s === ORDER_STATUS.WAIT_PAY) return '待付款'
  if (s === ORDER_STATUS.COMPLETED && c === 1) return '待评价'
  return { 
    [ORDER_STATUS.WAIT_ACCEPT]: '待接单', 
    [ORDER_STATUS.ACCEPTED]: '已接单', 
    [ORDER_STATUS.IN_SERVICE]: '服务中', 
    [ORDER_STATUS.COMPLETED]: '已完成', 
    [ORDER_STATUS.CANCELLED]: '已取消', 
    [ORDER_STATUS.REVIEWED]: '已评价',
    [ORDER_STATUS.ARRIVED || 11]: '已到达',
    [ORDER_STATUS.CANCEL_NEGOTIATING || 12]: '取消协商中'
  }[s] || '未知'
}
const formatDate = (date) => new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
const parseJSON = (str) => { try { return typeof str === 'string' ? JSON.parse(str) : str } catch(e) { return [] } }

const formatCountdown = (seconds) => {
  if (!seconds || seconds <= 0) {
    // 倒计时结束，触发自动刷新以显示取消状态
    setTimeout(() => onRefresh(), 1000);
    return '00:00';
  }
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const showReviewPopup = ref(false)
const submitting = ref(false)
const currentOrder = ref(null)
const reviewForm = ref({ rating: 5, content: '' })

const goReview = (item) => router.push({ path: `/order/${item.id}`, query: { review: 1 } })
const submitReview = async () => {
  submitting.value = true
  try {
    await request.post(`/orders/${currentOrder.value.id}/review`, reviewForm.value)
    showToast('评价成功')
    showReviewPopup.value = false
    onRefresh()
  } catch (e) {}
  submitting.value = false
}

const handleCancel = (item) => {
  confirmPopup.title = '取消确认'
  confirmPopup.message = '确定要取消这个订单吗？'
  confirmPopup.icon = 'info-o'
  confirmPopup.type = 'default'
  confirmPopup.okText = '确定取消'
  confirmPopup.show = true
  confirmPopup.onConfirm = async () => {
    try {
      await cancelOrder(item.id)
      showToast('取消成功')
      onRefresh()
    } catch (e) {}
  }
}

const handleDelete = (item) => {
  confirmPopup.title = '确认移除'
  confirmPopup.message = '订单将移至回收站。'
  confirmPopup.icon = 'delete-o'
  confirmPopup.type = 'danger'
  confirmPopup.okText = '移入回收站'
  confirmPopup.show = true
  confirmPopup.onConfirm = async () => {
    try {
      await updateOrderDeleteStatus(item.id, 1)
      showToast('已移至回收站')
      onRefresh()
    } catch (e) {}
  }
}

const confirmPopup = reactive({
  show: false,
  title: '',
  message: '',
  icon: '',
  type: 'default',
  okText: '',
  onConfirm: null,
  loading: false
})

const handleConfirmAction = async () => {
  if (confirmPopup.onConfirm) {
    confirmPopup.loading = true
    await confirmPopup.onConfirm()
    confirmPopup.loading = false
  }
  confirmPopup.show = false
}

onMounted(() => {
  if (route.query.status !== undefined) activeTab.value = String(route.query.status)
  onLoad()
  loadStats() // 额外在挂载时拉取一次统计
  window.addEventListener('order-refresh', onRefresh)
})

onUnmounted(() => {
  window.removeEventListener('order-refresh', onRefresh)
})
</script>

<style scoped>
.order-list-page { min-height: 100vh; background: #f8fafc; padding-bottom: 40px; }
.page-header { padding: 24px 20px 10px; background: #fff; }
.header-top { display: flex; justify-content: space-between; align-items: center; }
.header-title { font-size: 24px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; }
.all-orders-btn { display: flex; align-items: center; gap: 4px; padding: 6px 12px; background: #f1f5f9; border-radius: 100px; font-size: 12px; font-weight: 700; color: #64748b; }
.sticky-tabs { position: sticky; top: 0; z-index: 100; background: #fff; padding-bottom: 4px; }
.minimal-tabs :deep(.van-tabs__nav) { background: transparent; }
.minimal-tabs :deep(.van-tab) { font-weight: 600; font-size: 15px; color: #94a3b8; }
.minimal-tabs :deep(.van-tab--active) { color: #11998e; }
.list-content { padding: 16px; }
.premium-card { background: #ffffff; border-radius: 24px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); border: 1px solid rgba(0, 0, 0, 0.03); transition: all 0.3s; }
.premium-card:active { transform: translateY(2px); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.order-no { font-family: 'DIN Alternate', monospace; font-size: 13px; color: #94a3b8; }
.status-indicator { font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 100px; text-transform: uppercase; }
.status-0 { background: #fee2e2; color: #ef4444; }
.status-1 { background: #e0f2fe; color: #0ea5e9; }
.status-2 { background: #fef3c7; color: #d97706; }
.status-3, .status-5 { background: #f0fdf4; color: #22c55e; }
.status-4 { background: #f1f5f9; color: #94a3b8; }
.card-middle { margin-bottom: 20px; }
.service-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.service-name { font-size: 19px; font-weight: 900; color: #1e293b; flex: 1; margin-right: 12px; }
.price-box { display: flex; align-items: baseline; color: #ef4444; }
.price-box .currency { font-size: 14px; font-weight: 700; }
.price-box .amount { font-family: 'DIN Alternate', sans-serif; font-size: 24px; font-weight: 900; }
.details-box { display: flex; flex-direction: column; gap: 8px; }
.service-attribute-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.attr-pill { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; }
.attr-pill.medical { background: #eef2ff; color: #4f46e5; }
.attr-pill.pet { background: #fff7ed; color: #ea580c; }
.attr-pill.periodic { background: #f1f5f9; color: #475569; }
.detail-item { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
.item-icon { font-size: 16px; color: #cbd5e1; }
.live-status-pill { margin-top: 16px; background: rgba(17, 153, 142, 0.05); border-radius: 12px; padding: 8px 12px; display: flex; align-items: center; gap: 8px; }
.pulse-dot { width: 6px; height: 6px; background: #11998e; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(17, 153, 142, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(17, 153, 142, 0); } 100% { box-shadow: 0 0 0 0 rgba(17, 153, 142, 0); } }
.live-text { font-size: 12px; font-weight: 700; color: #11998e; }
.pay-countdown-bar { margin-top: 16px; background: #fff7e6; border-radius: 12px; padding: 8px 12px; display: flex; align-items: center; gap: 6px; color: #fa8c16; font-size: 12px; font-weight: 700; }
.card-bottom { border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
.action-buttons { display: flex; gap: 10px; }
.btn-cancel { background: #f1f5f9 !important; color: #64748b !important; }
.btn-pay { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; color: #fff !important; }
.btn-chat { background: #e0f2fe !important; color: #0ea5e9 !important; }
.btn-detail { background: #f8fafc !important; color: #1e293b !important; border: 1px solid #f1f5f9 !important; }
.premium-confirm-box { width: 85%; background: white; overflow: visible; border-radius: 22px; }
.confirm-card-content { padding: 32px 24px 24px; text-align: center; }
.confirm-icon-wrap { width: 64px; height: 64px; border-radius: 22px; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: -60px auto 20px; background: white; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.confirm-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px; }
.confirm-desc { font-size: 14px; color: #999; line-height: 1.6; margin-bottom: 32px; }
.confirm-btns { display: flex; gap: 12px; }
.c-btn-cancel { flex: 1; background: #f5f5f5 !important; color: #999 !important; height: 48px; font-weight: 600; }
.c-btn-ok { flex: 1.2; height: 48px; font-weight: 700; }
.c-btn-ok.success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; color: white !important; }
</style>
