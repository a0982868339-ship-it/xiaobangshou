<template>
  <div class="edit-profile-page">
    <van-nav-bar 
      title="修改资料" 
      fixed 
      placeholder 
      left-arrow 
      @click-left="$router.back()"
      class="custom-nav"
    />

    <div class="page-content">
      <!-- 1. 头像编辑区 -->
      <div class="avatar-section">
        <div class="avatar-upload-wrap" @click="triggerUpload">
          <div class="avatar-box shadow-card">
            <van-image v-if="form.avatar" :src="form.avatar" round fit="cover" width="100" height="100" />
            <div v-else class="avatar-text-placeholder">{{ getInitial() }}</div>
          </div>
          <div class="edit-badge">
            <van-icon name="photograph" />
          </div>
        </div>
        <div class="upload-tip">点击更换专业头像</div>
      </div>

      <van-form @submit="onSubmit">
        <!-- 2. 基础信息卡片 -->
        <div class="section-card shadow-card">
          <div class="card-title">基础信息</div>
          <van-cell-group :border="false">
            <van-field
              v-model="form.nickname"
              label="我的昵称"
              placeholder="请设置您的公开昵称"
              input-align="right"
              :rules="[{ required: true, message: '昵称不能为空' }]"
            />
            
            <van-field
              v-model="form.gender"
              is-link
              readonly
              label="性别"
              placeholder="选择性别"
              input-align="right"
              @click="showGenderPicker = true"
            />
          </van-cell-group>
        </div>

        <!-- 3. 个性签名卡片 -->
        <div class="section-card shadow-card">
          <div class="card-title">个人签名</div>
          <div class="signature-wrap">
            <van-field
              v-model="form.introduction"
              rows="4"
              autosize
              type="textarea"
              maxlength="100"
              placeholder="介绍一下自己的从业经验和优势吧，优质的签名能吸引更多客户下单。例如：拥有5年金牌代厨经验，擅长川鲁菜系，细心负责。"
              show-word-limit
              class="signature-field"
            />
          </div>
        </div>

        <!-- 4. 保存按钮 -->
        <div class="footer-btn">
          <van-button 
            type="primary" 
            block 
            round 
            native-type="submit" 
            :loading="loading"
            class="save-btn"
          >
            保存并应用
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 性别选择器 -->
    <van-popup v-model:show="showGenderPicker" position="bottom" round>
      <van-picker
        title="选择性别"
        :columns="genderColumns"
        @confirm="onGenderConfirm"
        @cancel="showGenderPicker = false"
      />
    </van-popup>

    <!-- 隐藏的文件上传 -->
    <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="onFileChange">
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast, showLoadingToast, closeToast } from 'vant'
import { getUserInfo } from '../api'
import request from '../api'

const router = useRouter()
const fileInput = ref(null)
const loading = ref(false)
const showGenderPicker = ref(false)

const form = reactive({
  nickname: '',
  gender: '',
  introduction: '',
  avatar: ''
})

const genderColumns = [
  { text: '男', value: 1 },
  { text: '女', value: 2 },
  { text: '保密', value: 0 }
]

const getInitial = () => form.nickname ? form.nickname.charAt(0).toUpperCase() : '?'

const triggerUpload = () => fileInput.value.click()

const onFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  showLoadingToast({ message: '正在上传...', forbidClick: true })
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const res = await request.post('/upload/image?type=avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    form.avatar = res.url
    showSuccessToast('上传成功')
  } catch (err) {
    showToast('上传失败')
  } finally {
    closeToast()
  }
}

const loadData = async () => {
  try {
    const userInfo = await getUserInfo()
    Object.assign(form, {
      nickname: userInfo.nickname || '',
      avatar: userInfo.avatar || '',
      gender: getGenderText(userInfo.gender),
      introduction: userInfo.introduction || ''
    })
  } catch (error) {
    console.error('获取信息失败:', error)
  }
}

const getGenderText = (val) => {
  const found = genderColumns.find(c => c.value === val)
  return found ? found.text : '保密'
}

const getGenderValue = (text) => {
  const found = genderColumns.find(c => c.text === text)
  return found ? found.value : 0
}

const onGenderConfirm = ({ selectedOptions }) => {
  form.gender = selectedOptions[0].text
  showGenderPicker.value = false
}

const onSubmit = async () => {
  loading.value = true
  try {
    await request.put('/users/profile', {
      nickname: form.nickname,
      gender: getGenderValue(form.gender),
      introduction: form.introduction,
      avatar: form.avatar
    })
    
    // 更新本地缓存
    const localInfo = JSON.parse(localStorage.getItem('provider_userInfo') || '{}')
    Object.assign(localInfo, {
      nickname: form.nickname,
      gender: getGenderValue(form.gender),
      introduction: form.introduction,
      avatar: form.avatar
    })
    localStorage.setItem('provider_userInfo', JSON.stringify(localInfo))
    
    showSuccessToast('修改已保存')
    setTimeout(() => router.back(), 1000)
  } catch (error) {
    showToast('保存失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.edit-profile-page {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f7f8fa 0%, #edf1f5 100%);
}

.page-content {
  padding: 24px 16px;
}

/* 1. 头像样式 */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
  padding-top: 10px;
}

.avatar-upload-wrap {
  position: relative;
  cursor: pointer;
}

.avatar-box {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid white;
}

.avatar-text-placeholder {
  font-size: 40px;
  color: #11998e;
  font-weight: 800;
}

.edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  background: #11998e;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 3px solid #f7f8fa;
  font-size: 16px;
}

.upload-tip {
  font-size: 13px;
  color: #969799;
  margin-top: 12px;
}

/* 2. 卡片样式 */
.section-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 15px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 16px;
  padding-left: 4px;
  border-left: 4px solid #11998e;
}

.signature-wrap {
  background: #f7f8fa;
  border-radius: 12px;
  overflow: hidden;
}

.signature-field {
  background: transparent;
  padding: 12px;
}

/* 3. 通用阴影 */
.shadow-card {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.footer-btn {
  margin-top: 40px;
  padding: 0 10px;
}

.save-btn {
  height: 50px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border: none;
  box-shadow: 0 8px 16px rgba(17, 153, 142, 0.2);
}

:deep(.van-field__label) {
  color: #646566;
  font-weight: 500;
}
</style>
