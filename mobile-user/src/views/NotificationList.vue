<template>
  <div class="notification-page">
    <van-nav-bar 
      title="消息通知" 
      left-arrow 
      @click-left="$router.back()" 
      fixed 
      placeholder 
      class="custom-nav"
    >
      <template #right>
        <span class="mark-read" @click="handleMarkAllRead">全部已读</span>
      </template>
    </van-nav-bar>

    <div class="page-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多通知了"
          @load="onLoad"
        >
          <div class="notify-list">
            <div 
              v-for="item in list" 
              :key="item.id" 
              class="notify-card shadow-card" 
              :class="{ 'unread': !item.is_read }"
              @click="handleItemClick(item)"
            >
              <div class="card-left">
                <div class="icon-box" :class="item.type">
                  <van-icon :name="getIcon(item.type)" />
                </div>
              </div>
              <div class="card-right">
                <div class="card-header">
                  <span class="title">{{ item.title }}</span>
                  <span class="time">{{ formatTime(item.created_at) }}</span>
                </div>
                <div class="content">{{ item.content }}</div>
                <div class="card-footer" v-if="item.target_url">
                  <span class="link">查看详情</span>
                  <van-icon name="arrow" />
                </div>
              </div>
              <div v-if="!item.is_read" class="unread-dot"></div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>

      <van-empty v-if="list.length === 0 && !loading" description="暂无消息通知" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getNotifications, markNotifyRead } from '../api'
import { showToast, showSuccessToast } from 'vant'

const router = useRouter()
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)

const getIcon = (type) => {
  if (type === 'order') return 'orders-o'
  if (type === 'wallet') return 'gold-coin-o'
  return 'volume-o'
}

const formatTime = (date) => {
  const d = new Date(date)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

const onLoad = async () => {
  try {
    const res = await getNotifications({ page: page.value, pageSize: 20 })
    const data = res.list || []
    list.value = [...list.value, ...data]
    loading.value = false
    if (data.length < 20) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (e) {
    loading.value = false
    finished.value = true
  }
}

const onRefresh = () => {
  page.value = 1
  list.value = []
  finished.value = false
  onLoad().then(() => {
    refreshing.value = false
  })
}

const handleItemClick = async (item) => {
  if (!item.is_read) {
    try {
      await markNotifyRead(item.id)
      item.is_read = 1
    } catch (e) {}
  }
  if (item.target_url) {
    router.push(item.target_url)
  }
}

const handleMarkAllRead = async () => {
  try {
    await markNotifyRead('all')
    list.value.forEach(item => item.is_read = 1)
    showSuccessToast('已全部标记为已读')
  } catch (e) {}
}

onMounted(() => {
  // 初始加载由 van-list 的 load 事件触发
})
</script>

<style scoped>
.notification-page {
  min-height: 100vh;
  background: #ffffff;
}

.custom-nav :deep(.van-nav-bar__title) {
  font-weight: 700;
  color: #1a1a1a;
}

.mark-read {
  font-size: 13px;
  color: #999;
}

.page-content {
  padding: 12px 16px;
}

.notify-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notify-card {
  display: flex;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 20px;
  position: relative;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.notify-card:active {
  transform: scale(0.98);
  background: #f2f2f2;
}

.notify-card.unread {
  background: #fff;
  border-color: #1a1a1a;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.card-left {
  margin-right: 12px;
}

.icon-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: #fff;
}

.icon-box.order { color: #11998e; background: #eefaf8; }
.icon-box.wallet { color: #ff9900; background: #fffaf0; }
.icon-box.system { color: #1a1a1a; background: #f5f5f5; }

.card-right {
  flex: 1;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
}

.time {
  font-size: 11px;
  color: #999;
}

.content {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.card-footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1a1a1a;
  font-size: 12px;
  font-weight: 600;
}

.unread-dot {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 8px;
  height: 8px;
  background: #ee0a24;
  border-radius: 50%;
}

.shadow-card {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}
</style>
