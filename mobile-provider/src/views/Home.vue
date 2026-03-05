<template>
  <div class="grab-home">
    <!-- 1. 精致状态头 -->
    <div class="grab-header" :class="{ 'is-working': workStatus }">
      <div class="header-main">
        <div class="header-top-row">
          <div class="location-chip" @click="$router.push('/service-area')">
            <van-icon name="location" />
            <span>{{ currentCity }} · {{ currentDistrict }}</span>
            <van-icon name="arrow" class="mini-arrow" />
          </div>
          <div class="header-notify" @click="$router.push('/notifications')">
            <van-icon name="bell" size="24" color="#ffffff" />
            <div class="unread-dot" v-if="unreadNotifyCount > 0"></div>
          </div>
        </div>
        
        <div class="status-center">
          <div class="status-indicator">
            <div class="pulse-ring" v-if="workStatus"></div>
            <div class="status-dot"></div>
          </div>
          <div class="status-text">
            <span class="main-state">{{ workStatus ? '正在接单中' : '正在休息中' }}</span>
            <span class="sub-state">{{ workStatus ? '系统正在为您匹配附近订单...' : '开启接单，开始赚钱吧' }}</span>
          </div>
          <van-switch 
            v-model="workStatus" 
            size="26" 
            active-color="rgba(255,255,255,0.35)" 
            inactive-color="rgba(0,0,0,0.2)" 
            @change="handleStatusChange"
            class="premium-switch"
          />
        </div>
      </div>
    </div>

    <!-- 2. 统计看板 (悬浮) -->
    <div class="stats-bar shadow-card">
      <div class="s-item" @click="$router.push('/order?status=1')">
        <div class="s-num">{{ stats.pendingCount || 0 }}</div>
        <div class="s-lab">待执行</div>
      </div>
      <div class="s-divider"></div>
      <div class="s-item" @click="$router.push('/earnings')">
        <div class="s-num highlight">¥{{ formatMoney(stats.todayIncome || 0) }}</div>
        <div class="s-lab">今日收益</div>
      </div>
      <div class="s-divider"></div>
      <div class="s-item" @click="$router.push('/reviews')">
        <div class="s-num">5.0</div>
        <div class="s-lab">好评率</div>
      </div>
    </div>

    <!-- 3. 实时抢单大厅 -->
    <div class="grab-list-container">
      <div class="list-title">
        <div class="t-left">
          <van-icon name="fire" color="#ff4d4f" />
          <span>附近待接订单</span>
        </div>
        <div class="t-right" @click="onRefresh">
          <van-icon name="replay" :class="{ 'refreshing': loading }" />
          <span>刷新</span>
        </div>
      </div>

      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div class="grab-list">
          <div v-for="item in pendingOrders" :key="item.id" class="grab-card shadow-card" :class="{ 'medical-escort-card': item.hospital_name || item.category_name?.includes('陪诊'), 'assigned': item.assignment_type === 2 }">
            <!-- 头部：普通单显示分类，陪诊单显示时长/类型 -->
            <div class="card-top">
              <div class="top-badges">
                <div class="c-type-badge" :class="{ 'medical': item.hospital_name }">{{ item.category_name }}</div>
                <div v-if="item.assignment_type === 2" class="c-assigned-badge">被指定</div>
              </div>
              <div v-if="!item.hospital_name" class="c-dist">{{ item.distance ? `${item.distance.toFixed(1)}km` : '近处' }}</div>
              <div v-else class="medical-duration-badge">{{ item.service_name.includes('8h') || item.service_name.includes('8小时') ? '全天 8h' : '半天 4h' }}</div>
            </div>
            
            <div class="card-body" @click="handleCardClick(item)">
              <!-- 陪诊单：大号医院名 -->
              <template v-if="item.hospital_name">
                <div class="hospital-primary-name">{{ item.hospital_name }}</div>
                <div class="medical-service-tag">{{ item.service_name }}</div>
                <div class="info-line mt-12">
                  <van-icon name="clock-o" />
                  <span class="val">{{ formatDate(item.service_time) }}</span>
                </div>
              </template>

              <!-- 普通单：原始样式 -->
              <template v-else>
                <div class="service-name">{{ item.service_name }}</div>
                <div class="info-line">
                  <van-icon name="location-o" />
                  <span class="val van-ellipsis">{{ item.service_address }}</span>
                  <van-icon name="map-marked" class="map-preview-icon" />
                </div>
                <div class="info-line">
                  <van-icon name="clock-o" />
                  <span class="val">{{ formatDate(item.service_time) }}</span>
                </div>
              </template>
            </div>

            <div class="card-footer">
              <div class="price-box">
                <span class="unit">预计报酬</span>
                <span class="amt">¥{{ ((item.total_price || 0) - (item.platform_fee || 0)).toFixed(2) }}</span>
              </div>
              <van-button 
                type="primary" 
                round 
                size="small" 
                class="grab-btn" 
                :class="{ 'medical': item.hospital_name, 'assigned': item.assignment_type === 2 }"
                @click.stop="handleGrab(item)"
              >
                {{ item.assignment_type === 2 ? '接受预约' : (item.hospital_name ? '接受预约' : '立即抢单') }}
              </van-button>
            </div>
          </div>

          <van-empty v-if="pendingOrders.length === 0" description="暂无新订单，请保持接单开启" />
        </div>
      </van-pull-refresh>
    </div>
    <!-- 4. 抢单前路径预览弹窗 -->
    <van-popup v-model:show="showMapPopup" position="bottom" round class="map-preview-popup" style="height: 80%">
      <div class="map-popup-container">
        <div class="map-popup-header">
          <div class="m-title">路径预看</div>
          <div class="m-desc" v-if="routeInfo">预计距离 {{ routeInfo.distance }}km，通勤约 {{ routeInfo.duration }} 分钟</div>
          <van-icon name="cross" class="m-close" @click="showMapPopup = false" />
        </div>
        
        <div class="map-main">
          <div id="route-map-container" class="full-map"></div>
          
          <!-- 悬浮导航按钮 -->
          <div class="map-actions-floating">
            <van-button round icon="guide-o" type="primary" class="nav-btn" @click="handleExternalNav">开始导航</van-button>
          </div>
        </div>

        <div class="map-footer">
          <div class="order-mini-info" v-if="selectedOrder">
            <div class="om-title">{{ selectedOrder.service_name }}</div>
            <div class="om-addr van-ellipsis">{{ selectedOrder.hospital_name || selectedOrder.service_address }}</div>
          </div>
          <van-button block round class="grab-btn-large" @click="handleGrab(selectedOrder)">立即抢单 (¥{{ ((selectedOrder?.total_price || 0) - (selectedOrder?.platform_fee || 0)).toFixed(2) }})</van-button>
        </div>
      </div>
    </van-popup>
    <!-- 5. 导航选择 -->
    <van-action-sheet
      v-model:show="showNavSheet"
      :actions="navActions"
      cancel-text="取消"
      close-on-click-action
      @select="onNavSelect"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, h, render } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showLoadingToast, closeToast } from 'vant'
