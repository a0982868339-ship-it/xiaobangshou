<template>
  <div class="my-card-page">
    <van-nav-bar
      title="我的服务名片"
      left-arrow
      fixed
      placeholder
      @click-left="$router.back()"
      class="custom-nav"
    />

    <div class="card-content">
      <!-- 整体化名片容器 -->
      <div class="integrated-card shadow-card">
        <!-- 1. 顶部沉浸式头部 -->
        <div class="card-hero">
          <div class="hero-bg"></div>
          <div class="hero-main">
            <div class="avatar-section">
              <div class="avatar-wrapper" :class="{ 'verified': userInfo.id_card_verified === 1 }">
                <van-image v-if="userInfo.avatar" :src="userInfo.avatar" round width="100%" height="100%" fit="cover" />
                <div v-else class="avatar-text">{{ getAvatarText() }}</div>
              </div>
              <div class="gender-tag" :class="userInfo.gender === 1 ? 'male' : 'female'">
                <van-icon :name="userInfo.gender === 1 ? 'male' : 'female'" />
              </div>
            </div>
            
            <div class="user-info-section">
              <div class="name-line">
                <span class="user-name">{{ userInfo.real_name || userInfo.nickname }}</span>
                <div class="verify-badge" v-if="userInfo.id_card_verified === 1">
                  <van-icon name="passed" />
                  <span>实名认证</span>
                </div>
              </div>
              <div class="meta-line">
                <span>从业{{ userInfo.work_years || '3' }}年</span>
                <span class="dot">·</span>
                <span>{{ userInfo.age || '28' }}岁</span>
                <span class="dot">·</span>
                <span>{{ userInfo.city || '三亚' }}</span>
              </div>
              <div class="score-line">
                <van-rate v-model="userInfo.rating" readonly allow-half color="#ffd21e" size="12" />
                <span class="score-num">{{ userInfo.rating || '5.0' }}</span>
                <span class="review-count">(120+评价)</span>
              </div>
            </div>
          </div>

          <!-- 核心数据栏 (整合进头部) -->
          <div class="stats-bar">
            <div class="stat-box">
              <div class="v">{{ userInfo.order_count || 0 }}</div>
              <div class="l">服务单数</div>
            </div>
            <div class="stat-box">
              <div class="v">{{ userInfo.positiveRate || '100%' }}</div>
              <div class="l">好评率</div>
            </div>
            <div class="stat-box">
              <div class="v">{{ userInfo.responseTime || '20min' }}</div>
              <div class="l">响应速度</div>
            </div>
          </div>
        </div>

        <!-- 2. 内容主体区 (不再使用独立卡片，而是通过分割线区分) -->
        <div class="card-body">
          <!-- 专业资质 -->
          <div class="body-section" v-if="userInfo.certifications && userInfo.certifications.length > 0">
            <div class="section-label">专业资质</div>
            <div class="cert-list">
              <div v-for="(cert, idx) in userInfo.certifications" :key="idx" class="cert-item">
                <van-icon name="medal-o" class="cert-icon" />
                <div class="cert-detail">
                  <div class="cn">{{ cert.name }}</div>
                  <div class="ct">官方已核验 · 有效期至 2027-12</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 个人简介 -->
          <div class="body-section">
            <div class="section-label">个人简介</div>
            <div class="bio-content">
              {{ userInfo.bio || '这位服务者很勤奋，暂时还没有填写简介~' }}
            </div>
          </div>

          <!-- 服务范围 -->
          <div class="body-section">
            <div class="section-label">服务范围</div>
            <div class="tags-group">
              <span v-for="tag in serviceTypes" :key="tag" class="flat-tag blue">{{ tag }}</span>
            </div>
          </div>

          <!-- 擅长菜系 -->
          <div class="body-section" v-if="cuisineTags.length > 0">
            <div class="section-label">拿手好菜</div>
            <div class="tags-group">
              <span v-for="tag in cuisineTags" :key="tag" class="flat-tag orange">{{ tag }}</span>
            </div>
          </div>

          <!-- 用户印象 -->
          <div class="body-section" v-if="impressions.length > 0">
            <div class="section-label">用户印象</div>
            <div class="impression-cloud">
              <span v-for="(tag, index) in impressions" :key="index" class="cloud-item" :class="'c-' + (index % 4)">
                {{ tag.text }} {{ tag.count }}
              </span>
            </div>
          </div>

          <!-- 安全核验 -->
          <div class="body-section no-border">
            <div class="section-label">安全核验</div>
            <div class="safety-grid">
              <div class="safety-node active"><van-icon name="shield-o" /> 实名</div>
              <div class="safety-node active"><van-icon name="notes-o" /> 健康证</div>
              <div class="safety-node active"><van-icon name="search" /> 背调</div>
              <div class="safety-node active"><van-icon name="friends-o" /> 面试</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 (改为随页面滚动) -->
    <div class="footer-btn-static">
      <van-button type="primary" block round @click="$router.push('/settings/profile')">
        修改资料
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getUserInfo, getCategories } from '../api'

const userInfo = ref({
  rating: 5.0
})

