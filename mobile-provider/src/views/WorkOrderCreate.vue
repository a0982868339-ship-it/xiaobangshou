<template>
  <div class="work-order-create-page">
    <van-nav-bar
      title="提交工单"
      left-arrow
      fixed
      placeholder
      @click-left="$router.back()"
    />

    <van-form @submit="onSubmit" style="margin-top: 12px;">
      <van-cell-group inset title="工单信息">
        <van-field
          v-model="form.title"
          label="工单标题"
          placeholder="请输入简短的标题"
          :rules="[{ required: true, message: '请输入工单标题' }]"
        />
        <van-field
          v-model="form.typeName"
          is-link
          readonly
          label="问题类型"
          placeholder="请选择问题类型"
          @click="showTypePicker = true"
        />
      </van-cell-group>

      <van-cell-group inset title="详细描述" style="margin-top: 12px;">
        <van-field
          v-model="form.content"
          rows="5"
          autosize
          label="工单内容"
          type="textarea"
          maxlength="500"
          placeholder="请详细描述您遇到的问题或需求，如涉及订单，请提供订单号..."
          show-word-limit
          :rules="[{ required: true, message: '请填写工单内容' }]"
        />
      </van-cell-group>

      <div style="margin: 30px 16px;">
        <van-button round block type="success" native-type="submit" :loading="loading">
          提交工单
        </van-button>
      </div>
    </van-form>

    <van-popup v-model:show="showTypePicker" position="bottom">
      <van-picker
        :columns="typeColumns"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import request from '../api'

const router = useRouter()
const loading = ref(false)
const showTypePicker = ref(false)

const typeColumns = [
  { text: '提现问题', value: 'finance' },
  { text: '订单纠纷', value: 'order' },
  { text: '资料审核', value: 'other' },
  { text: '系统建议', value: 'other' },
  { text: '其他问题', value: 'other' }
]

const form = ref({
  title: '',
  category: 'finance',
  typeName: '提现问题',
  content: '',
  contact: ''
})

const onTypeConfirm = ({ selectedOptions }) => {
  form.value.typeName = selectedOptions[0].text
  form.value.category = selectedOptions[0].value
  showTypePicker.value = false
}

const onSubmit = async () => {
  loading.value = true
  try {
    const userInfo = JSON.parse(localStorage.getItem('provider_userInfo') || '{}')
    await request.post('/system/feedback', {
      title: form.value.title,
      category: form.value.category,
      content: `[${form.value.typeName}] ${form.value.content}`,
      contact: userInfo.phone || ''
    })
    showSuccessToast('工单已提交，客服人员会尽快回复您')
    router.back()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.work-order-create-page { min-height: 100vh; background: #f7f8fa; }
</style>
