<template>
  <div class="service-settings-page">
    <van-nav-bar title="服务设置" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="page-content">
      <div class="header-info shadow-card">
        <div class="header-icon-box">
          <van-icon name="setting-o" />
        </div>
        <div class="header-text">
          <div class="title">配置您的专业服务</div>
          <div class="desc">合理配置服务类型和区域，能获得更精准的订单推送</div>
        </div>
      </div>

      <div class="menu-list">
        <div class="menu-item shadow-card" @click="$router.push('/service-settings/type')">
          <div class="item-left">
            <div class="icon-wrap type"><van-icon name="apps-o" /></div>
            <div class="item-info">
              <div class="item-title">服务类型</div>
              <div class="item-desc">勾选您擅长的技能领域</div>
            </div>
          </div>
          <van-icon name="arrow" class="arrow-icon" />
        </div>

        <div v-if="providesEscort" class="menu-item shadow-card" @click="$router.push('/hospital-settings')">
          <div class="item-left">
            <div class="icon-wrap hospital"><van-icon name="hospital-o" /></div>
            <div class="item-info">
              <div class="item-title">熟悉医院</div>
              <div class="item-desc">设置您常去的医疗机构</div>
            </div>
          </div>
          <van-icon name="arrow" class="arrow-icon" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const providesEscort = computed(() => {
  const types = JSON.parse(localStorage.getItem('provider_service_types') || '[]')
  // 陪诊相关 ID，根据实际业务逻辑匹配
  const escortIds = [1, 8, 9] 
  return types.some(id => escortIds.includes(Number(id)))
})
</script>

<style scoped>
.service-settings-page {
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

.header-info {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9eb 100%);
  border: 1px solid #eefae8;
}

.header-icon-box {
  width: 50px;
  height: 50px;
  background: #eefaf5;
  color: #52c41a;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.header-text .title {
  font-size: 18px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 4px;
}
.header-text .desc {
  font-size: 12px;
  color: #969799;
  line-height: 1.4;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-item {
  padding: 18px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}
.menu-item:active {
  background: #f9f9f9;
  transform: scale(0.98);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.icon-wrap.type { background: #e8f4ff; color: #1989fa; }
.icon-wrap.hospital { background: #fff1f0; color: #f5222d; }

.item-title {
  font-size: 16px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 2px;
}
.item-desc {
  font-size: 12px;
  color: #969799;
}

.arrow-icon {
  color: #ccc;
  font-size: 16px;
}
</style>