const allCategories = ref([])
const serviceTypes = computed(() => {
  if (!userInfo.value.service_types || allCategories.value.length === 0) {
    return ['居家养老', '陪诊服务', '代办买药', '生活护理'] 
  }
  const selectedIds = Array.isArray(userInfo.value.service_types) 
    ? userInfo.value.service_types.map(Number)
    : JSON.parse(userInfo.value.service_types || '[]').map(Number)
    
  return allCategories.value
    .filter(cat => selectedIds.includes(cat.id))
    .map(cat => cat.name)
})

const cuisineTags = computed(() => {
  if (!userInfo.value.cuisine_tags) return []
  return Array.isArray(userInfo.value.cuisine_tags)
    ? userInfo.value.cuisine_tags
    : JSON.parse(userInfo.value.cuisine_tags || '[]')
})

const impressions = ref([])

const getAvatarText = () => {
  const name = userInfo.value.real_name || userInfo.value.nickname || ''
  return name ? name.charAt(0).toUpperCase() : '👨‍💼'
}

onMounted(async () => {
  try {
    const [userData, categoriesData] = await Promise.all([
      getUserInfo(),
      getCategories({ parentId: 0 })
    ])
    userInfo.value = { 
      ...userData, 
      rating: parseFloat(userData.rating || 5.0),
      impressions: userData.impressions || [] 
    }
    if (userData.impressions) {
      impressions.value = userData.impressions
    }
    allCategories.value = categoriesData || []
  } catch (error) {
    console.error('获取信息失败:', error)
  }
})
</script>

<style scoped>
.my-card-page {
  min-height: 100vh;
  background: #f8fafc;
  padding-bottom: 100px;
}

.card-content {
  padding: 16px;
}

/* 整体化名片容器 */
.integrated-card {
  background: white;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
}

/* 1. 顶部沉浸式头部 */
.card-hero {
  position: relative;
  padding: 32px 20px 24px;
  background: linear-gradient(180deg, #f0fdf9 0%, #ffffff 100%);
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.avatar-section {
  position: relative;
}

.avatar-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  padding: 3px;
  background: #eee;
}

.avatar-wrapper.verified {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.avatar-text {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 900;
  color: #11998e;
}

.gender-tag {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  border: 2px solid white;
}
.gender-tag.male { background: #3b82f6; }
.gender-tag.female { background: #f43f5e; }

.user-info-section { flex: 1; }
.name-line { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.user-name { font-size: 22px; font-weight: 900; color: #1e293b; }

.verify-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(17, 153, 142, 0.1);
  color: #11998e;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
  font-weight: 500;
}
.dot { opacity: 0.3; }

.score-line { display: flex; align-items: center; gap: 6px; }
.score-num { font-size: 14px; font-weight: 800; color: #f59e0b; }
.review-count { font-size: 12px; color: #94a3b8; }

/* 核心数据栏 */
.stats-bar {
  display: flex;
  background: #f8fafc;
  border-radius: 16px;
  padding: 16px 0;
}
.stat-box {
  flex: 1;
  text-align: center;
  border-right: 1px solid #e2e8f0;
}
.stat-box:last-child { border-right: none; }
.stat-box .v { font-size: 18px; font-weight: 900; color: #1e293b; font-family: 'DIN Alternate'; }
.stat-box .l { font-size: 11px; color: #94a3b8; font-weight: 700; margin-top: 2px; }

/* 2. 内容主体区 */
.card-body {
  padding: 0 20px 24px;
}

.body-section {
  padding: 24px 0;
  border-bottom: 1px solid #f1f5f9;
}
.body-section.no-border { border-bottom: none; }

.section-label {
  font-size: 15px;
  font-weight: 900;
  color: #1e293b;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-label::before {
  content: '';
  width: 4px;
  height: 14px;
  background: #11998e;
  border-radius: 2px;
}

/* 资质列表 */
.cert-list { display: grid; gap: 12px; }
.cert-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fffbeb;
  padding: 12px 16px;
  border-radius: 12px;
}
.cert-icon { font-size: 24px; color: #f59e0b; }
.cn { font-size: 14px; font-weight: 800; color: #92400e; }
.ct { font-size: 11px; color: #b45309; opacity: 0.7; margin-top: 2px; }

.bio-content {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  background: #f8fafc;
  padding: 14px;
  border-radius: 12px;
}

.tags-group { display: flex; flex-wrap: wrap; gap: 8px; }
.flat-tag {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}
.flat-tag.blue { background: #eff6ff; color: #3b82f6; }
.flat-tag.orange { background: #fff7ed; color: #f97316; }

.impression-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.cloud-item {
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}
.cloud-item.c-0 { background: #f0f9ff; color: #0284c7; }
.cloud-item.c-1 { background: #f0fdf4; color: #16a34a; }
.cloud-item.c-2 { background: #fdf2f8; color: #db2777; }
.cloud-item.c-3 { background: #fff7ed; color: #ea580c; }

.safety-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.safety-node {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  padding: 10px 0;
  background: #f8fafc;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.safety-node.active { color: #16a34a; background: #f0fdf4; font-weight: 700; }
.safety-node i { font-size: 18px; }

.footer-btn-static {
  padding: 24px 20px 40px;
  background: transparent;
}

:deep(.van-button--primary) {
  background: #1a1a1a !important;
  border: none !important;
  font-weight: 800;
  height: 50px;
  font-size: 16px;
}
</style>
