<template>
  <div class="reviews-page">
    <van-nav-bar
      title="我的评价"
      left-arrow
      fixed
      placeholder
      @click-left="$router.back()"
    />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多评价了"
        @load="onLoad"
      >
        <div v-for="item in reviews" :key="item.id" class="review-card">
          <div class="review-header">
            <van-image :src="item.user_avatar" round width="40" height="40" class="user-avatar" />
            <div class="user-info">
              <div class="user-name">{{ item.user_nickname }}</div>
              <div class="review-time">{{ formatDate(item.created_at) }}</div>
            </div>
            <van-rate v-model="item.rating" readonly size="14" color="#ffd21e" />
          </div>
          
          <div class="service-name">服务项目：{{ item.service_name }}</div>
          
          <div class="review-tags" v-if="parseJSON(item.tags).length > 0">
            <van-tag v-for="tag in parseJSON(item.tags)" :key="tag" plain type="primary" class="r-tag">
              {{ tag }}
            </van-tag>
          </div>
          
          <div class="review-content">{{ item.content || '用户未填写文字评价' }}</div>
        </div>
      </van-list>
    </van-pull-refresh>
    
    <van-empty v-if="reviews.length === 0 && !loading" description="暂无评价" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api'

const reviews = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    const res = await request.get('/providers/reviews/me')
    reviews.value = res.data || res
    finished.value = true
  } catch (e) {
    console.error(e)
    finished.value = true
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onLoad = () => {
  loadData()
}

const onRefresh = () => {
  finished.value = false
  loadData()
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const parseJSON = (str) => {
  if (!str) return []
  try {
    return typeof str === 'string' ? JSON.parse(str) : str
  } catch (e) {
    return []
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.reviews-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.review-card {
  background: white;
  margin: 12px;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.review-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.user-info {
  flex: 1;
  margin-left: 12px;
}

.user-name {
  font-size: 15px;
  font-weight: bold;
  color: #323233;
}

.review-time {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}

.service-name {
  font-size: 13px;
  color: #646566;
  margin-bottom: 8px;
  padding: 4px 8px;
  background: #f7f8fa;
  border-radius: 4px;
  display: inline-block;
}

.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.r-tag {
  padding: 2px 8px;
}

.review-content {
  font-size: 14px;
  color: #323233;
  line-height: 1.6;
}
</style>
