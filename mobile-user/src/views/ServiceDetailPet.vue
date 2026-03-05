<template>
  <div class="detail-page">
    <van-loading v-if="loading" class="loading-wrapper" />
    
    <div v-else-if="service?.id" class="content-fade-in">
      <!-- 1. 极简沉浸式封面 -->
      <div class="service-hero-premium">
        <van-image v-if="service?.cover_image" :src="service.cover_image" fit="cover" width="100%" height="100%" class="hero-img" />
        <div v-else class="placeholder-hero-premium">{{ service?.name ? service.name[0] : 'P' }}</div>
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
            <h1 class="main-title">{{ service?.name }}</h1>
            <div class="tag-row">
              <span class="category-tag pet">宠物特护</span>
              <span class="rating-tag"><van-icon name="star" /> 4.9</span>
            </div>
          </div>
          <div class="price-section">
            <span class="price-symbol">¥</span>
            <span class="price-val">{{ service?.base_price }}</span>
            <span class="price-unit">起</span>
          </div>
        </div>
        <div class="service-desc-v2">{{ service?.description }}</div>
        <div class="sales-info-v2">已售 {{ service?.sales_count }} · 实时轨迹 · 宠物险覆盖</div>
      </div>

      <!-- 3. 宠物服务定制专区 -->
      <div class="selection-section-premium shadow-card">
        <div class="section-header-v2">
          <div class="header-indicator pet"></div>
          <span class="header-text">宠物特护服务定制</span>
        </div>
        
        <!-- 服务频次 (药丸风格) -->
        <div class="options-container-v2">
          <div class="opt-row-v2">
            <div class="opt-label">服务频次</div>
            <div class="pill-group-v2">
              <div v-for="opt in ['单次喂养', '定期周期']" :key="opt" 
                class="pill-item-v2" :class="{ 'active': serviceFrequency === opt }"
                @click="serviceFrequency = opt"
              >{{ opt }}</div>
            </div>
          </div>

          <!-- 服务时长 (网格风格) -->
          <div v-if="durationOptions.length > 0" class="opt-row-v2">
            <div class="opt-label">服务时长</div>
            <div class="duration-grid-v2">
              <div v-for="item in durationOptions" :key="item.label" 
                class="duration-card-v2" :class="{ 'active': selectedDurationLabel === item.label }"
                @click="selectedDurationLabel = item.label"
              >
                <div class="dv2-label">{{ item.label }}</div>
                <div class="dv2-price">¥{{ item.price }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 附加项列表 (含性格、健康、交接等逻辑) -->
        <div class="extra-items-list" v-if="extraPriceItems.length > 0">
          <!-- 遛狗专项：手动插入“加一只中小型犬”逻辑项 (移动到最上方) -->
          <div v-if="service?.id === 36" class="extra-item-row">
            <div class="ei-info">
              <div class="ei-name">加一只中小型犬</div>
              <div class="ei-price">¥15.00/只</div>
            </div>
            <van-stepper v-model="dishSelection['加一只中小型犬']" theme="round" button-size="24" disable-input min="0" />
          </div>

          <div v-for="item in extraPriceItems" :key="item.label" class="extra-item-row">
            <template v-if="service?.id === 36 && item.label.includes('大型犬')">
              <div class="ei-info">
                <div class="ei-name">加一只大型犬</div>
                <div class="ei-price">¥30.00/只</div>
              </div>
              <van-stepper v-model="dishSelection[item.label]" theme="round" button-size="24" disable-input min="0" />
            </template>
            <template v-else>
              <div class="ei-info">
                <div class="ei-name">{{ item.label }}</div>
                <div class="ei-price">¥{{ item.price }}/{{ item.unit || '项' }}</div>
              </div>
              <van-stepper v-model="dishSelection[item.label]" theme="round" button-size="24" disable-input min="0" @change="(val) => handleExtraItemChange(item.label, val)" />
            </template>
          </div>
        </div>

        <!-- 2. 性格与健康 (ID 37 专项：标签组) -->
        <div class="medical-options-v2" v-if="service?.id === 37">
          <div class="opt-group-v2">
            <div class="opt-label-v2">性格标签 (多选)</div>
            <div class="pill-grid-v2">
              <div v-for="tag in ['性格温顺','胆小怕人','活泼好动','社交牛杂','有攻击性','会开门']" 
                :key="tag" class="pill-item-v3" :class="{ 'active': personalityTags.includes(tag) }"
                @click="togglePersonality(tag)"
              >{{ tag }}</div>
            </div>
          </div>

          <div class="opt-group-v2">
            <div class="opt-label-v2">健康状态 (单选)</div>
            <div class="pill-grid-v2">
              <div v-for="tag in ['已接种疫苗','正在生病/服药','暂无疫苗']" 
                :key="tag" class="pill-item-v3" :class="{ 'active': healthStatus === tag }"
                @click="healthStatus = tag"
              >{{ tag }}</div>
            </div>
          </div>
        </div>

        <!-- 2.5 遛狗专项 (ID 36 专项) -->
        <div class="medical-options-v2" v-if="service?.id === 36">
          <div class="opt-group-v2">
            <div class="opt-label-v2">默认狗狗体型 (单选)</div>
            <div class="pill-grid-v2">
              <div v-for="tag in ['小型犬(10kg以下)','中型犬(10-25kg)','大型犬(25kg以上)']" 
                :key="tag" class="pill-item-v3" :class="{ 'active': dogSize === tag }"
                @click="handleDogSizeClick(tag)"
              >{{ tag }}</div>
            </div>
          </div>

          <div class="opt-group-v2">
            <div class="opt-label-v2">性格/行为标签 (多选)</div>
            <div class="pill-grid-v2">
              <div v-for="tag in ['性格温顺','爆冲倾向','对狗不友好','草丛爱好者','不捡球','已绝育']" 
                :key="tag" class="pill-item-v3" :class="{ 'active': personalityTags.includes(tag) }"
                @click="togglePersonality(tag)"
              >{{ tag }}</div>
            </div>
          </div>

          <div class="opt-group-v2">
            <div class="opt-label-v2">健康提醒 (单选)</div>
            <div class="pill-grid-v2">
              <div v-for="tag in ['已驱虫/疫苗','正在生病','发情期']" 
                :key="tag" class="pill-item-v3" :class="{ 'active': healthStatus === tag }"
                @click="healthStatus = tag"
              >{{ tag }}</div>
            </div>
          </div>
        </div>

        <!-- 3. 钥匙与环境 (ID 37 / ID 36 专项) -->
        <div class="security-options-v2" v-if="service?.id === 37 || service?.id === 36">
          <div class="opt-group-v2">
            <div class="opt-label-v2">钥匙交接 (必选)</div>
            <div class="pill-grid-v2">
              <div v-for="tag in ['密码锁','存放物业','快递寄送','师傅上门取(付费)']" 
                :key="tag" class="pill-item-v3" :class="{ 'active': keyHandover === tag }"
                @click="keyHandover = tag"
              >{{ tag }}</div>
            </div>
          </div>

          <div class="switch-group-v2">
            <!-- 遛狗专项：牵引要求 -->
            <div class="switch-item-v2" v-if="service?.id === 36">
              <span>自带牵引绳 (不带则师傅提供+5元)</span>
              <van-switch v-model="ownLeash" size="18" active-color="#7c3aed" />
            </div>
            <div class="switch-item-v2" v-if="service?.id === 37">
              <span>家中有摄像头</span>
              <van-switch v-model="hasCamera" size="18" active-color="#7c3aed" />
            </div>
            <div class="switch-item-v2" v-if="service?.id === 37">
              <span>需要代扔垃圾</span>
              <van-switch v-model="needTrash" size="18" active-color="#7c3aed" />
            </div>
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
          :disabled="!keyHandover"
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

            <div class="info-tile clickable" @click="isPeriodOrder ? (showCalendarRange = true) : (showDateTimePicker = true)">
              <span class="it-label">预约时间</span>
              <div class="it-val-wrap">
                <span class="it-val" :class="{ 'text-error': !isTimeValid }">{{ serviceTimeDisplay }}</span>
                <van-icon name="arrow" />
              </div>
            </div>

            <!-- 服务人员选择 (已移除) -->
            <!-- <div class="info-tile clickable" @click="fetchAvailableProviders">
              <span class="it-label">服务人员</span>
              <div class="it-val-wrap">
                <span v-if="selectedProvider" class="it-val-provider">
                  <van-image round width="20" height="20" :src="selectedProvider.avatar" />
                  <span class="p-name">{{ selectedProvider.nickname }}</span>
                </span>
                <span v-else class="it-val">请选择服务人员</span>
                <van-icon name="arrow" />
              </div>
            </div> -->
          </div>

          <div class="remark-tile-v2">
            <div class="rt-header"><van-icon name="edit" /> {{ [36, 37].includes(service?.id) ? '环境指引与备注' : '备注需求' }}</div>
            <van-field v-model="remark" rows="2" autosize type="textarea" maxlength="100" :placeholder="service?.id === 37 ? '请简述猫粮、水盆、砂盆的具体位置及禁忌房间。' : (service?.id === 36 ? '请备注狗狗性格及特殊要求' : '备注特殊要求...')" show-word-limit class="rt-field" />
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

    <van-calendar v-model:show="showCalendarRange" type="range" color="#7c3aed" :min-date="minDate" @confirm="onCalendarRangeConfirm" />
    
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

    <!-- 地址选择 -->
    <van-popup v-model:show="showAddressSelect" position="bottom" round class="address-popup-v2">
      <div class="address-v2-container">
        <div class="address-v2-header">选择服务地址</div>
        <div class="address-v2-list">
          <div v-for="addr in addressList" :key="addr.id" class="address-v2-card" :class="{ 'active': selectedAddress?.id === addr.id }" @click="selectAddress(addr)">
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

    <!-- 服务者选择 -->
    <van-popup v-model:show="showProviderSelect" position="bottom" round class="provider-popup-v2">
      <div class="provider-v2-container">
        <div class="provider-v2-header">
          <div class="p-v2-title">选择服务人员</div>
          <div class="p-v2-subtitle">优先展示距离近、评分高的师傅</div>
        </div>
        <div class="provider-v2-list">
          <!-- 选项1：系统分配 (已移除) -->
          <!-- <div class="provider-v2-card" :class="{ 'active': !selectedProvider }" @click="selectProvider(null)">
            <div class="pv2-avatar-wrap">
              <div class="pv2-system-avatar"><van-icon name="friends-o" /></div>
            </div>
            <div class="pv2-info">
              <div class="pv2-name">系统自动分配</div>
              <div class="pv2-desc">分配最合适的师傅，响应最快</div>
            </div>
            <van-icon v-if="!selectedProvider" name="success" class="pv2-check" />
          </div> -->

          <!-- 选项2：具体服务者 -->
          <div v-for="p in providerList" :key="p.id" class="provider-v2-card" :class="{ 'active': selectedProvider?.id === p.id }" @click="selectProvider(p)">
            <div class="pv2-avatar-wrap">
              <van-image round width="48" height="48" :src="p.avatar" class="pv2-avatar" />
              <div class="pv2-rating"><van-icon name="star" /> {{ p.rating }}</div>
            </div>
            <div class="pv2-info">
              <div class="pv2-name-row">
                <span class="pv2-name">{{ p.nickname }}</span>
                <span class="pv2-distance">{{ p.distance }}km</span>
              </div>
              <div class="pv2-stats">已服务 {{ p.order_count }} 次 · 宠物经验丰富</div>
              <div class="pv2-intro ellipsis-1">{{ p.introduction || '专业宠物特护，给爱宠最好的照顾' }}</div>
            </div>
            <van-icon v-if="selectedProvider?.id === p.id" name="success" class="pv2-check" />
          </div>
          
          <van-empty v-if="providerList.length === 0" description="附近暂无可用师傅" />
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
const serviceFrequency = ref('单次喂养')
const selectedDurationLabel = ref('')
const showOrderPopup = ref(false)
const showDateTimePicker = ref(false)
const showCalendarRange = ref(false)
const showAddressSelect = ref(false)
const addressList = ref([])
const selectedAddress = ref(null)
const showProviderSelect = ref(false)
const providerList = ref([])
const selectedProvider = ref(null)
const providerLoading = ref(false)
const selectedDate = ref(moment().format('YYYY-MM-DD'))
const selectedTimeSlot = ref('')
const selectedDateRange = ref([])
const serviceTime = ref('')
const orderLoading = ref(false)
const minDate = new Date()
const remark = ref('')

const catCount = ref(1)
const petAdditionalFee = ref(5) // 动态从配置读取
const dogSize = ref('')

const handleExtraItemChange = (label, val) => {
  if (label.includes('一只猫') || label.includes('一只狗') || label.includes('数量')) {
    catCount.value = 1 + parseInt(val || 0)
  }
}

const personalityTags = ref([])
const healthStatus = ref('')
const ownLeash = ref(true)
const specialInstructions = ref([])
const keyHandover = ref('')
const hasCamera = ref(false)
const needTrash = ref(false)

const togglePersonality = (tag) => {
  const idx = personalityTags.value.indexOf(tag)
  if (idx > -1) personalityTags.value.splice(idx, 1)
  else personalityTags.value.push(tag)
}

const handleDogSizeClick = (tag) => {
  dogSize.value = tag
  if (tag === '大型犬(25kg以上)') {
    showToast('大型犬需加收15元额外费')
  }
}

const toggleSpecialInstruction = (tag) => {
  const idx = specialInstructions.value.indexOf(tag)
  if (idx > -1) specialInstructions.value.splice(idx, 1)
  else specialInstructions.value.push(tag)
}

const isPeriodOrder = computed(() => serviceFrequency.value === '定期周期')

// 1. 健壮的价格配置解析逻辑 (空防御)
const priceItems = computed(() => {
  const config = service.value?.price_config
  if (!config) return []
  if (Array.isArray(config)) return config
  if (typeof config === 'object') return [config]
  try {
    const parsed = JSON.parse(config)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (e) { return [] }
})

const extraPriceItems = computed(() => priceItems.value.filter(i => i.label && !i.label.includes('分钟')))
const durationOptions = computed(() => priceItems.value.filter(i => i.label && i.label.includes('分钟')))

const isTimeValid = computed(() => {
  if (!serviceTime.value) return true 
  const startTime = serviceTime.value.split('-')[0].trim()
  const fullDateTime = moment(`${selectedDate.value} ${startTime}`, 'YYYY-MM-DD HH:mm')
  const now = moment()
  const serviceId = parseInt(route.params.id)

  // 全业务统一 4 小时缓冲
  if (fullDateTime.isBefore(now.clone().add(4, 'hours'))) return false
  if ([36, 37].includes(serviceId) && fullDateTime.isSame(now, 'day')) return false

  return true
})

const totalOrderPrice = computed(() => {
  let base = 0
  if (!service.value?.id) return '0.00'
  
  const items = priceItems.value
  const durationItem = items.find(item => item.label === selectedDurationLabel.value)
  const basePrice = durationItem ? durationItem.price : (service.value?.base_price || 0)
  let additionalPrice = 0
  
  // 核心：增加 .value 修复 TypeError 报错
  extraPriceItems.value.forEach(item => { 
    if (service.value?.id === 36 && item.label.includes('大型犬')) {
      additionalPrice += (dishSelection[item.label] || 0) * 30
    } else {
      additionalPrice += (dishSelection[item.label] || 0) * item.price 
    }
  })

  // 遛狗专项：手动计算“加一只中小型犬”
  if (service.value?.id === 36) {
    additionalPrice += (dishSelection['加一只中小型犬'] || 0) * 15
  }
  
  if (service.value?.id === 36 && !ownLeash.value) {
    additionalPrice += 5
  }

  // 遛狗专项：大型犬加价 15 元
  if (service.value?.id === 36 && dogSize.value === '大型犬(25kg以上)') {
    additionalPrice += 15
  }

  // 修复计费锁死问题：狗狗数量增加时联动 PET_ADDITIONAL_FEE
  // 注意：此处不再重复累加 catCount 逻辑，因为 extraPriceItems 已经包含了 "增加一只猫" 的费用
  
  // 核心修复：前端计算逻辑必须与后端 PetOrderStrategy.js 完全对齐
  // 后端逻辑：extraCats = options['增加一只猫'] || 0; extra += extraCats * additionalFee;
  // 前端 totalOrderPrice 已经通过遍历 extraPriceItems 累加了 (dishSelection['增加一只猫'] * price)
  // 但是后端还会额外读取 options['增加一只猫'] 进行二次加价，导致金额校验失败。
  // 解决方案：前端 totalOrderPrice 保持现状，但在 submitOrder 时，确保传给后端的 options 结构正确。
  
  base = Number(basePrice) + additionalPrice
  if (isPeriodOrder.value && selectedDateRange.value.length === 2) {
    const days = Math.ceil((selectedDateRange.value[1] - selectedDateRange.value[0]) / (86400000)) + 1
    base = base * days
    if (days >= 7) base *= 0.9
  }
  return base.toFixed(2)
})

const isFormValid = computed(() => {
  // 1. 基础校验 (时间、服务时段、地址)
  const baseValid = isTimeValid.value && serviceTime.value && selectedAddress.value && selectedAddress.value.lat;
  
  // 2. 宠物专项校验 (ID 36 遛狗, 37 喂猫)
  if ([36, 37].includes(service.value?.id)) {
    // 钥匙交接是核心必选项
    return baseValid && !!keyHandover.value;
  }

  return baseValid;
});

const serviceTimeDisplay = computed(() => {
  if (!serviceTime.value) return '请选择时间'
  if (isPeriodOrder.value && selectedDateRange.value.length === 2) {
    const d1 = selectedDateRange.value[0]; const d2 = selectedDateRange.value[1]
    return `${d1.getMonth()+1}/${d1.getDate()} - ${d2.getMonth()+1}/${d2.getDate()}`
  }
  // 核心：强制重新计算日期展示，防止 UI 不同步
  const dateObj = moment(selectedDate.value)
  const datePart = dateObj.isValid() ? dateObj.format('M/D') : ''
  return `${datePart} ${serviceTime.value}`
})

const loadConfigs = async () => {
  try {
    const res = await request.get('/system/configs/public')
    const configs = res.data || res
    if (configs.PET_ADDITIONAL_FEE) petAdditionalFee.value = parseFloat(configs.PET_ADDITIONAL_FEE)
  } catch (e) {}
}

const loadData = async () => {
  loading.value = true
  try {
    await loadConfigs()
    const res = await getServiceDetail(route.params.id)
    service.value = res || {}
    let config = []
    if (typeof res?.price_config === 'string') {
      try { config = JSON.parse(res.price_config) } catch(e) {}
    } else { config = res?.price_config || [] }
    config.forEach(item => { 
      if (item.label && !item.label.includes('分钟')) {
        dishSelection[item.label] = 0 
      }
    })
    // 确保硬编码的加价项也初始化为 0
    if (res?.id === 36) {
      dishSelection['加一只中小型犬'] = 0
    }
    if (durationOptions.value.length > 0) selectedDurationLabel.value = durationOptions.value[0].label
  } catch (e) {
    service.value = {}
  }
  loading.value = false
}

// 核心：修复函数定义错误，重构地址加载
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
  } catch (e) {
    console.error('加载地址失败:', e)
  }
}

