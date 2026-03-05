<template>
  <div class="wallet-page">
    <van-nav-bar title="我的钱包" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="page-content">
      <!-- 1. 沉浸式钱包卡片 -->
      <div class="premium-wallet-card shadow-card">
        <div class="card-bg-decoration"></div>
        <div class="card-content">
          <div class="wallet-label">账户当前可用余额 (元)</div>
          <div class="wallet-amount">{{ formatMoney(balance) }}</div>
          
          <div class="wallet-actions">
            <div class="action-item" @click="handleRecharge">
              <van-icon name="plus" />
              <span>充值</span>
            </div>
            <div class="divider"></div>
            <div class="action-item" @click="handleWithdraw">
              <van-icon name="refund-o" />
              <span>提现</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 快捷权益区 -->
      <div class="benefit-row">
        <div class="benefit-item shadow-card" @click="$router.push('/coupon')">
          <div class="b-icon red"><van-icon name="coupon-o" /></div>
          <div class="b-info">
            <div class="b-val">{{ couponCount }} 张</div>
            <div class="b-lab">可用优惠券</div>
          </div>
        </div>
        <div class="benefit-item shadow-card" @click="$router.push('/points')">
          <div class="b-icon gold"><van-icon name="gem-o" /></div>
          <div class="b-info">
            <div class="b-val">{{ points }}</div>
            <div class="b-lab">我的积分</div>
          </div>
        </div>
      </div>

      <!-- 3. 交易明细 -->
      <div class="records-section">
        <div class="section-header">
          <span class="title">交易明细</span>
          <div class="filter" @click="showFilter = true">
            <span>全部类型</span>
            <van-icon name="filter-o" />
          </div>
        </div>

        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <div class="record-list">
            <div v-for="item in records" :key="item.id" class="record-item shadow-card">
              <div class="r-left">
                <div class="r-icon" :class="item.type === 1 ? 'income' : 'expense'">
                  {{ item.type === 1 ? '💰' : '💳' }}
                </div>
                <div class="r-info">
                  <div class="r-title">{{ item.description }}</div>
                  <div class="r-time">{{ formatDate(item.created_at) }}</div>
                </div>
              </div>
              <div class="r-right">
                <div class="r-amount" :class="item.type === 1 ? 'plus' : 'minus'">
                  {{ item.type === 1 ? '+' : '-' }}{{ formatMoney(Math.abs(item.amount)) }}
                </div>
                <div class="r-status">交易成功</div>
              </div>
            </div>
            <van-empty v-if="records.length === 0" description="暂无交易记录" />
          </div>
        </van-pull-refresh>
      </div>
    </div>
    
    <van-action-sheet
      v-model:show="showRechargeSheet"
      :actions="rechargeActions"
      cancel-text="取消"
      description="请选择模拟充值金额"
      close-on-click-action
      @select="onRechargeSelect"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showLoadingToast } from 'vant'
import request from '../api'

const router = useRouter()
const balance = ref(0)
const points = ref(0)
const couponCount = ref(0)
const records = ref([])
const refreshing = ref(false)
const showFilter = ref(false)
const showRechargeSheet = ref(false)
const rechargeActions = [
  { name: '充值 ¥10', value: 10 },
  { name: '充值 ¥50', value: 50 },
  { name: '充值 ¥100', value: 100 },
  { name: '充值 ¥500', value: 500 },
]

const formatMoney = (val) => Number(val).toFixed(2)
const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

const loadData = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return router.push('/login')

    const [userRes, recordsRes] = await Promise.all([
      request.get('/auth/me'),
      request.get('/wallet/records')
    ])
    
    // 解析用户信息
    const user = userRes.data || userRes
    balance.value = user.balance || 0
    points.value = user.points || 0
    couponCount.value = user.couponCount || 0
    
    // 解析流水记录
    const rawRecords = recordsRes.data || recordsRes || []
    records.value = rawRecords.map(r => ({
      ...r,
      description: r.remark || (r.type === 1 ? '钱包充值' : r.type === 2 ? '服务支出' : r.type === 3 ? '订单收益' : '资金变动')
    }))
  } catch (e) {
    console.error('Wallet load error:', e)
    showToast('获取数据失败')
  }
  refreshing.value = false
}

const onRefresh = () => loadData()

const handleRecharge = () => {
  showRechargeSheet.value = true
}

const onRechargeSelect = async (item) => {
  const toast = showLoadingToast({
    message: '原子处理中...',
    forbidClick: true,
    duration: 0
  })
  
  try {
    await request.post('/wallet/recharge', { amount: item.value })
    toast.close()
    showSuccessToast('充值成功')
    loadData()
  } catch (e) {
    toast.close()
    showToast('支付失败')
  }
}

const handleWithdraw = () => {
  router.push('/wallet/withdraw')
}

onMounted(loadData)
</script>

<style scoped>
.wallet-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

/* 1. 钱包卡片 */
.premium-wallet-card {
  height: 180px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  color: white;
  padding: 30px 24px;
  margin-bottom: 20px;
}

.card-bg-decoration {
  position: absolute;
  right: -20px;
  top: -20px;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
  border-radius: 50%;
}

.card-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; }
.wallet-label { font-size: 13px; opacity: 0.8; margin-bottom: 12px; }
.wallet-amount { font-size: 44px; font-weight: 800; font-family: 'DIN Alternate', sans-serif; flex: 1; }

.wallet-actions {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 10px 0;
  margin-top: 10px;
}
.action-item { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: bold; }
.divider { width: 1px; height: 16px; background: rgba(255,255,255,0.3); }

/* 2. 权益行 */
.benefit-row { display: flex; gap: 12px; margin-bottom: 24px; }
.benefit-item { flex: 1; padding: 16px; display: flex; align-items: center; gap: 12px; }
.b-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.b-icon.red { background: #fff1f0; color: #f5222d; }
.b-icon.gold { background: #fffbe6; color: #faad14; }
.b-val { font-size: 15px; font-weight: bold; color: #323233; }
.b-lab { font-size: 11px; color: #969799; }

/* 3. 交易明细 */
.records-section { padding-bottom: 40px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 4px; }
.section-header .title { font-size: 16px; font-weight: bold; color: #323233; }
.filter { font-size: 12px; color: #11998e; display: flex; align-items: center; gap: 4px; }

.record-list { display: flex; flex-direction: column; gap: 12px; }
.record-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; }
.r-left { display: flex; align-items: center; gap: 12px; }
.r-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; background: #f7f8fa; }
.r-title { font-size: 14px; font-weight: 500; color: #323233; margin-bottom: 4px; }
.r-time { font-size: 11px; color: #ccc; }

.r-right { text-align: right; }
.r-amount { font-size: 17px; font-weight: bold; font-family: 'DIN Alternate'; }
.r-amount.plus { color: #52c41a; }
.r-amount.minus { color: #323233; }
.r-status { font-size: 10px; color: #969799; margin-top: 2px; }

.shadow-card { border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); background: #fff; }
.premium-wallet-card.shadow-card { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
</style>
