<template>
  <div class="withdraw-page">
    <van-nav-bar title="发起提现" left-arrow @click-left="$router.back()" fixed placeholder class="custom-nav" />
    
    <div class="page-content">
      <div class="withdraw-card">
        <div class="label">可提现余额 (元)</div>
        <div class="amount-wrap">
          <span class="currency">¥</span>
          <span class="val">{{ formatMoney(availableBalance) }}</span>
        </div>
      </div>

      <!-- 1. 银行卡选择区 (质感卡片版) -->
      <div class="section-header">提现至</div>
      <div class="card-select-container">
        <div v-if="selectedCard" class="premium-card-item shadow-card" @click="showCardList = true">
          <div class="pc-icon">🏦</div>
          <div class="pc-info">
            <div class="pc-bank">{{ selectedCard.bank_name }}</div>
            <div class="pc-desc">尾号 {{ selectedCard.card_no.slice(-4) }} | {{ selectedCard.real_name }}</div>
          </div>
          <van-icon name="arrow" class="pc-arrow" />
        </div>

        <div v-else class="no-card-placeholder" @click="$router.push('/bank-card')">
          <div class="placeholder-inner">
            <van-icon name="plus" class="plus-icon" />
            <span>添加银行卡以进行提现</span>
          </div>
        </div>
      </div>

      <!-- 2. 金额输入区 -->
      <van-form @submit="onSubmit" class="withdraw-form" v-if="selectedCard">
        <div class="section-header">提现金额</div>
        <div class="input-card shadow-card">
          <van-field
            v-model="amount"
            type="number"
            placeholder="请输入提现金额"
            :rules="[{ required: true, message: '请填写金额' }]"
            class="amount-field"
          >
            <template #button>
              <div class="all-btn" @click="amount = availableBalance">全部</div>
            </template>
          </van-field>
        </div>

        <div class="tips-box">
          <div class="tip-item">
            <span class="dot">1.</span>
            <span>管理员将在 1-3 个工作日内处理。</span>
          </div>
          <div class="tip-item">
            <span class="dot">2.</span>
            <span>最小提现金额 10.00 元。</span>
          </div>
        </div>

        <div class="footer-btn">
          <van-button 
            block 
            round 
            type="primary" 
            native-type="submit" 
            :loading="loading"
            class="apply-btn"
          >
            确认申请
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 银行卡列表弹出层 -->
    <van-action-sheet v-model:show="showCardList" title="选择银行卡" round>
      <div class="card-list-popup">
        <van-cell 
          v-for="card in cards" 
          :key="card.id"
          @click="onSelectCard(card)"
          class="card-list-item"
        >
          <template #title>
            <div class="li-bank">{{ card.bank_name }}</div>
            <div class="li-desc">尾号 {{ card.card_no.slice(-4) }}</div>
          </template>
          <template #right-icon>
            <van-icon name="success" v-if="selectedCard?.id === card.id" class="check-icon" />
          </template>
        </van-cell>
        <div class="popup-footer">
          <van-button block round class="add-new-btn" icon="plus" @click="$router.push('/bank-card')">
            使用新卡提现
          </van-button>
        </div>
      </div>
    </van-action-sheet>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast, showToast } from 'vant'
import request from '../api'

const router = useRouter()
const availableBalance = ref(0)
const loading = ref(false)
const cards = ref([])
const selectedCard = ref(null)
const showCardList = ref(false)
const amount = ref('')

const loadData = async () => {
  try {
    const [balanceRes, cardsRes] = await Promise.all([
      request.get('/orders/earnings'),
      request.get('/bank-cards')
    ])
    
    availableBalance.value = balanceRes.availableBalance
    cards.value = cardsRes || []
    
    if (cards.value.length > 0) {
      if (!selectedCard.value || !cards.value.find(c => c.id === selectedCard.value.id)) {
        selectedCard.value = cards.value.find(c => c.is_default) || cards.value[0]
      }
    } else {
      selectedCard.value = null
    }
  } catch (e) {
    console.error('加载提现数据失败:', e)
  }
}