import request from '../api'
import { loadAMap } from '../utils/amap'
import { getSocket, initSocket, closeSocket } from '../utils/socket'
import NotificationCard from '../components/NotificationCard.vue'

const router = useRouter()
const workStatus = ref(true)
const pendingOrders = ref([])
const loading = ref(false)
const refreshing = ref(false)
const unreadNotifyCount = ref(0) // 新增：未读通知数
const stats = ref({ pendingCount: 0, todayIncome: 0 })
const currentCity = ref('三亚市')
const currentDistrict = ref('崖州区')

// 地图路径预览相关
const showMapPopup = ref(false)
const selectedOrder = ref(null)
const routeInfo = ref(null)
let previewMap = null
let drivingInstance = null

// 导航选择相关
const showNavSheet = ref(false)
const navActions = [
  { name: '高德地图', color: '#11998e' },
  { name: '百度地图' }
]

// Socket通知助手函数
const showNotification = (title, message, type = 'info') => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  
  const vnode = h(NotificationCard, {
    type,
    title,
    message,
    duration: 5000, // 5秒自动消失
    onClick: () => {
      // 点击通知刷新列表
      if (typeof loadData === 'function') loadData()
    },
    onClose: () => {
      render(null, container)
      if (document.body.contains(container)) {
        document.body.removeChild(container)
      }
    }
  })
  
  render(vnode, container)
}

