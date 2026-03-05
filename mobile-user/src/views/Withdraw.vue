<template>
  <div class="withdraw-page">
    <van-nav-bar title="申请提现" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="page-content">
      <!-- 1. 资产卡片 -->
      <div class="asset-card shadow-card">
        <div class="lab">可提现金额 (元)</div>
        <div class="val">{{ formatMoney(balance) }}</div>
      </div>

      <!-- 2. 提现金额输入 -->
      <div class="withdraw-form shadow-card">
        <div class="form-title">提现金额</div>
        <div class="input-row">
          <span class="unit">¥</span>
          <van-field
            v-model="amount"
            type="number"
            placeholder="请输入提现金额"
            class="amount-input"
            :border="false"
          />
          <div class="all-btn" @click="amount = balance">全部提现</div>
        </div>
        <div class="withdraw-tips">
          最小提现金额 ¥100.00，手续费率 1%
        </div>
      </div>

      <!-- 3. 提现方式 -->
      <div class="type-section shadow-card">
        <div class="form-title">提现至</div>
        <van-radio-group v-model="withdrawType" class="type-group">
          <van-cell-group :border="false">
            <van-cell title="支付宝" clickable @click="withdrawType = 'alipay'" center>
              <template #icon>
                <div class="type-icon alipay"><van-icon name="alipay" /></div>
              </template>
              <template #right-icon>
                <van-radio name="alipay" checked-color="#11998e" />
              </template>
            </van-cell>
            <van-cell title="微信零钱" clickable @click="withdrawType = 'wechat'" center>
              <template #icon>
                <div class="type-icon wechat"><van-icon name="wechat" /></div>
              </template>
              <template #right-icon>
                <van-radio name="wechat" checked-color="#11998e" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>

        <!-- 账号信息输入 -->
        <div class="account-info">
          <van-field
            v-model="realName"
            label="真实姓名"
            placeholder="请输入收款人真实姓名"
            class="p-cell"
          />
          <van-field
            v-model="bankCardNo"
            :label="withdrawType === 'alipay' ? '支付宝账号' : '微信账号'"
            placeholder="请输入收款账号"
            class="p-cell"
          />
        </div>
      </div>

      <!-- 4. 说明 -->
      <div class="notice-box">
        <div class="n-title">提现说明:</div>
        <p>1. 提现申请提交后，余额将立即扣除并进入冻结状态。</p>
        <p>2. 管理员将在 1-3 个工作日内完成审核并进行转账。</p>
        <p>3. 若审核驳回，冻结金额将原路退回至您的钱包余额。</p>
      </div>

      <!-- 5. 提交按钮 -->
      <div class="footer-btn">
        <van-button 
          block 
          round 
          type="primary" 
          class="submit-btn" 
          :loading="loading"
          @click="handleSubmit"
        >
          提交提现申请
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showLoadingToast } from 'vant'
import request from '../api'

const router = useRouter()
const balance = ref(0)
const amount = ref('')
const withdrawType = ref('alipay')
const realName = ref('')
const bankCardNo = ref('')
const loading = ref(false)

const formatMoney = (val) => Number(val).toFixed(2)

const loadData = async () => {
  try {
    const res = await request.get('/auth/me')
    balance.value = res.data?.balance || res.balance || 0
  } catch (e) {}
}

const handleSubmit = async () => {
  if (!amount.value || amount.value < 100) return showToast('最小提现金额为 ¥100')
  if (amount.value > balance.value) return showToast('余额不足')
  if (!realName.value) return showToast('请输入真实姓名')
  if (!bankCardNo.value) return showToast('请输入收款账号')

  loading.value = true
  try {
    const data = {
      amount: amount.value,
      withdrawType: withdrawType.value,
      realName: realName.value,
      bankCardNo: bankCardNo.value
    }
    await request.post('/wallet/withdraw', data)
    showSuccessToast('申请已提交')
    setTimeout(() => {
      router.back()
    }, 1500)
  } catch (e) {
    showToast(e.response?.data?.message || '申请失败')
  }
  loading.value = false
}

onMounted(loadData)
</script>

<style scoped>
.withdraw-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

.shadow-card { background: white; border-radius: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); margin-bottom: 16px; padding: 20px; }

.asset-card { text-align: center; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
.asset-card .lab { font-size: 13px; opacity: 0.8; margin-bottom: 8px; }
.asset-card .val { font-size: 36px; font-weight: 800; font-family: 'DIN Alternate'; }

.form-title { font-size: 15px; font-weight: bold; color: #323233; margin-bottom: 16px; }

.input-row { display: flex; align-items: center; border-bottom: 1px solid #f5f5f5; padding-bottom: 10px; margin-bottom: 12px; }
.input-row .unit { font-size: 24px; font-weight: bold; color: #1a1a1a; margin-right: 8px; }
.amount-input { flex: 1; padding: 0; }
:deep(.amount-input .van-field__control) { font-size: 28px; font-weight: 800; font-family: 'DIN Alternate'; color: #1a1a1a; }
.all-btn { font-size: 13px; color: #11998e; font-weight: bold; }

.withdraw-tips { font-size: 12px; color: #999; }

.type-section { padding: 0; overflow: hidden; }
.type-section .form-title { padding: 20px 20px 0; margin-bottom: 10px; }
.type-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: white; margin-right: 12px; }
.type-icon.alipay { background: #108ee9; }
.type-icon.wechat { background: #07c160; }

.account-info { padding: 10px 16px 20px; border-top: 1px solid #f5f5f5; }
.p-cell { padding: 12px 0; }

.notice-box { padding: 0 4px; margin-bottom: 40px; }
.n-title { font-size: 13px; color: #666; margin-bottom: 8px; font-weight: bold; }
.notice-box p { font-size: 12px; color: #999; margin-bottom: 4px; line-height: 1.6; }

.footer-btn { padding: 0 4px; padding-bottom: 40px; }
.submit-btn { height: 50px; font-weight: bold; font-size: 16px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; border: none !important; box-shadow: 0 8px 16px rgba(17, 153, 142, 0.2); }
</style>
