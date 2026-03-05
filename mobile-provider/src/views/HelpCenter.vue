<template>
  <div class="help-center">
    <van-nav-bar title="帮助中心" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <van-tabs v-model:active="activeTab" @change="loadArticles" sticky offset-top="46px">
      <van-tab title="常见问题" name="faq" />
      <van-tab title="服务规则" name="rule" />
      <van-tab title="系统公告" name="notice" />
    </van-tabs>

    <div class="article-list">
      <van-cell-group inset style="margin-top: 12px;">
        <van-cell 
          v-for="item in articles" 
          :key="item.id" 
          :title="item.title" 
          is-link 
          @click="showDetail(item)"
        />
      </van-cell-group>
      <van-empty v-if="articles.length === 0" description="暂无内容" />
    </div>

    <!-- 文章详情弹出层 -->
    <van-popup v-model:show="detailVisible" position="right" :style="{ width: '100%', height: '100%' }">
      <van-nav-bar :title="currentArticle.title" left-arrow @click-left="detailVisible = false" />
      <div class="article-content" v-html="currentArticle.content"></div>
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
    articles.value = res
  } catch (e) {}
}

const showDetail = async (item) => {
  try {
    const res = await request.get(`/system/articles/${item.id}`)
    currentArticle.value = res
    detailVisible.value = true
  } catch (e) {}
}

onMounted(loadArticles)
</script>

<style scoped>
.help-center { min-height: 100vh; background: #f7f8fa; }
.article-content { padding: 20px; line-height: 1.6; color: #323233; font-size: 15px; }
:deep(.article-content img) { max-width: 100%; height: auto; }
</style>