const doRoutePreview = async (order) => {
  // 核心逻辑：陪诊单禁止弹出地图路径预览
  if (order.hospital_name || order.category_name?.includes('陪诊')) {
    return
  }
  selectedOrder.value = order
  showMapPopup.value = true
  
  await nextTick()
  initPreviewMap(order)
}

const handleCardClick = (item) => {
  if (item.hospital_name || item.category_name?.includes('陪诊')) {
    // 陪诊单点击：不再执行任何地图逻辑，静默处理或直接触发接受预约
    return
  }
  doRoutePreview(item)
}

const initPreviewMap = async (order) => {
  await loadAMap()
  
  if (!previewMap) {
    previewMap = new AMap.Map('route-map-container', {
      zoom: 13,
      viewMode: '2D'
    })
  }

  // 获取师傅当前位置
  const geoOptions = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { longitude, latitude } = pos.coords
    // console.log('>> [GPS] Current Pos:', longitude, latitude)
    const start = [longitude, latitude]
    const end = [order.service_longitude, order.service_latitude]

    // 调用高德路径规划
    if (!drivingInstance) {
      await new Promise(resolve => {
        AMap.plugin('AMap.Driving', () => {
          drivingInstance = new AMap.Driving({
            map: previewMap,
            hideMarkers: false,
            showTraffic: true
          })
          resolve()
        })
      })
    }

    drivingInstance.search(start, end, (status, result) => {
      if (status === 'complete') {
        const route = result.routes[0]
        routeInfo.value = {
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.ceil(route.time / 60)
        }
        // 自动缩放地图以展示全程
        previewMap.setFitView()
      } else {
        // 如果是跨城太远导致失败，尝试展示简单直线
        if (result === 'no_data' || result?.info === 'OUT_OF_SERVICE') {
          showToast('距离过远，已为您展示目的地位置')
          previewMap.setCenter(end)
          previewMap.setZoom(15)
          new AMap.Marker({ position: end, map: previewMap })
        } else {
          showToast('路径规划失败: ' + (result?.info || status))
        }
      }
    })
  }, () => {
    showToast('无法获取您的位置')
  })
}

const handleExternalNav = () => {
  if (!selectedOrder.value) return
  showNavSheet.value = true
}

const onNavSelect = (action) => {
  const order = selectedOrder.value
  const lat = order.service_latitude
  const lng = order.service_longitude
  const name = order.hospital_name || order.service_address
  
  if (action.name === '高德地图') {
    window.location.href = `amapuri://navigation?dev=0&lat=${lat}&lon=${lng}&poiname=${name}&style=2`
  } else {
    window.location.href = `baidumap://map/direction?destination=latlng:${lat},${lng}|name:${name}&mode=driving`
  }
}

defineExpose({
  doRoutePreview,
  handleExternalNav
})

let pollingTimer = null

const loadData = async () => {
  loading.value = true
  try {
    const [oRes, sRes, eRes, nRes] = await Promise.all([
      request.get('/orders?status=0&role=provider'),
      request.get('/orders/stats?role=provider'),
      request.get('/orders/earnings'),
      request.get('/notifications/unread').catch(() => ({ data: 0 }))
    ])
    
    pendingOrders.value = oRes.data || oRes
    
    const sData = sRes.data || sRes
    stats.value.pendingCount = sData[1] || 0
    
    stats.value.todayIncome = eRes.earnings?.today || 0
    
    // 加载未读通知
    unreadNotifyCount.value = nRes.data || nRes || 0
  } catch (e) {}
  loading.value = false
  refreshing.value = false
}

