<template>
  <div class="tech-dashboard">
    <div id="admin-map"></div>
    <div class="map-overlay-grid"></div>
    <div class="scanlines"></div>

    <!-- 顶部标题：战术重构 -->
    <header class="commander-header">
      <div class="h-line-left"></div>
      <div class="header-content">
        <div class="main-title">小帮手可视化调度平台</div>
        <div class="sub-title">REAL-TIME QUANTUM DISPATCH // SECURE_LINK_ESTABLISHED</div>
      </div>
      <div class="h-line-right">
        <div class="system-time">
          <div class="t">{{ currentTime }}</div>
          <div class="d">{{ currentDate }}</div>
        </div>
      </div>
    </header>

    <div class="dashboard-layout">
      <!-- 左侧：独立悬浮窗 -->
      <aside class="side-bar left-bar">
        <!-- 资源监测 -->
        <div class="tactical-card">
          <div class="card-tag">NO.01</div>
          <div class="card-header">资源实时监测</div>
          <div class="card-body">
            <div class="hud-data-grid">
              <div class="h-node">
                <div class="l">用户总数</div>
                <div class="v text-gold">{{ stats.users.totalUsers || 0 }}</div>
              </div>
              <div class="h-node">
                <div class="l">今日新增</div>
                <div class="v text-green">+{{ stats.users.todayNewUsers || 0 }}</div>
              </div>
              <div class="h-node">
                <div class="l">活跃用户</div>
                <div class="v text-cyan">{{ stats.users.activeUsers24h || 0 }}</div>
              </div>
              <div class="h-node">
                <div class="l">系统健康度</div>
                <div class="v text-blue">99.2%</div>
              </div>
            </div>
          </div>
          <div class="corners"><span></span><span></span><span></span><span></span></div>
        </div>

        <!-- 交易流水 -->
        <div class="tactical-card mt-20">
          <div class="card-tag">NO.02</div>
          <div class="card-header">交易流转分析</div>
          <div class="card-body">
            <div class="gmv-display-v2">
              <div class="l">累计交易量</div>
              <div class="v text-gold">¥ {{ stats.orders.totalGMV?.toLocaleString() || '0.00' }}</div>
              <div class="gmv-bar"></div>
            </div>
            <div class="sub-metrics">
              <div class="sm-item"><span>今日单量</span><b class="text-orange">{{ stats.orders.todayOrders || 0 }}</b></div>
              <div class="sm-item"><span>待处理</span><b class="text-blue">{{ stats.orders.pendingOrders || 0 }}</b></div>
            </div>
          </div>
          <div class="corners"><span></span><span></span><span></span><span></span></div>
        </div>

        <!-- 实时日志 -->
        <div class="tactical-card mt-20 log-box">
          <div class="card-header">中心实时指令日志</div>
          <div class="card-body event-stream">
            <div v-for="(ev, i) in events" :key="i" class="log-entry">
              <span class="t">[{{ ev.time }}]</span>
              <span class="m">> 指令同步: {{ ev.msg }}</span>
            </div>
            <div class="log-cursor">_</div>
          </div>
          <div class="corners"><span></span><span></span><span></span><span></span></div>
        </div>
      </aside>

      <!-- 中间 -->
      <main class="center-stage">
        <div v-if="selectedTarget" class="floating-popup anim-pop">
          <div class="popup-header">
            <div class="hex-avatar">{{ selectedTarget.nickname?.slice(0, 1) || 'O' }}</div>
            <div class="info">
              <div class="n">{{ selectedTarget.service_name || selectedTarget.nickname }}</div>
              <div class="i">识别码: {{ selectedTarget.order_no ? selectedTarget.order_no.slice(-8) : 'PRV-'+selectedTarget.id }}</div>
            </div>
            <div class="close-btn" @click="selectedTarget = null"><el-icon><CloseBold /></el-icon></div>
          </div>
          <div class="popup-body">
            <div class="p-row"><span>状态</span><span :class="selectedTarget.status === 0 ? 'text-yellow' : 'text-green'">{{ getTargetStatus(selectedTarget) === 'READY' ? '待命' : (getTargetStatus(selectedTarget) === 'SEARCHING' ? '搜寻中' : '服务中') }}</span></div>
            <div class="p-row"><span>坐标</span><span>{{ Number(selectedTarget.lng || 0).toFixed(3) }},{{ Number(selectedTarget.lat || 0).toFixed(3) }}</span></div>
            <el-button type="primary" block class="mt-15 tech-action-btn" @click="openChat">启动加密通信</el-button>
          </div>
          <div class="corners"><span></span><span></span><span></span><span></span></div>
        </div>
      </main>

      <!-- 右侧：独立悬浮窗 -->
      <aside class="side-bar right-bar">
        <!-- 调度图例 -->
        <div class="tactical-card legend-box">
          <div class="card-header">调度指挥图例</div>
          <div class="card-body">
            <div class="legend-list-v2">
              <div class="lg-item">
                <div class="lg-i circle pending"></div>
                <div class="lg-c"><div class="t">待命人员</div><div class="d">系统可用活跃运力</div></div>
              </div>
              <div class="lg-item">
                <div class="lg-i circle active"></div>
                <div class="lg-c"><div class="t">执行任务</div><div class="d">正在履行服务契约</div></div>
              </div>
              <div class="lg-item">
                <div class="lg-i diamond"></div>
                <div class="lg-c"><div class="t">实时需求</div><div class="d">产生待响应订单</div></div>
              </div>
              <div class="lg-item">
                <div class="lg-i link"></div>
                <div class="lg-c"><div class="t">动态航线</div><div class="d">实时调度路径</div></div>
              </div>
            </div>
          </div>
          <div class="corners"><span></span><span></span><span></span><span></span></div>
        </div>

        <!-- 品类占比 -->
        <div class="tactical-card mt-20">
          <div class="card-header">业务品类分布</div>
          <div class="card-body">
            <div class="tech-progress-list">
              <div v-for="cat in stats.categories" :key="cat.name" class="tp-item">
                <div v-for="n in 1" :key="n" class="tp-info"><span>{{ cat.name }}</span><span>{{ calculatePercent(cat.value, stats.orders.totalOrders) }}%</span></div>
                <div class="tp-bar-wrap">
                  <div class="tp-bar-segments">
                    <div v-for="n in 10" :key="n" class="seg" :class="{ 'active': n <= (cat.value / (stats.orders.totalOrders || 1) * 10) }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="corners"><span></span><span></span><span></span><span></span></div>
        </div>

        <!-- 预测分析 -->
        <div class="tactical-card mt-20">
          <div class="card-header">需求趋势预测</div>
          <div class="card-body" style="height: 140px;">
            <v-chart class="chart" :option="forecastOption" autoresize />
          </div>
          <div class="corners"><span></span><span></span><span></span><span></span></div>
        </div>
      </aside>
    </div>

    <!-- 底部：状态条 -->
    <footer class="tech-footer">
      <div class="f-section">数据加密模式: AES_256</div>
      <div class="f-section center">核心协议: SANYA_DISPATCH_V2.5</div>
      <div class="f-section right">系统运行时间: 142:12:05</div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import request from '../utils/request'
