<template>
  <div class="space-y-8">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">平台数据总览</h1>
        <p class="text-sm text-slate-500 font-medium">平台运行性能与实时业务统计</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-sm font-semibold text-slate-500 mono-text">{{ currentTime }}</div>
        <el-button class="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20" :icon="TrendCharts" circle @click="loadData"></el-button>
      </div>
    </header>

    <div class="grid grid-cols-[minmax(0,1fr)_360px] gap-8">
      <main class="flex flex-col gap-8">
        <section class="grid grid-cols-[minmax(0,1fr)_320px] gap-8">
          <div class="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
            <div class="relative z-10 space-y-4">
              <div class="text-xs uppercase tracking-widest text-slate-400 font-black">核心营收</div>
              <div class="flex items-end gap-3">
                <span class="text-2xl font-black text-indigo-400">¥</span>
                <span class="text-5xl font-black tracking-tight mono-text">{{ formatMoney(stats.orders.totalGMV) }}</span>
              </div>
              <div class="flex items-center gap-2 text-sm font-semibold text-green-400">
                <el-icon><CaretTop /></el-icon>
                <span>12.5%</span>
                <span class="text-slate-400 font-medium">较上周</span>
              </div>
            </div>
            <div class="absolute -right-4 -bottom-6 w-[280px] h-[140px] opacity-80">
              <v-chart :option="sparklineOption" autoresize />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6">
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div class="text-xs uppercase tracking-widest text-slate-400 font-black mb-2">累计用户</div>
              <div class="text-3xl font-black text-slate-900 mono-text">{{ stats.users.totalUsers || 0 }}</div>
              <div class="text-xs text-green-600 font-black uppercase tracking-wider mt-2">今日新增 {{ stats.users.todayNewUsers || 0 }}</div>
            </div>
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div class="text-xs uppercase tracking-widest text-slate-400 font-black mb-2">实时订单</div>
              <div class="text-3xl font-black text-slate-900 mono-text">{{ stats.orders.totalOrders || 0 }}</div>
              <div class="text-xs text-slate-400 font-black uppercase tracking-wider mt-2">运行稳定</div>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <div class="flex items-start justify-between mb-6">
            <div>
              <h2 class="text-xl font-black text-slate-900 tracking-tight">交易波动趋势</h2>
              <p class="text-sm text-slate-500 font-medium">实时监控全平台订单与成交额波动</p>
            </div>
            <el-radio-group v-model="trendType" size="small" class="custom-radio">
              <el-radio-button label="order">订单量</el-radio-button>
              <el-radio-button label="gmv">成交额</el-radio-button>
            </el-radio-group>
          </div>
          <div class="h-[400px]">
            <v-chart :option="trendOption" autoresize />
          </div>
        </section>

        <section class="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <h2 class="text-xl font-black text-slate-900 tracking-tight mb-6">业务热度分布</h2>
          <div class="grid grid-cols-2 gap-x-12 gap-y-6">
            <div v-for="(item, index) in topServices.slice(0, 4)" :key="index" class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm font-semibold text-slate-600">{{ item.name }}</span>
                <span class="text-sm font-black text-slate-900 mono-text">{{ item.sales_count }}</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-1000" :style="{ width: getSalesProgress(item.sales_count) + '%' }"></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <aside class="flex flex-col gap-8">
        <section class="bg-white rounded-[2rem] border border-slate-200 p-7 shadow-sm h-[480px] flex flex-col">
          <div class="flex items-center justify-between mb-6">
            <span class="text-sm font-black tracking-widest uppercase text-slate-400">实时运行日志</span>
            <div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div class="flex flex-col gap-5">
              <div v-for="(log, idx) in activityLogs" :key="idx" class="space-y-2">
                <div class="text-[10px] text-slate-400 mono-text uppercase tracking-widest">{{ log.time }}</div>
                <div class="flex items-center gap-3">
                  <span class="inline-flex items-center px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest" :class="{'bg-blue-50 text-blue-600': log.type === 'info', 'bg-green-50 text-green-600': log.type === 'success', 'bg-amber-50 text-amber-600': log.type === 'warning'}">
                    {{ log.tag }}
                  </span>
                  <span class="text-sm text-slate-600 font-medium">{{ log.msg }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-4">
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">待办任务</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-6 rounded-2xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all cursor-pointer" @click="$router.push('/verify/identity')">
              <div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                <el-icon size="20"><Stamp /></el-icon>
              </div>
              <div class="text-2xl font-black mono-text">{{ stats.users.pendingProviders || 0 }}</div>
              <div class="text-[10px] font-black uppercase tracking-widest">认证待审</div>
            </div>
            <div class="p-6 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 transition-all cursor-pointer" @click="$router.push('/orders/all?status=0')">
              <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
                <el-icon size="20"><Timer /></el-icon>
              </div>
              <div class="text-2xl font-black mono-text">{{ stats.orders.pendingOrders || 0 }}</div>
              <div class="text-[10px] font-black uppercase tracking-widest">待派订单</div>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-6">
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
              <span>CPU 负载</span>
              <span class="text-slate-900 mono-text">{{ stats.system.cpuLoad }}%</span>
            </div>
            <el-progress :percentage="parseFloat(stats.system.cpuLoad)" :stroke-width="4" :show-text="false" color="#4f46e5" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-black uppercase tracking-widest text-slate-400">接口延迟</span>
            <span class="text-sm font-black mono-text" :class="{ 'text-amber-600': latency > 50, 'text-slate-900': latency <= 50 }">{{ latency }}ms</span>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { getDashboardStats, getServices } from '../api/index.js'
import { 
  TrendCharts, CaretTop, Stamp, Timer 
} from '@element-plus/icons-vue'

use([CanvasRenderer, LineChart, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

const trendType = ref('order')
const stats = ref({
  users: {},
  orders: {},
  categories: [],
  trend: [],
  system: {
    onlineProviders: 0,
    activeOrders: 0,
    pendingWithdrawals: 0,
    memoryUsage: '0MB',
    uptime: 0,
    cpuLoad: '0.00'
  }
})
const topServices = ref([])
const currentTime = ref(new Date().toLocaleTimeString())

// 模拟实时日志
const activityLogs = ref([
  { time: '14:20:05', tag: 'ORDER', msg: '新订单 #8902 已创建', type: 'info' },
  { time: '14:18:32', tag: 'AUTH', msg: '师傅 张*通过实名认证', type: 'success' },
  { time: '14:15:10', tag: 'SYS', msg: '支付网关连接重置', type: 'warning' },
  { time: '14:10:45', tag: 'ORDER', msg: '订单 #8895 已完成支付', type: 'info' },
])

const latency = ref(24)
let dynamicTimer = null
let dataPollingTimer = null
let timeTimer = null

const startAtomicInteraction = () => {
  dynamicTimer = setInterval(() => {
    latency.value = Math.floor(Math.random() * (45 - 18 + 1)) + 18
  }, 3000)

  timeTimer = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString()
  }, 1000)

  dataPollingTimer = setInterval(loadData, 30000)
}

const formatMoney = (val) => {
  if (!val) return '0.00'
  return parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2 })
}

