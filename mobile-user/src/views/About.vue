<template>
  <div class="about-page">
    <van-nav-bar title="关于小帮手" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="page-content">
      <div class="logo-card shadow-card">
        <div class="logo-wrap">
          <div class="logo-inner">🤝</div>
        </div>
        <div class="app-name">小帮手</div>
        <div class="app-slogan">更专业的本地生活服务平台</div>
        <van-tag round color="#eefaf8" text-color="#11998e" class="version-tag">Version {{ currentVersion }}</van-tag>
      </div>

      <div class="menu-card shadow-card">
        <van-cell-group :border="false">
          <van-cell title="检查新版本" is-link @click="handleCheckUpdate">
            <template #value>
              <span class="dot-new" v-if="hasNewVersion">NEW</span>
            </template>
          </van-cell>
          <van-cell title="功能介绍" is-link @click="showFeatureIntro" />
          <van-cell title="服务协议" is-link to="/help" />
          <van-cell title="隐私政策" is-link to="/help" />
        </van-cell-group>
      </div>

      <div class="company-info">
        <div class="c-title">小帮手科技出品</div>
        <div class="c-copy">Copyright © 2026 Xiaobangshou. All Rights Reserved.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast, showConfirmDialog, showDialog } from 'vant'
import request from '../api'

const currentVersion = '1.0.0'
const hasNewVersion = ref(false)

const handleCheckUpdate = async () => {
  try {
    const res = await request.get('/system/check-update?platform=h5')
    const data = res.data || res
    if (data && data.version !== currentVersion) {
      showConfirmDialog({
        title: '发现新版本 v' + data.version,
        message: data.content || '修复了一些已知问题，提升系统稳定性。',
        confirmButtonText: '立即更新',
        confirmButtonColor: '#11998e'
      }).then(() => {
        if (data.url) window.location.href = data.url
        else showToast('请前往应用商店下载')
      })
    } else {
      showToast('当前已是最新版本')
    }
  } catch (e) {
    showToast('检查失败')
  }
}

const showFeatureIntro = () => {
  showDialog({
    title: '小帮手 - 功能介绍',
    message: '我们提供 30+ 种本地生活服务，包括专业陪诊、宠物特护、上门代厨、全屋收纳等。所有服务者均经过实名认证和专业技能核验，为您打造安全、高效、省心的生活助手。',
    confirmButtonText: '知道了',
    confirmButtonColor: '#11998e'
  })
}
</script>

<style scoped>
.about-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 24px 16px; display: flex; flex-direction: column; align-items: center; }

.logo-card {
  width: 100%; padding: 40px 0; background: white; border-radius: 24px;
  display: flex; flex-direction: column; align-items: center; margin-bottom: 24px;
}
.logo-wrap {
  width: 80px; height: 80px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-radius: 20px; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px rgba(17, 153, 142, 0.2); margin-bottom: 16px;
}
.logo-inner { font-size: 44px; }
.app-name { font-size: 22px; font-weight: 800; color: #323233; margin-bottom: 6px; }
.app-slogan { font-size: 13px; color: #969799; margin-bottom: 16px; }
.version-tag { padding: 2px 12px; font-weight: bold; }

.menu-card { width: 100%; padding: 8px 0; background: white; border-radius: 20px; }
.dot-new { font-size: 10px; background: #ee0a24; color: white; padding: 1px 6px; border-radius: 10px; font-weight: bold; }

.company-info { margin-top: auto; padding-top: 60px; text-align: center; }
.c-title { font-size: 13px; color: #323233; font-weight: bold; margin-bottom: 6px; }
.c-copy { font-size: 11px; color: #ccc; }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
