<template>
  <div class="health-cert-page">
    <van-nav-bar title="上传健康证" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="status-banner" v-if="certStatus !== 0" :class="getStatusClass()">
      <van-icon :name="getStatusIcon()" size="24" />
      <div class="status-info">
        <div class="status-title">{{ getStatusText() }}</div>
        <div class="status-desc" v-if="certStatus === 2">原因：{{ healthCertReason }}</div>
        <div class="status-desc" v-else-if="certStatus === 1">证件已通过审核，服务期间请随身携带。</div>
        <div class="status-desc" v-else-if="certStatus === 3">资料已提交，请耐心等待审核（预计24小时内）。</div>
      </div>
    </div>

    <div class="header-tips" v-if="certStatus === 0">
      <van-notice-bar 
        left-icon="info-o" 
        text="根据平台规定，提供【居家办事】（如上门做饭、保洁）相关服务的师傅，必须持有并上传有效的健康证。" 
        wrapable
      />
    </div>

    <van-form @submit="onSubmit" style="margin-top: 15px;">
      <van-cell-group inset title="证件照片">
        <van-cell>
          <div class="upload-section">
            <van-uploader 
              v-model="fileList" 
              :max-count="1"
              :preview-options="{ closeable: true, closeOnClickImage: true, closeOnClickOverlay: true }"
            >
              <div class="upload-placeholder">
                <van-icon name="photograph" size="48" />
                <div class="text">点击上传健康证正面</div>
              </div>
            </van-uploader>
          </div>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset title="基本信息" style="margin-top: 15px;">
        <van-field
          v-model="form.healthCertNo"
          label="证件编号"
          placeholder="请输入健康证上的编号"
          required
          :rules="[{ required: true, message: '请填写证件编号' }]"
        />
        
        <van-field
          is-link
          readonly
          label="有效期至"
          placeholder="请点击选择日期"
          :model-value="form.expireDate"
          required
          @click="showCalendar = true"
        />
      </van-cell-group>

      <div class="info-guide">
        <div class="guide-title">为什么要上传健康证？</div>
        <p>1. 保障用户的身体健康和食品安全。</p>
        <p>2. 提升您的专业信任度，获得更多派单机会。</p>
        <p>3. 符合国家对家政/餐饮从业人员的相关法律要求。</p>
      </div>

      <div style="margin: 30px 16px;">
        <van-button 
          round block 
          :type="certStatus === 2 ? 'warning' : 'success'" 
          native-type="submit" 
          :loading="loading"
          :disabled="certStatus === 3"
        >
          {{ certStatus === 1 ? '更新健康证' : (certStatus === 3 ? '审核中' : '提交审核') }}
        </van-button>
      </div>
    </van-form>

    <!-- 可视化日历选择器：扩大范围至 20 年后 -->
    <van-calendar
      v-model:show="showCalendar"
      title="选择健康证有效期"
      color="#07c160"
      :min-date="new Date()"
      :max-date="new Date(2045, 0, 1)"
      @confirm="onCalendarConfirm"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import request from '../api'

const router = useRouter()
const loading = ref(false)
const showCalendar = ref(false)
const fileList = ref([])
const certStatus = ref(0) // 0-未上传, 1-通过, 2-驳回, 3-审核中
const healthCertReason = ref('')

const form = ref({
  healthCertNo: '',
  expireDate: ''
})

const getStatusText = () => {
  return ['未上传', '审核通过', '审核驳回', '审核中'][certStatus.value]
}

const getStatusIcon = () => {
  return ['info-o', 'checked', 'clear', 'clock-o'][certStatus.value]
}

const getStatusClass = () => {
  return ['status-none', 'status-pass', 'status-fail', 'status-wait'][certStatus.value]
}

const onCalendarConfirm = (date) => {
  form.value.expireDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  showCalendar.value = false
}

const loadData = async () => {
  try {
    const res = await request.get('/auth/me')
    const data = res.data || res
    certStatus.value = data.health_cert_status || 0
    healthCertReason.value = data.health_cert_reason || ''
    
    if (data.health_cert_status && data.health_cert_status !== 0) {
      form.value.healthCertNo = data.health_cert_no || ''
      if (data.health_cert_expire) {
        const d = new Date(data.health_cert_expire)
        form.value.expireDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
      
      if (data.health_cert_image) {
        fileList.value = [{
          url: data.health_cert_image,
          status: 'done',
          message: '已上传'
        }]
      }
    }
  } catch (e) {
    console.error('获取健康证信息失败:', e)
  }
}

onMounted(loadData)

const onSubmit = async () => {
  // 核心拦截：实名通过后才允许上传健康证
  const userInfo = JSON.parse(localStorage.getItem('provider_userInfo') || '{}');
  if (Number(userInfo.id_card_verified) !== 1) {
    showToast('实名认证审核通过后，方可上传健康证');
    return;
  }

  if (fileList.value.length === 0) {
    showToast('请上传证件照片')
    return
  }

  loading.value = true
  try {
    // 智能上传：如果没有新文件（即使用了旧图），直接用旧图 URL
    let finalImageUrl = fileList.value[0].url
    if (fileList.value[0].file) {
      const formDataObj = new FormData()
      formDataObj.append('file', fileList.value[0].file)
      const uploadRes = await request.post('/upload/image?type=health', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      finalImageUrl = uploadRes.url
    }

    // 2. 提交后端保存
    await request.post('/providers/health-cert', {
      healthCertNo: form.value.healthCertNo,
      expireDate: form.value.expireDate,
      healthCertImage: finalImageUrl
    })

    showSuccessToast('健康证已提交审核')
    setTimeout(() => router.back(), 1500)
  } catch (e) {
    showToast('提交失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.health-cert-page { min-height: 100vh; background: #f7f8fa; }
.status-banner {
  display: flex;
  align-items: center;
  padding: 16px;
  margin: 12px;
  border-radius: 8px;
  gap: 12px;
}
.status-banner.status-pass { background: #f6ffed; border: 1px solid #b7eb8f; color: #52c41a; }
.status-banner.status-fail { background: #fff1f0; border: 1px solid #ffa39e; color: #f5222d; }
.status-banner.status-wait { background: #e6f7ff; border: 1px solid #91d5ff; color: #1890ff; }

.status-info { flex: 1; }
.status-title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
.status-desc { font-size: 12px; opacity: 0.8; }

.upload-section { display: flex; justify-content: center; padding: 20px 0; }
.upload-placeholder {
  width: 280px; height: 180px; border: 2px dashed #dcdee0; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; color: #969799;
}
.upload-placeholder .text { font-size: 14px; margin-top: 10px; }
.info-guide { padding: 20px; color: #969799; }
.guide-title { font-size: 14px; font-weight: bold; color: #323233; margin-bottom: 10px; }
.info-guide p { font-size: 12px; line-height: 1.8; margin: 0; }
</style>