const submitOrder = async () => {
  orderLoading.value = true
  try {
    const finalOptions = { ...dishSelection }
    if (selectedDurationLabel.value) finalOptions[selectedDurationLabel.value] = 1
    
    if (service.value?.id === 36) {
      // 核心修正：确保提交给后端的 key 与后端校验逻辑完全一致
      // 1. 处理大型犬加价项 (统一 key 为 '加一只大型犬')
      const largeKey = Object.keys(dishSelection).find(k => k.includes('大型犬'));
      if (largeKey) {
        finalOptions['加一只大型犬'] = dishSelection[largeKey];
      }

      finalOptions.is_tracking = true;
      finalOptions.dogSize = dogSize.value;
      // catCount 包含基础 1 + 额外增加的数量
      const extraLarge = finalOptions['加一只大型犬'] || 0;
      const extraSmall = dishSelection['加一只中小型犬'] || 0;
      finalOptions.catCount = 1 + parseInt(extraLarge) + parseInt(extraSmall);
      
      finalOptions.personalityTags = Array.isArray(personalityTags.value) ? [...personalityTags.value] : [];
      finalOptions.healthStatus = healthStatus.value;
      finalOptions.ownLeash = ownLeash.value;
      finalOptions.specialInstructions = Array.isArray(specialInstructions.value) ? [...specialInstructions.value] : [];
      finalOptions.keyHandover = keyHandover.value;
    } else     if (service.value?.id === 37) {
      // 核心修正：确保喂猫加价项 key 与后端 PetOrderStrategy.js 匹配
      // 后端代码：const extraCats = options['增加一只猫'] || 0;
      // 前端必须确保 finalOptions 中存在 '增加一只猫' 这个 key
      const catKey = Object.keys(dishSelection).find(k => k.includes('一只猫'));
      if (catKey) {
        finalOptions['增加一只猫'] = dishSelection[catKey];
      }
      
      finalOptions.catCount = catCount.value;
      finalOptions.personalityTags = Array.isArray(personalityTags.value) ? [...personalityTags.value] : [];
      finalOptions.healthStatus = healthStatus.value;
      finalOptions.keyHandover = keyHandover.value;
      finalOptions.hasCamera = hasCamera.value;
      finalOptions.needTrash = needTrash.value;
      finalOptions.specialInstructions = Array.isArray(specialInstructions.value) ? [...specialInstructions.value] : [];
    }

    const orderTime = serviceTime.value.includes('-') ? `${selectedDate.value} ${serviceTime.value.split('-')[0].trim()}` : `${selectedDate.value} ${serviceTime.value}`
    
    const orderData = { 
      serviceId: service.value?.id, 
      totalPrice: totalOrderPrice.value, 
      clientPrice: totalOrderPrice.value, // 新增：传递给后端进行金额校验，防止逻辑偏差
      serviceTime: orderTime, 
      orderType: isPeriodOrder.value ? 1 : 0, 
      serviceOptions: JSON.stringify(finalOptions), 
      serviceDays: [],
      remark: remark.value, // 核心补全：确保备注字段提交
      providerId: selectedProvider.value?.id || null,
      assignmentType: selectedProvider.value ? 2 : 1
    }
    if (isPeriodOrder.value) {
      const start = moment(selectedDateRange.value[0]); const days = moment(selectedDateRange.value[1]).diff(start, 'days') + 1
      for (let i = 0; i < days; i++) orderData.serviceDays.push(start.clone().add(i, 'days').format('YYYY-MM-DD') + ' 10:00')
    }
    Object.assign(orderData, { addressId: selectedAddress.value?.id, city: selectedAddress.value?.city || '三亚市', serviceLatitude: selectedAddress.value?.lat, serviceLongitude: selectedAddress.value?.lng })
    const res = await createOrder(orderData)
    showSuccessToast('下单成功'); router.push(`/order/${res.orderId}`)
  } catch (e) {
    const errorMsg = e.response?.data?.message || e.message || '下单失败'
    if (e.response?.status === 402) showDialog({ title: '价格变动', message: '请刷新重试' }).then(loadData)
    else showToast(errorMsg)
  }
  orderLoading.value = false
}

