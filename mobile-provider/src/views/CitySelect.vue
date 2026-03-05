<template>
  <div class="city-select-page">
    <van-nav-bar
      title="选择服务城市"
      left-arrow
      fixed
      placeholder
      @click-left="$router.back()"
    />

    <!-- 搜索框 -->
    <div class="search-wrap">
      <van-search
        v-model="searchValue"
        placeholder="输入城市名或拼音首字母"
        shape="round"
        clearable
      />
    </div>

    <div class="content-scroll">
      <!-- 搜索结果视图 -->
      <div v-if="searchValue" class="search-results">
        <van-cell 
          v-for="city in filteredCities" 
          :key="city.code" 
          :title="city.name" 
          @click="selectCity(city)"
        />
        <van-empty v-if="filteredCities.length === 0" description="未找到相关城市" />
      </div>

      <!-- 标准列表视图 -->
      <template v-else>
        <!-- 当前定位城市 -->
        <div class="location-section">
          <div class="section-title">当前定位/常驻城市</div>
          <div class="city-grid">
            <div class="city-tag current" @click="selectCity({ name: currentCity, code: currentCity === '三亚市' ? '460200' : '' })">
              <van-icon name="location" />
              {{ currentCity }}
            </div>
          </div>
        </div>

        <!-- 全国全量城市索引 (A-Z) -->
        <van-index-bar :index-list="indexList" highlight-color="#11998e">
          <div v-for="group in sortedCityGroups" :key="group.initial">
            <van-index-anchor :index="group.initial" />
            <van-cell 
              v-for="city in group.list" 
              :key="city.code" 
              :title="city.name" 
              @click="selectCity(city)"
            />
          </div>
        </van-index-bar>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { pinyin } from 'pinyin-pro'
import { getRegions } from '@/api'

const router = useRouter()
const searchValue = ref('')
const currentCity = ref('三亚市')
const allCities = ref([])
const loading = ref(false)

// 从后端获取全量城市
const fetchCities = async () => {
  try {
    loading.value = true
    // 仅获取已开通服务的城市（目前已开通海南全境）
    const data = await getRegions({ isOpen: true }) 
    
    allCities.value = data.map(item => {
      const py = pinyin(item.name, { toneType: 'none', type: 'array' })
      return {
        ...item,
        pinyin: py.join(''),
        firstLetter: py[0] ? py[0][0].toUpperCase() : 'Z'
      }
    }).sort((a, b) => a.pinyin.localeCompare(b.pinyin))
  } catch (error) {
    console.error('获取城市列表失败:', error)
  } finally {
    loading.value = false
  }
}

const sortedCityGroups = computed(() => {
  const groups = {}
  const initials = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  initials.forEach(char => groups[char] = [])

  allCities.value.forEach(city => {
    const initial = city.firstLetter
    if (groups[initial]) {
      groups[initial].push(city)
    } else {
      // 处理可能的特殊字符或不在 A-Z 范围内的
      if (!groups['#']) groups['#'] = []
      groups['#'].push(city)
    }
  })

  return [...initials, '#']
    .map(char => ({ initial: char, list: groups[char] || [] }))
    .filter(group => group.list.length > 0)
})

const indexList = computed(() => sortedCityGroups.value.map(g => g.initial))

const filteredCities = computed(() => {
  if (!searchValue.value) return []
  const query = searchValue.value.toLowerCase()
  return allCities.value.filter(c => 
    c.name.includes(query) || 
    c.pinyin.includes(query) ||
    c.firstLetter.toLowerCase() === query
  ).slice(0, 50)
})

const selectCity = (city) => {
  localStorage.setItem('temp_selected_city', JSON.stringify(city))
  router.back()
}

onMounted(() => {
  fetchCities()
  const saved = localStorage.getItem('provider_service_area')
  if (saved) currentCity.value = JSON.parse(saved).city || '三亚市'
})
</script>

<style scoped>
.city-select-page { 
  min-height: 100vh; 
  background: white; 
  display: flex;
  flex-direction: column;
}

.search-wrap { 
  padding: 8px 0; 
  background: white; 
  position: sticky; 
  top: 46px; 
  z-index: 100;
  border-bottom: 1px solid #f7f8fa;
}

.content-scroll {
  flex: 1;
  overflow-y: auto;
}

.location-section {
  padding: 16px;
  background: #f7f8fa;
}

.section-title {
  font-size: 13px;
  color: #969799;
  margin-bottom: 12px;
  font-weight: 500;
}

.city-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.city-tag {
  background: white;
  padding: 10px 4px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  color: #323233;
  transition: all 0.2s;
}

.city-tag.current {
  color: #11998e;
  font-weight: bold;
  background: #eefaf8;
  border: 1px solid #11998e;
}

.city-tag:active {
  background: #f2f3f5;
  transform: scale(0.95);
}

.shadow-card {
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

:deep(.van-index-bar__sidebar) {
  right: 4px;
}

:deep(.van-index-anchor) {
  background-color: #f7f8fa;
  color: #969799;
  font-weight: bold;
}

.search-results {
  padding-bottom: 40px;
}
</style>
