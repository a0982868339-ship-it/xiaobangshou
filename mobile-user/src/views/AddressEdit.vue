<template>
  <div class="address-edit-page">
    <van-nav-bar
      :title="id ? '编辑地址' : '新增地址'"
      left-arrow
      @click-left="$router.back()"
      fixed
      placeholder
    />
    
    <van-form @submit="onSave">
      <!-- 板块一：基本信息 -->
      <div class="group-header">
        <span class="group-title">联系人信息</span>
      </div>
      <div class="premium-group">
        <van-field
          v-model="form.contactName"
          label="姓名"
          placeholder="收货人姓名"
          :rules="[{ required: true, message: '请填写姓名' }]"
        />
        <van-field
          v-model="form.contactPhone"
          label="电话"
          type="tel"
          placeholder="收货人手机号"
          :rules="[{ required: true, message: '请填写电话' }]"
        />
      </div>

      <!-- 板块二：详细位置 -->
      <div class="group-header">
        <span class="group-title">服务地址</span>
      </div>
      <div class="premium-group">
        <!-- 1. 行政区选择 -->
        <van-field
          v-model="areaDisplay"
          is-link
          readonly
          label="所在地区"
          placeholder="请选择省 / 市 / 区"
          @click="showAreaPicker = true"
          :rules="[{ required: true, message: '请选择地区' }]"
        />
        
        <!-- 2. 地图精准选点入口 -->
        <van-field
          v-model="form.addressName"
          label="详细地址"
          placeholder="搜索小区/大厦"
          readonly
          is-link
          @click="goPickLocation"
          :rules="[{ required: true, message: '请精准定位详细地址' }]"
        >
          <template #left-icon>
            <van-icon name="location" color="#1a1a1a" />
          </template>
          <template #extra>
            <van-tag v-if="form.lat" type="primary" plain round>已定位</van-tag>
          </template>
        </van-field>

        <!-- 3. 补充楼栋门牌 -->
        <van-field
          v-model="form.addressHouse"
          label="门牌号"
          placeholder="例：5号楼102室"
          rows="1"
          autosize
          type="textarea"
        />
      </div>

      <!-- 板块三：设置 -->
      <div class="switch-cell">
        <van-cell title="设为默认地址" center :border="false" style="padding: 0; background: transparent;">
          <template #right-icon>
            <van-switch v-model="form.isDefault" size="20" active-color="#1a1a1a" />
          </template>
        </van-cell>
      </div>

      <div class="submit-wrap">
        <van-button round block type="primary" native-type="submit" :loading="loading" class="save-btn">
          保存地址
        </van-button>
        <van-button v-if="id" round block plain type="danger" class="delete-btn" @click="onDelete">
          删除该地址
        </van-button>
      </div>
    </van-form>

    <!-- 级联选择器弹出 (优化为市面流行的 Tab 切换模式) -->
    <van-popup v-model:show="showAreaPicker" position="bottom" round style="height: 60%">
      <div class="cascader-wrapper">
        <div class="cascader-header">选择所在地区</div>
        <van-cascader
          v-model="form.areaCode"
          title="请选择所在地区"
          :options="cascaderOptions"
          @close="showAreaPicker = false"
          @finish="onCascaderFinish"
          active-color="#1a1a1a"
        />
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showConfirmDialog, showFailToast } from 'vant'
import { areaList } from '@vant/area-data'
import { addAddress, getAddressDetail, updateAddress, deleteAddress } from '../api'

// 将 area-data 转换为 van-cascader 需要的 options 格式
const formatAreaList = () => {
  const options = []
  const { province_list, city_list, county_list } = areaList
  
  for (const pCode in province_list) {
    const province = {
      text: province_list[pCode],
      value: pCode,
      children: []
    }
    
    for (const cCode in city_list) {
      if (cCode.slice(0, 2) === pCode.slice(0, 2)) {
        const city = {
          text: city_list[cCode],
          value: cCode,
          children: []
        }
        
        for (const coCode in county_list) {
          if (coCode.slice(0, 4) === cCode.slice(0, 4)) {
            city.children.push({
              text: county_list[coCode],
              value: coCode
            })
          }
        }
        province.children.push(city)
      }
    }
    options.push(province)
  }
  return options
}

const cascaderOptions = formatAreaList()

const route = useRoute()
const router = useRouter()
const id = route.query.id
const loading = ref(false)
const showAreaPicker = ref(false)

const form = reactive({
  contactName: '',
  contactPhone: '',
  province: '',
  city: '',
  district: '',
  areaCode: '', // 新增：级联选择器绑定的 code
  addressName: '', // 地图搜索出来的建筑/小区名
  addressHouse: '', // 手填的门牌号
  lat: null,
  lng: null,
  isDefault: false
})

const areaDisplay = computed(() => {
  if (!form.province) return ''
  return `${form.province} / ${form.city} / ${form.district}`
})

const goPickLocation = () => {
  if (!form.city) return showFailToast('请先选择所在地区')
  // 在跳转前，将当前已填写的内容保存到 localStorage，防止返回后丢失
  const currentForm = {
    contactName: form.contactName,
    contactPhone: form.contactPhone,
    province: form.province,
    city: form.city,
    district: form.district,
    addressHouse: form.addressHouse,
    isDefault: form.isDefault
  }
  localStorage.setItem('temp_address_form', JSON.stringify(currentForm))
  router.push(`/address/picker?city=${form.city}&district=${form.district}`)
}

