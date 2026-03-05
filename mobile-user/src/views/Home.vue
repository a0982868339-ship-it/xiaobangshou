<template>
  <div class="home-page">
    <!-- 1. 沉浸式质感头部 -->
    <div class="home-header">
      <div class="header-top">
        <div class="location-chip" @click="goLocationPicker">
          <van-icon name="location" />
          <span class="city van-ellipsis">{{ locationName }}</span>
          <van-icon name="arrow-down" class="mini-arrow" />
        </div>
        <div class="header-right">
          <div class="msg-icon-wrap" @click="$router.push('/notifications')">
            <van-icon name="bell" size="24" color="#ffffff" />
            <div class="unread-dot" v-if="unreadNotifyCount > 0"></div>
          </div>
        </div>
      </div>
      
      <div class="search-bar-wrap">
        <van-search
          v-model="searchValue"
          placeholder="搜索您需要的专业服务..."
          shape="round"
          background="transparent"
          readonly
          class="custom-search"
          @click="$router.push('/category')"
        />
      </div>
    </div>

    <!-- 2. 分类金刚区 (质感大方块) -->
    <div class="category-card shadow-card">
      <div class="cat-grid">
        <div 
          v-for="cat in categories" 
          :key="cat.id" 
          class="cat-item" 
          @click="goCategory(cat)"
        >
          <div class="cat-icon-box" :class="`theme-${cat.id % 5}`">
            <!-- 优先使用后台配置的图标 -->
            <van-icon :name="cat.icon || getIconByCat(cat.name)" />
          </div>
          <span class="cat-name">{{ cat.name }}</span>
        </div>
      </div>
    </div>

    <!-- 3. 热门推荐流 (1:1 精致方块网格) -->
    <div class="recommend-feed">
      <div class="feed-header">
        <div class="h-left">
          <van-icon name="fire" color="#ff4d4f" />
          <span class="title">热门推荐服务</span>
        </div>
        <div class="h-right">按热度排序</div>
      </div>

      <div class="service-grid" v-if="sortedServices.length > 0">
        <div 
          v-for="item in sortedServices" 
          :key="item.id" 
          class="service-square shadow-card"
          @click="goDetail(item)"
        >
          <div class="card-cover">
            <van-image :src="item.cover_image" fit="cover" width="100%" height="100%">
              <template #error><div class="img-err">小帮手</div></template>
            </van-image>
            <div class="hot-tag" v-if="item.sales_count > 0">
              <van-icon name="fire" />
              <span>{{ item.sales_count }}</span>
            </div>
          </div>
          
          <div class="card-info">
            <div class="s-name van-ellipsis">{{ item.name || '专业服务' }}</div>
            <div class="s-price-row">
              <div class="price">
                <span class="unit">¥</span>
                <span class="num">{{ item.base_price || 0 }}</span>
              </div>
              <div class="go-circle">
                <van-icon name="plus" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 调试信息：如果列表为空，显示实际数据状态 -->
      <div v-else-if="!loading" class="empty-debug">
        <van-empty description="暂无服务项目，请切换城市" />
        <div style="display:none">{{ rawServices.length }}</div>
      </div>
    </div>
    <div class="bottom-spacer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import request from '../api'
import { loadAMap } from '../utils/amap'

const router = useRouter()
const locationName = ref('正在定位...')
const locationData = reactive({
  city: '',
  district: '',
  lat: null,
  lng: null,
  name: ''
})
const searchValue = ref('')
const categories = ref([])
const rawServices = ref([])
const loading = ref(false)
const unreadNotifyCount = ref(0)

// 彻底修复 Logo：根据您的截图进行精准映射
const getIconByCat = (name) => {
  if (name.includes('宠')) return 'gem-o'      // 对应截图：gem-o
  if (name.includes('医') || name.includes('陪')) return 'friends-o'  // 对应截图：friends-o
  if (name.includes('做饭') || name.includes('厨') || name.includes('饮') || name.includes('居')) return 'clock-o' // 对应截图：clock-o
  if (name.includes('保洁') || name.includes('清')) return 'brush-o'
  return 'apps-o'
}

// 智能定位逻辑：异步化改进，不再阻塞数据加载
const initLocation = async () => {
  // 1. 立即加载基础数据 (使用上次记忆或默认城市)
  const lastLoc = localStorage.getItem('last_service_location')
  if (lastLoc) {
    try {
      const parsed = JSON.parse(lastLoc)
      Object.assign(locationData, parsed)
      locationName.value = parsed.name || parsed.district || parsed.city
    } catch (e) {}
  } else {
    // 默认兜底
    locationName.value = '三亚市'
    locationData.city = '三亚市'
  }
  
  // 无论定位是否成功，先请求一次数据展示给用户
  loadData()

  // 2. 后台静默执行高德物理定位
  try {
    const AMap = await loadAMap()
    AMap.plugin('AMap.Geolocation', () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 5000,
        needAddress: true
      })
      
      geolocation.getCurrentPosition((status, result) => {
        if (status === 'complete') {
          const comp = result.addressComponent
          const newCity = comp.city || comp.province
          const newDistrict = comp.district
          
          // 如果定位到的城市/区与当前展示的不一致，提示用户切换或静默更新
          if (newCity !== locationData.city || newDistrict !== locationData.district) {
            console.log('>> [Location] 发现位置变更，静默刷新数据')
            locationData.city = newCity
            locationData.district = newDistrict
            locationData.lat = result.position.lat
            locationData.lng = result.position.lng
            locationName.value = newDistrict || newCity
            localStorage.setItem('last_service_location', JSON.stringify(locationData))
            loadData() // 静默刷新
          }
        }
      })
    })
  } catch (e) {
    console.warn('定位静默执行失败:', e)
  }
}