import { CloseBold } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import TIM from 'tim-js-sdk'
import TIMUploadPlugin from 'tim-upload-plugin'
import { loadAMap } from '../utils/amap'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const currentTime = ref('')
const currentDate = ref('')
const stats = ref({ users: {}, orders: {}, categories: [], trend: [] })

const providers = ref([])
const activeOrders = ref([])

const forecastOption = computed(() => ({
  grid: { top: 10, left: 30, right: 10, bottom: 20 },
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(4, 15, 28, 0.9)', borderColor: '#00d2ff', textStyle: { color: '#fff' } },
  xAxis: { type: 'category', data: ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00'], axisLine: { lineStyle: { color: 'rgba(0, 210, 255, 0.3)' } } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } } },
  series: [
    {
      name: '实际需求',
      type: 'line',
      smooth: true,
      data: [120, 132, 101, 134, 90, 230],
      itemStyle: { color: '#00d2ff' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0, 210, 255, 0.3)' }, { offset: 1, color: 'transparent' }] } }
    },
    {
      name: 'AI 预测',
      type: 'line',
      smooth: true,
      lineStyle: { type: 'dashed', color: '#fadb14' },
      data: [null, null, null, null, null, 230, 210, 245, 180], // 模拟预测
    }
  ]
}))

const events = ref([])
const selectedTarget = ref(null)
const chatVisible = ref(false)
const chatMessages = ref([])
const inputText = ref('')
const myUserId = ref('')
const msgListRef = ref(null)
let map, markers = [], curves = [], timer, timeTimer, tim

const initMap = async () => {
  try {
    // 1. 调用重构后的动态加载工具 (内部会自动处理 Key 和 Secret)
    await loadAMap()
    
    map = new AMap.Map('admin-map', {
      zoom: 13, center: [109.512, 18.252], viewMode: '3D', pitch: 35,
      mapStyle: 'amap://styles/blue', features: ['bg', 'road', 'building', 'point']
    })
    
    loadData()
  } catch (err) {
    ElMessage.error('加载地图失败: ' + err.message)
  }
}

const loadData = async () => {
  try {
    const providerRes = await request.get('/providers/admin/map-data')
    providers.value = providerRes || []
    const orderRes = await request.get('/orders/admin/map-data')
    activeOrders.value = orderRes || []
    syncMapObjects()
    const statsRes = await request.get('/system/admin/dashboard-stats')
    stats.value = statsRes
    if (providers.value.length > 0) {
      const p = providers.value[Math.floor(Math.random() * providers.value.length)]
      events.value.unshift({ time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), msg: `${p.nickname} 信号握手成功` })
      if (events.value.length > 15) events.value.pop()
    }
  } catch (e) {}
}

