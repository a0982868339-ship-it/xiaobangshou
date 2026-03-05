<template>
  <div class="profile-list-page">
    <van-nav-bar
      title="陪诊档案管理"
      left-arrow
      @click-left="$router.back()"
      fixed
      placeholder
    />

    <div class="list-container">
      <div v-if="loading" class="loading-box">
        <van-loading vertical>加载中...</van-loading>
      </div>
      
      <div v-else-if="profiles.length === 0" class="empty-box">
        <van-empty description="暂无就诊人档案">
          <van-button round type="primary" class="add-btn-large" @click="goAdd">
            立即创建档案
          </van-button>
        </van-empty>
      </div>

      <div v-else class="profiles-grid">
        <div v-for="item in profiles" :key="item.id" class="profile-card shadow-card" @click="goEdit(item)">
          <div class="pc-header">
            <div class="pc-name-row">
              <span class="pc-name">{{ item.name }}</span>
              <van-tag v-if="item.is_default" type="primary" size="mini" round>默认</van-tag>
            </div>
            <div class="pc-gender-age">
              {{ item.gender === 1 ? '男' : item.gender === 2 ? '女' : '未知' }} · {{ item.age || '?' }}岁
            </div>
          </div>
          
          <div class="pc-body">
            <div class="pc-info-item" v-if="item.hospital_name">
              <van-icon name="hospital-o" />
              <span>{{ item.hospital_name }}</span>
            </div>
            <div class="pc-tags" v-if="parseTags(item.tags).length > 0">
              <van-tag v-for="tag in parseTags(item.tags)" :key="tag" plain type="primary" size="mini" class="p-tag">
                {{ tag }}
              </van-tag>
            </div>
          </div>
          
          <div class="pc-footer">
            <div class="pc-edit-btn">
              <van-icon name="edit" />
              <span>编辑资料</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-action" v-if="profiles.length > 0">
      <van-button block round type="primary" class="btn-add-fix" icon="plus" @click="goAdd">
        新增就诊人档案
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPatientProfiles } from '../api'

const router = useRouter()
const profiles = ref([])
const loading = ref(true)

const loadData = async () => {
  try {
    const res = await getPatientProfiles()
    profiles.value = res || []
  } catch (e) {
  } finally {
    loading.value = false
  }
}

const parseTags = (tags) => {
  if (!tags) return []
  try {
    return typeof tags === 'string' ? JSON.parse(tags) : tags
  } catch (e) {
    return []
  }
}

const goAdd = () => router.push('/patient-profile/edit')
const goEdit = (item) => router.push(`/patient-profile/edit?id=${item.id}`)

onMounted(loadData)
</script>

<style scoped>
.profile-list-page {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: 100px;
}

.list-container {
  padding: 16px;
}

.profiles-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  position: relative;
  transition: all 0.2s;
  border: 1px solid #f1f5f9;
}

.profile-card:active {
  transform: scale(0.98);
  background: #fcfcfc;
}

.pc-header {
  margin-bottom: 16px;
}

.pc-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.pc-name {
  font-size: 18px;
  font-weight: 900;
  color: #1e293b;
}

.pc-gender-age {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 600;
}

.pc-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pc-info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #64748b;
}

.pc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.p-tag {
  border-radius: 6px;
  padding: 2px 8px;
}

.pc-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
}

.pc-edit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #11998e;
  font-weight: 700;
}

.footer-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
}

.btn-add-fix {
  height: 52px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
  border: none !important;
  font-weight: 800;
  box-shadow: 0 10px 20px rgba(17, 153, 142, 0.2);
}

.loading-box, .empty-box {
  padding-top: 100px;
  text-align: center;
}

.add-btn-large {
  width: 200px;
  margin-top: 20px;
}
</style>
