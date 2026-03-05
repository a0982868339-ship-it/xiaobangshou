<template>
  <div class="location-picker">
    <van-nav-bar title="搜索服务地址" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="search-header">
      <div class="city-tag" @click="showCityPicker = true">
        <span>{{ searchDistrict || searchCity || '选择城市' }}</span>
        <van-icon name="arrow-down" />
      </div>
      <van-search
        v-model="keyword"
        placeholder="搜索小区、大厦、地标"
        @input="onSearch"
        class="search-input"
      />
    </div>

    <div id="picker-map" class="map-container">
      <div class="map-center-pin">📍</div>
    </div>

    <div class="poi-list">
      <div v-if="loading" class="search-loading">
        <van-loading vertical>正在搜索附近地址...</van-loading>
      </div>
      <van-cell
        v-for="item in poiList"
        :key="item.id"
        @click="selectPoi(item)"
      >
        <template #title>
          <div class="poi-name">{{ item.name }}</div>
        </template>
        <template #label>
          <div class="poi-address">{{ item.address }}</div>
        </template>
        <template #right-icon>
          <div class="poi-icon-wrap">
            <van-icon name="location" color="#1a1a1a" size="18" />
          </div>
        </template>
      </van-cell>
      <van-empty v-if="poiList.length === 0 && !loading" description="请输入关键词搜索详细地址" />
    </div>

    <van-popup v-model:show="showCityPicker" position="bottom" round>
      <van-cascader
        v-model="cascaderValue"
        title="请选择所在地区"
        :options="options"
        @close="showCityPicker = false"
        @finish="onCascaderFinish"
      />
    </van-popup>

    <!-- 全屏加载蒙层 -->
    <van-overlay :show="mapLoading" z-index="2000">
      <div class="loading-wrapper">
        <van-loading color="#1989fa" vertical>正在定位服务区域...</van-loading>
      </div>
    </van-overlay>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadAMap } from '../utils/amap'
import { areaList } from '@vant/area-data'
import { showToast } from 'vant'
import request from '../api'

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const poiList = ref([])
const searchCity = ref(route.query.city || '哈尔滨市')
const searchDistrict = ref(route.query.district || '')
const loading = ref(false)
const mapLoading = ref(false)
const showCityPicker = ref(false)
const cascaderValue = ref('')

// 核心逻辑：根据当前城市/区，自动定位级联选择器的初始位置
const syncCascaderValue = () => {
  if (!searchCity.value) return
  
  const cityList = areaList.city_list
  const countyList = areaList.county_list
  
  // 1. 尝试匹配区县
  if (searchDistrict.value) {
    const dCode = Object.keys(countyList).find(code => countyList[code].includes(searchDistrict.value))
    if (dCode) {
      cascaderValue.value = dCode
      return
    }
  }
  
  // 2. 尝试匹配城市
  const cCode = Object.keys(cityList).find(code => cityList[code].includes(searchCity.value))
  if (cCode) {
    cascaderValue.value = cCode
  }
}

// 监听弹窗打开，同步位置
watch(showCityPicker, (val) => {
  if (val) syncCascaderValue()
})

// 将 areaList 转换为 Cascader 级联选择器所需的 options 格式
const options = computed(() => {
  const provinceList = areaList.province_list
  const cityList = areaList.city_list
  const countyList = areaList.county_list

  return Object.keys(provinceList).map(pCode => {
    const province = {
      text: provinceList[pCode],
      value: pCode,
      children: []
    }

    // 筛选该省下的市
    Object.keys(cityList).forEach(cCode => {
      if (cCode.slice(0, 2) === pCode.slice(0, 2)) {
        const city = {
          text: cityList[cCode],
          value: cCode,
          children: []
        }

        // 筛选该市下的区县
        Object.keys(countyList).forEach(dCode => {
          if (dCode.slice(0, 4) === cCode.slice(0, 4)) {
            city.children.push({
              text: countyList[dCode],
              value: dCode
            })
          }
        })
        province.children.push(city)
      }
    })
    return province
  })
})

let map, placeSearch, timer

const initMap = async () => {
  mapLoading.value = true
  try {
    // 1. 优先加载 SDK，不再等待后端坐标
    await loadAMap()
    
    // 2. 立即初始化地图（先用默认坐标占位，实现秒开）
    const defaultCenter = [116.397428, 39.90923]
    map = new AMap.Map('picker-map', {
      zoom: 15,
      center: defaultCenter,
      viewMode: '2D'
    })

    // 3. 初始化搜索插件
    AMap.plugin(['AMap.PlaceSearch', 'AMap.AutoComplete', 'AMap.Geocoder'], () => {
      placeSearch = new AMap.PlaceSearch({
        pageSize: 20,
        city: searchCity.value,
        map: map
      })

      const geocoder = new AMap.Geocoder({
        city: searchCity.value
      })

      // 监听地图拖拽结束事件
      map.on('dragend', () => {
        const center = map.getCenter()
        loading.value = true
        
        // 1. 逆地理编码获取当前中心点的地址信息
        geocoder.getAddress(center, (status, result) => {
          if (status === 'complete' && result.regeocode) {
            // 2. 搜索周边 POI
            placeSearch.searchNearBy('小区|写字楼|学校|医院|地标', center, 1000, (status, result) => {
              loading.value = false
              if (status === 'complete' && result.poiList) {
                poiList.value = result.poiList.pois
              }
            })
          }
        })
      })

      // 4. 异步查询精准坐标，不阻塞 UI
      const targetName = (searchCity.value + (searchDistrict.value || '')).replace('undefined', '')
      request.get(`/system/area/center?name=${encodeURIComponent(targetName)}`)
        .then(res => {
          if (res && res.lng) {
            const center = [res.lng, res.lat]
            map.setCenter(center)
            // 自动搜索周边，确保列表不为空
            placeSearch.searchNearBy('小区|写字楼', center, 2000, (status, result) => {
              if (status === 'complete' && result.poiList) {
                poiList.value = result.poiList.pois
              }
            })
          }
        })
        .finally(() => {
          mapLoading.value = false
        })
    })
  } catch (e) {
    mapLoading.value = false
    console.error('Map Init Error:', e)
    showToast('地图加载异常')
  }
}