const onCalendarRangeConfirm = (values) => { selectedDateRange.value = values; showCalendarRange.value = false; showDateTimePicker.value = true }
const confirmTimeSelection = () => { 
  if (!selectedTimeSlot.value) return showToast('请选择时间段')
  serviceTime.value = selectedTimeSlot.value
  showDateTimePicker.value = false 
}

const selectAddress = (addr) => { selectedAddress.value = addr; showAddressSelect.value = false }

const fetchAvailableProviders = async () => {
  if (!selectedAddress.value || !serviceTime.value) {
    return showToast('请先选择地址和时间')
  }
  
  providerLoading.value = true
  try {
    const orderTime = serviceTime.value.includes('-') ? `${selectedDate.value} ${serviceTime.value.split('-')[0].trim()}` : `${selectedDate.value} ${serviceTime.value}`
    const res = await request.get('/providers/match/pet', {
      params: {
        serviceId: service.value.id,
        serviceTime: orderTime,
        lat: selectedAddress.value.lat,
        lng: selectedAddress.value.lng
      }
    })
    providerList.value = res.data || []
    showProviderSelect.value = true
  } catch (e) {
    showToast('获取服务人员失败')
  } finally {
    providerLoading.value = false
  }
}

const selectProvider = (p) => {
  selectedProvider.value = p
  showProviderSelect.value = false
}

