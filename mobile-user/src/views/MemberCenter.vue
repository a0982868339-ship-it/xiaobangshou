<template>
  <div class="member-page">
    <van-nav-bar title="会员中心" fixed placeholder left-arrow @click-left="$router.back()" transparent />
    
    <!-- 会员卡展示 -->
    <div class="member-header">
      <div class="member-card" :class="currentLevel.class">
        <div class="card-header">
          <div class="user-info">
            <van-image round width="40" height="40" :src="userInfo.avatar || 'https://via.placeholder.com/40'" />
            <div class="name-box">
              <div class="nickname">{{ userInfo.nickname || '未登录' }}</div>
              <div class="level-tag">{{ currentLevel.name }}</div>
            </div>
          </div>
          <div class="card-logo">🤝</div>
        </div>
        <div class="card-body">
          <div class="points-info">
            <div class="label">当前成长值</div>
            <div class="value">{{ userInfo.points || 0 }}</div>
          </div>
          <div class="progress-box">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressWidth }"></div>
            </div>
            <div class="progress-tip">再获得 {{ nextLevelPoints }} 成长值升级为 {{ nextLevelName }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 会员权益 -->
    <div class="section-title">会员专属权益</div>
    <div class="benefits-grid">
      <div v-for="item in benefits" :key="item.id" class="benefit-item">
        <div class="benefit-icon" :style="{ background: item.color }">{{ item.icon }}</div>
        <div class="benefit-name">{{ item.name }}</div>
        <div class="benefit-desc">{{ item.desc }}</div>
      </div>
    </div>

    <!-- 充值中心 -->
    <div class="section-title">余额充值 · 升级加速</div>
    <div class="recharge-grid">
      <div 
        v-for="item in rechargeOptions" 
        :key="item.amount" 
        class="recharge-card"
        :class="{ active: selectedAmount === item.amount }"
        @click="selectedAmount = item.amount"
      >
        <div class="amount">¥{{ item.amount }}</div>
        <div class="give">赠{{ item.give }}积分</div>
        <div class="discount" v-if="item.tag">{{ item.tag }}</div>
      </div>
    </div>

    <div class="recharge-footer">
      <van-button type="primary" block round @click="handleRecharge">立即充值</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showSuccessToast, showToast } from 'vant'
import { getUserInfo } from '../api'

const userInfo = ref({})
const selectedAmount = ref(500)

const levels = [
  { name: '普通会员', min: 0, class: 'level-0' },
  { name: '银卡会员', min: 500, class: 'level-1' },
  { name: '金卡会员', min: 1000, class: 'level-2' },
  { name: '钻石会员', min: 3000, class: 'level-3' }
]

const currentLevel = computed(() => {
  const points = userInfo.value.points || 0
  return [...levels].reverse().find(l => points >= l.min) || levels[0]
})

const nextLevel = computed(() => {
  const points = userInfo.value.points || 0
  return levels.find(l => l.min > points) || null
})

const progressWidth = computed(() => {
  if (!nextLevel.value) return '100%'
  const points = userInfo.value.points || 0
  return (points / nextLevel.value.min * 100) + '%'
})

const nextLevelPoints = computed(() => nextLevel.value ? nextLevel.value.min - (userInfo.value.points || 0) : 0)
const nextLevelName = computed(() => nextLevel.value ? nextLevel.value.name : '最高等级')

const benefits = [
  { id: 1, name: '会员折扣', desc: '全场服务 8.5 折起', icon: '💎', color: '#fff1f0' },
  { id: 2, name: '专属管家', desc: '一对一优先处理', icon: '👤', color: '#e6f7ff' },
  { id: 3, name: '生日礼包', desc: '每年生日 50元券', icon: '🎂', color: '#f9f0ff' },
  { id: 4, name: '极速退款', desc: '闪电到账无需等待', icon: '⚡', color: '#fff7e6' }
]

const rechargeOptions = [
  { amount: 500, give: 50, tag: '入门推荐' },
  { amount: 1000, give: 150, tag: '超值首选' },
  { amount: 3000, give: 500, tag: '至尊专享' }
]

const handleRecharge = () => {
  showSuccessToast(`模拟充值 ¥${selectedAmount.value} 成功！`)
}

onMounted(async () => {
  try {
    const res = await getUserInfo()
    userInfo.value = res
  } catch (e) {}
})
</script>

<style scoped>
.member-page { min-height: 100vh; background: #fff; padding-bottom: 80px; }
.member-header { 
  background: linear-gradient(180deg, #2c3e50 0%, #fff 100%);
  padding: 20px 15px 40px;
}
.member-card {
  height: 180px; border-radius: 16px; padding: 20px; color: white;
  display: flex; flex-direction: column; justify-content: space-between;
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}
.level-0 { background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); color: #4568dc; }
.level-1 { background: linear-gradient(135deg, #cfd9df 0%, #e2ebf0 100%); color: #555; }
.level-2 { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }
.level-3 { background: linear-gradient(135deg, #232526 0%, #414345 100%); color: #f6d365; }

.card-header { display: flex; justify-content: space-between; align-items: center; }
.user-info { display: flex; align-items: center; gap: 12px; }
.nickname { font-size: 18px; font-weight: bold; }
.level-tag { font-size: 11px; background: rgba(255,255,255,0.3); padding: 2px 8px; border-radius: 10px; margin-top: 4px; }
.card-logo { font-size: 24px; }

.progress-bar { height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin: 10px 0; overflow: hidden; }
.progress-fill { height: 100%; background: #fff; border-radius: 3px; }
.progress-tip { font-size: 11px; opacity: 0.8; }

.section-title { padding: 20px 15px 15px; font-size: 16px; font-weight: bold; }
.benefits-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 0 15px; }
.benefit-item { background: #f8f9fb; border-radius: 12px; padding: 15px; text-align: center; }
.benefit-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 20px; }
.benefit-name { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
.benefit-desc { font-size: 11px; color: #969799; }

.recharge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 15px; }
.recharge-card { 
  border: 1px solid #ebedf0; border-radius: 8px; padding: 15px 5px; text-align: center;
  position: relative; transition: all 0.2s;
}
.recharge-card.active { border-color: #667eea; background: #f0f4ff; }
.recharge-card .amount { font-size: 18px; font-weight: bold; color: #323233; }
.recharge-card .give { font-size: 11px; color: #667eea; margin-top: 4px; }
.recharge-card .discount { 
  position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
  background: #ff4d4f; color: white; font-size: 9px; padding: 2px 6px; border-radius: 10px;
}

.recharge-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 15px; background: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); }
</style>
