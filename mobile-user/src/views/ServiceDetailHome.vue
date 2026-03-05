<template>
  <div class="detail-page">
    <van-loading v-if="loading" class="loading-wrapper" />
    
    <div v-else-if="service.id" class="content-fade-in">
      <!-- 1. 极简沉浸式封面 -->
      <div class="service-hero-premium">
        <van-image v-if="service.cover_image" :src="service.cover_image" fit="cover" width="100%" height="100%" class="hero-img" />
        <div v-else class="placeholder-hero-premium">{{ service.name ? service.name[0] : 'S' }}</div>
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
              <span class="category-tag">{{ categoryTag }}</span>
              <span class="rating-tag"><van-icon name="star" /> 4.9</span>
            </div>
          </div>
          <div class="price-section">
            <span class="price-symbol">¥</span>
            <span class="price-val">{{ service.base_price }}</span>
            <span class="price-unit">起</span>
          </div>
        </div>
        <div class="service-desc-v2">{{ service.description }}</div>
        <div class="sales-info-v2">{{ salesInfo }}</div>
      </div>

      <div class="selection-section-premium shadow-card" v-if="!isNursingVisit">
        <div class="section-header-v2">
          <div class="header-indicator"></div>
          <span class="header-text">自由点菜 (大厨上门)</span>
        </div>
        
        <div class="dish-grid-v2">
          <div v-for="item in priceItems" :key="item.label" class="dish-card-v2">
            <div class="dc-info">
              <div class="dc-name">{{ item.label }}</div>
              <div class="dc-price">¥{{ item.price }}/{{ item.unit || '道' }}</div>
            </div>
            <van-stepper v-model="dishSelection[item.label]" theme="round" button-size="24" disable-input min="0" class="dc-stepper" />
          </div>
        </div>

        <div class="options-container-v2">
          <div class="opt-row-v2">
            <div class="opt-label">用餐人数</div>
            <div class="pill-group-v2">
              <div v-for="opt in dinersOptions" :key="opt.value" 
                class="pill-item-v2" :class="{ 'active': dinersCount === opt.value }"
                @click="dinersCount = opt.value"
              >{{ opt.text }}</div>
            </div>
          </div>
          
          <div class="opt-row-v2">
            <div class="opt-label">口味偏好</div>
            <div class="pill-group-v2">
              <div v-for="s in ['偏淡','适中','偏重']" :key="s" 
                class="pill-item-v2" :class="{ 'active': flavorPrefs.salt === s }"
                @click="flavorPrefs.salt = s"
              >{{ s }}</div>
            </div>
          </div>
        </div>

        <div class="shopping-glass-tile">
          <div class="sg-left">
            <div class="sg-icon"><van-icon name="shopping-cart-o" /></div>
            <div class="sg-content">
              <div class="sg-title">代买食材</div>
              <div class="sg-desc">代买费 ¥{{ shoppingFeePerDish }}/道，实报实销</div>
            </div>
          </div>
          <van-switch v-model="needShopping" size="20" active-color="#11998e" />
        </div>
      </div>

      <div class="selection-section-premium shadow-card" v-else>
        <div class="section-header-v2">
          <div class="header-indicator medical"></div>
          <span class="header-text">养老院探访定制</span>
        </div>

        <div class="options-container-v2">
          <div class="opt-row-v2" v-if="visitPackages.length > 0">
            <div class="opt-label">探访时长</div>
            <div class="pill-group-v2">
              <div v-for="item in visitPackages" :key="item.label"
                class="pill-item-v2" :class="{ 'active': selectedVisitPackage?.label === item.label }"
                @click="selectedVisitPackage = item"
              >{{ item.label }}</div>
            </div>
          </div>

          <div class="opt-row-v2">
            <div class="opt-label">老人信息</div>
            <div class="visit-input-grid">
              <van-field v-model="elderName" placeholder="老人姓名" class="visit-field" />
              <van-field v-model="elderAge" type="number" placeholder="年龄" class="visit-field" />
            </div>
            <div class="pill-group-v2">
              <div v-for="g in ['男','女']" :key="g"
                class="pill-item-v2" :class="{ 'active': elderGender === g }"
                @click="elderGender = g"
              >{{ g }}</div>
            </div>
          </div>

          <div class="opt-row-v2">
            <div class="opt-label">与老人关系</div>
            <div class="pill-group-v2">
              <div v-for="r in ['子女','亲属','朋友','监护人']" :key="r"
                class="pill-item-v2" :class="{ 'active': relation === r }"
                @click="relation = r"
              >{{ r }}</div>
            </div>
          </div>

          <div class="opt-row-v2">
            <div class="opt-label">养老院名称</div>
            <van-field v-model="nursingHomeName" placeholder="请输入养老院名称" class="visit-field-full" />
          </div>

          <div class="opt-row-v2">
            <div class="opt-label">探访重点</div>
            <div class="pill-group-v2">
              <div v-for="tag in ['情绪状态','饮食情况','卫生环境','同住关系','物品安全']" :key="tag"
                class="pill-item-v2" :class="{ 'active': visitFocus.includes(tag) }"
                @click="toggleVisitFocus(tag)"
              >{{ tag }}</div>
            </div>
          </div>

          <div class="opt-row-v2">
            <div class="opt-label">输出方式</div>
            <div class="pill-group-v2">
              <div class="pill-item-v2" :class="{ 'active': needPhotoReport }" @click="needPhotoReport = !needPhotoReport">图文记录</div>
              <div class="pill-item-v2" :class="{ 'active': needVideoReport }" @click="needVideoReport = !needVideoReport">短视频</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. 底部悬浮动作条 (玻璃拟态) -->
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
          :disabled="Number(totalOrderPrice) < 80"
          @click="openOrderPopup"
        >
          立即预约
        </van-button>
      </div>

      <div class="bottom-spacer-v2"></div>
    </div>

    <!-- 确认预约弹窗 (极简质感) -->
    <van-popup v-model:show="showOrderPopup" position="bottom" round class="premium-confirm-popup">
      <div class="confirm-v2-wrapper">
        <div class="confirm-v2-header">
          <div class="c-v2-title">确认预约信息</div>
          <div class="c-v2-subtitle">请核对服务详情，确保信息准确</div>
        </div>
        
        <div class="confirm-v2-body">
          <div class="info-tile-group">
            <div class="info-tile">
              <span class="it-label">服务项目</span>
              <span class="it-val">{{ service?.name }}</span>
            </div>
            
            <div class="info-tile clickable" @click="showAddressSelect = true">
              <span class="it-label">服务地址</span>
              <div class="it-val-wrap">
                <span class="it-val ellipsis-1">{{ selectedAddress ? selectedAddress.address : '点击选择服务地址' }}</span>
                <van-icon name="arrow" />
              </div>
            </div>

            <div class="info-tile" v-if="isNursingVisit">
              <span class="it-label">养老院名称</span>
              <span class="it-val">{{ nursingHomeName || '未填写' }}</span>
            </div>

            <div class="info-tile" v-if="isNursingVisit">
              <span class="it-label">老人信息</span>
              <span class="it-val">{{ elderName || '未填写' }}{{ elderAge ? ` · ${elderAge}岁` : '' }}{{ elderGender ? ` · ${elderGender}` : '' }}</span>
            </div>

            <div class="info-tile" v-if="isNursingVisit && selectedVisitPackage">
              <span class="it-label">探访时长</span>
              <span class="it-val">{{ selectedVisitPackage.label }}</span>
            </div>

            <div class="info-tile" v-if="isNursingVisit && visitFocus.length">
              <span class="it-label">探访重点</span>
              <span class="it-val">{{ visitFocus.join('、') }}</span>
            </div>

            <div class="info-tile clickable" @click="showDateTimePicker = true">
              <span class="it-label">预约时间</span>
              <div class="it-val-wrap">
                <span class="it-val" :class="{ 'text-error': !isTimeValid }">{{ serviceTimeDisplay }}</span>
                <van-icon name="arrow" />
              </div>
            </div>
          </div>

          <div class="remark-tile-v2">
            <div class="rt-header"><van-icon name="edit" /> 备注需求</div>
            <van-field
              v-model="remark"
              rows="2"
              autosize
              type="textarea"
              maxlength="100"
              placeholder="如有特殊口味或进门要求请备注..."
              show-word-limit
              class="rt-field"
            />
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

    <!-- 地址选择 (极简列表) -->
    <van-popup v-model:show="showAddressSelect" position="bottom" round class="address-popup-v2">
      <div class="address-v2-container">
        <div class="address-v2-header">选择服务地址</div>
        <div class="address-v2-list">
          <div v-for="addr in addressList" :key="addr.id" 
            class="address-v2-card" :class="{ 'active': selectedAddress?.id === addr.id }"
            @click="selectAddress(addr)"
          >
            <div class="av2-info">
              <div class="av2-user">{{ addr.name }} <span class="av2-tel">{{ addr.tel }}</span></div>
              <div class="av2-detail">{{ addr.address }}</div>
            </div>
            <van-icon v-if="selectedAddress?.id === addr.id" name="success" class="av2-check" />
          </div>
          <van-empty v-if="addressList.length === 0" description="暂无地址，请先添加" />
        </div>
        <!-- 新增地址动作条 -->
        <div class="address-v2-footer">
          <van-button block round class="add-address-btn-v2" icon="plus" @click="$router.push('/address-edit')">
            新增服务地址
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 时间选择 (极简双栏) -->
    <van-popup v-model:show="showDateTimePicker" position="bottom" round class="time-popup-v2">
      <div class="time-v2-wrapper">
        <div class="time-v2-header">
          <div class="t-v2-title">选择服务时间</div>
          <div class="t-v2-subtitle">请选择师傅上门的预计时段</div>
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
          <van-button block round class="time-v2-confirm" @click="confirmTimeSelection">确认时间</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request, { getServiceDetail, getAddresses, createOrder } from '../api'
