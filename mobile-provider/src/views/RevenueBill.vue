<template>
  <div class="bill-page">
    <van-nav-bar
      title="收益账单"
      left-arrow
      fixed
      placeholder
      @click-left="$router.back()"
    />

    <!-- 1. 月度选择与统计看板 -->
    <div class="bill-header">
      <div class="month-selector" @click="showMonthPicker = true">
        <span class="current-month">{{ currentMonthText }}</span>
        <van-icon name="arrow-down" />
      </div>
      
      <div class="month-summary">
        <div class="summary-item">
          <div class="label">本月累计预估 (元)</div>
          <div class="value">¥{{ formatMoney(monthlyStats.income) }}</div>
        </div>
        <div class="summary-sub-grid">
          <div class="sub-item">
            <span class="s-lab">本月完工</span>
            <span class="s-val">{{ monthlyStats.count }} 笔</span>
          </div>
          <div class="sub-item">
            <span class="s-lab">今日预估</span>
            <span class="s-val">¥{{ formatMoney(monthlyStats.today) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 收入构成分析 (质感小图表) -->
    <div class="section-card shadow-card" v-if="categoryStats.length > 0">
      <div class="card-title">收入构成分析</div>
      <div class="category-list">
        <div v-for="item in categoryStats" :key="item.name" class="cat-progress-item">
          <div class="cat-info">
            <span class="name">{{ item.name }}</span>
            <span class="amt">¥{{ formatMoney(item.amount) }}</span>
          </div>
          <van-progress :percentage="item.percent" stroke-width="6" color="#11998e" :show-pivot="false" />
        </div>
      </div>
    </div>

    <!-- 3. 日度流水清单 -->
    <div class="bill-list-container">
      <div class="list-title">流水明细</div>
      <van-empty v-if="records.length === 0" description="该月暂无账单数据" />
      
      <div v-for="(group, date) in groupedRecords" :key="date" class="date-group">
        <div class="group-header">{{ date }}</div>
        <div class="record-items">
          <div v-for="item in group" :key="item.id" class="record-cell shadow-card">
            <div class="r-icon">{{ getIconByDesc(item.description) }}</div>
            <div class="r-main">
              <div class="r-top">
                <span class="r-title">{{ item.description }}</span>
                <span class="r-amount">+{{ formatMoney(item.amount) }}</span>
              </div>
              <div class="r-bottom">
                <span class="r-time">{{ formatTime(item.created_at) }}</span>
                <span class="r-status" :class="{ 'pending': item.source_type === 1 }">
                  {{ item.source_type === 1 ? '公示期冻结' : '已存入余额' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 月份选择器弹出 -->
    <van-popup v-model:show="showMonthPicker" position="bottom" round>
      <van-date-picker
        v-model="pickerValue"
        title="选择月份"
        :columns-type="['year', 'month']"
        :min-date="new Date(2024, 0, 1)"
        :max-date="new Date()"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import request from '../api'

const showMonthPicker = ref(false)
const pickerValue = ref([new Date().getFullYear().toString(), (new Date().getMonth() + 1).toString().padStart(2, '0')])
const currentMonth = ref(new Date())
const records = ref([])
const monthlyStats = ref({ income: 0, count: 0, average: 0 })
const categoryStats = ref([])

const currentMonthText = computed(() => {
  return `${currentMonth.value.getFullYear()}年${currentMonth.value.getMonth() + 1}月`
})

// 将记录按日期分组
const groupedRecords = computed(() => {
  const groups = {}
  records.value.forEach(item => {
    const date = new Date(item.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  })
  return groups
})

const formatMoney = (val) => Number(val).toFixed(2)
const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

const getIconByDesc = (desc) => {
  if (desc.includes('遛狗')) return '🐕'
  if (desc.includes('做饭')) return '🍳'
  if (desc.includes('陪诊')) return '🏥'
  if (desc.includes('喂猫')) return '🐱'
  return '🧧'
}

const onMonthConfirm = ({ selectedValues }) => {
  currentMonth.value = new Date(selectedValues[0], selectedValues[1] - 1)
  showMonthPicker.value = false
  loadData()
}

const loadData = async () => {
  try {
    // 实际业务中应传入年份月份参数
    const res = await request.get('/orders/earnings') 
    records.value = res.records || []
    
    // 修复：月度统计应使用后端返回的实时计算数据，而非仅统计已结算的流水记录
    // 这样才能与“我的钱包”中的“本月累计预估”保持一致
    monthlyStats.value = {
      income: parseFloat(res.earnings?.month || 0),
      count: res.orderStats?.completed || 0,
      today: parseFloat(res.earnings?.today || 0)
    }

    // 动态分类统计 (依然基于流水记录展示构成，或可根据需要调整)
    const statsMap = {}
    records.value.forEach(r => {
      // 提取分类名称：从 "服务收益: 专家号代挂" 提取 "专家号代挂"
      // 或者从 "订单结算收入: ORD..." 这种旧格式做简单兼容
      let catName = '其它服务'
      if (r.description.includes(':')) {
        catName = r.description.split(':')[1].trim()
      } else if (r.description.includes('收入')) {
        catName = '订单结算'
      }
      
      // 进一步细化分类归组（可选）
      if (catName.includes('挂') || catName.includes('医') || catName.includes('诊')) catName = '医疗陪诊'
      if (catName.includes('狗')) catName = '上门遛狗'
      if (catName.includes('猫') || catName.includes('宠')) catName = '宠物特护'
      if (catName.includes('厨') || catName.includes('饭')) catName = '专业代厨'

      if (!statsMap[catName]) statsMap[catName] = 0
      statsMap[catName] += Number(r.amount)
    })

    categoryStats.value = Object.keys(statsMap).map(name => ({
      name,
      amount: statsMap[name],
      percent: income > 0 ? Math.round((statsMap[name] / income) * 100) : 0
    })).sort((a, b) => b.amount - a.amount)
  } catch (e) {
    console.error('加载账单数据失败:', e)
  }
}

onMounted(loadData)
</script>

<style scoped>
.bill-page { min-height: 100vh; background: #f7f8fa; padding-bottom: calc(80px + env(safe-area-inset-bottom)); }

.bill-header {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 20px 20px 40px;
  color: white;
}

.month-selector {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.2);
  padding: 6px 14px;
  border-radius: 20px;
  margin-bottom: 24px;
  font-size: 14px;
}

.month-summary { }
.month-summary .label { font-size: 12px; opacity: 0.8; margin-bottom: 8px; }
.month-summary .value { font-size: 32px; font-weight: bold; font-family: 'DIN Alternate', sans-serif; margin-bottom: 20px; }

.summary-sub-grid { display: flex; gap: 32px; }
.sub-item { display: flex; flex-direction: column; gap: 4px; }
.s-lab { font-size: 11px; opacity: 0.7; }
.s-val { font-size: 15px; font-weight: 500; }

.section-card { margin: 16px; padding: 20px; background: white; border-radius: 16px; }
.card-title { font-size: 14px; font-weight: bold; color: #323233; margin-bottom: 16px; }

.cat-progress-item { margin-bottom: 16px; }
.cat-info { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.cat-info .name { color: #646566; }
.cat-info .amt { color: #323233; font-weight: bold; }

.bill-list-container { padding: 0 16px 40px; }
.list-title { font-size: 15px; font-weight: bold; color: #323233; margin-bottom: 16px; }

.date-group { margin-bottom: 24px; }
.group-header { font-size: 13px; color: #969799; margin-bottom: 12px; padding-left: 4px; }

.record-items { display: flex; flex-direction: column; gap: 12px; }
.record-cell {
  background: white; padding: 16px; border-radius: 12px;
  display: flex; align-items: center; gap: 12px;
}
.r-icon { font-size: 24px; }
.r-main { flex: 1; }
.r-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.r-title { font-size: 15px; font-weight: bold; color: #323233; }
.r-amount { font-size: 16px; font-weight: bold; color: #11998e; font-family: 'DIN Alternate'; }
.r-bottom { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #969799; }
.r-status.pending { color: #fa8c16; font-weight: bold; }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