const onRefresh = () => {
  loadData()
}

const handleStatusChange = async (val) => {
  const originalValue = !val
  try {
    showLoadingToast({ message: '正在切换状态...', forbidClick: true })
    await request.put('/providers/work-status', { workStatus: val ? 1 : 0 })
    showSuccessToast(val ? '接单模式已开启' : '已进入休息模式')
  } catch (e) {
    // 原子级回滚：如果后端失败，强制恢复前端开关状态
    workStatus.value = originalValue
    showToast(e.response?.data?.message || '状态切换失败，请重试')
  }
}

const handleGrab = async (order) => {
  showLoadingToast({ message: '正在抢单...', forbidClick: true })
  try {
    await request.put(`/orders/${order.id}/accept`)
    showSuccessToast('抢单成功！')
    
    // 动态跳转：如果是周期单，跳转到周期详情页
    if (order.order_type == 1 || order.service_name?.includes('周期') || order.category_name?.includes('周期')) {
      const targetId = order.recurring_order_id || order.id
      router.push(`/recurring-order/${targetId}`)
    } else {
      router.push(`/order/${order.id}`)
    }
  } catch (e) {}
}

const formatMoney = (val) => Number(val).toFixed(2)
const formatDate = (date) => new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

onMounted(() => {
  loadData()
  pollingTimer = setInterval(loadData, 30000)
  
  const area = localStorage.getItem('provider_service_area')
  if (area) {
    const data = JSON.parse(area)
    currentCity.value = data.city
    currentDistrict.value = data.districts?.[0]?.name || '全城'
  }

  // 初始化Socket监听
  const token = localStorage.getItem('provider_token')
  if (token) {
    const socket = initSocket(token)
    
    // 监听新订单 (仅执行数据刷新，通知由 App.vue 全局处理)
    socket.on('NEW_ORDER', (data) => {
      console.log('>> [Home/Socket] New Order - Refreshing List')
      loadData()
    })
  }
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  
  // 移除监听但保持连接（可能其他页面也需要）
  const socket = getSocket()
  if (socket) {
    socket.off('NEW_ORDER')
  }
})
</script>

<style scoped>
.grab-home { min-height: 100vh; background: #f7f8fa; padding-bottom: calc(80px + env(safe-area-inset-bottom)); }

/* 1. 状态头样式 */
.grab-header {
  height: 240px;
  background: linear-gradient(135deg, #2c3e50 0%, #000000 100%);
  padding: 60px 20px 0;
  color: white;
  transition: all 0.5s;
}
.grab-header.is-working {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.header-main { display: flex; flex-direction: column; }
.header-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }

.location-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.15);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
}

.header-notify {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: rgba(255,255,255,0.25);
  border-radius: 12px;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.header-notify:active {
  background: rgba(255,255,255,0.25);
  transform: scale(0.9);
}
.header-notify .unread-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
  border: 1.5px solid #11998e;
}
.mini-arrow { font-size: 10px; opacity: 0.7; }

.status-center { display: flex; align-items: center; gap: 16px; }
.status-indicator { position: relative; width: 12px; height: 12px; }
.status-dot { width: 12px; height: 12px; background: white; border-radius: 50%; }
.pulse-ring {
  position: absolute; width: 12px; height: 12px; background: white; border-radius: 50%;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(4); opacity: 0; } }

