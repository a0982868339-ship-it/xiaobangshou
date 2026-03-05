<template>
  <div class="help-center">
    <van-nav-bar title="帮助中心" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="sticky-tabs">
      <van-tabs v-model:active="activeTab" @change="onTabChange" color="#11998e" line-width="20px">
        <van-tab title="常见问题" name="faq" />
        <van-tab title="服务规则" name="rule" />
        <van-tab title="系统公告" name="notice" />
      </van-tabs>
    </div>

    <div class="page-content">
      <div class="article-list">
        <div 
          v-for="item in articles" 
          :key="item.id" 
          class="article-card shadow-card"
          @click="showDetail(item)"
        >
          <div class="a-info">
            <div class="a-title">{{ item.title }}</div>
            <div class="a-time" v-if="activeTab === 'notice'">{{ formatDate(item.created_at) }}</div>
          </div>
          <van-icon name="arrow" class="arrow-icon" />
        </div>
      </div>
      <van-empty v-if="articles.length === 0" description="暂无相关内容" />
    </div>

    <!-- 文章详情弹出层 -->
    <van-popup v-model:show="detailVisible" position="bottom" round style="height: 90%">
      <div class="detail-container">
        <div class="detail-header">
          <div class="d-title">{{ currentArticle.title }}</div>
          <div class="d-meta">{{ formatDate(currentArticle.created_at) }} · 小帮手官方</div>
        </div>
        <div class="article-content" v-html="currentArticle.content"></div>
        
        <div class="detail-footer">
          <van-button block round type="primary" @click="detailVisible = false">已阅读</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api'

const activeTab = ref('faq')
const articles = ref([])
const detailVisible = ref(false)
const currentArticle = ref({})

const loadArticles = async () => {
  try {
    const res = await request.get(`/system/articles?category=${activeTab.value}`)
    articles.value = res.data || res
  } catch (e) {}
}

const onTabChange = () => loadArticles()

const showDetail = async (item) => {
  try {
    const res = await request.get(`/system/articles/${item.id}`)
    currentArticle.value = res.data || res
    detailVisible.value = true
  } catch (e) {}
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

onMounted(loadArticles)
</script>

<style scoped>
.help-center { min-height: 100vh; background: #f7f8fa; }
.sticky-tabs { position: sticky; top: 0; z-index: 10; background: white; }
.page-content { padding: 16px; }

.article-list { display: flex; flex-direction: column; gap: 12px; }
.article-card {
  background: white; padding: 18px 16px; border-radius: 16px;
  display: flex; justify-content: space-between; align-items: center;
  transition: all 0.2s;
}
.article-card:active { background: #f9f9f9; transform: scale(0.98); }

.a-title { font-size: 15px; color: #323233; font-weight: 500; }
.a-time { font-size: 11px; color: #969799; margin-top: 4px; }
.arrow-icon { color: #ccc; font-size: 14px; }

.detail-container { height: 100%; display: flex; flex-direction: column; padding: 24px 20px; }
.detail-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f2f3f5; }
.d-title { font-size: 20px; font-weight: 800; color: #323233; margin-bottom: 10px; line-height: 1.4; }
.d-meta { font-size: 12px; color: #969799; }

.article-content { flex: 1; overflow-y: auto; line-height: 1.8; color: #444; font-size: 15px; }
:deep(.article-content img) { max-width: 100%; height: auto; border-radius: 8px; }

.detail-footer { padding-top: 20px; padding-bottom: env(safe-area-inset-bottom); }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
