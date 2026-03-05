<template>
  <div class="recurring-order-page">
    <!-- 导航栏 -->
    <van-nav-bar
      title="周期订单详情"
      left-arrow
      @click-left="$router.back()"
      fixed
      placeholder
      class="premium-nav"
    />

    <div v-if="loading" class="loading-container">
      <van-loading size="24px" vertical>加载中...</van-loading>
    </div>

    <div v-else-if="order" class="content">
      <!-- 1. 沉浸式状态头 (匹配 OrderDetail.vue 风格) -->
      <div class="status-header-v4" :class="getStatusClass(order.status)">
        <div class="status-main-v4">
          <div class="status-left-v4">
            <van-icon :name="getStatusIconName(order.status)" class="status-icon-v4" />
            <span class="status-text-v4">{{ getStatusText(order.status) }}</span>
          </div>
          <div class="order-no-v4">编号: {{ order.order_no.slice(-8) }}</div>
        </div>
        <div class="status-sub-v4">{{ getStatusSubText() }}</div>
      </div>

      <!-- 2. 服务者信息卡片 (如果有) -->
      <div v-if="order.provider" class="provider-card-v4">
        <div class="provider-info-v4">
          <van-image round width="48" height="48" :src="order.provider.avatar" class="provider-avatar-v4" />
          <div class="provider-detail-v4">
            <div class="provider-name-v4">{{ order.provider.name }}</div>
            <div class="provider-rating-v4">
              <van-rate v-model="order.provider.rating" readonly size="12" color="#ffd21e" />
              <span class="rating-num-v4">{{ order.provider.rating || '5.0' }}</span>
            </div>
          </div>
        </div>
        <div class="provider-actions-v4">
          <div class="action-btn-v4 chat" @click="handleChat"><van-icon name="chat-o" /></div>
          <div class="action-btn-v4 phone" @click="handlePhone"><van-icon name="phone-o" /></div>
        </div>
      </div>

      <!-- 3. 服务全节点溯源 (排期表) -->
      <div class="section-card-v4 premium-shadow">
        <div class="section-title-v4">服务全节点溯源</div>
        <div class="schedule-timeline-v4">
          <div
            v-for="(session, index) in order.sessions"
            :key="session.id"
            class="schedule-item-v4"
            :class="[getSessionCardClass(session), { 'is-expanded': expandedSessionId === session.id }]"
          >
            <div class="timeline-line-v4"></div>
            <div class="timeline-dot-v4"></div>
            
            <div class="schedule-wrapper-v4">
              <div class="schedule-content-v4" @click="handleSessionClick(session)">
                <div class="schedule-main-v4">
                  <div class="schedule-title-v4">第{{ index + 1 }}次服务</div>
                  <div class="schedule-time-v4">{{ formatDate(session.session_date) }} {{ session.service_time }}</div>
                </div>
                <div class="schedule-status-v4">
                  <span class="status-tag-v4" :class="getSessionStatusClass(session)">
                    {{ getSessionStatusTextNew(session) }}
                  </span>
                  <!-- 小三角切换按钮 -->
                  <div v-if="canCancelSession(session)" class="expand-toggle-v4" @click.stop="toggleSessionExpand(session.id)">
                    <van-icon :name="expandedSessionId === session.id ? 'arrow-up' : 'arrow-down'" />
                  </div>
                  <van-icon v-else name="arrow" class="arrow-icon-v4" />
                </div>
              </div>

              <!-- 隐藏的操作区：点击小三角展开 -->
              <transition name="van-slide-down">
                <div v-if="expandedSessionId === session.id" class="session-actions-v4">
                  <div class="action-divider-v4"></div>
                  <div class="action-buttons-v4">
                    <van-button 
                      size="small" 
                      round 
                      plain 
                      class="session-cancel-btn-v4"
                      icon="close"
                      @click.stop="requestCancelSession(session)"
                    >
                      申请取消该日服务
                    </van-button>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 订单详情信息 -->
      <div class="section-card-v4">
        <div class="section-title-v4">订单详情信息</div>
        <div class="info-list-v4">
          <div class="info-item-v4">
            <span class="info-label-v4">服务项目</span>
            <span class="info-value-v4">{{ order.service_name }}</span>
          </div>
          <div class="info-item-v4">
            <span class="info-label-v4">服务次数</span>
            <span class="info-value-v4">{{ order.total_sessions }}次 (已完成 {{ order.completed_sessions }}次)</span>
          </div>
          <div class="info-item-v4">
            <span class="info-label-v4">服务地址</span>
            <span class="info-value-v4 address-v4">{{ order.address }}</span>
          </div>
          <div class="info-item-v4">
            <span class="info-label-v4">联系人</span>
            <span class="info-value-v4">{{ order.contact_phone }}</span>
          </div>
        </div>
      </div>

      <!-- 5. 底部固定操作栏 -->
      <div class="bottom-bar-v4">
        <van-button class="bottom-btn-v4 secondary" @click="handleContact">
          联系师傅
        </van-button>
        <van-button v-if="order.status === 0" class="bottom-btn-v4 primary" @click="handlePay">
          立即支付 ¥{{ order.total_price }}
        </van-button>
        <van-button v-else-if="canCancelWholeOrder" class="bottom-btn-v4 danger" @click="handleCancelOrder">
          申请取消
        </van-button>
      </div>
    </div>

    <!-- 查看日报弹窗 -->
    <van-popup
      v-model:show="showReportPopup"
      position="bottom"
      round
      :style="{ height: '80%' }"
      class="report-viewer"
    >
      <div class="popup-header">
        <div class="popup-title">今日服务报告</div>
        <div class="popup-subtitle">{{ formatDate(currentSession?.session_date) }} 服务详情</div>
        <van-icon name="cross" class="close-icon" @click="showReportPopup = false" />
      </div>

      <div class="popup-body">
        <!-- 照片展墙 -->
        <div class="photo-wall" v-if="reportImages.length">
          <van-image
            v-for="(img, idx) in reportImages"
            :key="idx"
            :src="img"
            width="100%"
            class="report-image"
            round
            @click="previewImg(img)"
          />
        </div>

        <!-- 详细反馈 -->
        <div class="report-content-section">
          <div class="section-label">服务反馈</div>
          <div class="note-box">
            {{ currentSession?.report_note || '服务者未填写详细信息' }}
          </div>
        </div>

        <div class="report-footer-hint">
          如有任何问题，请及时联系在线客服或电话沟通。
        </div>
      </div>

      <div class="popup-footer" v-if="currentSession?.status === 'punched'">
        <van-button type="primary" block round @click="confirmSession(currentSession.id); showReportPopup = false">
          确认服务无误，完成支付
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, h, render } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '../api'
import { showToast, showConfirmDialog, showImagePreview } from 'vant'
import { useSocket } from '@/composables/useSocket'
import NotificationCard from '@/components/NotificationCard.vue'

