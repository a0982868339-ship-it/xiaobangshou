<template>
  <div class="feedback-page">
    <van-nav-bar title="工单与反馈" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="notice-bar">
      <van-notice-bar left-icon="info-o" text="遇到订单纠纷或结算问题？请提交工单，专人跟进处理。" />
    </div>

    <van-form @submit="onSubmit" style="margin-top: 12px;">
      <van-cell-group inset title="问题类型">
        <van-field name="picker" label="选择分类">
          <template #input>
            <div class="category-grid">
              <div 
                v-for="cat in categories" 
                :key="cat.id" 
                class="cat-item" 
                :class="{ active: form.category === cat.id }"
                @click="form.category = cat.id"
              >
                {{ cat.name }}
              </div>
            </div>
          </template>
        </van-field>
      </van-cell-group>

      <van-cell-group inset title="工单详情" style="margin-top: 12px;">
        <van-field
          v-model="form.content"
          rows="4"
          autosize
          type="textarea"
          maxlength="500"
          placeholder="请填写具体问题、订单号及诉求，方便我们快速核实处理。"
          show-word-limit
          :rules="[{ required: true, message: '请填写工单内容' }]"
        />
      </van-cell-group>

      <van-cell-group inset title="优先级" style="margin-top: 12px;">
        <van-field name="radio" label="处理时效">
          <template #input>
            <van-radio-group v-model="form.priority" direction="horizontal">
              <van-radio :name="1">常规</van-radio>
              <van-radio :name="2">紧急</van-radio>
            </van-radio-group>
          </template>
        </van-field>
      </van-cell-group>

      <div style="margin: 30px 16px;">
        <van-button round block type="primary" native-type="submit" :loading="loading" color="#52c41a">
          提交工单
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import request from '../api'

const router = useRouter()
const loading = ref(false)

const categories = [
  { id: 'order', name: '订单纠纷' },
  { id: 'finance', name: '提现/结算' },
  { id: 'complaint', name: '用户投诉' },
  { id: 'other', name: '规则咨询' }
]

const form = reactive({
  category: 'order',
  priority: 1,
  content: '',
  contact: ''
})

const onSubmit = async () => {
  loading.value = true
  try {
    await request.post('/system/feedback', form)
    showSuccessToast('工单已录入系统')
    setTimeout(() => router.back(), 1500)
  } catch (e) {}
  loading.value = false
}
</script>

<style scoped>
.feedback-page { min-height: 100vh; background: #f7f8fa; }
.category-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; width: 100%; }
.cat-item {
  padding: 8px; border: 1px solid #ebedf0; border-radius: 6px;
  text-align: center; font-size: 13px; color: #646566; background: #fff;
}
.cat-item.active {
  border-color: #52c41a; color: #52c41a; background: #f0f9eb;
}
</style>
