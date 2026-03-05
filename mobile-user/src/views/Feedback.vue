<template>
  <div class="feedback-page">
    <van-nav-bar title="工单与反馈" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="notice-bar">
      <van-notice-bar left-icon="info-o" text="提交工单后，客服将在24小时内为您处理并答复。" />
    </div>

    <van-form @submit="onSubmit" style="margin-top: 12px;">
      <van-cell-group inset title="工单分类">
        <van-field name="picker" label="问题分类">
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

      <van-cell-group inset title="详细描述" style="margin-top: 12px;">
        <van-field
          v-model="form.content"
          rows="4"
          autosize
          type="textarea"
          maxlength="500"
          placeholder="请详细描述您遇到的问题（如订单号、具体情况等），以便我们快速定位处理。"
          show-word-limit
          :rules="[{ required: true, message: '请填写描述内容' }]"
        />
      </van-cell-group>

      <van-cell-group inset title="紧急程度" style="margin-top: 12px;">
        <van-field name="radio" label="紧迫性">
          <template #input>
            <van-radio-group v-model="form.priority" direction="horizontal">
              <van-radio :name="1">普通</van-radio>
              <van-radio :name="2">紧急</van-radio>
              <van-radio :name="3">特急</van-radio>
            </van-radio-group>
          </template>
        </van-field>
      </van-cell-group>

      <van-cell-group inset title="联系方式" style="margin-top: 12px;">
        <van-field
          v-model="form.contact"
          label="联系电话"
          placeholder="方便客服回访（选填）"
        />
      </van-cell-group>

      <div style="margin: 30px 16px;">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          提交工单
        </van-button>
      </div>
    </van-form>

    <div class="my-tickets" @click="goHistory">
      <van-cell title="查看我的工单记录" is-link icon="clock-o" />
    </div>
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
  { id: 'order', name: '订单问题' },
  { id: 'finance', name: '退款/财务' },
  { id: 'tech', name: '技术故障' },
  { id: 'complaint', name: '违规投诉' },
  { id: 'other', name: '其他反馈' }
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
    showSuccessToast('工单已提交，请耐心等待')
    setTimeout(() => router.back(), 1500)
  } catch (e) {}
  loading.value = false
}

const goHistory = () => {
  // 预留历史记录页
  showSuccessToast('暂无历史记录')
}
</script>

<style scoped>
.feedback-page { min-height: 100vh; background: #f7f8fa; padding-bottom: 40px; }
.category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; }
.cat-item {
  padding: 6px 4px; border: 1px solid #ebedf0; border-radius: 4px;
  text-align: center; font-size: 13px; color: #646566; background: #fff;
  transition: all 0.2s;
}
.cat-item.active {
  border-color: #1989fa; color: #1989fa; background: #ecf5ff;
}
.my-tickets { margin-top: 20px; }
</style>
