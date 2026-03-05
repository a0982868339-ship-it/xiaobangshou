<template>
  <div class="area-page">
    <van-nav-bar title="服务区域" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="page-content">
      <!-- 常驻城市 -->
      <div class="section-card shadow-card">
        <div class="section-header">
          <van-icon name="location-o" class="header-icon blue" />
          <span>常驻服务城市</span>
        </div>
        <div class="city-selector" @click="$router.push('/city-select')">
          <span class="city-name">{{ selectedCity }}</span>
          <div class="switch-tag">切换城市</div>
        </div>
      </div>

      <!-- 接单范围 (原子级药丸多选) -->
      <div class="section-card shadow-card">
        <div class="section-header">
          <van-icon name="aim" class="header-icon green" />
          <span>接单范围设置</span>
        </div>
        
        <div class="range-switch-box">
          <div class="rs-info">
            <div class="rs-title">覆盖全城</div>
            <div class="rs-desc">{{ allCity ? '接收该城市所有区域的订单' : '仅接收下方选定区域的订单' }}</div>
          </div>
          <van-switch v-model="allCity" size="24" active-color="#11998e" @change="onAllCityChange" />
        </div>

        <transition name="van-slide-down">
          <div v-if="!allCity" class="district-selection-v2">
            <div class="ds-title">请勾选服务的具体区县 <span>(多选)</span></div>
            <div class="ds-tag-grid">
              <div 
                v-for="item in districtList" 
                :key="item.code" 
                class="p-pill-tag"
                :class="{ 'active': selectedDistricts.some(d => d.code === item.code) }"
                @click="toggleDistrictV2(item)"
              >
                <van-icon :name="selectedDistricts.some(d => d.code === item.code) ? 'success' : 'plus'" />
                {{ item.name }}
              </div>
            </div>
            <div v-if="districtList.length === 0" class="ds-empty-tip">该城市无需选择具体区县</div>
            <div v-else-if="selectedDistricts.length === 0" class="ds-empty-error">请至少选择一个服务区域</div>
          </div>
        </transition>
      </div>

      <!-- 距离限制 -->
      <div class="section-card shadow-card">
        <div class="section-header">
          <van-icon name="guide-o" class="header-icon orange" />
          <span>距离偏好 (可选)</span>
        </div>
        
        <!-- 通用服务距离 -->
        <div class="distance-control">
          <div class="d-label">常规服务最远距离</div>
          <div class="d-stepper">
            <van-stepper v-model="maxDistance" step="5" min="5" max="50" button-size="28" theme="round" />
            <span class="unit">公里</span>
          </div>
        </div>

        <!-- 陪诊专项距离 (仅当服务者包含陪诊业务时显示) -->
        <div v-if="providesEscort" class="distance-control mt-12">
          <div class="d-label">陪诊医院最远距离</div>
          <div class="d-stepper">
            <van-stepper v-model="maxEscortDistance" step="5" min="5" max="50" button-size="28" theme="round" />
            <span class="unit">公里</span>
          </div>
        </div>

        <div class="distance-tip">
          💡 提示：设置后，即使在接单区县内，超过此距离的订单也将不再为您优先推荐。
        </div>
      </div>

      <div class="footer-btn">
        <van-button round block type="primary" class="save-btn" @click="saveArea" :loading="loading">
          保存服务区域
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showSuccessToast, showToast } from 'vant'
import { getRegions } from '@/api'

const selectedCity = ref('三亚市')
const selectedCityCode = ref('460200')
const allCity = ref(true)
const districts = ref([])
const selectedDistricts = ref([])
const maxDistance = ref(15)
const maxEscortDistance = ref(15) // 新增：陪诊医院距离偏好
const loading = ref(false)

// 从后端加载该城市的下属区县
const loadDistricts = async () => {
  // 核心防御：如果没有代码，尝试通过名称反查（防止新账号或缓存丢失导致的问题）
  if (!selectedCityCode.value && selectedCity.value) {
    try {
      const allRegions = await getRegions({ name: selectedCity.value })
      if (allRegions && allRegions.length > 0) {
        selectedCityCode.value = allRegions[0].code
      }
    } catch (e) { console.error('自动对齐代码失败') }
  }

  if (!selectedCityCode.value) {
    districts.value = []
    return
  }
  
  loading.value = true
  try {
    // 核心修复：调用后端级联接口获取真实下级区域
    const data = await getRegions({ 
      parentCode: selectedCityCode.value,
      isOpen: true 
    })
    districts.value = data || []
    
    // 清洗已选数据：如果当前选中的区县不再新列表中，则移除
    const validCodes = districts.value.map(d => d.code)
    selectedDistricts.value = selectedDistricts.value.filter(d => validCodes.includes(d.code))
  } catch (error) {
    console.error('加载区县失败:', error)
  } finally {
    loading.value = false
  }
}

