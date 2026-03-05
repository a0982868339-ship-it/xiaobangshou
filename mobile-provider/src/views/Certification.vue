<template>
  <div class="certification-page">
    <van-nav-bar
      title="资质认证中心"
      left-arrow
      fixed
      placeholder
      @click-left="$router.back()"
    />

    <!-- 1. 分类引导区：直接点，不用滑选择器 -->
    <div class="category-guide">
      <div class="section-title">选择要认证的专业类别</div>
      <van-grid :column-num="2" :gutter="12" :border="false">
        <van-grid-item v-for="item in typeOptions" :key="item.value" @click="startCert(item)">
          <div class="type-card" :class="item.value">
            <div class="card-icon-wrap">
              <van-icon :name="item.icon" />
            </div>
            <div class="type-name">{{ item.text }}</div>
            <div class="type-desc">{{ item.desc }}</div>
          </div>
        </van-grid-item>
      </van-grid>
    </div>

    <!-- 2. 已上传证件列表 -->
    <div class="cert-list" v-if="certList.length > 0">
      <div class="list-title">
        <span>我的专业资质</span>
        <van-tag round type="primary" plain>{{ certList.length }}</van-tag>
      </div>
      
      <div v-for="item in certList" :key="item.id" class="cert-card shadow">
        <div class="cert-header">
          <div class="cert-info">
            <div class="c-name">{{ item.name }}</div>
            <div class="c-tag-row">
              <van-tag type="primary" plain size="small">{{ getTypeText(item.type) }}</van-tag>
            </div>
          </div>
          <van-tag :type="getStatusType(item.status)" size="medium" round>{{ getStatusText(item.status) }}</van-tag>
        </div>
        
        <div class="cert-body">
          <div class="info-item" v-if="item.certificate_no">
            <span class="label">证件编号:</span>
            <span class="val">{{ item.certificate_no }}</span>
          </div>
          <div class="info-item" v-if="item.expire_date">
            <span class="label">有效期至:</span>
            <span class="val">{{ formatDate(item.expire_date) }}</span>
          </div>
          <div class="reject-reason" v-if="item.status === 2">
            <van-icon name="warning-o" /> 驳回原因：{{ item.reject_reason }}
          </div>
        </div>

        <div class="cert-footer" v-if="parseJSON(item.images).length > 0">
          <van-image
            v-for="(img, idx) in parseJSON(item.images)"
            :key="idx"
            :src="img"
            width="64"
            height="64"
            fit="cover"
            radius="8"
            class="thumb-img"
            @click="previewImages(parseJSON(item.images), idx)"
          />
        </div>
      </div>
    </div>

    <!-- 3. 表单弹出层：半屏抽屉 -->
    <van-popup 
      v-model:show="showForm" 
      position="bottom" 
      round 
      closeable 
      safe-area-inset-bottom
      style="height: 80%"
    >
      <div class="form-container">
        <div class="form-header">
          <div class="f-title">上传 {{ form.type }}</div>
          <div class="f-desc">请确保上传的证件照片清晰、真实有效</div>
        </div>

        <van-form @submit="onSubmit">
          <van-cell-group inset>
            <van-field
              v-model="form.name"
              label="证件名称"
              placeholder="如：护士执业证、高级育婴师"
              required
              :rules="[{ required: true, message: '请填写证件名称' }]"
            />
            <van-field
              v-model="form.certificateNo"
              label="证件编号"
              placeholder="请填写证件上的编号"
            />
            <van-field
              v-model="form.expireDate"
              is-link
              readonly
              label="到期日期"
              placeholder="请点击选择日期 (长期有效请留空)"
              @click="showCalendar = true"
            />
            
            <div class="upload-box">
              <div class="u-label">上传证件照片 (最多3张)</div>
              <van-uploader 
                v-model="fileList" 
                multiple 
                :max-count="3" 
                :after-read="afterRead"
                upload-icon="photograph"
                upload-text="添加照片"
                :preview-options="{ closeable: true, closeOnClickImage: true, closeOnClickOverlay: true }"
              />
            </div>
          </van-cell-group>

          <div class="form-submit">
            <van-button block round type="primary" native-type="submit" :loading="submitting">
              提交平台审核
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 可视化日历选择器：扩大范围至 20 年后 -->
    <van-calendar
      v-model:show="showCalendar"
      title="选择证书有效期"
      color="#1989fa"
      :min-date="new Date()"
      :max-date="new Date(2045, 0, 1)"
      @confirm="onCalendarConfirm"
    />

    <van-empty 
      v-if="certList.length === 0 && !showForm" 
      image="search"
      description="您还没有通过认证的资质" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { showToast, showSuccessToast, showImagePreview } from 'vant'
import request from '../api'

const certList = ref([])
const showForm = ref(false)
const showCalendar = ref(false)
const submitting = ref(false)
const fileList = ref([])

const form = reactive({
  type: '',
  typeValue: '',
  name: '',
  certificateNo: '',
  expireDate: '',
  images: []
})

