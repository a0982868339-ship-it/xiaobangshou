<template>
  <div class="earnings-page">
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <!-- 1. 沉浸式资产大头 -->
      <div class="wallet-header">
        <div class="header-bg"></div>
        <div class="main-balance-card shadow-card">
          <div class="balance-top">
            <span class="label">可提现余额 (元)</span>
            <van-icon name="eye-o" class="eye-icon" />
          </div>
          <div class="balance-num">{{ formatMoney(balances.availableBalance) }}</div>
          
          <div class="balance-sub-row">
            <div class="sub-item">
              <div class="val">¥{{ formatMoney(balances.frozenBalance) }}</div>
              <div class="lab">公示期冻结 <van-icon name="question-o" @click="showSettlementInfo" /></div>
            </div>
            <div class="v-line"></div>
            <div class="sub-item">
              <div class="val">¥{{ formatMoney(balances.totalBalance) }}</div>
              <div class="lab">账户总资产</div>
            </div>
          </div>

          <van-button type="primary" block round class="withdraw-btn" @click="goWithdraw">
            立即提现至银行卡
          </van-button>
        </div>

        <!-- 2. 快捷数据看板 -->
        <div class="quick-stats">
          <div class="stat-card shadow-card">
            <div class="s-val">¥{{ formatMoney(earnings.month) }}</div>
            <div class="s-lab">本月累计预估</div>
          </div>
          <div class="stat-card shadow-card">
            <div class="s-val active">¥{{ formatMoney(earnings.today) }}</div>
            <div class="s-lab">今日实时收益</div>
          </div>
        </div>
      </div>

      <!-- 3. 服务表现统计 -->
      <div class="performance-section section-card shadow-card">
        <div class="section-header">服务表现数据</div>
        <div class="performance-grid">
          <div class="p-item">
            <div class="p-icon blue"><van-icon name="orders-o" /></div>
            <div class="p-info">
              <div class="p-num">{{ orderStats.total || 0 }}</div>
              <div class="p-text">总服务单</div>
            </div>
          </div>
          <div class="p-item">
            <div class="p-icon green"><van-icon name="passed" /></div>
            <div class="p-info">
              <div class="p-num">{{ orderStats.completed || 0 }}</div>
              <div class="p-text">已完工</div>
            </div>
          </div>
          <div class="p-item">
            <div class="p-icon orange"><van-icon name="star-o" /></div>
            <div class="p-info">
              <div class="p-num">{{ orderStats.positiveRate || '100%' }}</div>
              <div class="p-text">好评率</div>
            </div>
          </div>
          <div class="p-item">
            <div class="p-icon gold"><van-icon name="medal-o" /></div>
            <div class="p-info">
              <div class="p-num">{{ orderStats.rating || '5.0' }}</div>
              <div class="p-text">服务评分</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. 收益流水列表 -->
      <div class="records-section">
        <div class="list-header">
          <span class="title">最近收益流水</span>
          <div class="header-right" @click="$router.push('/revenue-bill')">
            <span>查看月度账单</span>
            <van-icon name="arrow" />
          </div>
        </div>
        
        <van-empty v-if="records.length === 0" description="暂无收益流水记录" />
        
        <div class="record-list">
          <div v-for="item in records" :key="item.id" class="record-item shadow-card">
            <div class="r-left">
              <div class="r-icon">🧧</div>
              <div class="r-main">
                <div class="r-title">{{ item.description }}</div>
                <div class="r-time">{{ formatDate(item.created_at) }}</div>
              </div>
            </div>
            <div class="r-right">
              <div class="r-amount">+{{ formatMoney(item.amount) }}</div>
              <div class="r-status" :class="{ 'frozen': item.settlement_status === 0 }">
                {{ item.settlement_status === 1 ? '已入账' : '公示期' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 物理占位符，确保内容不被底部导航栏遮挡 -->
      <div class="bottom-spacer"></div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getEarnings } from '../api'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const earnings = ref({ total: 0, today: 0, week: 0, month: 0 })
const balances = ref({ totalBalance: 0, frozenBalance: 0, availableBalance: 0 })
const orderStats = ref({ total: 0, completed: 0, positiveRate: '100%', rating: '5.0' })
const records = ref([])
const refreshing = ref(false)

const loadData = async () => {
  try {
    const res = await getEarnings()
    console.log('>> [Earnings] Data:', res)
    if (res) {
      earnings.value = res.earnings || { total: 0, today: 0, week: 0, month: 0 }
      balances.value = {
        totalBalance: Math.max(0, res.totalBalance || 0),
        frozenBalance: Math.max(0, res.frozenBalance || 0),
        availableBalance: Math.max(0, res.availableBalance || 0)
      }
      
      // 动态获取好评率和评分，如果没有数据则显示默认值
      orderStats.value = {
        ...(res.orderStats || { total: 0, completed: 0 }),
        positiveRate: res.orderStats?.positiveRate || '100%',
        rating: res.orderStats?.rating || '5.0'
      }
      records.value = res.records || []
    }
  } catch (error) {
    console.error('>> [Earnings] Load Error:', error)
  } finally {
    refreshing.value = false
  }
}

const showSettlementInfo = () => {
  showDialog({
    title: '资金结算规则',
    message: '为了保障交易安全，订单收益需经过公示期后方可提现：\n\n1. 普通服务者：T+2 (48小时)\n2. 资深服务者：T+1 (24小时)\n3. 金牌服务者：T+0 (实时)\n\n提升服务质量和单数可缩短结算周期。',
    confirmButtonText: '知道了',
    confirmButtonColor: '#11998e'
  })
}

const onRefresh = () => loadData()
const formatMoney = (val) => Number(val).toFixed(2)
const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
const goWithdraw = () => router.push('/withdraw')

onMounted(loadData)
</script>

<style scoped>
.earnings-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.bottom-spacer {
  height: 70px; /* 精确适配导航栏高度，减少不必要的留白 */
  width: 100%;
  background: transparent;
}

/* 1. 头部钱包 */
.wallet-header {
  position: relative;
  padding: 20px 16px 40px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-bottom-left-radius: 32px;
  border-bottom-right-radius: 32px;
}

.main-balance-card {
  background: white;
  border-radius: 24px;
  padding: 24px;
  margin-top: 40px;
  text-align: center;
}

.balance-top {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #969799;
  font-size: 13px;
  margin-bottom: 12px;
}

.balance-num {
  font-size: 44px;
  font-weight: 800;
  color: #323233;
  font-family: 'DIN Alternate', sans-serif;
  margin-bottom: 24px;
}

.balance-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 16px 0;
  background: #f9fdfb;
  border-radius: 16px;
  margin-bottom: 24px;
}
.sub-item .val { font-size: 16px; font-weight: bold; color: #323233; margin-bottom: 4px; }
.sub-item .lab { font-size: 11px; color: #969799; display: flex; align-items: center; gap: 2px; }
.v-line { width: 1px; height: 24px; background: #eee; }

.withdraw-btn {
  height: 50px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border: none;
  box-shadow: 0 8px 16px rgba(17, 153, 142, 0.2);
}

/* 2. 快捷统计 */
.quick-stats {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.stat-card {
  flex: 1;
  padding: 16px;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
}
.stat-card .s-val { font-size: 18px; font-weight: 800; color: #323233; margin-bottom: 4px; }
.stat-card .s-val.active { color: #11998e; }
.stat-card .s-lab { font-size: 11px; color: #969799; }

/* 3. 表现网格 */
.section-card { margin: 16px; padding: 20px; }
.section-header { font-size: 15px; font-weight: bold; color: #323233; margin-bottom: 20px; }

.performance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.p-item { display: flex; align-items: center; gap: 12px; }
.p-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.p-icon.blue { background: #e8f4ff; color: #1989fa; }
.p-icon.green { background: #eefaf5; color: #52c41a; }
.p-icon.orange { background: #fff7e6; color: #fa8c16; }
.p-icon.gold { background: #fffbe6; color: #ff9900; }

.p-num { font-size: 17px; font-weight: bold; color: #323233; }
.p-text { font-size: 11px; color: #969799; }

/* 4. 流水列表 */
.records-section { 
  padding: 0 16px 120px; /* 显著增加底部间距 */
}
.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.list-header .title { font-size: 16px; font-weight: bold; color: #323233; }
.header-right { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #11998e; font-weight: 500; cursor: pointer; }

.record-list { display: flex; flex-direction: column; gap: 12px; }
.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  transition: all 0.2s;
}
.record-item:active { background: #f2f3f5; transform: scale(0.98); }

.r-left { display: flex; align-items: center; gap: 12px; }
.r-icon { font-size: 24px; }
.r-title { font-size: 14px; font-weight: 500; color: #323233; margin-bottom: 4px; }
.r-time { font-size: 11px; color: #ccc; }

.r-right { text-align: right; }
.r-amount { font-size: 17px; font-weight: bold; color: #52c41a; font-family: 'DIN Alternate', sans-serif; }
.r-status { font-size: 10px; color: #969799; margin-top: 2px; }
.r-status.frozen { color: #f59e0b; }

.shadow-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}
</style>
