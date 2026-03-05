<template>
  <div class="package-page">
    <van-nav-bar title="包月套餐" fixed placeholder left-arrow @click-left="$router.back()" />
    
    <div class="header-banner">
      <div class="banner-title">省心省钱 · 品质生活</div>
      <div class="banner-desc">12款精选套餐，最高省 1200 元</div>
    </div>

    <van-tabs v-model:active="activeTab" sticky offset-top="46px">
      <van-tab v-for="group in packageGroups" :key="group.type" :title="group.label">
        <div class="package-list">
          <div v-for="pkg in group.list" :key="pkg.id" class="package-card">
            <div class="card-tag">{{ pkg.tag }}</div>
            <div class="pkg-header">
              <div class="pkg-name">{{ pkg.name }}</div>
              <div class="pkg-price">
                <span class="symbol">¥</span>
                <span class="num">{{ pkg.price }}</span>
                <span class="unit">/月</span>
              </div>
            </div>
            <div class="pkg-content">
              <div v-for="(line, i) in pkg.features" :key="i" class="feature-line">
                <van-icon name="success" color="#52c41a" />
                <span>{{ line }}</span>
              </div>
            </div>
            <div class="pkg-footer">
              <div class="old-price">原价 ¥{{ pkg.oldPrice }}</div>
              <van-button type="primary" size="small" round @click="handleBuy(pkg)">立即订阅</van-button>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showConfirmDialog, showSuccessToast } from 'vant'

const activeTab = ref(0)

const packageGroups = ref([
  {
    type: 'food',
    label: '上门做饭',
    list: [
      { id: 1, name: '工作日晚餐包月', price: 1280, oldPrice: 1600, tag: '最受欢迎', features: ['周一至周五上门', '3菜1汤', '食材代购', '厨具清洁'] },
      { id: 2, name: '双休全餐周卡', price: 480, oldPrice: 600, tag: '周末特惠', features: ['周六日全天上门', '5菜1汤', '水果拼盘', '深度清洁'] }
    ]
  },
  {
    type: 'pet',
    label: '宠物照顾',
    list: [
      { id: 3, name: '猫咪居家托管', price: 600, oldPrice: 900, tag: '省心选', features: ['每天上门1次', '添粮/换水/铲屎', '陪玩15分钟', '视频反馈'] },
      { id: 4, name: '狗狗户外遛弯', price: 880, oldPrice: 1200, tag: '大户型', features: ['每天上门2次', '户外运动30分', '基础梳毛', '位置追踪'] }
    ]
  },
  {
    type: 'clean',
    label: '家庭保洁',
    list: [
      { id: 5, name: '周期保洁包月', price: 380, oldPrice: 480, tag: '划算', features: ['每周上门1次', '4小时深度清洁', '全屋除尘', '厨卫消毒'] }
    ]
  }
])

const handleBuy = (pkg) => {
  showConfirmDialog({
    title: '确认订阅',
    message: `您正在订阅【${pkg.name}】\n应付金额：¥${pkg.price}`,
  }).then(() => {
    showSuccessToast('订阅成功！')
  }).catch(() => {})
}
</script>

<style scoped>
.package-page { min-height: 100vh; background: #f7f8fa; }
.header-banner { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
  padding: 30px 20px; color: white; text-align: center;
}
.banner-title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
.banner-desc { font-size: 14px; opacity: 0.8; }

.package-list { padding: 15px; }
.package-card { 
  background: white; border-radius: 12px; padding: 20px; margin-bottom: 15px; 
  position: relative; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.card-tag { 
  position: absolute; top: 0; right: 0; background: #ee0a24; color: white; 
  font-size: 10px; padding: 2px 8px; border-radius: 0 0 0 8px;
}
.pkg-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; }
.pkg-name { font-size: 18px; font-weight: bold; color: #323233; }
.pkg-price { color: #ee0a24; }
.pkg-price .num { font-size: 24px; font-weight: bold; }
.pkg-price .unit { font-size: 12px; color: #969799; }

.pkg-content { margin-bottom: 20px; }
.feature-line { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #646566; margin-bottom: 8px; }

.pkg-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f2f3f5; pt: 15px; }
.old-price { font-size: 12px; color: #969799; text-decoration: line-through; }
</style>