const fallbackToCitySearch = (AMap) => {
  AMap.plugin('AMap.CitySearch', () => {
    const citySearch = new AMap.CitySearch()
    citySearch.getLocalCity((status, result) => {
      if (status === 'complete' && result.city) {
        locationData.city = result.city
        locationName.value = result.city
        loadData()
      } else {
        locationName.value = '三亚市'
        loadData()
      }
    })
  })
}

// 核心资产：智能排序逻辑
const sortedServices = computed(() => {
  const list = Array.isArray(rawServices.value) ? rawServices.value : []
  if (list.length === 0) return []
  
  // 核心逻辑：按销量（热度）倒序排列
  return [...list].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
})

const loadData = async () => {
  loading.value = true
  try {
    const [cRes, sRes, nRes] = await Promise.all([
      request.get('/services/categories?parentId=0'),
      request.get('/services', { 
        params: { 
          pageSize: 50,
          city: locationData.city,
          district: locationData.district
        } 
      }),
      request.get('/notifications/unread').catch(() => ({ data: 0 }))
    ])
    
    // 加载未读通知数
    unreadNotifyCount.value = nRes.data || nRes || 0
    
    // 强制兼容性解析
    categories.value = (cRes.list || cRes.data?.list || cRes.data || cRes || []).slice(0, 10)
    
    // 针对截图中的数据结构进行精准解析
    if (sRes.list) {
      rawServices.value = sRes.list
    } else if (sRes.data?.list) {
      rawServices.value = sRes.data.list
    } else if (Array.isArray(sRes.data)) {
      rawServices.value = sRes.data
    } else if (Array.isArray(sRes)) {
      rawServices.value = sRes
    } else {
      rawServices.value = []
    }
  } catch (e) {
    console.error('加载数据失败:', e)
    rawServices.value = []
  }
  loading.value = false
}

const goDetail = (s) => router.push(`/service/${s.id}`)
const goCategory = (cat) => router.push({ path: '/category', query: { id: cat.id } })
const goLocationPicker = () => router.push({
  path: '/address/picker',
  query: {
    city: locationData.city,
    district: locationData.district
  }
})

onMounted(() => {
  initLocation()
})
</script>

<style scoped>
.home-page { min-height: 100vh; background: #f7f8fa; }

.home-header {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  padding: 50px 16px 40px;
  border-bottom-left-radius: 32px; border-bottom-right-radius: 32px;
}

.header-top { display: flex; justify-content: space-between; align-items: center; color: white; margin-bottom: 24px; }
.header-right { display: flex; align-items: center; }
.msg-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: rgba(255,255,255,0.25);
  border-radius: 12px;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.msg-icon-wrap:active {
  background: rgba(255,255,255,0.25);
  transform: scale(0.9);
}
.msg-icon-wrap .unread-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
  border: 1.5px solid #11998e;
}
.location-chip { display: flex; align-items: center; gap: 4px; font-weight: bold; font-size: 17px; }
.mini-arrow { font-size: 12px; opacity: 0.8; }

:deep(.van-search__content) { 
  background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

/* 2. 金刚区升级 */
.category-card {
  margin: -20px 16px 20px;
  padding: 24px 12px;
}
.cat-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px 12px;
}
.cat-item {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.cat-icon-box {
  width: 54px; height: 54px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.cat-name { font-size: 13px; color: #323233; font-weight: bold; }

.theme-0 { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
.theme-1 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.theme-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.theme-3 { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.theme-4 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }

/* 3. 推荐方块网格 */
.recommend-feed { padding: 0 16px 40px; }
.feed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 4px; }
.h-left { display: flex; align-items: center; gap: 6px; font-size: 18px; font-weight: 800; color: #323233; }
.h-right { font-size: 11px; color: #969799; }

.service-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}

.service-square {
  background: white; border-radius: 24px; overflow: hidden; display: flex; flex-direction: column;
}

.card-cover {
  width: 100%; aspect-ratio: 1; background: #f7f8fa; position: relative;
}
.img-err { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #ddd; font-weight: 800; }

.hot-tag {
  position: absolute; top: 12px; left: 12px;
  background: #ff4d4f; color: white; font-size: 9px; padding: 2px 8px; border-radius: 6px; font-weight: 800;
}

.card-info { padding: 14px; }
.s-name { font-size: 15px; font-weight: 800; color: #323233; margin-bottom: 8px; }

.s-price-row { display: flex; justify-content: space-between; align-items: center; }
.price { color: #ee0a24; }
.price .num { font-size: 20px; font-weight: 800; font-family: 'DIN Alternate'; }
.price .unit, .price .suffix { font-size: 11px; }

.go-circle {
  width: 26px; height: 26px; background: #11998e; color: white;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 14px; box-shadow: 0 2px 6px rgba(17, 153, 142, 0.3);
}

.shadow-card { background: white; border-radius: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
.bottom-spacer { height: 100px; }
</style>
