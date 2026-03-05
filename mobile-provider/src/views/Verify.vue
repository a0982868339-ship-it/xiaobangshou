<template>
  <div class="verify-page">
    <van-nav-bar title="实名认证" left-arrow @click-left="$router.back()" fixed placeholder />

    <!-- 认证进度 -->
    <van-steps :active="activeStep" active-color="#52c41a">
      <van-step>身份录入</van-step>
      <van-step>{{ verifyMethod === 1 ? '人脸识别' : '证件上传' }}</van-step>
      <van-step>认证结果</van-step>
    </van-steps>

    <div class="verify-content">
      <!-- Step 0: 身份信息录入与选择方式 -->
      <div v-if="activeStep === 0">
        <div class="verify-header-text">
          <div class="v-title">实名认证</div>
          <p class="v-desc">为了您的账号安全及业务合规，请完成实名核验</p>
        </div>

        <van-cell-group inset class="info-group shadow-premium">
          <van-field v-model="formData.realName" label="真实姓名" placeholder="请输入您的姓名" />
          <van-field v-model="formData.idCard" label="身份证号" placeholder="18位身份证号" />
        </van-cell-group>

        <div class="method-selection mt-20">
          <div class="m-title">请选择认证方式</div>
          
          <div class="method-card primary" @click="startAlipayVerify">
            <div class="m-left">
              <van-icon name="alipay" class="m-icon alipay" />
              <div class="m-text">
                <div class="mt">支付宝快捷认证</div>
                <div class="md">推荐，眨眨眼即可完成，实时生效</div>
              </div>
            </div>
            <van-icon name="arrow" class="m-arrow" />
          </div>

          <div class="method-card secondary" @click="startManualVerify">
            <div class="m-left">
              <van-icon name="idcard" class="m-icon manual" />
              <div class="m-text">
                <div class="mt">人工审核认证</div>
                <div class="md">无支付宝用户选此项，需上传身份证及手持照</div>
              </div>
            </div>
            <van-icon name="arrow" class="m-arrow" />
          </div>
        </div>
      </div>

      <!-- Step 1-A: 支付宝等待/跳转中 -->
      <div v-if="activeStep === 1 && verifyMethod === 1" class="loading-stage">
        <van-loading vertical>正在唤起支付宝人脸识别...</van-loading>
        <p class="tip">如未自动跳转，请点击下方按钮</p>
        <van-button type="primary" size="small" round plain @click="openAlipayUrl">手动跳转</van-button>
      </div>

      <!-- Step 1-B: 人工审核证件上传 -->
      <div v-if="activeStep === 1 && verifyMethod === 2" class="manual-stage">
        <div class="v-header-section">
          <div class="v-header">证件照片上传</div>
          <p class="v-header-desc">请拍摄并上传清晰的二代身份证原件照片</p>
        </div>
        
        <div class="uploader-container">
          <div class="id-card-grid">
            <!-- 正面 -->
            <div class="id-card-item">
              <van-uploader :after-read="(file) => onPhotoRead(file, 'front')" class="full-width">
                <div class="id-card-box" :class="{ 'has-img': formData.frontImage }">
                  <img v-if="formData.frontImage" :src="formData.frontImage" class="preview-img" />
                  <div v-else class="placeholder-content">
                    <div class="id-card-icon front">
                      <div class="avatar-mock"></div>
                      <div class="lines-mock">
                        <div class="line short"></div>
                        <div class="line"></div>
                        <div class="line"></div>
                      </div>
                    </div>
                    <span class="upload-label">点击上传身份证正面</span>
                  </div>
                  <div v-if="formData.frontImage" class="re-upload">重新上传</div>
                </div>
              </van-uploader>
            </div>

            <!-- 反面 -->
            <div class="id-card-item">
              <van-uploader :after-read="(file) => onPhotoRead(file, 'back')" class="full-width">
                <div class="id-card-box" :class="{ 'has-img': formData.backImage }">
                  <img v-if="formData.backImage" :src="formData.backImage" class="preview-img" />
                  <div v-else class="placeholder-content">
                    <div class="id-card-icon back">
                      <div class="emblem-mock"></div>
                      <div class="text-mock">国徽面</div>
                    </div>
                    <span class="upload-label">点击上传身份证反面</span>
                  </div>
                  <div v-if="formData.backImage" class="re-upload">重新上传</div>
                </div>
              </van-uploader>
            </div>
          </div>

          <!-- 手持 -->
          <div class="handheld-section mt-20">
            <div class="v-header-small">手持证件照</div>
            <van-uploader :after-read="(file) => onPhotoRead(file, 'handheld')" class="full-width">
              <div class="handheld-box" :class="{ 'has-img': formData.handheldImage }">
                <img v-if="formData.handheldImage" :src="formData.handheldImage" class="preview-img" />
                <div v-else class="placeholder-content">
                  <div class="handheld-mock">
                    <div class="person-mock"></div>
                    <div class="small-card-mock"></div>
                  </div>
                  <div class="mock-desc">
                    <span class="upload-label">上传手持身份证上半身照</span>
                    <p class="sub-label">请确保五官清晰，证件文字可辨认</p>
                  </div>
                </div>
                <div v-if="formData.handheldImage" class="re-upload">重新上传</div>
              </div>
            </van-uploader>
          </div>
        </div>

        <div class="submit-bar">
          <van-button type="primary" block round @click="submitManual" :loading="loading" class="v-submit-btn">
            提交人工审核
          </van-button>
          <div class="cancel-link" @click="activeStep = 0">返回修改信息</div>
        </div>
      </div>

      <!-- Step 2: 结果页 -->
      <div v-if="activeStep === 2" class="result-stage">
        <van-icon :name="result.icon" :color="result.color" size="80" />
        <div class="r-title">{{ result.title }}</div>
        <p class="r-desc">{{ result.desc }}</p>
        <van-button type="primary" block round @click="$router.replace('/user')">返回我的</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast, showDialog } from 'vant'