const syncMapObjects = () => {
  if (!map || !window.AMap) return
  markers.forEach(m => map.remove(m)); markers = []
  curves.forEach(c => map.remove(c)); curves = []

  providers.value.forEach(p => {
    const isBusy = p.serving_count > 0
    const color = isBusy ? '#ff4d4f' : '#00d2ff' 
    const content = `
      <div class="m-marker-container">
        <div class="m-pulse" style="border-color: ${color}"></div>
        <div class="m-dot-carrier ${isBusy ? 'busy' : ''}" style="background:${color}; box-shadow: 0 0 12px ${color}"></div>
      </div>`
    const marker = new AMap.Marker({ position: [Number(p.lng), Number(p.lat)], content, offset: new AMap.Pixel(-15, -15), extData: p })
    marker.on('click', () => { selectedTarget.value = marker.getExtData(); syncMapObjects() })
    markers.push(marker); map.add(marker)
  })

  activeOrders.value.forEach(o => {
    const orderPos = [Number(o.lng), Number(o.lat)]
    if (o.status === 0) {
      const content = `<div class="m-rhombus-demand"></div>`
      const marker = new AMap.Marker({ position: orderPos, content, offset: new AMap.Pixel(-8, -8), extData: o })
      marker.on('click', () => { selectedTarget.value = marker.getExtData(); syncMapObjects() })
      markers.push(marker); map.add(marker)
    } 
    else if ((o.status === 1 || o.status === 2) && o.provider_lat && o.provider_lng) {
      const pPos = [Number(o.provider_lng), Number(o.provider_lat)]
      const dx = orderPos[0] - pPos[0]; const dy = orderPos[1] - pPos[1]
      const controlPoint = [(pPos[0] + orderPos[0]) / 2 - dy * 0.3, (pPos[1] + orderPos[1]) / 2 + dx * 0.3]
      const curve = new AMap.BezierCurve({ 
        path: [pPos, controlPoint, orderPos], 
        strokeColor: "#00d2ff", 
        strokeOpacity: 0.4, 
        strokeWeight: 1.5, 
        lineJoin: 'round',
        strokeStyle: 'solid'
      })
      curves.push(curve); map.add(curve)
      
      // 增加终点标记
      const content = `<div class="m-rhombus-demand mini"></div>`
      const marker = new AMap.Marker({ position: orderPos, content, offset: new AMap.Pixel(-4, -4) })
      markers.push(marker); map.add(marker)
    }
  })
}

const getTargetStatus = (t) => t.order_no ? (t.status === 0 ? 'SEARCHING' : 'ON_DUTY') : 'READY'
const calculatePercent = (s, t) => t > 0 ? ((s / t) * 100).toFixed(1) : 0

onMounted(() => {
  initMap()
  timer = setInterval(loadData, 5000)
  timeTimer = setInterval(() => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
    currentDate.value = now.toLocaleDateString('zh-CN').replace(/\//g, '-')
  }, 1000)
})
onUnmounted(() => { clearInterval(timer); clearInterval(timeTimer) })
</script>

