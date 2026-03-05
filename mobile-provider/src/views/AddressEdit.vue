<template>
  <div class="address-edit-page">
    <van-nav-bar
      title="设置常驻地址"
      left-arrow
      @click-left="$router.back()"
    />
    
    <div class="tip">此地址将用于计算接单距离，请如实填写</div>

    <van-address-edit
      :area-list="areaList"
      show-search-result
      :area-columns-num="3"
      @save="onSave"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { areaList } from '@vant/area-data'
import request from '@/utils/request'

const router = useRouter()

const onSave = async (content) => {
  try {
    const addressStr = `${content.province}${content.city}${content.county}${content.addressDetail}`
    await request.put('/providers/profile', {
      service_address: addressStr,
      city: content.city,
      // 如果有经纬度解析 logic 可以在此加入，目前主要同步地址文本
    })
    showSuccessToast('地址设置成功')
    setTimeout(() => router.back(), 1500)
  } catch (err) {
    console.error('保存地址失败:', err)
  }
}
</script>

<style scoped>
.tip { padding: 15px; font-size: 13px; color: #ed6a0c; background-color: #fffbe8; }
</style>

