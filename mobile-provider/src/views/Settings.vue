<template>
  <div class="settings-page">
    <van-nav-bar title="设置" fixed placeholder left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <!-- 通知设置 -->
      <div class="section-card shadow-card">
        <div class="section-header">通知管理</div>
        <van-cell-group :border="false">
          <van-cell title="新订单提醒" center>
            <template #right-icon>
              <van-switch v-model="settings.orderNotify" size="20" active-color="#11998e" @change="saveSettings" />
            </template>
          </van-cell>
          <van-cell title="系统公告" center>
            <template #right-icon>
              <van-switch v-model="settings.systemNotify" size="20" active-color="#11998e" @change="saveSettings" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 存储与隐私 -->
      <div class="section-card shadow-card">
        <div class="section-header">通用设置</div>
        <van-cell-group :border="false">
          <van-cell title="清除本地缓存" is-link @click="clearCache">
            <template #value>
              <span class="cache-val">{{ cacheSize }}</span>
            </template>
          </van-cell>
          <van-cell title="关于小帮手" is-link @click="showAbout">
            <template #value>v1.0.0</template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 退出登录 -->
      <div class="logout-box">
        <van-button block round class="logout-btn" @click="handleLogout">
          退出当前账号
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showDialog } from 'vant'

const router = useRouter()
const settings = ref({
  orderNotify: true,
  activityNotify: true,
  systemNotify: true
})
const cacheSize = ref('0 MB')

onMounted(() => {
  loadSettings()
  calculateCacheSize()
})

const loadSettings = () => {
  const saved = localStorage.getItem('app_settings')
  if (saved) settings.value = JSON.parse(saved)
}

const saveSettings = () => {
  localStorage.setItem('app_settings', JSON.stringify(settings.value))
  showToast('设置已更新')
}

const calculateCacheSize = () => {
  let total = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) total += localStorage[key].length + key.length
  }
  cacheSize.value = `${(total / 1024 / 1024).toFixed(2)} MB`
}

const clearCache = () => {
  showConfirmDialog({
    title: '清除缓存',
    message: '确定要清除本地缓存数据吗？',
    confirmButtonColor: '#11998e'
  }).then(() => {
    const token = localStorage.getItem('provider_token')
    const userInfo = localStorage.getItem('provider_userInfo')
    localStorage.clear()
    if (token) localStorage.setItem('provider_token', token)
    if (userInfo) localStorage.setItem('provider_userInfo', userInfo)
    calculateCacheSize()
    showToast('已清理')
  })
}

const showAbout = () => {
  showDialog({
    title: '关于小帮手',
    message: '小帮手 - 专业的一站式本地生活服务平台\n\n版本: 1.0.0 (Build 2026)\n\n我们致力于连接更专业的服务，创造更美好的生活。',
    confirmButtonText: '知道了',
    confirmButtonColor: '#11998e'
  })
}

const handleLogout = () => {
  showConfirmDialog({
    title: '退出登录',
    message: '确定要退出当前服务者账号吗？',
    confirmButtonColor: '#ee0a24'
  }).then(() => {
    localStorage.removeItem('provider_token')
    localStorage.removeItem('provider_userInfo')
    router.replace('/login')
    showToast('已安全退出')
  })
}
</script>

<style scoped>
.settings-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

.section-card {
  background: white;
  border-radius: 16px;
  padding: 8px 0;
  margin-bottom: 16px;
  overflow: hidden;
}

.section-header {
  padding: 16px 20px 8px;
  font-size: 13px;
  color: #969799;
  font-weight: 500;
}

.cache-val { color: #969799; font-size: 13px; }

.logout-box { margin-top: 40px; padding: 0 16px; }
.logout-btn {
  height: 50px;
  border: 1px solid #ebedf0;
  color: #646566;
  font-weight: 500;
  background: white;
}
.logout-btn:active { background: #f2f3f5; }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