const onCascaderFinish = ({ selectedOptions }) => {
  form.province = selectedOptions[0].text
  form.city = selectedOptions[1].text
  form.district = selectedOptions[2].text
  showAreaPicker.value = false
}

const loadAddress = async () => {
  if (!id) return
  try {
    const res = await getAddressDetail(id)
    form.contactName = res.contact_name
    form.contactPhone = res.contact_phone
    form.province = res.province
    form.city = res.city
    form.district = res.district
    form.addressName = res.address.split(' ')[0] || ''
    form.addressHouse = res.address.split(' ')[1] || ''
    form.lat = res.lat
    form.lng = res.lng
    form.isDefault = res.is_default === 1
  } catch (e) {}
}

const onSave = async () => {
  loading.value = true
  try {
    const data = {
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      province: form.province,
      city: form.city,
      district: form.district,
      address: `${form.addressName} ${form.addressHouse}`.trim(),
      isDefault: form.isDefault ? 1 : 0,
      lat: form.lat,
      lng: form.lng
    }
    
    let savedAddress = null
    if (id) {
      await updateAddress(id, data)
      savedAddress = { id, ...data }
    } else {
      const res = await addAddress(data)
      // 兼容返回格式，如果是 axios 直接返回的对象，或者包含 data 字段
      savedAddress = res.data || res
    }
    
    // 商业化优化：如果是从下单流程跳转过来的，保存后自动选中并返回
    if (localStorage.getItem('is_ordering_return')) {
      localStorage.setItem('temp_selected_location', JSON.stringify({
        id: savedAddress.id,
        name: form.addressName,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        province: data.province,
        city: data.city,
        district: data.district
      }))
      localStorage.removeItem('is_ordering_return')
    }

    showSuccessToast('地址已保存')
    setTimeout(() => router.back(), 1000)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const onDelete = () => {
  showConfirmDialog({ title: '提醒', message: '确定要删除此地址吗？' }).then(async () => {
    try {
      await deleteAddress(id)
      showSuccessToast('已删除')
      router.back()
    } catch (e) {}
  })
}

onMounted(async () => {
  if (id) await loadAddress()
  
  // 1. 恢复之前填写的表单内容
  const savedForm = localStorage.getItem('temp_address_form')
  if (savedForm) {
    const data = JSON.parse(savedForm)
    Object.assign(form, data)
    localStorage.removeItem('temp_address_form')
  }

  // 2. 检查是否有地图返回的数据 (优先级最高，会覆盖 loadAddress 加载的旧数据)
  const temp = localStorage.getItem('temp_selected_location')
  if (temp) {
    const loc = JSON.parse(temp)
    form.addressName = loc.name
    form.lat = loc.lat
    form.lng = loc.lng
    // 同时也补全省市区（如果用户还没选的话）
    if (!form.city || form.city !== loc.city) {
      form.province = loc.province
      form.city = loc.city
      form.district = loc.district
    }
    localStorage.removeItem('temp_selected_location')
  }
})
</script>

<style scoped>
.address-edit-page { 
  min-height: 100vh; 
  background: #ffffff; 
  padding-bottom: 40px;
}

/* 导航栏极简处理 */
:deep(.van-nav-bar) {
  background: #fff;
}
:deep(.van-nav-bar__title) {
  font-weight: 600;
  color: #1a1a1a;
}

/* 分组标题极简化 */
.group-header {
  padding: 24px 20px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.group-title {
  font-size: 13px;
  font-weight: 600;
  color: #999;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* 输入框质感升级 */
.premium-group {
  margin: 0 16px;
  background: #f9f9f9;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
}

:deep(.van-field) {
  padding: 16px 20px;
  background: transparent;
}

:deep(.van-field__label) {
  font-weight: 500;
  color: #333;
  width: 70px;
}

:deep(.van-field__control) {
  color: #1a1a1a;
  font-weight: 400;
}

:deep(.van-cell::after) {
  left: 20px;
  right: 20px;
  border-bottom: 1px solid #eee;
}

/* 开关单元格 */
.switch-cell {
  margin: 20px 16px;
  padding: 16px 20px;
  background: #f9f9f9;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
}

/* 提交按钮质感 */
.submit-wrap { 
  margin: 40px 20px; 
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.save-btn {
  height: 52px;
  font-weight: 600;
  font-size: 16px;
  background: linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%) !important;
  border: none !important;
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.delete-btn {
  height: 52px;
  font-weight: 500;
  color: #ff4d4f !important;
  border: 1px solid #ff4d4f !important;
  background: transparent !important;
}

.mt-12 { margin-top: 12px !important; }

/* 级联选择器样式优化 */
.cascader-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.cascader-header {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 20px 0 10px;
  color: #1a1a1a;
}
:deep(.van-cascader__header) {
  display: none; /* 隐藏默认标题，使用自定义标题 */
}
:deep(.van-cascader__tabs) {
  padding: 0 10px;
}
:deep(.van-cascader__tab) {
  font-weight: 500;
  color: #999;
}
:deep(.van-cascader__tab--active) {
  color: #1a1a1a;
  font-weight: 600;
}
</style>