const route = useRoute()
const router = useRouter()
const orderId = route.params.id

const loading = ref(true)
const order = ref(null)

// 日报查看相关
const showReportPopup = ref(false)
const currentSession = ref(null)
const reportImages = computed(() => {
  if (!currentSession.value?.report_images) return []
  try {
    return JSON.parse(currentSession.value.report_images)
  } catch {
    return []
  }
})

const petInfo = computed(() => {
  try {
    return order.value?.remark ? JSON.parse(order.value.remark) : null
  } catch {
    return null
  }
})

const getStatusIconName = (id) => {
  return { 0: 'bill-o', 1: 'logistics', 2: 'passed' }[id] || 'bill-o'
}

const canCancelWholeOrder = computed(() => {
  if (!order.value) return false
  // 仅在未支付或所有场次都未开始时可整体取消
  return order.value.status === 0 || (order.value.status === 1 && order.value.completed_sessions === 0)
})

const handleChat = () => showToast('聊天功能开发中')
const handlePhone = () => {
  if (order.value?.provider?.phone) {
    window.location.href = `tel:${order.value.provider.phone}`
  } else {
    showToast('暂无联系电话')
  }
}
const handleContact = () => handlePhone()
const handleCancelOrder = () => {
  showConfirmDialog({
    title: '申请取消',
    message: '确认申请取消整个周期单？'
  }).then(async () => {
    try {
      await request.post(`/recurring/${orderId}/cancel`)
      showToast('取消申请已提交')
      loadOrderDetail()
    } catch (e) {
      showToast(e.message || '操作失败')
    }
  }).catch(() => {})
}
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

// 支付订单
const handlePay = async () => {
  try {
    await showConfirmDialog({
      title: '确认支付',
      message: `确认支付¥${order.value.total_price}购买${order.value.total_sessions}次服务？`
    })

    await request.post(`/recurring/${orderId}/pay`)
    showToast('支付成功')
    await loadOrderDetail()
  } catch (error) {
    if (error !== 'cancel') showToast(error.message || '支付失败')
  }
}