const onSearch = () => {
  if (timer) clearTimeout(timer)
  
  // 增加防抖逻辑 (300ms)，避免频繁调用接口导致卡顿
  timer = setTimeout(() => {
    if (!keyword.value || keyword.value.length < 2) {
      poiList.value = []
      return
    }
    if (!placeSearch) return
    
    loading.value = true
    placeSearch.setCity(searchCity.value)
    placeSearch.search(keyword.value, (status, result) => {
      loading.value = false
      if (status === 'complete' && result.poiList) {
        poiList.value = result.poiList.pois
      } else {
        poiList.value = []
      }
    })
  }, 300)
}

const onCascaderFinish = async ({ selectedOptions }) => {
  const province = selectedOptions[0].text
  const city = selectedOptions[1].text
  const district = selectedOptions[2].text
  
  searchCity.value = city
  searchDistrict.value = district
  showCityPicker.value = false
  
  // 切换城市/区后立即从数据库查询坐标并空降
  try {
    const targetName = district || city
    const centerRes = await request.get(`/system/area/center?name=${targetName}`)
    const center = [centerRes.lng, centerRes.lat]
    map.setZoomAndCenter(district ? 15 : 14, center)
    
    if (placeSearch) {
      placeSearch.setCity(city)
      // 核心修复：切换区域后立即触发一次周边搜索，更新下方列表
      loading.value = true
      placeSearch.searchNearBy('小区|写字楼|学校|医院|地标', center, 2000, (status, result) => {
        loading.value = false
        if (status === 'complete' && result.poiList) {
          poiList.value = result.poiList.pois
        } else {
          poiList.value = []
        }
      })
    }
  } catch (e) {
    loading.value = false
  }
}

const selectPoi = (poi) => {
  // 原子级防御：确保坐标和地址同时存在，防止选点在海里或无效区域
  if (!poi || !poi.location || !poi.location.lat || !poi.location.lng) {
    showToast('该位置无效，请选择具体建筑或小区')
    return
  }

  const locationData = {
    name: poi.name,
    address: poi.address || poi.name,
    lat: poi.location.lat,
    lng: poi.location.lng,
    province: poi.pname,
    city: poi.cityname,
    district: poi.adname
  }
  localStorage.setItem('temp_selected_location', JSON.stringify(locationData))
  localStorage.setItem('last_service_location', JSON.stringify(locationData))
  router.back()
}

onMounted(initMap)
</script>

<style scoped>
.location-picker { 
  height: 100vh; 
  display: flex; 
  flex-direction: column; 
  background: #ffffff; 
}

/* 搜索栏质感升级 */
.search-header { 
  display: flex; 
  align-items: center; 
  background: #fff; 
  padding: 8px 16px; 
  position: relative; 
  z-index: 100; 
  gap: 12px;
}

.city-tag { 
  display: flex; 
  align-items: center; 
  justify-content: center;
  gap: 4px; 
  font-size: 14px; 
  font-weight: 600;
  color: #1a1a1a; 
  white-space: nowrap; 
  padding: 0 12px;
  height: 40px;
  background: #f5f5f5;
  border-radius: 10px;
  transition: all 0.2s;
}
.city-tag:active {
  background: #e8e8e8;
}

.search-input { 
  flex: 1; 
  padding: 0;
  height: 40px;
}
:deep(.van-search) {
  padding: 0;
  background: transparent;
  height: 100%;
}
:deep(.van-search__content) {
  background: #f5f5f5;
  border-radius: 10px;
  padding-left: 12px;
  height: 100%;
  display: flex;
  align-items: center;
}
:deep(.van-field__control) {
  padding: 0;
  line-height: normal;
  display: flex;
  align-items: center;
}
:deep(.van-field__body) {
  height: 100%;
  display: flex;
  align-items: center;
}
:deep(.van-search__field) {
  padding: 0;
  height: 100%;
  display: flex;
  align-items: center;
}

/* 地图区域极简化 */
.map-container { 
  height: 40vh; 
  width: 100%; 
  position: relative; 
  overflow: hidden;
}
.map-center-pin { 
  position: absolute; 
  top: 50%; 
  left: 50%; 
  transform: translate(-50%, -100%); 
  font-size: 32px; 
  z-index: 10; 
  pointer-events: none;
  filter: drop-shadow(0 4px 4px rgba(0,0,0,0.2));
}

/* POI列表质感升级 */
.poi-list { 
  flex: 1; 
  overflow-y: auto; 
  background: #fff; 
  border-radius: 24px 24px 0 0; 
  margin-top: -24px; 
  position: relative; 
  z-index: 10; 
  box-shadow: 0 -8px 24px rgba(0,0,0,0.06); 
  padding: 12px 4px 0;
}

:deep(.van-cell) {
  padding: 16px 20px;
  background: transparent;
}
:deep(.van-cell__title) {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
:deep(.van-cell__label) {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
:deep(.van-cell:active) {
  background: #f9f9f9;
}

.poi-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.poi-address {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.poi-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f5f5f5;
  border-radius: 50%;
  margin-left: 8px;
}

.search-loading { 
  padding: 60px 0; 
  text-align: center; 
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* 隐藏高德地图logo和版权信息，保持极简 */
:deep(.amap-logo), :deep(.amap-copyright) {
  display: none !important;
}
</style>
