<template>
  <div class="hosp-settings">
    <van-nav-bar title="熟悉医院设置" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="page-content">
      <div class="header-tip-card shadow-card">
        <van-icon name="info-o" class="tip-icon" />
        <div class="tip-text">勾选您经常去、流程熟悉的医院，我们将优先为您推荐这些医院的订单。</div>
      </div>

      <div class="hosp-list-wrap">
        <div class="list-header">
          <span class="title">选择熟悉医院</span>
          <van-tag round type="primary" plain>{{ selectedHospitals.length }}</van-tag>
        </div>

        <van-checkbox-group v-model="selectedHospitals">
          <div class="hospital-grid">
            <div 
              v-for="item in hospitalList" 
              :key="item.id" 
              class="hosp-item shadow-card"
              :class="{ 'is-selected': selectedHospitals.includes(item.id) }"
              @click="toggleHospital(item.id)"
            >
              <div class="hosp-main">
                <div class="hosp-name">{{ item.name }}</div>
                <van-tag size="mini" type="primary" plain>{{ item.level }}</van-tag>
              </div>
              <van-checkbox :name="item.id" shape="square" @click.stop />
            </div>
          </div>
        </van-checkbox-group>
        
        <van-empty v-if="hospitalList.length === 0 && !loading" description="当前城市暂无录入的三甲医院" />
      </div>

      <div class="footer-btn">
        <van-button round block type="primary" class="submit-btn" @click="handleSave" :loading="saveLoading">
          完成并保存
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showSuccessToast, showToast } from 'vant'
import request from '../api'

const hospitalList = ref([])
const selectedHospitals = ref([])
const loading = ref(false)
const saveLoading = ref(false)

const toggleHospital = (id) => {
  const index = selectedHospitals.value.indexOf(id)
  if (index > -1) selectedHospitals.value.splice(index, 1)
  else selectedHospitals.value.push(id)
}

const loadData = async () => {
  loading.value = true
  try {
    let city = '杭州'
    const areaSaved = localStorage.getItem('provider_service_area')
    if (areaSaved) {
      const areaData = JSON.parse(areaSaved)
      city = areaData.city || '杭州'
    }

    const [allHosp, myHosp] = await Promise.all([
      request.get(`/common/hospitals?city=${city}`),
      request.get('/providers/my-hospitals')
    ])
    
    hospitalList.value = allHosp || []
    selectedHospitals.value = (myHosp || []).map(h => h.id)
  } catch (e) {
    showToast('加载失败')
  }
  loading.value = false
}

const handleSave = async () => {
  saveLoading.value = true
  try {
    await request.put('/providers/hospitals', { hospitalIds: selectedHospitals.value })
    showSuccessToast('保存成功')
    setTimeout(() => window.history.back(), 1000)
  } catch (e) {}
  saveLoading.value = false
}

onMounted(loadData)
</script>

<style scoped>
.hosp-settings { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

.header-tip-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 12px;
  margin-bottom: 24px;
}
.tip-icon { font-size: 20px; color: #1890ff; margin-top: 2px; }
.tip-text { font-size: 13px; color: #003a8c; line-height: 1.5; }

.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 4px; }
.list-header .title { font-size: 16px; font-weight: bold; color: #323233; }

.hospital-grid { display: flex; flex-direction: column; gap: 12px; }

.hosp-item {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.hosp-item.is-selected { border-color: #11998e; background: #f0f9f8; }

.hosp-main { flex: 1; }
.hosp-name { font-size: 15px; font-weight: bold; color: #323233; margin-bottom: 4px; }

.footer-btn { margin-top: 32px; padding-bottom: 40px; }
.submit-btn { height: 50px; font-size: 16px; font-weight: bold; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border: none; }

.shadow-card { background: white; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