const onSelectCard = (card) => {
  selectedCard.value = card
  showCardList.value = false
}

const onSubmit = async () => {
  if (!selectedCard.value) return showToast('请先选择银行卡');
  if (parseFloat(amount.value) < 10) return showToast('最小10元');
  if (parseFloat(amount.value) > availableBalance.value) return showToast('可用余额不足');

  loading.value = true
  try {
    await request.post('/wallet/withdraw', {
      amount: amount.value,
      bankName: selectedCard.value.bank_name,
      bankCardNo: selectedCard.value.card_no,
      realName: selectedCard.value.real_name
    })
    showSuccessToast('申请已提交')
    setTimeout(() => router.back(), 1500)
  } catch (e) {}
  loading.value = false
}

const formatMoney = (val) => Number(val).toFixed(2)

onMounted(loadData)
onActivated(loadData)
</script>

<script>
export default {
  name: 'Withdraw'
}
</script>

<style scoped>
.withdraw-page {
  min-height: 100vh;
  background: #ffffff;
}

.custom-nav :deep(.van-nav-bar__title) {
  font-weight: 700;
  color: #1a1a1a;
}

.page-content {
  padding: 24px 16px;
}

/* 余额卡片 */
.withdraw-card {
  text-align: center;
  padding: 20px 0 40px;
}
.withdraw-card .label {
  font-size: 13px;
  color: #999;
  margin-bottom: 12px;
}
.amount-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}
.currency {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}
.val {
  font-size: 48px;
  font-weight: 800;
  color: #1a1a1a;
  font-family: 'DIN Alternate', sans-serif;
}

/* 分组标题 */
.section-header {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
  padding-left: 4px;
}

/* 银行卡项 */
.premium-card-item {
  background: #f9f9f9;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #f0f0f0;
  margin-bottom: 24px;
  transition: all 0.2s;
}
.premium-card-item:active {
  background: #f2f2f2;
  transform: scale(0.98);
}
.pc-icon {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
.pc-info {
  flex: 1;
}
.pc-bank {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}
.pc-desc {
  font-size: 12px;
  color: #999;
}
.pc-arrow {
  color: #ccc;
  font-size: 16px;
}

/* 无卡占位 */
.no-card-placeholder {
  background: #f9f9f9;
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  border: 1px dashed #ddd;
  color: #11998e;
  margin-bottom: 24px;
}
.placeholder-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}
.plus-icon {
  font-size: 24px;
}

/* 金额输入卡片 */
.input-card {
  background: #f9f9f9;
  border-radius: 20px;
  padding: 8px 4px;
  border: 1px solid #f0f0f0;
  margin-bottom: 16px;
}
.amount-field {
  background: transparent !important;
  padding: 16px 20px;
}
.amount-field :deep(.van-field__control) {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
}
.all-btn {
  font-size: 13px;
  font-weight: 700;
  color: #11998e;
  padding: 4px 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

/* 提示信息 */
.tips-box {
  padding: 0 10px;
  margin-bottom: 40px;
}
.tip-item {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: #999;
  line-height: 1.8;
}
.dot {
  font-weight: 700;
}

/* 底部按钮 */
.footer-btn {
  padding: 0 4px;
}
.apply-btn {
  height: 52px;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
  border: none !important;
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.2);
}

/* 弹窗样式 */
.card-list-popup {
  padding: 10px 0 30px;
}
.card-list-item {
  padding: 16px 20px;
}
.li-bank {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}
.li-desc {
  font-size: 12px;
  color: #999;
}
.check-icon {
  color: #11998e;
  font-size: 18px;
  font-weight: bold;
}
.popup-footer {
  padding: 24px 20px 0;
}
.add-new-btn {
  height: 48px;
  background: #f5f5f5 !important;
  color: #1a1a1a !important;
  border: none !important;
  font-weight: 600;
}

.shadow-card {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}
</style>
