<template>
  <div class="service-type-page">
    <van-nav-bar title="选择服务类型" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="page-content">
      <div class="tip-section">
        <van-notice-bar 
          wrapable 
          :scrollable="false" 
          left-icon="info-o" 
          text="请勾选您能提供的服务项目。为了保证质量，建议选择您最擅长的领域。" 
        />
      </div>

      <div class="category-grid">
        <div 
          v-for="item in allCategories" 
          :key="item.id" 
          class="cat-item shadow-card"
          :class="{ 'is-selected': selectedServices.includes(item.id) }"
          @click="toggleService(item.id)"
        >
          <div class="cat-icon-box">
            <van-icon :name="getIconByCatName(item.name)" />
          </div>
          <div class="cat-name">{{ item.name }}</div>
          <div class="selection-indicator">
            <van-icon :name="selectedServices.includes(item.id) ? 'checked' : 'circle'" />
          </div>
        </div>
      </div>

      <!-- 菜系定制卡片 -->
      <transition name="van-fade">
        <div v-if="needsCuisine" class="cuisine-section shadow-card">
          <div class="section-header">
            <div class="title-left">
              <van-icon name="fire-o" color="#fa8c16" />
              <span>拿手菜系 (最多5项)</span>
            </div>
            <van-tag type="warning" plain round>{{ selectedCuisines.length }}/5</van-tag>
          </div>
          <div class="cuisine-tags">
            <div 
              v-for="item in cuisineOptions" 
              :key="item"
              class="cuisine-tag"
              :class="{ 'active': selectedCuisines.includes(item) }"
              @click="toggleCuisine(item)"
            >
              {{ item }}
            </div>
          </div>
        </div>
      </transition>

      <div class="footer-btn">
        <van-button 
          round block 
          type="primary" 
          class="submit-btn" 
          @click="saveSettings" 
          :loading="saving"
        >
          保存配置
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showConfirmDialog } from 'vant'
import { getCategories } from '../api'

const router = useRouter()
const selectedServices = ref([])
const allCategories = ref([])
const saving = ref(false)

const cuisineOptions = [
  '川菜', '粤菜', '湘菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜', 
  '本帮菜', '东北菜', '面食点心', '烘焙甜品', '西餐', '日料', '家常菜'
]
const selectedCuisines = ref([])

const needsCuisine = computed(() => {
  const homeService = allCategories.value.find(c => c.name.includes('做饭') || c.name.includes('饮食'))
  return homeService && selectedServices.value.includes(homeService.id)
})

const getIconByCatName = (name) => {
  if (name.includes('陪诊') || name.includes('医')) return 'hospital-o'
  if (name.includes('宠')) return 'dog'
  if (name.includes('做饭') || name.includes('厨')) return 'fire-o'
  if (name.includes('保洁') || name.includes('清')) return 'brush-o'
  return 'apps-o'
}

const toggleService = (id) => {
  const index = selectedServices.value.indexOf(id)
  if (index > -1) {
    selectedServices.value.splice(index, 1)
  } else {
    selectedServices.value.push(id)
  }
}

const toggleCuisine = (name) => {
  if (selectedCuisines.value.includes(name)) {
    selectedCuisines.value = selectedCuisines.value.filter(i => i !== name)
  } else if (selectedCuisines.value.length < 5) {
    selectedCuisines.value.push(name)
  } else {
    showToast('最多选择5项')
  }
}

const loadData = async () => {
  try {
    const res = await getCategories({ parentId: 0 })
    allCategories.value = res || []
    
    const savedTypes = localStorage.getItem('provider_service_types')
    if (savedTypes) selectedServices.value = JSON.parse(savedTypes).map(Number)
    
    const savedCuisines = localStorage.getItem('provider_cuisine_tags')
    if (savedCuisines) selectedCuisines.value = JSON.parse(savedCuisines)
  } catch (e) {}
}

const saveSettings = async () => {
  if (selectedServices.value.length === 0) return showToast('请至少选择一个服务类型')
  if (needsCuisine.value && selectedCuisines.value.length === 0) return showToast('请选择擅长菜系')

  saving.value = true
  try {
    const request = (await import('../api')).default
    await request.put('/providers/service-types', {
      serviceTypes: selectedServices.value,
      cuisineTags: selectedCuisines.value
    })
    
    localStorage.setItem('provider_service_types', JSON.stringify(selectedServices.value))
    localStorage.setItem('provider_cuisine_tags', JSON.stringify(selectedCuisines.value))

    showSuccessToast('保存成功')
    setTimeout(() => router.back(), 1000)
  } catch (e) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.service-type-page {
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
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.cat-item {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.cat-item.is-selected {
  border-color: #11998e;
  background: #f0f9f8;
}

.cat-icon-box {
  width: 48px;
  height: 48px;
  background: #f7f8fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #11998e;
  margin-bottom: 10px;
}
.is-selected .cat-icon-box {
  background: #11998e;
  color: white;
}

.cat-name {
  font-size: 15px;
  font-weight: bold;
  color: #323233;
}

.selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 18px;
  color: #ccc;
}
.is-selected .selection-indicator {
  color: #11998e;
}

.cuisine-section {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: bold;
  color: #323233;
}

.cuisine-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cuisine-tag {
  padding: 6px 14px;
  background: #f7f8fa;
  border-radius: 20px;
  font-size: 13px;
  color: #646566;
  border: 1px solid #ebedf0;
}
.cuisine-tag.active {
  background: #fff7e6;
  color: #fa8c16;
  border-color: #ffd591;
  font-weight: bold;
}

.footer-btn {
  margin-top: 32px;
  padding-bottom: 40px;
}
.submit-btn {
  height: 50px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border: none;
}
</style>
