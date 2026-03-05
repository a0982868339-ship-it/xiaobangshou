<template>
  <div class="about-page">
    <van-nav-bar title="关于我们" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="logo-section">
      <div class="logo">🆘</div>
      <div class="app-name">小帮手</div>
      <div class="version">Version {{ currentVersion }}</div>
    </div>

    <van-cell-group inset style="margin-top: 20px;">
      <van-cell title="检查更新" is-link @click="handleCheckUpdate" />
      <van-cell title="功能介绍" is-link @click="showToast('致力于打造最贴心的生活助手')" />
      <van-cell title="用户协议" is-link to="/help" />
      <van-cell title="隐私政策" is-link to="/help" />
    </van-cell-group>

    <div class="footer-info">
      <p>© 2026 小帮手平台 版权所有</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast, showConfirmDialog, showDialog } from 'vant'
import request from '../api'

const currentVersion = '1.0.0'

const handleCheckUpdate = async () => {
  try {
    const res = await request.get('/system/check-update?platform=h5')
    if (res && res.version !== currentVersion) {
      showConfirmDialog({
        title: '发现新版本 v' + res.version,
        message: res.content || '修复了一些已知问题，提升系统稳定性。',
        confirmButtonText: '立即更新',
        cancelButtonText: '稍后再说'
      }).then(() => {
        if (res.url) window.location.href = res.url
        else showToast('请前往应用商店下载')
      })
    } else {
      showToast('当前已是最新版本')
    }
  } catch (e) {
    showToast('检查失败')
  }
}
</script>

<style scoped>
.about-page { min-height: 100vh; background: #f7f8fa; }
.logo-section { text-align: center; padding: 40px 0; background: white; }
.logo { font-size: 60px; margin-bottom: 10px; }
.app-name { font-size: 20px; font-weight: bold; color: #323233; }
.version { font-size: 14px; color: #969799; margin-top: 5px; }
.footer-info { position: absolute; bottom: 30px; width: 100%; text-align: center; font-size: 12px; color: #c8c9cc; }
</style>