const openOrderPopup = () => { 
  if (!localStorage.getItem('token')) return router.push('/login')
  
  // 核心拦截：如果是宠物服务，进入弹窗前必须选择钥匙交接
  if ([36, 37].includes(service.value?.id) && !keyHandover.value) {
    return showToast('请选择钥匙交接方式');
  }

  // 必须选择服务人员 (已移除)
  // if (!selectedProvider.value) {
  //   return showToast('请选择服务人员');
  // }

  // 增加可选性检查
  if (typeof loadAddresses === 'function') loadAddresses(); 
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
    let disabled = false
    if ([36, 37].includes(serviceId) && i === 0) disabled = true
    options.push({ full: d.format('YYYY-MM-DD'), day: d.format('D'), month: d.format('M月'), week: i === 0 ? '今天' : i === 1 ? '明天' : weekMap[weekEn] || weekEn, disabled })
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
  const slots = [{ label: '08:00 - 09:00', start: '08:00', displayTag: '清晨' }, { label: '09:00 - 10:00', start: '09:00', displayTag: '早间' }, { label: '10:00 - 11:00', start: '10:00', displayTag: '上午' }, { label: '11:00 - 12:00', start: '11:00', displayTag: '中午' }, { label: '14:00 - 15:00', start: '14:00', displayTag: '下午' }, { label: '15:00 - 16:00', start: '15:00', displayTag: '下午' }, { label: '16:00 - 17:00', start: '16:00', displayTag: '傍晚' }, { label: '17:00 - 18:00', start: '17:00', displayTag: '傍晚' }, { label: '18:00 - 19:00', start: '18:00', displayTag: '晚间' }]
  return slots.map(s => {
    const slotStartTime = moment(`${selectedDate.value} ${s.start}`, 'YYYY-MM-DD HH:mm')
    const disabled = slotStartTime.isBefore(now.clone().add(4, 'hours'))
    return { ...s, displayTime: s.label, disabled }
  })
})

