<template>
  <div class="detail-page">
    <van-loading v-if="loading" class="loading-wrapper" />
    
    <div v-else-if="service.id" class="content-fade-in">
      <!-- 1. 极简沉浸式封面 -->
      <div class="service-hero-premium">
        <van-image v-if="service.cover_image" :src="service.cover_image" fit="cover" width="100%" height="100%" class="hero-img" />
        <div v-else class="placeholder-hero-premium">{{ service.name ? service.name[0] : 'M' }}</div>
        <div class="hero-overlay-gradient"></div>
        <div class="nav-glass-bar">
          <div class="glass-circle-btn" @click="$router.back()"><van-icon name="arrow-left" /></div>
          <div class="glass-circle-btn" @click="handleShare"><van-icon name="share-o" /></div>
        </div>
      </div>

      <!-- 2. 质感服务信息卡片 -->
      <div class="premium-info-card">
        <div class="info-header">
          <div class="title-section">
            <h1 class="main-title">{{ service.name }}</h1>
            <div class="tag-row">
              <span class="category-tag medical">医疗陪护</span>
              <span class="rating-tag"><van-icon name="star" /> 5.0</span>
            </div>
          </div>
          <div class="price-section">
            <span class="price-symbol">¥</span>
            <span class="price-val">{{ service.base_price }}</span>
            <span class="price-unit">/次</span>
          </div>
        </div>
        <div class="service-desc-v2">{{ service.description }}</div>
        <div class="sales-info-v2">已护 1.2k+ · 专业陪诊员 · 隐私保护</div>
      </div>

      <!-- 3. 服务特色介绍 -->
      <div class="selection-section-premium shadow-card">
        <div class="section-header-v2">
          <div class="header-indicator medical"></div>
          <span class="header-text">服务承诺</span>
        </div>
        <div class="medical-features-grid">
          <div class="feature-item">
            <van-icon name="shield-o" class="f-icon" />
            <div class="f-text">实名认证</div>
          </div>
          <div class="feature-item">
            <van-icon name="clock-o" class="f-icon" />
            <div class="f-text">准时到达</div>
          </div>
          <div class="feature-item">
            <van-icon name="records-o" class="f-icon" />
            <div class="f-text">全程记录</div>
          </div>
          <div class="feature-item">
            <van-icon name="phone-o" class="f-icon" />
            <div class="f-text">隐私沟通</div>
          </div>
        </div>
      </div>

      <!-- 4. 底部悬浮动作条 -->
      <div class="floating-action-bar-v2">
        <div class="fab-price-area">
          <div class="fab-label">预估金额</div>
          <div class="fab-main">
            <span class="fab-symbol">¥</span>
            <span class="fab-val">{{ totalOrderPrice }}</span>
          </div>
        </div>
        <van-button 
          block 
          round 
          class="fab-book-btn" 
          @click="openOrderPopup"
        >
          立即预约
        </van-button>
      </div>

      <div class="bottom-spacer-v2"></div>
    </div>

    <!-- 确认预约弹窗 -->
    <van-popup v-model:show="showOrderPopup" position="bottom" round class="premium-confirm-popup">
      <div class="confirm-v2-wrapper">
        <div class="confirm-v2-header">
          <div class="c-v2-title">预约陪诊服务</div>
          <div class="c-v2-subtitle">请填写以下信息，以便为您安排最佳陪诊员</div>
        </div>
        
        <div class="confirm-v2-body">
          <div class="info-tile-group">
            <div class="info-tile">
              <span class="it-label">服务项目</span>
              <span class="it-val">{{ service?.name }}</span>
            </div>

            <!-- 就诊人选择 -->
            <div class="info-tile clickable" @click="showProfileSelect = true">
              <span class="it-label">就诊人</span>
              <div class="it-val-wrap">
                <span class="it-val" :class="{ 'placeholder': !selectedProfile }">
                  {{ selectedProfile ? selectedProfile.name : '点击选择就诊人' }}
                </span>
                <van-icon name="arrow" />
              </div>
            </div>

            <!-- 医院选择 -->
            <div class="info-tile clickable" @click="showHospitalPicker = true">
              <span class="it-label">就诊医院</span>
              <div class="it-val-wrap">
                <span class="it-val" :class="{ 'placeholder': !hospitalName }">
                  {{ hospitalName || '点击选择医院' }}
                </span>
                <van-icon name="arrow" />
              </div>
            </div>

            <!-- 时间选择 -->
            <div class="info-tile clickable" @click="showDateTimePicker = true">
              <span class="it-label">就诊时间</span>
              <div class="it-val-wrap">
                <span class="it-val" :class="{ 'placeholder': !serviceTime, 'text-error': !isTimeValid }">
                  {{ serviceTimeDisplay }}
                </span>
                <van-icon name="arrow" />
              </div>
            </div>
          </div>

          <!-- 联系信息 -->
          <div class="contact-tile-v2">
            <div class="ct-row">
              <span class="ct-label">联系人</span>
              <van-field v-model="contactName" placeholder="联系人姓名" class="ct-field" />
            </div>
            <div class="ct-row">
              <span class="ct-label">手机号</span>
              <van-field v-model="contactPhone" type="tel" placeholder="常用手机号" class="ct-field" />
            </div>
          </div>
        </div>

        <div class="confirm-v2-footer">
          <div class="footer-price">
            <span class="fp-label">实付预估</span>
            <div class="fp-main">¥<span class="fp-val">{{ totalOrderPrice }}</span></div>
          </div>
          <van-button round block class="footer-confirm-btn" :loading="orderLoading" :disabled="!isFormValid" @click="submitOrder">
            确认预约
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 档案选择 -->
    <van-popup v-model:show="showProfileSelect" position="bottom" round class="address-popup-v2">
      <div class="address-v2-container">
        <div class="address-v2-header-premium">
          <div class="avp-title">选择就诊人资料</div>
          <div class="avp-subtitle">请确保资料与身份证信息一致</div>
        </div>
        <div class="address-v2-list">
          <div v-for="item in profileList" :key="item.id" class="address-v2-card" :class="{ 'active': selectedProfile?.id === item.id }" @click="selectedProfile = item; showProfileSelect = false">
            <div class="av2-info">
              <div class="av2-user">{{ item.name }} <span class="av2-tel">{{ item.age }}岁</span></div>
              <div class="av2-detail">常用医院：{{ item.hospital_name || '未设' }}</div>
            </div>
            <van-icon v-if="selectedProfile?.id === item.id" name="success" class="av2-check medical" />
          </div>
        </div>
        <div class="popup-footer-v2">
          <van-button block round icon="plus" class="footer-action-btn" @click="$router.push('/patient-profile/edit')">创建新档案</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 医院选择器 -->
    <van-popup v-model:show="showHospitalPicker" position="bottom" round class="address-popup-v2">
      <div class="address-v2-container">
        <div class="address-v2-header-premium">
          <div class="avp-title">选择就诊医院</div>
          <div class="avp-subtitle">请选择您预约挂号所在的医院</div>
        </div>
        <div class="address-v2-list hospital-list">
          <div v-for="item in hospitalOptions" :key="item.value" 
            class="address-v2-card" :class="{ 'active': hospitalName === item.text }" 
            @click="hospitalName = item.text; serviceLatitude = item.lat; serviceLongitude = item.lng; showHospitalPicker = false" 
          >
            <div class="av2-info">
              <div class="av2-user">{{ item.text }}</div>
              <div class="av2-detail">三亚市专业医疗机构</div>
            </div>
            <van-icon v-if="hospitalName === item.text" name="success" class="av2-check medical" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 时间选择 -->
    <van-popup v-model:show="showDateTimePicker" position="bottom" round class="time-popup-v2">
      <div class="time-v2-wrapper">
        <div class="time-v2-header">
          <div class="t-v2-title">选择就诊时间</div>
          <div class="t-v2-subtitle">请根据挂号建议时间，选择陪诊时段</div>
        </div>
        <div class="time-v2-content">
          <div class="time-v2-sidebar">
            <div v-for="date in dateOptions" :key="date.full" 
              class="date-v2-item" :class="{ 'active': selectedDate === date.full, 'disabled': date.disabled }"
              @click="!date.disabled && (selectedDate = date.full)"
            >
              <div class="dv2-week">{{ date.week }}</div>
              <div class="dv2-date-wrap">
                <span class="dv2-month">{{ date.month }}</span>
                <span class="dv2-day">{{ date.day }}</span>
              </div>
            </div>
          </div>
          <div class="time-v2-main">
            <div class="time-v2-grid">
              <div v-for="slot in dynamicTimeSlots" :key="slot.label" 
                class="slot-v2-card" :class="{ 'active': selectedTimeSlot === slot.label, 'disabled': slot.disabled }"
                @click="!slot.disabled && (selectedTimeSlot = slot.label)"
              >
                <div class="sv2-time">{{ slot.displayTime }}</div>
                <div class="sv2-tag">{{ slot.displayTag }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="time-v2-footer">
          <van-button block round class="time-v2-confirm" @click="confirmTimeSelection">确认就诊时间</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request, { getServiceDetail, createOrder, getPatientProfiles } from '../api'
import { showToast, showSuccessToast, showDialog } from 'vant'
import moment from 'moment'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const service = ref({})
const profileList = ref([])
const selectedProfile = ref(null)
const hospitalName = ref('')
const serviceLatitude = ref(null)
const serviceLongitude = ref(null)
const hospitalOptions = [
  { text: '三亚中心医院', value: 1, lat: 18.252, lng: 109.512 },
  { text: '三亚市人民医院', value: 2, lat: 18.255, lng: 109.508 },
  { text: '三亚学院附属医院', value: 3, lat: 18.301, lng: 109.505 },
  { text: '解放军总医院三亚分院', value: 4, lat: 18.275, lng: 109.742 }
]
const contactName = ref('')
const contactPhone = ref('')
const showOrderPopup = ref(false)
const showProfileSelect = ref(false)
const showHospitalPicker = ref(false)
const showDateTimePicker = ref(false)
const selectedDate = ref(moment().format('YYYY-MM-DD'))
const selectedTimeSlot = ref('')
const serviceTime = ref('')
const orderLoading = ref(false)

const isTimeValid = computed(() => {
  if (!serviceTime.value) return true 
  const startTimeStr = serviceTime.value.split('-')[0].trim()
  const fullDateTime = moment(`${selectedDate.value} ${startTimeStr}`, 'YYYY-MM-DD HH:mm')
  const now = moment()
  const serviceId = parseInt(route.params.id)

  if (fullDateTime.isBefore(now.clone().add(4, 'hours'))) return false
  if (serviceId === 16 && fullDateTime.hour() < 12) {
    const deadline = fullDateTime.clone().subtract(1, 'days').hour(22).minute(0).second(0)
    if (now.isAfter(deadline)) return false
  }
  if (serviceId === 17 && fullDateTime.isSame(now, 'day')) return false
  if (serviceId === 18 && now.hour() >= 12 && fullDateTime.isSame(now, 'day')) return false

  return true
})

const totalOrderPrice = computed(() => parseFloat(service.value?.base_price || 0).toFixed(2))
const isFormValid = computed(() => isTimeValid.value && selectedProfile.value && hospitalName.value && contactPhone.value && serviceTime.value)

const serviceTimeDisplay = computed(() => {
  if (!serviceTime.value) return '点击选择时间'
  const datePart = moment(selectedDate.value).format('M/D')
  return `${datePart} ${serviceTime.value}`
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await getServiceDetail(route.params.id)
    service.value = res || {}
    const profiles = await getPatientProfiles()
    profileList.value = profiles
    if (profileList.value.length === 1) {
      selectedProfile.value = profileList.value[0]
      contactName.value = selectedProfile.value.name
    }
  } catch (e) {
    service.value = {}
  }
  loading.value = false
}

const submitOrder = async () => {
  orderLoading.value = true
  try {
    // 核心加固：陪诊专项数据闭环
    const safeOptions = {
      patientName: selectedProfile.value?.name,
      patientAge: selectedProfile.value?.age,
      patientGender: selectedProfile.value?.gender,
      patientTags: selectedProfile.value?.tags,
      patientRemarks: selectedProfile.value?.remarks,
      hospitalName: hospitalName.value,
      contactName: contactName.value,
      contactPhone: contactPhone.value
    }

    const orderData = {
      serviceId: service.value?.id,
      totalPrice: totalOrderPrice.value,
      serviceTime: `${selectedDate.value} ${serviceTime.value.split('-')[0].trim()}`,
      patientProfileId: selectedProfile.value.id, // 核心：补充档案ID
      patientName: selectedProfile.value.name,
      patientGender: selectedProfile.value.gender,
      patientAge: selectedProfile.value.age,
      patientTags: selectedProfile.value.tags,
      medicalNotes: selectedProfile.value.remarks, // 将档案备注作为初始陪诊笔记
      hospitalName: hospitalName.value,
      contactName: contactName.value,
      contactPhone: contactPhone.value,
      city: '三亚市',
      serviceLatitude: serviceLatitude.value,
      serviceLongitude: serviceLongitude.value,
      serviceOptions: JSON.stringify(safeOptions)
    }
    const res = await createOrder(orderData)
    showSuccessToast('下单成功'); router.push(`/order/${res.orderId}`)
  } catch (e) {
    const errorMsg = e.response?.data?.message || e.message || '下单失败'
    showToast(errorMsg)
  }
  orderLoading.value = false
}

const confirmTimeSelection = () => { 
  if (!selectedTimeSlot.value) return showToast('请选择时间段')
  serviceTime.value = selectedTimeSlot.value
  showDateTimePicker.value = false 
}

const openOrderPopup = () => { 
  if (!localStorage.getItem('token')) return router.push('/login')
  showOrderPopup.value = true 
}

const handleShare = () => showToast('功能开发中')

const dateOptions = computed(() => {
  const options = []
  const now = moment()
  const weekMap = { 'Mon': '周一', 'Tue': '周二', 'Wed': '周三', 'Thu': '周四', 'Fri': '周五', 'Sat': '周六', 'Sun': '周日' }
  const serviceId = parseInt(route.params.id)

  for (let i = 0; i < 30; i++) {
    const d = now.clone().add(i, 'days')
    const weekEn = d.format('ddd')
    const dateStr = d.format('YYYY-MM-DD')
    
    let disabled = false
    if (serviceId === 17 && i === 0) disabled = true
    if (serviceId === 18 && i === 0 && now.hour() >= 12) disabled = true

    options.push({ 
      full: dateStr, 
      day: d.format('D'), 
      month: d.format('M月'), 
      week: i === 0 ? '今天' : i === 1 ? '明天' : weekMap[weekEn] || weekEn,
      disabled
    })
  }
  return options
})

watch(() => dateOptions.value, (newOptions) => {
  if (newOptions && newOptions.length > 0) {
    const current = newOptions.find(o => o.full === selectedDate.value)
    if (!current || current.disabled) {
      const nextAvailable = newOptions.find(o => !o.disabled)
      if (nextAvailable) selectedDate.value = nextAvailable.full
    }
  }
}, { immediate: true })

const dynamicTimeSlots = computed(() => {
  const now = moment()
  const serviceId = parseInt(route.params.id)
  
  let slots = []
  if (serviceId === 16) {
    slots = [
      { label: '08:00 - 12:00', start: '08:00', displayTag: '上午号' },
      { label: '09:00 - 13:00', start: '09:00', displayTag: '上午号' },
      { label: '10:00 - 14:00', start: '10:00', displayTag: '午间号' },
      { label: '13:30 - 17:30', start: '13:30', displayTag: '下午号 (末班)' }
    ]
  } else if (serviceId === 17) {
    slots = [
      { label: '08:00 - 16:00', start: '08:00', displayTag: '全天场' },
      { label: '09:00 - 17:00', start: '09:00', displayTag: '全天场' }
    ]
  } else {
    slots = [
      { label: '08:30 - 09:30', start: '08:30', displayTag: '早间' },
      { label: '10:30 - 11:30', start: '10:30', displayTag: '上午' },
      { label: '14:30 - 15:30', start: '14:30', displayTag: '下午' },
      { label: '16:30 - 17:30', start: '16:30', displayTag: '傍晚' }
    ]
  }

  return slots.map(s => {
    const slotStartTime = moment(`${selectedDate.value} ${s.start}`, 'YYYY-MM-DD HH:mm')
    let disabled = false
    if (slotStartTime.isBefore(now.clone().add(4, 'hours'))) disabled = true
    if (!disabled && serviceId === 16) {
      const startHour = parseInt(s.start.split(':')[0])
      if (startHour < 12) {
        const deadline = slotStartTime.clone().subtract(1, 'days').hour(22).minute(0).second(0)
        if (now.isAfter(deadline)) disabled = true
      }
    }
    return { ...s, displayTime: s.label, disabled }
  })
})

watch(selectedDate, () => {
  const currentSlot = dynamicTimeSlots.value.find(s => s.label === selectedTimeSlot.value)
  if (!currentSlot || currentSlot.disabled) {
    selectedTimeSlot.value = ''
    serviceTime.value = ''
    const firstAvailable = dynamicTimeSlots.value.find(s => !s.disabled)
    if (firstAvailable) selectedTimeSlot.value = firstAvailable.label
  }
})

onMounted(loadData)
</script>

<style scoped>
.detail-page { min-height: 100vh; background: #f8fafc; padding-bottom: 120px; }
.content-fade-in { animation: fadeIn 0.6s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.service-hero-premium { height: 320px; position: relative; overflow: hidden; }
.hero-img { width: 100%; height: 100%; transition: transform 0.8s ease; }
.placeholder-hero-premium { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); font-size: 80px; font-weight: 900; color: rgba(255,255,255,0.2); }
.hero-overlay-gradient { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(to top, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%); }
.nav-glass-bar { position: absolute; top: 44px; left: 0; right: 0; padding: 0 20px; display: flex; justify-content: space-between; z-index: 20; }
.glass-circle-btn { width: 40px; height: 40px; background: rgba(255,255,255,0.25); backdrop-filter: blur(12px); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; border: 1px solid rgba(255,255,255,0.2); }
.premium-info-card { margin: -40px 20px 20px; background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border-radius: 32px; padding: 28px 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); border: 1px solid rgba(255,255,255,0.8); position: relative; z-index: 30; }
.info-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.main-title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 8px; line-height: 1.2; letter-spacing: -0.5px; }
.category-tag.medical { color: #4f46e5; background: #eef2ff; font-size: 12px; padding: 2px 10px; border-radius: 100px; font-weight: 700; }
.rating-tag { font-size: 12px; color: #f59e0b; font-weight: 700; display: flex; align-items: center; gap: 2px; }
.price-val { font-size: 32px; color: #ef4444; font-weight: 900; font-family: 'DIN Alternate'; }
.service-desc-v2 { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 16px; }
.sales-info-v2 { font-size: 12px; color: #94a3b8; font-weight: 600; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.selection-section-premium { margin: 0 20px 20px; padding: 24px 20px; background: white; border-radius: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.03); }
.section-header-v2 { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
.header-indicator.medical { width: 4px; height: 18px; background: #4f46e5; border-radius: 2px; }
.header-text { font-size: 18px; font-weight: 900; color: #0f172a; }
.medical-features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.feature-item { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.f-icon { font-size: 24px; color: #4f46e5; background: #eef2ff; width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
.f-text { font-size: 11px; color: #64748b; font-weight: 700; }
.floating-action-bar-v2 { position: fixed; bottom: calc(20px + env(safe-area-inset-bottom)); left: 20px; right: 20px; height: 84px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(24px); border-radius: 28px; display: flex; align-items: center; padding: 0 16px 0 28px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1); border: 1px solid rgba(255, 255, 255, 0.8); z-index: 100; animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.fab-price-area { flex: 1; }
.fab-label { font-size: 12px; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
.fab-main { color: #ef4444; display: flex; align-items: baseline; }
.fab-symbol { font-size: 16px; font-weight: 800; margin-right: 2px; }
.fab-val { font-size: 28px; font-weight: 900; font-family: 'DIN Alternate'; }
.fab-book-btn { width: 140px; height: 56px !important; background: #0f172a !important; border: 1px solid rgba(255,255,255,0.1) !important; font-weight: 800; font-size: 16px; color: #fff !important; border-radius: 20px !important; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2) !important; }
.premium-confirm-popup { border-radius: 36px 32px 0 0 !important; background: #f8fafc; }
.confirm-v2-wrapper { padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.confirm-v2-header { padding: 32px 24px 20px; text-align: center; background: white; border-radius: 32px 32px 0 0; }
.c-v2-title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
.c-v2-subtitle { font-size: 13px; color: #94a3b8; font-weight: 600; }
.info-tile-group { margin: 20px; background: white; border-radius: 28px; padding: 8px 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.info-tile { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid #f1f5f9; }
.info-tile:last-child { border-bottom: none; }
.it-label { font-size: 14px; color: #64748b; font-weight: 700; min-width: 80px; }
.it-val { font-size: 15px; font-weight: 800; color: #0f172a; text-align: right; }
.it-val.placeholder { color: #cbd5e1; font-weight: 600; }
.it-val-wrap { display: flex; align-items: center; gap: 4px; color: #0f172a; flex: 1; justify-content: flex-end; }
.clickable:active { opacity: 0.6; }
.contact-tile-v2 { margin: 0 20px 24px; background: white; border-radius: 28px; padding: 8px 20px; }
.ct-row { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; }
.ct-row:last-child { border-bottom: none; }
.ct-label { font-size: 14px; color: #64748b; font-weight: 700; width: 80px; }
.ct-field :deep(.van-field__control) { text-align: right; font-weight: 800; color: #0f172a; }
.confirm-v2-footer { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: white; border-top: 1px solid #f1f5f9; }
.footer-price { flex: 1; }
.fp-label { font-size: 12px; color: #94a3b8; font-weight: 700; }
.fp-main { font-size: 24px; font-weight: 900; color: #ef4444; font-family: 'DIN Alternate'; }
.footer-confirm-btn { background: #0f172a !important; height: 56px !important; border-radius: 20px !important; font-weight: 800; color: #ffffff !important; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2) !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 16px !important; }
.address-popup-v2, .time-popup-v2 { border-radius: 36px 36px 0 0 !important; }
.address-v2-container, .time-v2-wrapper { padding: 32px 20px; }
.address-v2-header-premium { text-align: center; margin-bottom: 24px; }
.avp-title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
.avp-subtitle { font-size: 13px; color: #94a3b8; font-weight: 600; }
.address-v2-card { background: #f8fafc; border-radius: 24px; padding: 20px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; border: 2px solid transparent; transition: all 0.2s; }
.address-v2-card.active { background: #f0f9ff; border-color: #0369a1; }
.av2-user { font-size: 15px; font-weight: 800; color: #1e293b; }
.av2-tel { font-size: 13px; color: #64748b; font-weight: normal; margin-left: 8px; }
.av2-detail { font-size: 13px; color: #64748b; line-height: 1.4; margin-top: 4px; }
.av2-check.medical { color: #4f46e5; }
.popup-footer-v2 { margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.footer-action-btn { height: 52px !important; background: #f1f5f9 !important; color: #4f46e5 !important; border: none !important; font-weight: 800; border-radius: 16px !important; }
.time-v2-content { display: flex; height: 420px; background: #f8fafc; border-radius: 32px; margin: 0 16px; overflow: hidden; border: 1px solid #f1f5f9; }
.time-v2-sidebar { width: 100px; background: #f1f5f9; overflow-y: auto; }
.date-v2-item { padding: 20px 12px; text-align: center; transition: all 0.3s; }
.date-v2-item.active { background: white; color: #4f46e5; border-left: 4px solid #4f46e5; }
.date-v2-item.disabled { opacity: 0.3; filter: grayscale(1); pointer-events: none; }
.dv2-week { font-size: 12px; font-weight: 800; color: #94a3b8; margin-bottom: 4px; }
.dv2-date-wrap { display: flex; flex-direction: column; line-height: 1.2; }
.dv2-month { font-size: 11px; color: #94a3b8; font-weight: 700; }
.dv2-day { font-size: 22px; font-weight: 900; color: #1e293b; font-family: 'DIN Alternate'; }
.time-v2-main { flex: 1; background: white; overflow-y: auto; padding: 24px 16px; }
.time-v2-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
.slot-v2-card { background: #f8fafc; border-radius: 20px; padding: 20px; text-align: center; border: 2px solid transparent; transition: all 0.3s; }
.slot-v2-card.active { background: #f0f9ff; border-color: #0369a1; color: #0369a1; }
.slot-v2-card.disabled { opacity: 0.3; filter: grayscale(1); pointer-events: none; }
.sv2-time { font-size: 18px; font-weight: 900; font-family: 'DIN Alternate'; }
.sv2-tag { font-size: 12px; font-weight: 700; opacity: 0.6; }
.time-v2-footer { padding: 24px 20px calc(24px + env(safe-area-inset-bottom)); background: white; }
.time-v2-confirm { background: #0f172a !important; height: 56px !important; border-radius: 20px !important; color: #ffffff !important; font-weight: 800; }
.bottom-spacer-v2 { height: 120px; }
.ellipsis-1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-error { color: #ef4444 !important; }
</style>
