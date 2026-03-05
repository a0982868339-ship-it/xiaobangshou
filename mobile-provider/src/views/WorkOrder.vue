<template>
  <div class="work-order-page">
    <van-nav-bar title="我的工单" left-arrow fixed placeholder @click-left="$router.back()">
      <template #right>
        <van-icon name="plus" size="20" @click="$router.push('/work-order/create')" />
      </template>
    </van-nav-bar>

    <div class="page-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <div v-for="item in list" :key="item.id" class="order-card shadow-card" @click="goDetail(item)">
            <div class="card-header">
              <div class="order-no">工单编号: {{ item.order_no }}</div>
              <van-tag :type="getStatusType(item.status)" round>{{ getStatusText(item.status) }}</van-tag>
            </div>
            
            <div class="card-body">
              <div class="order-title">{{ item.title }}</div>
              <div class="order-content van-multi-ellipsis--l2">{{ item.content }}</div>
              <div class="order-time">
                <van-icon name="clock-o" />
                <span>{{ formatDate(item.created_at) }}</span>
              </div>
            </div>

            <div class="card-reply" v-if="item.reply">
              <div class="reply-badge">平台回复</div>
              <div class="reply-text van-multi-ellipsis--l2">{{ item.reply }}</div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
      
      <van-empty v-if="list.length === 0 && !loading" description="暂无工单记录" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api'

const router = useRouter()
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)

const loadData = async () => {
  try {
    const res = await request.get('/system/feedback/me')
    list.value = res.data || res
    finished.value = true
  } catch (e) {
    console.error(e)
  } finally {
    refreshing.value = false
    loading.value = false
  }
}

const onLoad = () => {
  loadData()
}

const onRefresh = () => {
  finished.value = false
  loadData()
}

const getStatusText = (status) => {
  const map = { 0: '待处理', 1: '处理中', 2: '已解决', 3: '已关闭' }
  return map[status] || '未知'
}

const getStatusType = (status) => {
  const map = { 0: 'warning', 1: 'primary', 2: 'success', 3: 'default' }
  return map[status] || 'default'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

const goDetail = (item) => {
  // 详情逻辑待完善
}

onMounted(loadData)
</script>

<style scoped>
.work-order-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

.order-card { background: white; margin-bottom: 16px; padding: 20px; border-radius: 16px; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.order-no { font-size: 12px; color: #969799; font-family: monospace; }

.order-title { font-size: 17px; font-weight: bold; color: #323233; margin-bottom: 8px; }
.order-content { font-size: 14px; color: #646566; line-height: 1.6; margin-bottom: 12px; }
.order-time { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #ccc; }

.card-reply {
  margin-top: 16px;
  padding: 12px;
  background: #f6ffed;
  border-radius: 12px;
  border: 1px solid #eefae8;
}
.reply-badge {
  display: inline-block;
  font-size: 10px;
  color: #52c41a;
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 6px;
  font-weight: bold;
}
.reply-text { font-size: 13px; color: #52c41a; line-height: 1.5; }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