<style scoped>
.tech-dashboard { width: 100%; height: calc(100vh - 160px); position: relative; background: #f8fafc; color: #0f172a; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
#admin-map { width: 100%; height: 100%; position: absolute; z-index: 0; filter: saturate(1); }
.map-overlay-grid, .scanlines, .h-line-left, .h-line-right, .card-tag, .corners, .log-cursor { display: none; }
.commander-header { position: absolute; top: 0; left: 0; right: 0; height: 72px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: #ffffff; border-bottom: 1px solid #e2e8f0; z-index: 10; }
.main-title { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
.sub-title { font-size: 12px; color: #94a3b8; letter-spacing: 1px; }
.system-time { text-align: right; margin-left: 16px; color: #64748b; }
.system-time .t { font-size: 16px; font-weight: 700; }
.system-time .d { font-size: 12px; }
.dashboard-layout { position: absolute; inset: 72px 0 24px 0; display: flex; justify-content: space-between; padding: 24px; z-index: 5; pointer-events: none; gap: 24px; }
.side-bar { width: 300px; pointer-events: auto; display: flex; flex-direction: column; gap: 16px; }
.center-stage { flex: 1; pointer-events: auto; }
.tactical-card { width: 100%; background: #ffffff; border: 1px solid #e2e8f0; padding: 16px; border-radius: 24px; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06); position: relative; }
.mt-20 { margin-top: 20px; }
.card-header { font-size: 14px; color: #0f172a; font-weight: 700; margin-bottom: 12px; }
.hud-data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.h-node .l { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
.h-node .v { font-size: 20px; font-weight: 800; }
.gmv-display-v2 .l { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
.gmv-display-v2 .v { font-size: 24px; font-weight: 800; color: #d97706; }
.gmv-bar { height: 2px; background: #e2e8f0; width: 100%; margin: 10px 0; }
.sub-metrics { display: flex; gap: 16px; }
.sm-item span { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
.sm-item b { font-size: 14px; font-weight: 700; }
.tp-item { margin-bottom: 12px; }
.tp-info { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; color: #64748b; }
.tp-bar-segments { display: flex; gap: 2px; }
.seg { flex: 1; height: 4px; background: #e2e8f0; border-radius: 999px; }
.seg.active { background: #4f46e5; }
.legend-list-v2 .lg-item { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.lg-i { width: 10px; height: 10px; border: 1.5px solid #94a3b8; flex-shrink: 0; }
.lg-i.circle.pending { border-radius: 50%; background: #2563eb; }
.lg-i.circle.active { border-radius: 50%; background: #dc2626; }
.lg-i.diamond { transform: rotate(45deg); background: #d97706; }
.lg-i.link { border: none; border-top: 1.5px dashed #cbd5e1; height: 0; width: 16px; }
.lg-c .t { font-size: 12px; font-weight: 700; }
.lg-c .d { font-size: 10px; color: #94a3b8; }
.log-entry { font-size: 11px; margin-bottom: 5px; color: #64748b; }
.floating-popup { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 360px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; pointer-events: auto; box-shadow: 0 20px 40px rgba(15,23,42,0.1); }
.popup-header { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0; }
.popup-body { padding: 20px; }
.hex-avatar { width: 44px; height: 44px; background: #4f46e5; color: #ffffff; display: flex; align-items: center; justify-content: center; border-radius: 14px; font-weight: 800; font-size: 20px; }
.popup-header .info { flex: 1; }
.popup-header .n { font-size: 16px; font-weight: 700; color: #0f172a; }
.popup-header .i { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.popup-header .close-btn { cursor: pointer; color: #94a3b8; font-size: 18px; transition: all 0.2s; }
.popup-header .close-btn:hover { color: #0f172a; }
.p-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
.p-row span:first-child { color: #94a3b8; }
.p-row span:last-child { color: #0f172a; font-weight: 600; }
.tech-action-btn { background: #0f172a !important; border: 1px solid #0f172a !important; color: #ffffff !important; border-radius: 12px; }
.text-gold { color: #d97706; }
.text-green { color: #16a34a; }
.text-orange { color: #d97706; }
.mt-25 { margin-top: 25px; }
</style>