import request from '../api'

const router = useRouter()
const activeStep = ref(0)
const verifyMethod = ref(0) // 1-Alipay, 2-Manual
const loading = ref(false)
const alipayJumpUrl = ref('')

const formData = reactive({
  realName: '',
  idCard: '',
  frontImage: '',
  backImage: '',
  handheldImage: ''
})

const result = reactive({
  icon: 'checked',
  color: '#52c41a',
  title: '认证提交成功',
  desc: ''
})

// 开启支付宝认证
const startAlipayVerify = async () => {
  if (!formData.realName || !formData.idCard) return showToast('请输入完整身份信息')
  
  // 身份证正则验证
  const idCardReg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  if (!idCardReg.test(formData.idCard)) {
    return showToast('请输入正确的身份证号')
  }
  
  try {
    showLoadingToast({ message: '初始化中...', forbidClick: true })
    const res = await request.post('/users/verify/alipay/init', {
      realName: formData.realName,
      idCard: formData.idCard
    })
    alipayJumpUrl.value = res.jumpUrl
    verifyMethod.value = 1
    activeStep.value = 1
    openAlipayUrl()
    
    // 轮询查询结果 (实际应由支付宝 App 跳回触发)
    checkAlipayResult()
  } catch (e) {
    showToast(e.message || '系统繁忙')
  }
}

const openAlipayUrl = () => {
  if (alipayJumpUrl.value) {
    window.location.href = alipayJumpUrl.value
  }
}

const checkAlipayResult = async () => {
  // 模拟轮询逻辑
  const timer = setInterval(async () => {
    try {
      const res = await request.get('/users/verify/alipay/query')
      if (res.status === 1) {
        clearInterval(timer)
        result.icon = 'checked'
        result.title = '核验通过'
        result.desc = '您的身份已通过支付宝实时核验，立刻开始接单吧！'
        activeStep.value = 2
      }
    } catch (e) {}
  }, 3000)
}

// 开启人工认证
const startManualVerify = () => {
  if (!formData.realName || !formData.idCard) return showToast('请输入完整身份信息')
  
  // 身份证正则验证
  const idCardReg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  if (!idCardReg.test(formData.idCard)) {
    return showToast('请输入正确的身份证号')
  }

  verifyMethod.value = 2
  activeStep.value = 1
}