.status-text { flex: 1; display: flex; flex-direction: column; }
.main-state { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
.sub-state { font-size: 12px; opacity: 0.8; }

/* 4. 开关质感升级 */
.premium-switch {
  border: 1px solid rgba(255,255,255,0.2);
}
.premium-switch :deep(.van-switch__node) {
  background-color: #fff;
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
}

/* 2. 统计条 */
.stats-bar {
  margin: -30px 16px 20px;
  display: flex;
  align-items: center;
  padding: 24px 0;
  z-index: 10;
}
.s-item { flex: 1; text-align: center; }
.s-num { font-size: 20px; font-weight: 800; color: #323233; margin-bottom: 4px; }
.s-num.highlight { color: #11998e; }
.s-lab { font-size: 11px; color: #969799; }
.s-divider { width: 1px; height: 24px; background: #f0f0f0; }

/* 3. 抢单列表 */
.grab-list-container { padding: 0 16px; }
.list-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 4px; }
.t-left { display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: bold; color: #323233; }
.t-right { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #969799; }
.refreshing { animation: rotate 1s linear infinite; }
@keyframes rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }

.grab-list { display: flex; flex-direction: column; gap: 16px; }
.grab-card { padding: 20px; position: relative; overflow: hidden; }
.grab-card.assigned { border: 1.5px solid #7c3aed; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.top-badges { display: flex; gap: 8px; align-items: center; }
.c-type-badge { font-size: 11px; color: #11998e; background: #eefaf8; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
.c-assigned-badge { font-size: 11px; color: #ffffff; background: #7c3aed; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
.c-dist { font-size: 12px; color: #969799; }

.c-type-badge.medical { background: #e0f2fe; color: #0ea5e9; }
.medical-duration-badge { font-size: 11px; font-weight: 800; color: #0ea5e9; background: #f0f9ff; padding: 2px 8px; border-radius: 6px; }

.hospital-primary-name { font-size: 20px; font-weight: 900; color: #1e293b; margin-bottom: 6px; letter-spacing: -0.5px; }
.medical-service-tag { font-size: 13px; color: #64748b; font-weight: 600; display: inline-block; background: #f8fafc; padding: 2px 8px; border-radius: 4px; }

.medical-escort-card { border-left: 4px solid #0ea5e9; background: linear-gradient(to right, #f0f9ff 0%, #ffffff 100%); }
.grab-btn.medical { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25); }

.mt-12 { margin-top: 12px; }

.service-name { font-size: 18px; font-weight: bold; color: #323233; margin-bottom: 12px; }
.info-line { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #646566; margin-bottom: 8px; }
.info-line .val { flex: 1; }

.card-footer {
  margin-top: 16px; padding-top: 16px; border-top: 1px solid #f7f8fa;
  display: flex; justify-content: space-between; align-items: center;
}
.price-box { display: flex; align-items: baseline; gap: 4px; }
.price-box .unit { font-size: 11px; color: #969799; }
.price-box .amt { font-size: 22px; font-weight: 800; color: #ee0a24; font-family: 'DIN Alternate'; }

.grab-btn { 
  padding: 0 20px; height: 36px; border: none; font-weight: bold;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.2);
}
.grab-btn.assigned {
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%) !important;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
}

.shadow-card { background: white; border-radius: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }

.map-preview-icon {
  margin-left: auto;
  color: #11998e;
  font-size: 18px;
}

/* 路径预览弹窗样式 */
.map-preview-popup {
  display: flex;
  flex-direction: column;
}
.map-popup-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.map-popup-header {
  padding: 20px;
  position: relative;
  text-align: center;
}
.m-title {
  font-size: 18px;
  font-weight: 800;
  color: #1a1a1a;
}
.m-desc {
  font-size: 13px;
  color: #11998e;
  margin-top: 4px;
  font-weight: 600;
}
.m-close {
  position: absolute;
  right: 20px;
  top: 22px;
  font-size: 20px;
  color: #ccc;
}

.map-main {
  flex: 1;
  position: relative;
}
.full-map {
  width: 100%;
  height: 100%;
}
.map-actions-floating {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 10;
}
.nav-btn {
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.3);
  padding: 0 24px;
}

.map-footer {
  padding: 20px;
  background: white;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.05);
}
.order-mini-info {
  margin-bottom: 16px;
}
.om-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
.om-addr {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}
.grab-btn-large {
  height: 54px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
  border: none !important;
  font-weight: 800;
  font-size: 16px;
}
</style>