import { showToast, showSuccessToast, showDialog } from 'vant'
import moment from 'moment'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const service = ref({})
const dishSelection = reactive({})
const dinersCount = ref(5)
const dinersOptions = [{ text: '1-5人', value: 5 }, { text: '6-10人', value: 10 }, { text: '10人+', value: 99 }]
const flavorPrefs = reactive({ salt: '适中', spicy: '微辣' })
const needShopping = ref(false)
const shoppingFeePerDish = ref(5) 
const nursingHomeName = ref('')
const elderName = ref('')
const elderAge = ref('')
const elderGender = ref('')
const relation = ref('')
const visitFocus = ref([])
const needPhotoReport = ref(true)
const needVideoReport = ref(false)
const selectedVisitPackage = ref(null)

const showOrderPopup = ref(false)
const showAddressSelect = ref(false)
const addressList = ref([])
const selectedAddress = ref(null)
const remark = ref('')
const orderLoading = ref(false)

const showDateTimePicker = ref(false)
const selectedDate = ref(moment().format('YYYY-MM-DD'))
const selectedTimeSlot = ref('')
const serviceTime = ref('')

const isNursingVisit = computed(() => {
  const name = service.value?.name || ''
  return name.includes('养老院') || name.includes('探访')
})

const categoryTag = computed(() => (isNursingVisit.value ? '陪伴照护' : '居家办事'))
const salesInfo = computed(() => (isNursingVisit.value ? '关怀探访 · 记录反馈 · 陪护保障' : `已售 ${service.value.sales_count} · 准时到达 · 专业大厨`))

