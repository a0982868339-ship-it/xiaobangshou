<template>
  <div class="points-page">
    <van-nav-bar title="积分中心" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <!-- 1. 总积分展示区 (极简质感卡片) -->
    <div class="points-header">
      <div class="header-content">
        <div class="p-label">可用积分</div>
        <div class="p-val-row">
          <span class="p-val">{{ points }}</span>
          <div class="checkin-btn" :class="{ 'is-checked': hasCheckedIn }" @click="handleCheckIn">
            <van-icon :name="hasCheckedIn ? 'success' : 'sign'" />
            <span>{{ hasCheckedIn ? '今日已签' : '每日签到' }}</span>
          </div>
        </div>
        <div class="p-sub">下单、评价均可获得积分奖励</div>
      </div>
    </div>

    <!-- 2. 积分明细流 -->
    <div class="records-section shadow-premium">
      <div class="section-title">积分明细</div>
      
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多记录了"
          @load="onLoad"
          class="record-list"
        >
          <div v-for="item in records" :key="item.id" class="record-item">
            <div class="ri-left">
              <div class="ri-title">{{ item.remark || getSourceText(item.source) }}</div>
              <div class="ri-time">{{ formatDate(item.created_at) }}</div>
            </div>
            <div class="ri-right" :class="item.type === 1 ? 'is-plus' : 'is-minus'">
              {{ item.type === 1 ? '+' : '-' }}{{ item.amount }}
            </div>
          </div>
        </van-list>
      </van-pull-refresh>

      <div v-if="records.length === 0 && !loading" class="empty-box">
        <van-empty description="暂无积分明细" />
      </div>
    </div>

    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getPointsRecords, checkIn, getUserInfo } from '../api'
import { showToast, showSuccessToast } from 'vant'

const points = ref(0)
const hasCheckedIn = ref(false)
const records = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)

const loadUserData = async () => {
  try {
    const res = await getUserInfo()
    points.value = res.points || 0
  } catch (e) {}
}

const handleCheckIn = async () => {
  if (hasCheckedIn.value) return
  try {
    const res = await checkIn()
    showSuccessToast(res.message || '签到成功')
    hasCheckedIn.value = true
    loadUserData()
    onRefresh()
  } catch (e) {
    // 核心修复：如果后端返回 400 错误（如今日已签），前端优雅提示并更新状态
    if (e.message?.includes('今日已完成签到') || e.response?.data?.message?.includes('今日已完成签到')) {
      showToast('今日已签到过啦')
      hasCheckedIn.value = true
    }
  }
}

const onLoad = async () => {
  if (loading.value || finished.value) return
  loading.value = true
  try {
    const data = await getPointsRecords()
    records.value = data || []
    
    // 核心修复：进入页面时，从历史流水中自动判定今天是否已签到
    const today = new Date().toDateString()
    hasCheckedIn.value = records.value.some(r => 
      r.source === 'checkin' && 
      new Date(r.created_at).toDateString() === today
    )
    
    finished.value = true
  } catch (e) {
    console.error('加载积分明细失败:', e)
  }
  loading.value = false
  refreshing.value = false
}

const onRefresh = () => {
  finished.value = false
  onLoad()
}

const getSourceText = (source) => {
  const map = {
    'order': '订单奖励',
    'checkin': '每日签到',
    'signup': '注册赠送',
    'redeem': '积分兑换'
  }
  return map[source] || '其他'
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadUserData()
  onLoad()
})
</script>

<style scoped>
.points-page { min-height: 100vh; background: #f8fafc; }

.points-header {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 40px 24px 60px;
  color: white;
}

.p-label { font-size: 14px; opacity: 0.8; margin-bottom: 8px; }
.p-val-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.p-val { font-size: 48px; font-weight: 900; font-family: 'DIN Alternate', sans-serif; }

.checkin-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 100px;
  font-size: 14px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.checkin-btn.is-checked { background: rgba(255, 255, 255, 0.1); opacity: 0.7; }

.p-sub { font-size: 12px; opacity: 0.7; }

.records-section {
  margin: -30px 16px 0;
  background: white;
  border-radius: 24px;
  padding: 24px 20px;
  min-height: 400px;
  z-index: 10;
  position: relative;
}

.section-title { font-size: 17px; font-weight: 900; color: #1e293b; margin-bottom: 20px; }

.record-list { margin-top: 10px; }
.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f1f5f9;
}
.record-item:last-child { border-bottom: none; }

.ri-title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
.ri-time { font-size: 12px; color: #94a3b8; }

.ri-right { font-size: 18px; font-weight: 900; font-family: 'DIN Alternate'; }
.ri-right.is-plus { color: #11998e; }
.ri-right.is-minus { color: #64748b; }

.shadow-premium { box-shadow: 0 10px 30px rgba(0,0,0,0.04); }
.empty-box { padding-top: 60px; }
.bottom-spacer { height: 40px; }
</style>
