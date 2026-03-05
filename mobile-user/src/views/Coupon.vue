<template>
  <div class="coupon-page">
    <van-nav-bar title="优惠券中心" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <van-tabs v-model:active="activeTab" sticky offset-top="46px" color="#11998e">
      <van-tab title="可用 (3)" name="valid">
        <div class="coupon-list">
          <div v-for="i in 3" :key="i" class="coupon-item shadow-card">
            <div class="coupon-left">
              <div class="amount">
                <span class="unit">¥</span>
                <span class="num">{{ 10 * i }}</span>
              </div>
              <div class="condition">满{{ 50 * i }}可用</div>
            </div>
            
            <div class="coupon-middle">
              <div class="c-title van-ellipsis">{{ i === 1 ? '新用户专享券' : '通用服务满减券' }}</div>
              <div class="c-time">有效期至 2026.12.31</div>
              <div class="c-scope">全平台服务通用</div>
            </div>

            <div class="coupon-right">
              <van-button size="small" round type="primary" class="use-btn" @click="$router.push('/')">
                去使用
              </van-button>
            </div>

            <!-- 装饰性半圆 -->
            <div class="dot top"></div>
            <div class="dot bottom"></div>
          </div>
        </div>
      </van-tab>
      
      <van-tab title="已使用/过期" name="expired">
        <van-empty image="coupon" description="没有已失效的优惠券" />
      </van-tab>
    </van-tabs>

    <!-- 领券中心入口 -->
    <div class="get-more-wrap">
      <div class="get-more-card shadow-card" @click="showToast('更多优惠活动筹备中')">
        <div class="g-left">
          <van-icon name="gift-o" />
          <span>领券中心</span>
        </div>
        <div class="g-right">
          <span>更多好券等你拿</span>
          <van-icon name="arrow" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast } from 'vant'

const activeTab = ref('valid')
</script>

<style scoped>
.coupon-page { min-height: 100vh; background: #f7f8fa; }
.coupon-list { padding: 16px; }

.coupon-item {
  display: flex;
  background: white;
  border-radius: 16px;
  margin-bottom: 16px;
  height: 100px;
  position: relative;
  overflow: hidden;
  align-items: center;
}

.coupon-left {
  width: 100px;
  height: 100%;
  background: #eefaf8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #11998e;
  border-right: 1px dashed #b2dfdb;
}
.amount .unit { font-size: 14px; font-weight: bold; }
.amount .num { font-size: 32px; font-weight: 800; font-family: 'DIN Alternate'; }
.condition { font-size: 11px; opacity: 0.8; }

.coupon-middle {
  flex: 1;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}
.c-title { font-size: 15px; font-weight: bold; color: #323233; margin-bottom: 6px; }
.c-time { font-size: 11px; color: #969799; margin-bottom: 4px; }
.c-scope { font-size: 11px; color: #11998e; }

.coupon-right {
  padding-right: 16px;
}
.use-btn { border: none; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 0 15px; }

/* 装饰性打孔 */
.dot {
  position: absolute;
  left: 96px;
  width: 10px;
  height: 10px;
  background: #f7f8fa;
  border-radius: 50%;
  z-index: 2;
}
.dot.top { top: -5px; }
.dot.bottom { bottom: -5px; }

.get-more-wrap { padding: 0 16px 40px; }
.get-more-card {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 16px;
}
.g-left { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: bold; color: #323233; }
.g-left .van-icon { font-size: 20px; color: #ee0a24; }
.g-right { font-size: 12px; color: #969799; display: flex; align-items: center; gap: 4px; }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
