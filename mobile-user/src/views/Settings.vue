<template>
  <div class="settings-page">
    <van-nav-bar title="更多设置" fixed placeholder left-arrow @click-left="$router.back()" />

    <div class="page-content">
      <!-- 通知偏好 -->
      <div class="section-card shadow-card">
        <div class="section-header">通知偏好</div>
        <van-cell-group :border="false">
          <van-cell title="订单动态提醒" center>
            <template #right-icon>
              <van-switch v-model="settings.orderNotify" size="20" active-color="#11998e" @change="saveSettings" />
            </template>
          </van-cell>
          <van-cell title="系统消息与公告" center>
            <template #right-icon>
              <van-switch v-model="settings.systemNotify" size="20" active-color="#11998e" @change="saveSettings" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 通用设置 -->
      <div class="section-card shadow-card">
        <div class="section-header">通用设置</div>
        <van-cell-group :border="false">
          <van-cell title="清除本地缓存" is-link @click="clearCache">
            <template #value>
              <span class="cache-val">{{ cacheSize }}</span>
            </template>
          </van-cell>
          <van-cell title="当前版本" value="v1.0.0" />
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
  showToast('设置已保存')
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
    title: '温馨提示',
    message: '清除缓存将释放手机空间，不会删除您的个人资料。',
    confirmButtonColor: '#11998e'
  }).then(() => {
    const token = localStorage.getItem('token')
    const userInfo = localStorage.getItem('userInfo')
    localStorage.clear()
    if (token) localStorage.setItem('token', token)
    if (userInfo) localStorage.setItem('userInfo', userInfo)
    calculateCacheSize()
    showToast('清理完成')
  })
}

const handleLogout = () => {
  showConfirmDialog({
    title: '退出登录',
    message: '确定要退出当前账号吗？',
    confirmButtonColor: '#ee0a24'
  }).then(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
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
  border-radius: 20px;
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