// 上传照片逻辑
const onPhotoRead = async (file, type) => {
  const fd = new FormData()
  fd.append('file', file.file)
  try {
    showLoadingToast('上传中...')
    const res = await request.post('/upload/image?type=verify', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    formData[`${type}Image`] = res.url
    closeToast()
  } catch (e) {
    showToast('上传失败')
  }
}

const submitManual = async () => {
  if (!formData.frontImage || !formData.backImage || !formData.handheldImage) {
    return showToast('请上传完整三张照片')
  }
  
  loading.value = true
  try {
    await request.post('/users/verify/manual/submit', formData)
    result.icon = 'clock'
    result.color = '#1989fa'
    result.title = '人工审核中'
    result.desc = '您的资料已提交，管理员将在 24 小时内完成审核，请耐心等待。'
    activeStep.value = 2
  } catch (e) {
    showToast(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 检查已有状态
})
</script>

<style scoped>
.verify-page { min-height: 100vh; background: #f8fafc; }
.verify-content { padding: 20px 0; }
.verify-header-text { padding: 20px 32px; }
.v-title { font-size: 22px; font-weight: 900; color: #1e293b; }
.v-desc { font-size: 14px; color: #94a3b8; margin-top: 4px; }

.info-group { margin-top: 10px; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.03); }

.method-selection { padding: 0 24px; }
.m-title { font-size: 15px; font-weight: 700; color: #64748b; margin-bottom: 16px; }

.method-card {
  background: white; border-radius: 20px; padding: 20px;
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px; border: 1.5px solid transparent; transition: all 0.3s;
}
.method-card:active { transform: scale(0.98); }
.method-card.primary { border-color: rgba(22, 119, 255, 0.1); }
.method-card .m-left { display: flex; align-items: center; gap: 16px; }
.m-icon { font-size: 32px; }
.m-icon.alipay { color: #1677ff; }
.m-icon.manual { color: #64748b; }
.mt { font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 4px; }
.md { font-size: 12px; color: #94a3b8; }
.m-arrow { color: #ccc; }

.v-header-section { padding: 10px 0 24px; text-align: center; }
.v-header { font-size: 20px; font-weight: 900; color: #1e293b; margin-bottom: 6px; }
.v-header-desc { font-size: 13px; color: #94a3b8; }
.v-header-small { font-size: 15px; font-weight: 700; color: #475569; margin-bottom: 12px; text-align: center; }

.manual-stage { padding: 0 24px; }
.full-width { width: 100%; display: flex; justify-content: center; }
:deep(.van-uploader__wrapper) { width: 100%; justify-content: center; }
:deep(.van-uploader__input-wrapper) { width: 100%; }

.id-card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; justify-items: center; }
.id-card-box {
  width: 100%; height: 110px; background: #fff; border: 1.5px dashed #cbd5e1;
  border-radius: 16px; display: flex; flex-direction: column; align-items: center;
  justify-content: center; position: relative; overflow: hidden; transition: all 0.3s;
}
.id-card-box.has-img { border-style: solid; border-color: #11998e; background: #f0fdfa; }

.preview-img { width: 100%; height: 100%; object-fit: cover; }
.re-upload {
  position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6);
  color: #fff; font-size: 11px; padding: 4px 0; text-align: center; backdrop-filter: blur(4px);
}

.placeholder-content { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.upload-label { font-size: 11px; font-weight: 700; color: #64748b; }

/* 模拟身份证图标 */
.id-card-icon { width: 50px; height: 32px; border-radius: 4px; border: 1px solid #e2e8f0; position: relative; padding: 4px; }
.avatar-mock { width: 12px; height: 16px; background: #f1f5f9; border-radius: 2px; position: absolute; right: 4px; top: 4px; }
.line { height: 2px; background: #f1f5f9; margin-bottom: 3px; border-radius: 1px; width: 20px; }
.line.short { width: 10px; }
.emblem-mock { width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid #f1f5f9; margin: 0 auto 4px; }
.text-mock { font-size: 6px; color: #cbd5e1; text-align: center; }

/* 手持照盒子 */
.handheld-box {
  width: 100%; height: 180px; background: #fff; border: 1.5px dashed #cbd5e1;
  border-radius: 20px; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden; transition: all 0.3s;
}
.handheld-box.has-img { border-style: solid; border-color: #11998e; }
.handheld-box .placeholder-content { flex-direction: row; gap: 20px; padding: 0 20px; justify-content: center; width: 100%; }
.handheld-mock { width: 60px; height: 80px; border: 2px solid #f1f5f9; border-radius: 10px; position: relative; flex-shrink: 0; }
.person-mock { width: 30px; height: 30px; background: #f1f5f9; border-radius: 50%; margin: 15px auto 5px; }
.small-card-mock { width: 24px; height: 16px; background: #e2e8f0; border-radius: 2px; margin: 0 auto; border: 1px solid #fff; }
.mock-desc { text-align: left; }
.sub-label { font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: normal; }

.submit-bar { margin-top: 40px; padding-bottom: 40px; }
.v-submit-btn { height: 54px; font-size: 16px; font-weight: 900; background: linear-gradient(135deg, #1677ff 0%, #0052d9 100%); border: none; box-shadow: 0 10px 20px rgba(22, 119, 255, 0.2); }
.cancel-link { text-align: center; margin-top: 20px; color: #94a3b8; font-size: 13px; cursor: pointer; }

.loading-stage { padding: 80px 32px; text-align: center; }
.loading-stage .tip { margin: 20px 0; font-size: 13px; color: #94a3b8; }

.manual-stage { padding: 0 24px; }
.v-header { font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 20px; }
.uploader-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.u-item.wide { grid-column: span 2; }
.u-box {
  background: #fff; border: 2px dashed #e2e8f0; border-radius: 16px;
  height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: #94a3b8; font-size: 12px; overflow: hidden;
}
.u-item.wide .u-box { height: 160px; }
.u-box img { width: 100%; height: 100%; object-fit: cover; }
.u-box.has-img { border-style: solid; border-color: #11998e; }

.submit-bar { margin-top: 32px; }

.result-stage { text-align: center; padding: 80px 32px; }
.r-title { font-size: 24px; font-weight: 900; margin: 24px 0 12px; color: #1e293b; }
.r-desc { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 48px; }

.mt-20 { margin-top: 20px; }
:deep(.van-button) { font-weight: 800; height: 52px; border-radius: 16px; }
</style>
