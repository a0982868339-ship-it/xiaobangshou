<template>
  <div class="bank-card-page">
    <van-nav-bar title="银行卡管理" left-arrow @click-left="$router.back()" fixed placeholder />

    <div class="page-content">
      <div class="card-list" v-if="cards.length > 0">
        <div v-for="item in cards" :key="item.id" class="card-item shadow-card" :class="getBankTheme(item.bank_name)">
          <div class="card-top">
            <div class="bank-logo">
              <van-icon name="balance-o" />
            </div>
            <div class="bank-info">
              <div class="bank-name">{{ item.bank_name }}</div>
              <div class="card-type">储蓄卡</div>
            </div>
            <van-icon name="delete-o" class="delete-btn" @click.stop="handleDelete(item.id)" />
          </div>
          <div class="card-no">
            <span>****</span>
            <span>****</span>
            <span>****</span>
            <span class="last-digits">{{ item.card_no.slice(-4) }}</span>
          </div>
          <div class="card-holder">{{ item.real_name }}</div>
          
          <!-- 卡片装饰背景 -->
          <div class="card-bg-pattern"></div>
        </div>
      </div>

      <div v-else class="empty-state">
        <van-empty description="暂无绑定银行卡">
          <template #image>
            <div class="empty-icon-wrap">
              <van-icon name="credit-card" />
            </div>
          </template>
        </van-empty>
      </div>

      <div class="add-btn-box">
        <van-button type="primary" block round class="add-btn" @click="showAddDialog = true">
          <van-icon name="plus" /> 添加新的银行卡
        </van-button>
      </div>
    </div>

    <!-- 添加银行卡弹窗 -->
    <van-dialog 
      v-model:show="showAddDialog" 
      title="绑定银行卡" 
      show-cancel-button 
      confirm-button-text="立即绑定"
      confirm-button-color="#11998e"
      :before-close="beforeAddClose"
    >
      <div class="add-form">
        <van-cell-group inset :border="false">
          <van-field
            v-model="form.realName"
            label="持卡人"
            placeholder="请输入姓名"
            required
          />
          <van-field
            v-model="form.cardNo"
            type="digit"
            label="银行卡号"
            placeholder="请输入16-19位卡号"
            @update:model-value="onCardNoInput"
            required
          />
          <van-field
            v-model="form.bankName"
            is-link
            readonly
            label="开户银行"
            placeholder="系统将自动识别"
            @click="showBankPicker = true"
            required
          />
        </van-cell-group>
        <div class="form-tip">💡 提现仅支持绑定持卡人本人的储蓄卡</div>
      </div>
    </van-dialog>

    <!-- 银行选择器 -->
    <van-popup v-model:show="showBankPicker" position="bottom" round>
      <van-picker
        title="选择开户银行"
        :columns="bankColumns"
        @confirm="onBankConfirm"
        @cancel="showBankPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showConfirmDialog, showSuccessToast } from 'vant'
import request from '../api'

const cards = ref([])
const showAddDialog = ref(false)
const showBankPicker = ref(false)
const form = ref({ realName: '', cardNo: '', bankName: '', isDefault: 1 })

const bankColumns = [
  { text: '中国工商银行', value: 'ICBC' },
  { text: '中国建设银行', value: 'CCB' },
  { text: '中国农业银行', value: 'ABC' },
  { text: '中国银行', value: 'BOC' },
  { text: '招商银行', value: 'CMB' },
  { text: '交通银行', value: 'COMM' },
  { text: '邮储银行', value: 'PSBC' },
  { text: '中信银行', value: 'CITIC' },
  { text: '光大银行', value: 'CEB' },
  { text: '民生银行', value: 'CMBC' },
  { text: '平安银行', value: 'PAB' },
  { text: '兴业银行', value: 'CIB' }
]

const getBankTheme = (name) => {
  if (name.includes('工商') || name.includes('中国银行') || name.includes('中信')) return 'theme-red'
  if (name.includes('建设') || name.includes('招商') || name.includes('交通')) return 'theme-blue'
  if (name.includes('农业') || name.includes('邮储') || name.includes('民生')) return 'theme-green'
  return 'theme-default'
}

const onCardNoInput = (val) => {
  if (val.length >= 6) {
    const binMap = {
      '622202': '中国工商银行', '622848': '中国农业银行', '622700': '中国建设银行',
      '621483': '招商银行', '621700': '中国建设银行', '621226': '中国工商银行',
      '622588': '招商银行', '621785': '中国银行', '621792': '中国银行', '622126': '交通银行'
    }
    const prefix6 = val.substring(0, 6)
    if (binMap[prefix6]) form.value.bankName = binMap[prefix6]
  }
}

const onBankConfirm = ({ selectedOptions }) => {
  form.value.bankName = selectedOptions[0].text
  showBankPicker.value = false
}

const loadCards = async () => {
  try {
    cards.value = await request.get('/bank-cards')
  } catch (e) {}
}

const beforeAddClose = async (action) => {
  if (action === 'cancel') return true
  if (!form.value.realName || !form.value.cardNo || !form.value.bankName) {
    showToast('请完整填写信息')
    return false
  }
  try {
    await request.post('/bank-cards', form.value)
    showSuccessToast('绑定成功')
    loadCards()
    return true
  } catch (e) { return false }
}

const handleDelete = (id) => {
  showConfirmDialog({
    title: '解除绑定',
    message: '确定要解绑这张银行卡吗？解绑后将无法提现至此卡。',
    confirmButtonColor: '#ee0a24'
  }).then(async () => {
    await request.delete(`/bank-cards/${id}`)
    showSuccessToast('已解绑')
    loadCards()
  })
}

onMounted(loadCards)
</script>

<style scoped>
.bank-card-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

.card-list { display: flex; flex-direction: column; gap: 16px; }

.card-item {
  height: 180px;
  border-radius: 20px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-top { display: flex; align-items: center; gap: 12px; z-index: 2; }
.bank-logo {
  width: 40px; height: 40px; background: rgba(255,255,255,0.2);
  border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;
}
.bank-info { flex: 1; }
.bank-name { font-size: 18px; font-weight: bold; }
.card-type { font-size: 12px; opacity: 0.7; }
.delete-btn { font-size: 20px; opacity: 0.8; padding: 4px; }

.card-no {
  font-size: 24px; font-family: 'Courier New', Courier, monospace;
  display: flex; justify-content: space-between; align-items: center;
  z-index: 2; letter-spacing: 2px;
}
.last-digits { font-weight: bold; }

.card-holder { font-size: 15px; font-weight: 500; z-index: 2; opacity: 0.9; }

/* 主题颜色 */
.theme-red { background: linear-gradient(135deg, #e53935 0%, #ff5252 100%); }
.theme-blue { background: linear-gradient(135deg, #1e88e5 0%, #42a5f5 100%); }
.theme-green { background: linear-gradient(135deg, #43a047 0%, #66bb6a 100%); }
.theme-default { background: linear-gradient(135deg, #546e7a 0%, #78909c 100%); }

.card-bg-pattern {
  position: absolute; right: -20px; bottom: -20px; width: 150px; height: 150px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  border-radius: 50%; z-index: 1;
}

.empty-icon-wrap {
  width: 80px; height: 80px; background: #fff; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 40px; color: #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.add-btn-box { margin-top: 32px; }
.add-btn { height: 50px; font-size: 16px; font-weight: bold; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border: none; }

.add-form { padding: 20px 0; }
.form-tip { font-size: 12px; color: #969799; padding: 12px 20px; text-align: center; }

.shadow-card { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); }
</style>
