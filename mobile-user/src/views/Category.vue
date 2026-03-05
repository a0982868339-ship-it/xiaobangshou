<template>
  <div class="category-page">
    <van-nav-bar title="精选分类" fixed placeholder class="glass-nav" />
    
    <div class="main-body">
      <!-- 一级类目 - 胶囊悬浮侧边栏 -->
      <div class="sidebar">
        <div 
          v-for="(item, index) in parentCategories" 
          :key="item.id"
          class="sidebar-item"
          :class="{ active: activeParentIndex === index }"
          @click="selectParent(index)"
        >
          <div class="active-capsule" v-if="activeParentIndex === index" :style="{ background: `${currentThemeColor}15` }"></div>
          <div class="active-line" :style="{ background: currentThemeColor }"></div>
          <div class="sidebar-icon-wrapper">
            <van-icon :name="getCategoryIcon(item)" :color="activeParentIndex === index ? currentThemeColor : '#8a8a8e'" size="20" />
          </div>
          <span class="sidebar-text">{{ item.name }}</span>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="content-area">
        <div class="category-header">
          <div class="category-title">{{ parentCategories[activeParentIndex]?.name }}</div>
          <div class="category-subtitle">发现优质服务</div>
        </div>

        <transition-group name="stagger" tag="div" class="service-list">
          <div 
            v-for="(service, index) in filteredServices" 
            :key="service.id"
            class="service-item"
            :style="{ '--delay': index * 0.05 + 's' }"
          >
            <div class="service-card" @click="goDetail(service.id)">
              <div class="card-main">
                <div class="service-img-box" v-if="service.cover_image">
                  <van-image :src="service.cover_image" fit="cover" width="84" height="84" radius="16" />
                  <div class="img-overlay"></div>
                </div>
                <div class="service-content">
                  <div class="service-name-row">
                    <span class="service-name">{{ service.name }}</span>
                  </div>
                  <div class="service-desc-row">
                    <span class="service-desc van-multi-ellipsis--l2">{{ service.description }}</span>
                  </div>
                  
                  <div class="service-footer">
                    <div class="price-container">
                      <div class="price-val-wrap">
                        <span class="p-symbol">¥</span>
                        <span class="p-val">{{ service.base_price }}</span>
                        <span class="p-unit">起</span>
                      </div>
                    </div>
                    <div class="footer-actions">
                      <div class="add-btn-circle" :style="{ background: currentThemeColor }">
                        <van-icon name="plus" color="#fff" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition-group>
        
        <van-empty 
          v-if="filteredServices.length === 0" 
          image="search"
          description="该分类下暂无项目" 
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Category'
}
</script>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCategories, getServices } from '../api'

const router = useRouter()
const route = useRoute()
const activeParentIndex = ref(0)
const parentCategories = ref([])
const subCategories = ref([])
const allServices = ref([])

// 主题色映射，让每个大分类都有自己的性格
const themeColors = ['#667eea', '#52c41a', '#ff9c6e', '#13c2c2', '#eb2f96', '#722ed1', '#fadb14']
const currentThemeColor = computed(() => themeColors[activeParentIndex.value % themeColors.length])

const init = async () => {
  const parents = await getCategories({ parentId: 0 })
  parentCategories.value = parents
  const services = await getServices({ pageSize: 200 })
  allServices.value = services.list || []
  
  // 核心：处理首页传过来的分类 ID
  if (route.query.id) {
    const index = parents.findIndex(p => p.id == route.query.id)
    if (index !== -1) {
      selectParent(index)
      return
    }
  }
  
  if (parents.length > 0) selectParent(0)
}

// 监听路由参数变化，处理在分类页内部切换的情况
watch(() => route.query.id, (newId) => {
  if (newId && parentCategories.value.length > 0) {
    const index = parentCategories.value.findIndex(p => p.id == newId)
    if (index !== -1) selectParent(index)
  }
})

// 核心逻辑：获取显示的图标名
const getCategoryIcon = (item) => {
  // 1. 优先使用后台配置的图标 (修复后台修改不生效的问题)
  if (item && item.icon && item.icon.trim() !== '') {
    return item.icon;
  }
  
  // 2. 如果后台没配置，再走自动匹配逻辑
  const name = item ? (item.name || '') : '';
  const iconMap = {
    '宠': 'friends-o',
    '医': 'hospital-o',
    '陪': 'friends-o',
    '做饭': 'fire-o',
    '厨': 'fire-o',
    '保洁': 'brush-o',
    '洗': 'brush-o',
    '收纳': 'apps-o',
    '其它': 'more-o'
  };
  
  const match = Object.keys(iconMap).find(k => name.includes(k));
  return iconMap[match] || 'manager-o';
}