const getSalesProgress = (count) => {
  const max = Math.max(...topServices.value.map(s => s.sales_count), 100)
  return Math.min(100, Math.round((count / max) * 100))
}

const sparklineOption = computed(() => ({
  grid: { left: 0, right: 0, top: 10, bottom: 0 },
  xAxis: { type: 'category', show: false },
  yAxis: { type: 'value', show: false },
  series: [{
    type: 'line',
    smooth: 0.4,
    showSymbol: false,
    lineStyle: { 
      width: 3, 
      color: '#3b82f6',
      shadowBlur: 10,
      shadowColor: 'rgba(59, 130, 246, 0.4)'
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0)' }
        ]
      }
    },
    data: [30, 45, 32, 56, 48, 72, 65]
  }]
}))

const trendOption = computed(() => {
  const isOrder = trendType.value === 'order'
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#fff' },
      backdropFilter: 'blur(8px)',
      borderWidth: 1,
      formatter: (params) => {
        const p = params[0]
        return `<div style="padding: 4px 8px;">
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">${p.name}</div>
          <div style="font-size: 16px; font-weight: 800; color: #fff;">
            ${!isOrder ? '¥' : ''}${p.value}
          </div>
        </div>`
      }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: stats.value.trend.map(t => t.date),
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    series: [{
      name: isOrder ? '订单量' : '成交额',
      type: 'line',
      smooth: 0.4,
      showSymbol: false,
      lineStyle: {
        width: 4,
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: isOrder ? '#3b82f6' : '#10b981' },
            { offset: 0.5, color: isOrder ? '#60a5fa' : '#34d399' },
            { offset: 1, color: isOrder ? '#3b82f6' : '#10b981' }
          ]
        },
        shadowBlur: 15,
        shadowColor: isOrder ? 'rgba(59, 130, 246, 0.5)' : 'rgba(16, 185, 129, 0.5)'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: isOrder ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)' },
            { offset: 1, color: 'transparent' }
          ]
        }
      },
      data: stats.value.trend.map(t => isOrder ? t.orderCount : t.dailyGMV)
    }]
  }
})

const loadData = async () => {
  try {
    const [statsRes, servicesRes] = await Promise.all([
      getDashboardStats(),
      getServices({ pageSize: 10 })
    ])
    stats.value = statsRes
    topServices.value = servicesRes.list || []
  } catch (e) {
    console.error('加载统计数据失败:', e)
  }
}

onMounted(() => {
  loadData()
  startAtomicInteraction()
})

onUnmounted(() => {
  if (dynamicTimer) clearInterval(dynamicTimer)
  if (dataPollingTimer) clearInterval(dataPollingTimer)
  if (timeTimer) clearInterval(timeTimer)
})
</script>

<style scoped>
.tilt-card {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
}

.tilt-card:hover {
  transform: perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(-5px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

:deep(.custom-radio .el-radio-button__inner) {
  background-color: rgba(248, 250, 252, 0.7);
  border-color: #e2e8f0;
  color: #64748b;
  font-weight: 700;
}

:deep(.custom-radio .el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background-color: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);
}
</style>