const providesEscort = computed(() => {
  const types = JSON.parse(localStorage.getItem('provider_service_types') || '[]')
  // 陪诊相关 ID：1-专业陪诊, 8-代办买药, 9-报告代取
  const escortIds = [1, 8, 9] 
  return types.some(id => escortIds.includes(Number(id)))
})

const districtList = computed(() => districts.value)

onMounted(async () => {
  await loadSavedArea()
  
  // 检查是否有从 CitySelect.vue 返回的新城市
  const temp = localStorage.getItem('temp_selected_city')
  if (temp) {
    const city = JSON.parse(temp)
    selectedCity.value = city.name
    selectedCityCode.value = city.code
    selectedDistricts.value = []
    allCity.value = true
    localStorage.removeItem('temp_selected_city')
    await loadDistricts()
  }
})

const loadSavedArea = async () => {
  const saved = localStorage.getItem('provider_service_area')
  if (saved) {
    const data = JSON.parse(saved)
    selectedCity.value = data.city || '三亚市'
    selectedCityCode.value = data.cityCode || '460200'
    allCity.value = data.allCity !== false
    selectedDistricts.value = data.districts || []
    maxDistance.value = data.maxDistance || 15
    maxEscortDistance.value = data.maxEscortDistance || 15 // 加载
    await loadDistricts()
  } else {
    await loadDistricts()
  }
}

const onAllCityChange = (val) => {
  if (val) selectedDistricts.value = []
}

const toggleDistrictV2 = (item) => {
  const index = selectedDistricts.value.findIndex(d => d.code === item.code)
  if (index > -1) {
    selectedDistricts.value.splice(index, 1)
  } else {
    selectedDistricts.value.push({ code: item.code, name: item.name })
  }
}

const saveArea = async () => {
  if (!allCity.value && districtList.value.length > 0 && selectedDistricts.value.length === 0) {
    return showToast('请选择接单区县或开启覆盖全城')
  }
  
  loading.value = true
  try {
    const request = (await import('../api')).default
    const areaData = {
      city: selectedCity.value,
      cityCode: selectedCityCode.value,
      allCity: allCity.value,
      districts: selectedDistricts.value,
      maxDistance: maxDistance.value,
      maxEscortDistance: maxEscortDistance.value // 新增
    }
    // 注意：这里需要确保后端对应的 providers/service-areas 接口能处理这个结构
    await request.put('/providers/service-areas', { serviceAreas: areaData })
    localStorage.setItem('provider_service_area', JSON.stringify(areaData))
    showSuccessToast('保存成功')
    setTimeout(() => window.history.back(), 1000)
  } catch (error) {
    showToast('保存失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.area-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.page-content {
  padding: 16px;
}

.shadow-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
  margin-bottom: 16px;
  overflow: hidden;
}

.section-card {
  padding: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 20px;
}

.header-icon { font-size: 18px; }
.header-icon.blue { color: #1989fa; }
.header-icon.green { color: #52c41a; }
.header-icon.orange { color: #fa8c16; }

.city-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #f1f5f9;
}
.city-name { font-size: 20px; font-weight: 900; color: #1a1a1a; letter-spacing: -0.5px; }
.switch-tag {
  background: #eefaf8;
  color: #11998e;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: bold;
}

.range-switch-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 16px;
  margin-bottom: 20px;
}
.rs-title { font-size: 15px; font-weight: 800; color: #1a1a1a; }
.rs-desc { font-size: 12px; color: #999; margin-top: 2px; }

.district-selection-v2 {
  padding-top: 10px;
}
.ds-title {
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 16px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.ds-title span { font-size: 11px; font-weight: normal; color: #ccc; }

.ds-tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.p-pill-tag {
  padding: 8px 14px;
  background: #fff;
  border: 1.5px solid #f1f5f9;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.p-pill-tag.active {
  background: #eefaf8;
  border-color: #11998e;
  color: #11998e;
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.1);
  transform: translateY(-1px);
}

.ds-empty-error {
  font-size: 12px;
  color: #ee0a24;
  margin-top: 12px;
  text-align: center;
}

.ds-empty-tip {
  font-size: 13px;
  color: #969799;
  text-align: center;
  padding: 20px 0;
  background: #f9f9f9;
  border-radius: 8px;
}

.distance-control {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.d-label { font-size: 14px; color: #646566; }
.mt-12 { margin-top: 12px; }
.d-stepper { display: flex; align-items: center; gap: 8px; }
.unit { font-size: 13px; color: #969799; }

.distance-tip { font-size: 12px; color: #969799; line-height: 1.6; background: #fffcf5; padding: 10px; border-radius: 8px; border: 1px solid #fff1b8; }

.footer-btn { margin-top: 32px; padding-bottom: 40px; }
.save-btn { height: 50px; font-size: 16px; font-weight: bold; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border: none; }
</style>