const priceItems = computed(() => {
  const config = service.value?.price_config
  if (!config) return []
  if (Array.isArray(config)) return config
  if (typeof config === 'object') return [config]
  try {
    const parsed = JSON.parse(config)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (e) {
    return []
  }
})

const visitPackages = computed(() => priceItems.value)

const totalOrderPrice = computed(() => {
  let base = 0
  if (!service.value?.id) return '0.00'
  if (isNursingVisit.value) {
    const selected = selectedVisitPackage.value
    base = selected?.price ? Number(selected.price) : Number(service.value?.base_price || 0)
    return base.toFixed(2)
  }
  const items = priceItems.value
  
  if (items.length > 0) {
    base = items.reduce((sum, i) => {
      const count = dishSelection[i.label] || 0
      return sum + (count * i.price)
    }, 0)
    
    if (needShopping.value) {
      const totalDishes = Object.values(dishSelection).reduce((sum, count) => sum + count, 0)
      base += totalDishes * shoppingFeePerDish.value
    }
  } else {
    base = 0
  }
  return base.toFixed(2)
})

const isTimeValid = computed(() => {
  if (!serviceTime.value) return true 
  const fullDateTime = moment(`${selectedDate.value} ${serviceTime.value}`, 'YYYY-MM-DD HH:mm')
  return fullDateTime.isAfter(moment().add(4, 'hours'))
})

const isFormValid = computed(() => {
  if (!isTimeValid.value || !serviceTime.value || !selectedAddress.value || !selectedAddress.value.lat) return false
  if (!isNursingVisit.value) return true
  return nursingHomeName.value && elderName.value && relation.value
})

const serviceTimeDisplay = computed(() => {
  if (!serviceTime.value) return '点击选择时间'
  const datePart = moment(selectedDate.value).format('M/D')
  return `${datePart} ${serviceTime.value}`
})

const toggleVisitFocus = (tag) => {
  const idx = visitFocus.value.indexOf(tag)
  if (idx > -1) {
    visitFocus.value.splice(idx, 1)
  } else {
    visitFocus.value.push(tag)
  }
}

const loadConfigs = async () => {
  try {
    const res = await request.get('/system/configs/public')
    const configs = res.data || res
    if (configs.INGREDIENT_BUYING_FEE_PER_DISH) shoppingFeePerDish.value = parseFloat(configs.INGREDIENT_BUYING_FEE_PER_DISH)
  } catch (e) {}
}

const loadData = async () => {
  loading.value = true
  try {
    await loadConfigs()
    const res = await getServiceDetail(route.params.id)
    service.value = res || {}
    priceItems.value.forEach(item => {
      if (item.label && dishSelection[item.label] === undefined) {
        dishSelection[item.label] = 0
      }
    })
    if (isNursingVisit.value && visitPackages.value.length > 0 && !selectedVisitPackage.value) {
      selectedVisitPackage.value = visitPackages.value[0]
    }
  } catch (e) {
    service.value = {}
  }
  loading.value = false
}

const submitOrder = async () => {
  orderLoading.value = true
  try {
    // 核心加固：确保 flavorPrefs 等对象数据闭环，严禁空数组泄露
    const safeOptions = isNursingVisit.value ? {
      nursingHomeName: nursingHomeName.value,
      elderName: elderName.value,
      elderAge: elderAge.value,
      elderGender: elderGender.value,
      relation: relation.value,
      visitFocus: [...visitFocus.value],
      needPhotoReport: needPhotoReport.value,
      needVideoReport: needVideoReport.value,
      visitPackage: selectedVisitPackage.value?.label || null
    } : {
      ...dishSelection,
      dinersCount: dinersCount.value,
      flavorPrefs: { ...flavorPrefs },
      needShopping: needShopping.value
    }

    const orderData = {
      serviceId: service.value?.id,
      totalPrice: totalOrderPrice.value,
      serviceTime: `${selectedDate.value} ${serviceTime.value}`,
      remark: remark.value,
      needShopping: isNursingVisit.value ? 0 : (needShopping.value ? 1 : 0),
      addressId: selectedAddress.value?.id,
      city: selectedAddress.value?.city || '三亚市',
      serviceLatitude: selectedAddress.value?.lat,
      serviceLongitude: selectedAddress.value?.lng,
      serviceOptions: JSON.stringify(safeOptions)
    }
    const res = await createOrder(orderData)
    showSuccessToast('下单成功')
    router.push(`/order/${res.orderId}`)
  } catch (e) {
    const errorMsg = e.response?.data?.message || e.message || '下单失败'
    if (e.response?.status === 402) {
      showDialog({ title: '价格已更新', message: '价格已变动，请确认' }).then(() => loadData())
    } else {
      showToast(errorMsg)
    }
  }
  orderLoading.value = false
}

const loadAddresses = async () => {
  try {
    const data = await getAddresses()
    addressList.value = data.map(i => ({
      ...i,
      tel: i.contact_phone,
      name: i.contact_name,
      address: `${i.province}${i.city}${i.district}${i.address}`
    }))
    if (addressList.value.length > 0) {
      selectedAddress.value = addressList.value[0]
    }
  } catch (e) {}
}

const syncTempData = () => {
  const temp = localStorage.getItem('temp_selected_location')
  if (temp) {
    const loc = JSON.parse(temp)
    selectedAddress.value = { id: 'temp_' + Date.now(), name: '已选位置', tel: '', address: loc.address || loc.name, lat: loc.lat, lng: loc.lng }
    localStorage.removeItem('temp_selected_location'); showOrderPopup.value = true
  }
}

const confirmTimeSelection = () => {
  if (!selectedTimeSlot.value) return showToast('请选择时段')
  serviceTime.value = selectedTimeSlot.value
  showDateTimePicker.value = false
}

const selectAddress = (addr) => {
  selectedAddress.value = addr
  showAddressSelect.value = false
}

const openOrderPopup = () => {
  if (!localStorage.getItem('token')) return router.push('/login')
  loadAddresses()
  showOrderPopup.value = true
}

const dateOptions = computed(() => {
  const options = []
  const now = moment()
  const weekMap = { 'Mon': '周一', 'Tue': '周二', 'Wed': '周三', 'Thu': '周四', 'Fri': '周五', 'Sat': '周六', 'Sun': '周日' }
  for (let i = 0; i < 15; i++) {
    const d = now.clone().add(i, 'days')
    const weekEn = d.format('ddd')
    options.push({ 
      full: d.format('YYYY-MM-DD'), 
      day: d.format('D'), 
      month: d.format('M月'), 
      week: i === 0 ? '今天' : i === 1 ? '明天' : weekMap[weekEn] || weekEn,
      disabled: false
    })
  }
  return options
})

const dynamicTimeSlots = computed(() => {
  const now = moment()
  const slots = isNursingVisit.value ? [
    { label: '09:00', displayTime: '09:00', displayTag: '上午' },
    { label: '13:30', displayTime: '13:30', displayTag: '下午' },
    { label: '18:00', displayTime: '18:00', displayTag: '傍晚' }
  ] : [
    { label: '10:30', displayTime: '10:30', displayTag: '午餐' },
    { label: '16:30', displayTime: '16:30', displayTag: '晚餐' }
  ]
  return slots.map(s => {
    const slotStartTime = moment(`${selectedDate.value} ${s.label}`, 'YYYY-MM-DD HH:mm')
    const disabled = slotStartTime.isBefore(now.clone().add(4, 'hours'))
    return { ...s, disabled }
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

onMounted(() => { loadData(); syncTempData() })
</script>

<style scoped>
.detail-page { min-height: 100vh; background: #f8fafc; padding-bottom: 120px; }
.content-fade-in { animation: fadeIn 0.6s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.service-hero-premium { height: 320px; position: relative; overflow: hidden; }
.hero-img { width: 100%; height: 100%; transition: transform 0.8s ease; }
.placeholder-hero-premium { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%); font-size: 80px; font-weight: 900; color: #94a3b8; }
.hero-overlay-gradient { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(to top, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%); }
.nav-glass-bar { position: absolute; top: 44px; left: 0; right: 0; padding: 0 20px; display: flex; justify-content: space-between; z-index: 20; }
.glass-circle-btn { width: 40px; height: 40px; background: rgba(255,255,255,0.25); backdrop-filter: blur(12px); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.premium-info-card { margin: -40px 20px 20px; background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border-radius: 32px; padding: 28px 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); border: 1px solid rgba(255,255,255,0.8); position: relative; z-index: 30; }
.info-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.main-title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 8px; line-height: 1.2; letter-spacing: -0.5px; }
.tag-row { display: flex; gap: 8px; align-items: center; }
.category-tag { font-size: 12px; color: #11998e; background: #eefaf8; padding: 2px 10px; border-radius: 100px; font-weight: 700; }
.rating-tag { font-size: 12px; color: #f59e0b; font-weight: 700; display: flex; align-items: center; gap: 2px; }
.price-val { font-size: 32px; color: #ef4444; font-weight: 900; font-family: 'DIN Alternate'; }
.service-desc-v2 { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 16px; }
.sales-info-v2 { font-size: 12px; color: #94a3b8; font-weight: 600; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.selection-section-premium { margin: 0 20px 20px; padding: 24px 20px; background: white; border-radius: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.03); }
.section-header-v2 { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
.header-indicator { width: 4px; height: 18px; background: linear-gradient(to bottom, #11998e, #38ef7d); border-radius: 2px; }
.header-text { font-size: 18px; font-weight: 900; color: #0f172a; }
.dish-grid-v2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
.dish-card-v2 { background: #f8fafc; padding: 16px; border-radius: 20px; display: flex; flex-direction: column; gap: 12px; border: 1px solid transparent; transition: all 0.3s ease; }
.dish-card-v2:active { transform: scale(0.98); background: #f1f5f9; }
.dc-name { font-size: 15px; font-weight: 800; color: #1e293b; }
.dc-price { font-size: 12px; color: #94a3b8; font-weight: 600; }
.dc-stepper { align-self: flex-end; }
.options-container-v2 { display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px; }
.opt-label { font-size: 14px; font-weight: 800; color: #475569; margin-bottom: 12px; }
.pill-group-v2 { display: flex !important; gap: 10px !important; flex-wrap: nowrap !important; }
.pill-item-v2 { flex: 1 !important; height: 40px !important; display: flex !important; align-items: center !important; justify-content: center !important; background: #f1f5f9 !important; border-radius: 100px !important; font-size: 13px !important; color: #64748b !important; font-weight: 700 !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; border: 1px solid transparent !important; }
.pill-item-v2.active { background: #fff7ed !important; color: #c2410c !important; box-shadow: 0 4px 12px rgba(194, 65, 12, 0.08) !important; transform: translateY(-1px) !important; border: 1px solid #ffedd5 !important; }
.visit-input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.visit-field { background: #f8fafc !important; border-radius: 16px !important; padding: 10px 12px !important; }
.visit-field-full { background: #f8fafc !important; border-radius: 16px !important; padding: 10px 12px !important; }
.shopping-glass-tile { background: #f0fdfa; padding: 20px; border-radius: 24px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #ccfbf1; }
.sg-left { display: flex; align-items: center; gap: 16px; }
.sg-icon { width: 44px; height: 44px; background: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #11998e; font-size: 22px; box-shadow: 0 4px 12px rgba(17, 153, 142, 0.1); }
.sg-title { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
.sg-desc { font-size: 12px; color: #14b8a6; font-weight: 600; }
.floating-action-bar-v2 { position: fixed; bottom: calc(20px + env(safe-area-inset-bottom)); left: 20px; right: 20px; height: 84px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(24px); border-radius: 28px; display: flex; align-items: center; padding: 0 16px 0 28px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1); border: 1px solid rgba(255, 255, 255, 0.8); z-index: 100; animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.fab-price-area { flex: 1; }
.fab-label { font-size: 12px; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
.fab-main { color: #ef4444; display: flex; align-items: baseline; }
.fab-symbol { font-size: 16px; font-weight: 800; margin-right: 2px; }
.fab-val { font-size: 28px; font-weight: 900; font-family: 'DIN Alternate'; }
.fab-book-btn { width: 140px; height: 56px !important; background: #0f172a !important; border: 1px solid rgba(255,255,255,0.1) !important; font-weight: 800; font-size: 16px; color: #fff !important; border-radius: 20px !important; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2) !important; }
.fab-book-btn.van-button--disabled { background: #94a3b8 !important; border: none !important; box-shadow: none !important; opacity: 0.6; }
.fab-book-btn:active { transform: scale(0.96); background: #1e293b !important; }
.premium-confirm-popup { border-radius: 36px 32px 0 0 !important; background: #f8fafc; }
.confirm-v2-wrapper { padding-bottom: calc(20px + env(safe-area-inset-bottom)); }
.confirm-v2-header { padding: 32px 24px 20px; text-align: center; background: white; border-radius: 32px 32px 0 0; }
.c-v2-title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
.c-v2-subtitle { font-size: 13px; color: #94a3b8; font-weight: 600; }
.info-tile-group { margin: 20px; background: white; border-radius: 28px; padding: 8px 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
.info-tile { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; border-bottom: 1px solid #f1f5f9; }
.info-tile:last-child { border-bottom: none; }
.it-label { font-size: 14px; color: #64748b; font-weight: 700; }
.it-val { font-size: 15px; font-weight: 800; color: #0f172a; text-align: right; }
.it-val-wrap { display: flex; align-items: center; gap: 4px; color: #0f172a; flex: 1; justify-content: flex-end; }
.clickable:active { opacity: 0.6; }
.remark-tile-v2 { margin: 0 20px 24px; background: white; border-radius: 28px; padding: 20px; }
.rt-header { font-size: 14px; font-weight: 800; color: #475569; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.rt-field { background: #f8fafc !important; border-radius: 16px; padding: 12px !important; }
.confirm-v2-footer { display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: white; border-top: 1px solid #f1f5f9; }
.footer-price { flex: 1; }
.fp-label { font-size: 12px; color: #94a3b8; font-weight: 700; }
.fp-main { font-size: 24px; font-weight: 900; color: #ef4444; font-family: 'DIN Alternate'; }
.footer-confirm-btn { height: 56px !important; background: #0f172a !important; border: none !important; font-weight: 800; font-size: 16px; border-radius: 20px !important; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2) !important; color: #ffffff !important; display: flex !important; align-items: center !important; justify-content: center !important; }
.address-popup-v2, .time-popup-v2 { border-radius: 32px 32px 0 0 !important; }
.address-v2-container, .time-v2-wrapper { padding: 28px 20px; }
.address-v2-header, .time-v2-header { text-align: center; margin-bottom: 24px; }
.t-v2-title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
.t-v2-subtitle { font-size: 13px; color: #94a3b8; font-weight: 600; }
.address-v2-card { background: #f8fafc; border-radius: 20px; padding: 20px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; border: 2px solid transparent; transition: all 0.2s; }
.address-v2-card.active { background: #eefaf8; border-color: #11998e; }
.av2-user { font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
.av2-tel { font-size: 13px; color: #64748b; font-weight: normal; margin-left: 8px; }
.av2-detail { font-size: 13px; color: #64748b; line-height: 1.4; }
.av2-check { color: #11998e; font-size: 20px; }
.address-v2-footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.add-address-btn-v2 { height: 52px !important; background: #f1f5f9 !important; color: #11998e !important; border: none !important; font-weight: 800; font-size: 15px; border-radius: 16px !important; }
.add-address-btn-v2:active { background: #e2e8f0 !important; }
.time-v2-content { display: flex; height: 400px; background: #f8fafc; border-radius: 24px; overflow: hidden; }
.time-v2-sidebar { width: 100px; background: #f1f5f9; overflow-y: auto; }
.date-v2-item { padding: 20px 12px; text-align: center; transition: all 0.2s; }
.date-v2-item.active { background: white; color: #11998e; }
.date-v2-item.disabled { opacity: 0.3; filter: grayscale(1); pointer-events: none; }
.dv2-week { font-size: 12px; font-weight: 800; color: #94a3b8; margin-bottom: 4px; }
.dv2-date-wrap { display: flex; flex-direction: column; line-height: 1.2; }
.dv2-month { font-size: 11px; color: #94a3b8; font-weight: 700; }
.dv2-day { font-size: 22px; font-weight: 900; color: #1e293b; font-family: 'DIN Alternate'; }
.time-v2-main { flex: 1; background: white; overflow-y: auto; padding: 16px; }
.time-v2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.slot-v2-card { background: #f8fafc; border-radius: 16px; padding: 16px; text-align: center; border: 2px solid transparent; transition: all 0.2s; }
.slot-v2-card.active { background: #eefaf8; border-color: #11998e; }
.slot-v2-card.disabled { opacity: 0.3; filter: grayscale(1); pointer-events: none; }
.sv2-time { font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom: 2px; }
.sv2-tag { font-size: 11px; color: #94a3b8; font-weight: 700; }
.time-v2-footer { margin-top: 24px; }
.time-v2-confirm { height: 56px !important; background: #0f172a !important; border: none !important; font-weight: 800; border-radius: 20px !important; color: #ffffff !important; }
.bottom-spacer-v2 { height: 120px; }
.ellipsis-1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-error { color: #ef4444 !important; }
</style>