const selectParent = async (index) => {
  activeParentIndex.value = index
  const parentId = parentCategories.value[index].id
  // 仍然获取子分类 ID，但仅用于筛选服务，不显示标题
  subCategories.value = await getCategories({ parentId })
}

// 核心逻辑：计算右侧显示哪些服务
const filteredServices = computed(() => {
  if (parentCategories.value.length === 0) return []
  
  const currentParentId = parentCategories.value[activeParentIndex.value].id
  const childIds = subCategories.value.map(c => c.id)
  
  // 包含：直接属于大类的服务 + 属于该大类下所有子类的服务
  return allServices.value.filter(s => 
    s.category_id === currentParentId || childIds.includes(s.category_id)
  )
})

const goDetail = (id) => router.push(`/service/${id}`)

onMounted(init)
</script>

<style scoped>
.category-page { height: 100vh; display: flex; flex-direction: column; background: #fcfcfd; }
.main-body { flex: 1; display: flex; overflow: hidden; }

/* 毛玻璃导航栏 */
.glass-nav {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.8) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

/* 侧边栏 - 胶囊悬浮设计 */
.sidebar { 
  width: 92px; 
  background: #f7f8fa; 
  height: 100%; 
  overflow-y: auto;
  padding-top: 8px;
}
.sidebar-item { 
  height: 88px;
  display: flex; 
  flex-direction: column;
  align-items: center; 
  justify-content: center;
  font-size: 12px; 
  color: #8a8a8e; 
  position: relative; 
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}
.sidebar-item.active { 
  color: #1d1d1f; 
  font-weight: 600;
}
.active-capsule {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 6px;
  bottom: 6px;
  border-radius: 16px;
  z-index: 0;
  animation: capsuleScale 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.active-line {
  position: absolute;
  left: 0;
  top: 34px;
  bottom: 34px;
  width: 3px;
  border-radius: 0 4px 4px 0;
  opacity: 0;
  transition: all 0.3s ease;
}
.sidebar-item.active .active-line {
  opacity: 1;
}
.sidebar-icon-wrapper {
  z-index: 1;
  margin-bottom: 8px;
  transition: transform 0.3s ease;
}
.sidebar-item.active .sidebar-icon-wrapper {
  transform: scale(1.1) translateY(-2px);
}
.sidebar-text {
  z-index: 1;
  font-size: 13px;
}

/* 右侧内容区 - 呼吸感布局 */
.content-area { 
  flex: 1; 
  padding: 20px 16px; 
  overflow-y: auto; 
  background: #fff;
  border-top-left-radius: 24px;
  box-shadow: -10px 0 20px rgba(0,0,0,0.02);
  z-index: 1;
}

.category-header {
  margin-bottom: 24px;
  padding-left: 4px;
}
.category-title {
  font-size: 22px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 4px;
  letter-spacing: -0.5px;
}
.category-subtitle {
  font-size: 13px;
  color: #86868b;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.service-card { 
  background: #fff; 
  border-radius: 20px; 
  padding: 12px; 
  position: relative;
  transition: all 0.3s ease;
  border: 1px solid #f2f2f7;
}

.service-card:active {
  transform: scale(0.97);
  background: #f5f5f7;
}

.card-main {
  display: flex;
  align-items: stretch;
  gap: 16px;
}

.service-img-box {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.service-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 关键：防止 flex 子项溢出 */
}

.service-name {
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.service-desc {
  font-size: 12px;
  color: #86868b;
  line-height: 1.4;
}

.service-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: auto; /* 将页脚推到底部 */
  padding-top: 12px;
}

.price-container {
  display: flex;
  align-items: baseline;
}

.price-val-wrap {
  display: flex;
  align-items: baseline;
  color: #ff3b30;
}

.p-symbol { font-size: 12px; font-weight: 700; margin-right: 1px; }
.p-val { font-size: 20px; font-weight: 800; font-family: 'DIN Alternate', sans-serif; }
.p-unit { font-size: 11px; color: #86868b; margin-left: 4px; font-weight: 500; }

.footer-actions {
  display: flex;
  align-items: center;
}

.add-btn-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.add-btn-circle:active {
  transform: scale(0.9);
}

/* 交错入场动画 */
.stagger-enter-active {
  transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  transition-delay: var(--delay);
}
.stagger-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

@keyframes capsuleScale {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 隐藏滚动条 */
.sidebar::-webkit-scrollbar,
.content-area::-webkit-scrollbar {
  display: none;
}
</style>
