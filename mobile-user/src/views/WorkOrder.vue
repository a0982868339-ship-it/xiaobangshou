<template>
  <div class="work-order-page">
    <van-nav-bar title="我的工单" left-arrow fixed placeholder @click-left="$router.back()">
      <template #right>
        <van-icon name="plus" size="20" color="#11998e" @click="$router.push('/work-order/create')" />
      </template>
    </van-nav-bar>

    <div class="page-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多工单记录"
          @load="onLoad"
        >
          <div v-for="item in list" :key="item.id" class="order-card shadow-card" @click="goDetail(item)">
            <div class="card-header">
              <div class="order-no">工单编号: {{ item.order_no }}</div>
              <van-tag :type="getStatusType(item.status)" round class="status-tag">
                {{ getStatusText(item.status) }}
              </van-tag>
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
              <div class="reply-header">
                <div class="reply-badge">官方回复</div>
                <div class="reply-time">{{ formatDate(item.updated_at) }}</div>
              </div>
              <div class="reply-text">{{ item.reply }}</div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
      
      <van-empty v-if="list.length === 0 && !loading" description="暂无工单，如需帮助请点击右上角提交" />
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

const onLoad = () => loadData()
const onRefresh = () => { finished.value = false; loadData() }

const getStatusText = (status) => ({ 0: '待处理', 1: '处理中', 2: '已解决', 3: '已关闭' }[status] || '未知')
const getStatusType = (status) => ({ 0: 'warning', 1: 'primary', 2: 'success', 3: 'default' }[status] || 'default')

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

const goDetail = (item) => {}

onMounted(loadData)
</script>

<style scoped>
.work-order-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

.order-card { background: white; margin-bottom: 16px; padding: 20px; border-radius: 20px; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.order-no { font-size: 12px; color: #969799; font-family: monospace; }
.status-tag { padding: 2px 10px; font-weight: bold; }

.order-title { font-size: 17px; font-weight: bold; color: #323233; margin-bottom: 8px; }
.order-content { font-size: 14px; color: #646566; line-height: 1.6; margin-bottom: 12px; }
.order-time { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #ccc; }

.card-reply {
  margin-top: 16px;
  padding: 16px;
  background: #f0f9f8;
  border-radius: 16px;
  border: 1px solid #e0f2f1;
}
.reply-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.reply-badge {
  display: inline-block; font-size: 10px; color: #11998e; background: white;
  padding: 2px 8px; border-radius: 6px; font-weight: bold; box-shadow: 0 2px 4px rgba(17, 153, 142, 0.1);
}
.reply-time { font-size: 11px; color: #969799; }
.reply-text { font-size: 13px; color: #333; line-height: 1.6; }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
