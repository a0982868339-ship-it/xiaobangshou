<template>
  <div class="recycle-page">
    <van-nav-bar title="订单回收站" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="list-container">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="回收站已清空"
          @load="onLoad"
        >
          <div v-for="item in orders" :key="item.id" class="order-card shadow-card">
            <div class="card-header">
              <div class="o-no">订单号: {{ item.order_no.slice(-8) }}</div>
              <van-tag type="default" round>{{ getStatusText(item.status) }}</van-tag>
            </div>
            
            <div class="card-body">
              <div class="s-name">{{ item.service_name }}</div>
              <div class="s-price">¥{{ item.total_price }}</div>
            </div>

            <div class="card-footer">
              <div class="tip">移入时间: {{ formatDate(item.updated_at) }}</div>
              <div class="actions">
                <van-button size="small" round plain @click="handleRestore(item)">还原</van-button>
                <van-button size="small" round plain type="danger" @click="handleHiding(item)">彻底删除</van-button>
              </div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>

    <van-empty v-if="orders.length === 0 && !loading" description="回收站空空如也" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api'
import { showConfirmDialog, showToast, showSuccessToast } from 'vant'

const router = useRouter()
const orders = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)

const onLoad = async () => {
  loading.value = true
  try {
    // deleteStatus=1 表示查询回收站中的订单
    const data = await request.get('/orders', { params: { deleteStatus: 1 } })
    orders.value = data || []
    finished.value = true
  } catch (e) {}
  loading.value = false
  refreshing.value = false
}

const onRefresh = () => {
  finished.value = false
  onLoad()
}

const handleRestore = (item) => {
  showConfirmDialog({
    title: '确认还原',
    message: '该订单将恢复至订单列表中。'
  }).then(async () => {
    try {
      await request.put(`/orders/${item.id}/delete-status`, { status: 0 })
      showSuccessToast('已还原')
      onRefresh()
    } catch (e) {}
  })
}

const handleHiding = (item) => {
  showConfirmDialog({
    title: '彻底删除',
    message: '彻底删除后将无法找回该订单，确认删除？',
    confirmButtonColor: '#ff4d4f'
  }).then(async () => {
    try {
      await request.put(`/orders/${item.id}/delete-status`, { status: 2 })
      showSuccessToast('已彻底删除')
      onRefresh()
    } catch (e) {}
  })
}

const getStatusText = (s) => ({ 0: '待接单', 1: '已接单', 2: '服务中', 3: '待评价', 4: '已取消', 5: '已评价' }[s] || '未知')
const formatDate = (date) => new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

onMounted(onLoad)
</script>

<style scoped>
.recycle-page { min-height: 100vh; background: #f7f8fa; }
.list-container { padding: 12px; }
.order-card { background: white; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.o-no { font-size: 12px; color: #999; }
.card-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.s-name { font-size: 15px; font-weight: bold; }
.s-price { color: #ee0a24; font-weight: bold; }
.card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f5f5f5; padding-top: 12px; }
.tip { font-size: 11px; color: #ccc; }
.actions { display: flex; gap: 8px; }
.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