// 确认服务完成
const confirmSession = async (sessionId) => {
  try {
    await showConfirmDialog({
      title: '确认服务完成',
      message: '确认服务者已完成本次服务？确认后资金将结算给服务者。'
    })

    await request.post(`/recurring/session/${sessionId}/confirm`)
    showToast('确认成功')
    await loadOrderDetail()
  } catch (error) {
    if (error !== 'cancel') showToast(error.message || '确认失败')
  }
}

const viewReport = (session) => {
  currentSession.value = session
  showReportPopup.value = true
}

const previewImg = (url) => {
  showImagePreview([url])
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${month}月${day}日 周${weekDays[d.getDay()]}`
}

const formatTime = (time) => {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

const getStatusClass = (id) => ({ 0: 'unpaid', 1: 'ongoing', 2: 'completed' }[id] || 'unpaid')
const getStatusIcon = (id) => ({ 0: '💳', 1: '🎯', 2: '✅' }[id] || '💳')
const getStatusText = (id) => ({ 0: '待支付', 1: '服务中', 2: '已完成' }[id] || '待支付')

const getStatusSubText = () => {
  if (!order.value || order.value.status !== 1) return ''
  return `已完成 ${order.value.completed_sessions}/${order.value.total_sessions} 次`
}

// 新版状态映射函数
const getSessionCardClass = (s) => {
  if (s.status === 3 || s.status === 'settled' || s.status === 'confirmed') return 'completed'
  if (s.status === 2 || s.status === 'punched') return 'in-progress'
  if (s.status === 11) return 'arrived'
  if (s.status === 'cancel_pending') return 'cancel-pending'
  return 'pending'
}

const getSessionStatusClass = (s) => {
  if (s.status === 3 || s.status === 'settled' || s.status === 'confirmed') return 'completed'
  if (s.status === 2 || s.status === 'punched' || s.status === 11) return 'in-progress'
  if (s.status === 'cancel_pending') return 'cancel-pending'
  return 'pending'
}

const getSessionStatusTextNew = (s) => {
  if (s.status === 3 || s.status === 'settled') return '已完成'
  if (s.status === 'confirmed') return '待结算'
  if (s.status === 2) return '服务中'
  if (s.status === 'punched') return '已打卡'
  if (s.status === 11) return '已到达'
  if (s.status === 'cancel_pending') return '取消中'
  if (s.status === 'cancelled') return '已取消'
  return '待服务'
}

// 展开/收起单场次操作
const expandedSessionId = ref(null)
const toggleSessionExpand = (sessionId) => {
  expandedSessionId.value = expandedSessionId.value === sessionId ? null : sessionId
}

// 判断是否可申请取消（待服务/已到达状态）
const canCancelSession = (session) => {
  return session.status === 0 || session.status === 'pending' || session.status === 11
}

// 点击日期卡片进入详情
const handleSessionClick = (session) => {
  // 跳转到场次详情页（复用 OrderDetail）
  router.push(`/order/${session.id}?type=recurring`)
}

// 申请取消单个场次
const requestCancelSession = async (session) => {
  try {
    await showConfirmDialog({
      title: '申请取消',
      message: `确认申请取消 ${formatDate(session.session_date)} 的服务？服务者同意后将退还该次费用。`
    })
    
    await request.post(`/recurring/session/${session.id}/request-cancel`)
    showToast('取消申请已提交')
    expandedSessionId.value = null
    await loadOrderDetail()
  } catch (error) {
    if (error !== 'cancel') showToast(error.message || '申请失败')
  }
}

const getSessionClass = (status) => `status-${status}`
const getSessionStatusText = (status) => {
  return { pending: '待服务', punched: '已打卡', confirmed: '待结算', settled: '已结算' }[status] || status
}

// Socket通知助手函数
const showNotification = (title, message, type = 'order') => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  
  const vnode = h(NotificationCard, {
    type,
    title,
    message,
    duration: 5000,
    onClick: () => {
      loadOrderDetail()
    },
    onClose: () => {
      render(null, container)
      document.body.removeChild(container)
    }
  })
  
  render(vnode, container)
}

// 初始化Socket监听
const socket = useSocket()

onMounted(() => {
  loadOrderDetail()

  // 监听周期单Socket事件
  socket.on('recurring_session_arrived', (data) => {
    console.log('Socket: 师傅已到达', data)
    showNotification('师傅已到达', data.message, 'order')
    loadOrderDetail()
  })

  socket.on('recurring_session_started', (data) => {
    console.log('Socket: 服务已开始', data)
    showNotification('服务开始', data.message, 'order')
    loadOrderDetail()
  })

  socket.on('recurring_session_completed', (data) => {
    console.log('Socket: 服务已完成', data)
    showNotification('服务完成', data.message, 'order')
    loadOrderDetail()
  })

  socket.on('recurring_order_cancelled', (data) => {
    console.log('Socket: 订单已取消', data)
    showNotification('订单已取消', data.message, 'warning')
    loadOrderDetail()
  })

  socket.on('recurring_order_reject_cancel', (data) => {
    console.log('Socket: 取消被拒绝', data)
    showNotification('取消申请被拒绝', data.message, 'warning')
    loadOrderDetail()
  })
})

onUnmounted(() => {
  // 清理Socket监听
  socket.off('recurring_session_arrived')
  socket.off('recurring_session_started')
  socket.off('recurring_session_completed')
  socket.off('recurring_order_cancelled')
  socket.off('recurring_order_reject_cancel')
})
</script>

<style scoped>
.recurring-order-page { min-height: 100vh; background: #f8fafc; padding-bottom: 110px; }
.premium-nav { background: transparent !important; }

/* 1. 沉浸式状态头 - 极致质感 */
.status-header-v4 {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: white; padding: 60px 24px 100px;
  position: relative; overflow: hidden;
}
.status-header-v4.completed { background: linear-gradient(135deg, #07c160 0%, #059669 100%); }
.status-header-v4.unpaid { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }

/* 增加背景装饰增强质感 */
.status-header-v4::before {
  content: ''; position: absolute; top: -100px; left: -100px; width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%; z-index: 1;
}
.status-header-v4::after {
  content: ''; position: absolute; bottom: -50px; right: -50px; width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%; z-index: 1;
}

.status-main-v4 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; position: relative; z-index: 2; }
.status-left-v4 { display: flex; align-items: center; gap: 16px; }
.status-icon-v4 { font-size: 40px; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15)); }
.status-text-v4 { font-size: 32px; font-weight: 900; letter-spacing: -1px; }
.order-no-v4 { font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 6px 16px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.status-sub-v4 { font-size: 16px; opacity: 0.95; font-weight: 600; position: relative; z-index: 2; padding-left: 4px; }

/* 2. 服务者卡片 - 悬浮质感 */
.provider-card-v4 {
  margin: -50px 20px 24px; background: rgba(255,255,255,0.98); backdrop-filter: blur(30px);
  border-radius: 36px; padding: 28px; display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,1);
  position: relative; z-index: 10;
}
.provider-info-v4 { display: flex; align-items: center; gap: 18px; }
.provider-avatar-v4 { border: 4px solid #fff; box-shadow: 0 8px 20px rgba(0,0,0,0.1); }
.provider-name-v4 { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
.provider-rating-v4 { display: flex; align-items: center; gap: 8px; }
.rating-num-v4 { font-size: 14px; color: #f59e0b; font-weight: 800; }

.provider-actions-v4 { display: flex; gap: 16px; }
.action-btn-v4 {
  width: 48px; height: 48px; border-radius: 18px; display: flex;
  align-items: center; justify-content: center; font-size: 24px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.action-btn-v4:active { transform: scale(0.85); }
.action-btn-v4.chat { background: #f0f7ff; color: #0084ff; }
.action-btn-v4.phone { background: #f0fdf4; color: #07c160; }

/* 3. 通用卡片容器 */
.section-card-v4 {
  margin: 0 20px 24px; background: white; border-radius: 36px; padding: 32px 28px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid rgba(241, 245, 249, 0.5);
}
.premium-shadow { box-shadow: 0 15px 40px rgba(124, 58, 237, 0.04); }
.section-title-v4 { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 28px; display: flex; align-items: center; gap: 10px; }
.section-title-v4::before { content: ''; width: 5px; height: 18px; background: linear-gradient(to bottom, #7c3aed, #a78bfa); border-radius: 3px; }

/* 4. 溯源时间轴 - 极致细节 */
.schedule-timeline-v4 { position: relative; padding-left: 12px; }
.schedule-item-v4 {
  position: relative; padding-bottom: 32px;
}
.schedule-item-v4:last-child { padding-bottom: 0; }

.timeline-line-v4 {
  position: absolute; left: 5px; top: 28px; bottom: 0;
  width: 2px; background: linear-gradient(to bottom, #f1f5f9 0%, #f1f5f9 100%);
}
.schedule-item-v4:last-child .timeline-line-v4 { display: none; }

.timeline-dot-v4 {
  position: absolute; left: 0; top: 20px; width: 12px; height: 12px;
  background: #e2e8f0; border-radius: 50%; border: 3px solid #fff; z-index: 2;
  box-shadow: 0 0 0 1px #f1f5f9; transition: all 0.3s;
}
.schedule-item-v4.completed .timeline-dot-v4 { background: #07c160; box-shadow: 0 0 0 4px rgba(7, 193, 96, 0.05); }
.schedule-item-v4.in-progress .timeline-dot-v4 { background: #7c3aed; box-shadow: 0 0 0 6px rgba(124, 58, 237, 0.15); }

.schedule-wrapper-v4 { flex: 1; padding-left: 28px; }
.schedule-content-v4 { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.schedule-content-v4:active { opacity: 0.7; }

.schedule-title-v4 { font-size: 16px; font-weight: 800; color: #1e293b; transition: color 0.2s; }
.is-expanded .schedule-title-v4 { color: #7c3aed; }
.schedule-time-v4 { font-size: 13px; color: #94a3b8; margin-top: 5px; font-weight: 600; }

.schedule-status-v4 { display: flex; align-items: center; gap: 12px; }
.status-tag-v4 { font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 100px; }
.status-tag-v4.completed { color: #059669; background: #ecfdf5; }
.status-tag-v4.in-progress { color: #7c3aed; background: #f5f3ff; }
.status-tag-v4.pending { color: #64748b; background: #f8fafc; }

.expand-toggle-v4 {
  width: 28px; height: 28px; border-radius: 8px; background: #f8fafc;
  display: flex; align-items: center; justify-content: center;
  color: #cbd5e1; transition: all 0.3s;
}
.is-expanded .expand-toggle-v4 { background: #f5f3ff; color: #7c3aed; transform: rotate(0deg); }
.arrow-icon-v4 { font-size: 14px; color: #cbd5e1; }

/* 展开操作区样式 */
.session-actions-v4 { overflow: hidden; }
.action-divider-v4 { height: 1px; background: #f1f5f9; margin: 16px 0; }
.action-buttons-v4 { display: flex; justify-content: flex-end; }
.session-cancel-btn-v4 {
  height: 36px !important; padding: 0 16px !important;
  border-color: #fee2e2 !important; color: #ef4444 !important;
  font-weight: 800 !important; font-size: 12px !important;
  background: #fff1f2 !important;
}

/* 5. 详情列表 */
.info-list-v4 { display: flex; flex-direction: column; gap: 24px; }
.info-item-v4 { display: flex; justify-content: space-between; align-items: flex-start; }
.info-label-v4 { font-size: 15px; color: #94a3b8; font-weight: 700; }
.info-value-v4 { font-size: 15px; color: #0f172a; font-weight: 800; text-align: right; }
.info-value-v4.address-v4 { max-width: 220px; line-height: 1.6; }

/* 6. 底部操作栏 - 极致悬浮 */
.bottom-bar-v4 {
  position: fixed; bottom: 24px; left: 24px; right: 24px;
  background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(20px);
  padding: 14px 14px 14px 24px; border-radius: 24px;
  display: flex; align-items: center; gap: 16px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1); z-index: 100;
}
.bottom-btn-v4 { flex: 1; height: 56px !important; border-radius: 18px !important; font-weight: 900; font-size: 16px; border: none !important; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.bottom-btn-v4:active { transform: scale(0.94); }
.bottom-btn-v4.primary { background: #07c160 !important; color: white !important; box-shadow: 0 8px 20px rgba(7, 193, 96, 0.3); }
.bottom-btn-v4.secondary { background: rgba(255,255,255,0.1) !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.1) !important; }
.bottom-btn-v4.danger { background: #ef4444 !important; color: white !important; box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3); }

/* 报告弹窗优化 */
.report-viewer { border-radius: 40px 40px 0 0 !important; }
.popup-header { padding: 36px 28px 20px; text-align: left; }
.popup-title { font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -1px; }
.popup-subtitle { font-size: 15px; color: #94a3b8; font-weight: 700; margin-top: 8px; }
.close-icon { position: absolute; right: 28px; top: 36px; font-size: 26px; color: #cbd5e1; }
.note-box { background: #f8fafc; border: none; border-radius: 28px; padding: 28px; font-size: 16px; color: #334155; line-height: 1.7; }
</style>