const typeOptions = [
  { text: '医疗资质', value: 'medical', icon: 'medal-o', desc: '护士/康复师' },
  { text: '宠物资质', value: 'pet', icon: 'dog', desc: '训犬/美容师' },
  { text: '家政资质', value: 'domestic', icon: 'shop-o', desc: '厨师/育婴师' },
  { text: '通用资质', value: 'other', icon: 'apps-o', desc: '驾驶/搬运' }
]

const startCert = (typeObj) => {
  form.type = typeObj.text
  form.typeValue = typeObj.value
  showForm.value = true
}

const getTypeText = (type) => {
  const found = typeOptions.find(o => o.value === type)
  return found ? found.text : '其他类型'
}

const getStatusText = (s) => ['待审核', '已通过', '已驳回'][s] || '审核中'
const getStatusType = (s) => ['warning', 'success', 'danger'][s] || 'default'

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const parseJSON = (str) => {
  if (!str) return []
  try { return typeof str === 'string' ? JSON.parse(str) : str } catch (e) { return [] }
}

const onCalendarConfirm = (date) => {
  form.expireDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  showCalendar.value = false
}

const loadData = async () => {
  try {
    const res = await request.get('/providers/certifications/me')
    certList.value = res.data || res
  } catch (e) {}
}

const afterRead = async (file) => {
  const files = Array.isArray(file) ? file : [file]
  for (const item of files) {
    item.status = 'uploading'
    item.message = '上传中...'
    try {
      const formData = new FormData()
      formData.append('file', item.file)
      const res = await request.post('/upload/image?type=cert', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      item.status = 'done'
      item.url = res.url
    } catch (e) {
      item.status = 'failed'
    }
  }
}

const onSubmit = async () => {
  const images = fileList.value.filter(f => f.status === 'done').map(f => f.url)
  if (images.length === 0) return showToast('请至少上传一张证件照片')

  submitting.value = true
  try {
    await request.post('/providers/certifications', {
      type: form.typeValue,
      name: form.name,
      certificateNo: form.certificateNo,
      expireDate: form.expireDate,
      images
    })
    showSuccessToast('提交成功，请耐心等待审核')
    showForm.value = false
    loadData()
    // 重置表单
    Object.assign(form, { type: '', typeValue: '', name: '', certificateNo: '', expireDate: '', images: [] })
    fileList.value = []
  } catch (e) {
  } finally {
    submitting.value = false
  }
}

const previewImages = (images, index) => {
  showImagePreview({ 
    images, 
    startPosition: index,
    closeable: true,
    closeOnClickImage: true,
    closeOnClickOverlay: true
  })
}

onMounted(loadData)
</script>

<style scoped>
.certification-page { min-height: 100vh; background: #f7f8fa; padding-bottom: 40px; }
.category-guide { padding: 16px; }
.section-title { font-size: 16px; font-weight: bold; color: #323233; margin-bottom: 16px; padding-left: 4px; }

.type-card {
  width: 100%;
  height: 100px;
  background: white;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  transition: all 0.2s;
  border: 1px solid transparent;
}
.type-card:active { transform: scale(0.95); background: #f2f3f5; }

.card-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f0f7ff;
  color: #1989fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 8px;
}

.type-name { font-size: 14px; font-weight: bold; color: #323233; margin-bottom: 2px; }
.type-desc { font-size: 11px; color: #969799; }

/* 不同类别的颜色微调 */
.medical .card-icon-wrap { background: #eefaff; color: #1989fa; }
.pet .card-icon-wrap { background: #fff7e6; color: #fa8c16; }
.domestic .card-icon-wrap { background: #f6ffed; color: #52c41a; }
.other .card-icon-wrap { background: #f9f0ff; color: #722ed1; }

.cert-list { margin-top: 10px; }
.list-title { display: flex; justify-content: space-between; align-items: center; padding: 0 20px 12px; font-size: 15px; font-weight: bold; color: #323233; }

.cert-card { background: white; margin: 0 16px 12px; border-radius: 16px; padding: 16px; }
.cert-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.c-name { font-size: 16px; font-weight: bold; color: #323233; margin-bottom: 4px; }
.cert-body { padding: 10px; background: #f9f9f9; border-radius: 8px; margin-bottom: 12px; }
.info-item { display: flex; font-size: 13px; margin-bottom: 4px; }
.info-item .label { color: #969799; width: 70px; }
.info-item .val { color: #323233; font-weight: 500; }

.reject-reason { font-size: 12px; color: #ee0a24; background: #fff1f0; padding: 8px; border-radius: 4px; margin-top: 8px; }
.cert-footer { display: flex; gap: 10px; flex-wrap: wrap; }
.thumb-img { border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

.form-container { padding: 20px 0; }
.form-header { padding: 0 24px 20px; }
.f-title { font-size: 20px; font-weight: bold; color: #323233; margin-bottom: 6px; }
.f-desc { font-size: 13px; color: #969799; }

.upload-box { padding: 16px; }
.u-label { font-size: 14px; color: #646566; margin-bottom: 12px; }
.form-submit { margin: 32px 20px; }
</style>