// 修复切换日期残留 Bug：自动重置或跳选
watch(selectedDate, () => {
  const currentSlot = dynamicTimeSlots.value.find(s => s.label === selectedTimeSlot.value)
  
  // 4小时起订锁校验
  let isWithinBuffer = false
  if (selectedTimeSlot.value) {
    const startTime = selectedTimeSlot.value.split('-')[0].trim()
    const fullDateTime = moment(`${selectedDate.value} ${startTime}`, 'YYYY-MM-DD HH:mm')
    isWithinBuffer = fullDateTime.isBefore(moment().add(4, 'hours'))
  }

  if (!currentSlot || currentSlot.disabled || isWithinBuffer) {
    selectedTimeSlot.value = ''
    serviceTime.value = ''
    const firstAvailable = dynamicTimeSlots.value.find(s => !s.disabled)
    if (firstAvailable) selectedTimeSlot.value = firstAvailable.label
  }
})

onMounted(() => { loadData() })
</script>

<style scoped>
.ei-status-text { font-size: 14px; font-weight: 800; color: #ef4444; }
.fee-notice { background: #fff7f6; border-radius: 16px; padding: 12px 16px !important; margin-top: 4px; border: 1px dashed #fecaca; }
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
.category-tag { font-size: 12px; color: #7c3aed; background: #f5f3ff; padding: 2px 10px; border-radius: 100px; font-weight: 700; }
.rating-tag { font-size: 12px; color: #f59e0b; font-weight: 700; display: flex; align-items: center; gap: 2px; }
.price-val { font-size: 32px; color: #ef4444; font-weight: 900; font-family: 'DIN Alternate'; }
.service-desc-v2 { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 16px; }
.sales-info-v2 { font-size: 12px; color: #94a3b8; font-weight: 600; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.selection-section-premium { margin: 0 20px 20px; padding: 24px 20px; background: white; border-radius: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.03); }
.section-header-v2 { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
.header-indicator.pet { width: 4px; height: 18px; background: linear-gradient(to bottom, #7c3aed, #a78bfa); border-radius: 2px; }
.header-text { font-size: 18px; font-weight: 900; color: #0f172a; }
.options-container-v2 { display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px; }
.opt-label { font-size: 14px; font-weight: 800; color: #475569; margin-bottom: 12px; }
.pill-group-v2 { display: flex !important; gap: 10px !important; flex-wrap: nowrap !important; }
.pill-item-v2 { flex: 1 !important; height: 40px !important; display: flex !important; align-items: center !important; justify-content: center !important; background: #f1f5f9 !important; border-radius: 100px !important; font-size: 13px !important; color: #64748b !important; font-weight: 700 !important; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; border: 1px solid transparent !important; }
.pill-item-v2.active { background: #f5f3ff !important; color: #7c3aed !important; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08) !important; transform: translateY(-1px) !important; border: 1px solid #ddd6fe !important; }
.duration-grid-v2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.duration-card-v2 { background: #f8fafc; border-radius: 16px; padding: 16px 8px; text-align: center; border: 2px solid transparent; transition: all 0.2s; }
.duration-card-v2.active { background: white; border-color: #7c3aed; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1); }
.dv2-label { font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
.dv2-price { font-size: 12px; color: #94a3b8; font-weight: 700; }
.duration-card-v2.active .dv2-label { color: #7c3aed; }
.extra-items-list { display: flex; flex-direction: column; gap: 16px; }
.extra-item-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #f1f5f9; }
.extra-item-row:last-child { border-bottom: none; }
.ei-name { font-size: 15px; font-weight: 800; color: #1e293b; }
.ei-price { font-size: 12px; color: #94a3b8; font-weight: 600; }
.floating-action-bar-v2 { position: fixed; bottom: calc(20px + env(safe-area-inset-bottom)); left: 20px; right: 20px; height: 84px; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(24px); border-radius: 28px; display: flex; align-items: center; padding: 0 16px 0 28px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1); border: 1px solid rgba(255, 255, 255, 0.8); z-index: 100; animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.fab-price-area { flex: 1; }
.fab-label { font-size: 12px; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
.fab-main { color: #ef4444; display: flex; align-items: baseline; }
.fab-symbol { font-size: 16px; font-weight: 800; margin-right: 2px; }
.fab-val { font-size: 28px; font-weight: 900; font-family: 'DIN Alternate'; }
.fab-book-btn { width: 140px; height: 56px !important; background: #0f172a !important; border: 1px solid rgba(255,255,255,0.1) !important; font-weight: 800; font-size: 16px; color: #fff !important; border-radius: 20px !important; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2) !important; }
.fab-book-btn:active { transform: scale(0.96); background: #1e293b !important; }
.fab-book-btn.van-button--disabled { background: #cbd5e1 !important; color: #94a3b8 !important; box-shadow: none !important; border: none !important; opacity: 0.8; }
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
.medical-options-v2, .security-options-v2 { margin-top: 24px; display: flex; flex-direction: column; gap: 20px; }
.opt-group-v2 { display: flex; flex-direction: column; gap: 12px; }
.opt-label-v2 { font-size: 14px; font-weight: 800; color: #475569; }
.pill-grid-v2 { display: flex; flex-wrap: wrap; gap: 8px; }
.pill-item-v3 { padding: 8px 16px; background: #f1f5f9; border-radius: 100px; font-size: 12px; color: #64748b; font-weight: 700; transition: all 0.3s; border: 1px solid transparent; }
.pill-item-v3.active { background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe; box-shadow: 0 4px 10px rgba(124, 58, 237, 0.1); }
.switch-group-v2 { display: flex; flex-direction: column; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 20px; }
.switch-item-v2 { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 700; color: #1e293b; }
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
.address-v2-card.active { background: #f5f3ff; border-color: #7c3aed; }
.av2-user { font-size: 15px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
.av2-tel { font-size: 13px; color: #64748b; font-weight: normal; margin-left: 8px; }
.av2-detail { font-size: 13px; color: #64748b; line-height: 1.4; }
.av2-check { color: #7c3aed; font-size: 20px; }
.address-v2-footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
.add-address-btn-v2 { height: 52px !important; background: #f1f5f9 !important; color: #7c3aed !important; border: none !important; font-weight: 800; font-size: 15px; border-radius: 16px !important; }
.add-address-btn-v2:active { background: #e2e8f0 !important; }

/* 服务者选择样式 */
.it-val-provider { display: flex; align-items: center; gap: 6px; }
.it-val-provider .p-name { font-size: 15px; font-weight: 800; color: #0f172a; }
.provider-popup-v2 { border-radius: 32px 32px 0 0 !important; background: #f8fafc; max-height: 80vh; }
.provider-v2-container { padding: 28px 20px calc(28px + env(safe-area-inset-bottom)); }
.provider-v2-header { text-align: center; margin-bottom: 24px; }
.p-v2-title { font-size: 20px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
.p-v2-subtitle { font-size: 13px; color: #94a3b8; font-weight: 600; }
.provider-v2-list { display: flex; flex-direction: column; gap: 12px; }
.provider-v2-card { background: white; border-radius: 24px; padding: 16px; display: flex; align-items: center; gap: 16px; border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
.provider-v2-card.active { border-color: #7c3aed; background: #f5f3ff; }
.pv2-avatar-wrap { position: relative; }
.pv2-system-avatar { width: 48px; height: 48px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #64748b; }
.pv2-rating { position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); background: #0f172a; color: #f59e0b; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 100px; display: flex; align-items: center; gap: 2px; white-space: nowrap; }
.pv2-info { flex: 1; min-width: 0; }
.pv2-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.pv2-name { font-size: 16px; font-weight: 900; color: #1e293b; }
.pv2-distance { font-size: 12px; color: #7c3aed; font-weight: 700; }
.pv2-stats { font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
.pv2-intro { font-size: 12px; color: #94a3b8; }
.pv2-desc { font-size: 13px; color: #64748b; }
.pv2-check { color: #7c3aed; font-size: 22px; }
.time-v2-content { display: flex; height: 420px; background: #f8fafc; border-radius: 32px; margin: 0 16px; overflow: hidden; border: 1px solid #f1f5f9; }
.time-v2-sidebar { width: 100px; background: #f1f5f9; overflow-y: auto; }
.date-v2-item { padding: 20px 12px; text-align: center; transition: all 0.3s; }
.date-v2-item.active { background: white; color: #7c3aed; border-left: 4px solid #7c3aed; }
.date-v2-item.disabled { opacity: 0.3; filter: grayscale(1); pointer-events: none; }
.dv2-week { font-size: 12px; font-weight: 800; color: #94a3b8; margin-bottom: 4px; }
.dv2-date-wrap { display: flex; flex-direction: column; line-height: 1.2; }
.dv2-month { font-size: 11px; color: #94a3b8; font-weight: 700; }
.dv2-day { font-size: 22px; font-weight: 900; color: #1e293b; font-family: 'DIN Alternate'; }
.time-v2-main { flex: 1; background: white; overflow-y: auto; padding: 16px; }
.time-v2-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.slot-v2-card { background: #f8fafc; border-radius: 16px; padding: 16px; text-align: center; border: 2px solid transparent; transition: all 0.2s; }
.slot-v2-card.active { background: #f5f3ff; border-color: #7c3aed; }
.slot-v2-card.disabled { opacity: 0.3; filter: grayscale(1); pointer-events: none; }
.sv2-time { font-size: 16px; font-weight: 900; color: #0f172a; }
.sv2-tag { font-size: 11px; color: #94a3b8; font-weight: 700; }
.time-v2-footer { margin-top: 24px; }
.time-v2-confirm { height: 56px !important; background: #0f172a !important; border: none !important; font-weight: 800; border-radius: 20px !important; color: #ffffff !important; }
.bottom-spacer-v2 { height: 120px; }
.ellipsis-1 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.text-error { color: #ef4444 !important; }
</style>
