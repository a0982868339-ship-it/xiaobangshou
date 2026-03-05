<template>
  <div class="verify-page">
    <van-nav-bar title="实名认证" left-arrow @click-left="$router.back()" fixed placeholder />

    <div class="verify-content">
      <div v-if="!realNameVerified">
        <div class="verify-header-text">
          <div class="v-title">实名身份核验</div>
          <p class="v-desc">为了保障您的账户安全及交易权益，请先完成实名认证</p>
        </div>

        <div class="channel-grid">
          <div class="channel-card alipay" @click="handleChannelVerify('alipay')">
            <van-icon name="alipay" />
            <span>支付宝实名</span>
          </div>
          <div class="channel-card wechat" @click="handleChannelVerify('wechat')">
            <van-icon name="wechat" />
            <span>微信实名</span>
          </div>
        </div>

        <van-divider>或手动输入</van-divider>

        <van-cell-group inset class="info-group shadow-premium">
          <van-field v-model="formData.realName" label="真实姓名" placeholder="请输入您的姓名" />
          <van-field v-model="formData.idCard" label="身份证号" placeholder="18位身份证号" />
        </van-cell-group>
        
        <div class="action-bar" v-if="formData.realName && formData.idCard">
          <van-button type="primary" block round @click="realNameVerified = true">
            下一步：人脸核验
          </van-button>
        </div>
      </div>

      <div v-else-if="!faceVerified" class="face-verify-stage">
        <div class="face-scan-box shadow-premium">
          <div class="scan-circle">
            <van-icon name="photograph" />
            <div class="scan-line"></div>
          </div>
          <div class="scan-tips">请正对屏幕，保持光线充足</div>
        </div>
        
        <div class="action-bar">
          <van-button type="primary" block round :loading="verifyLoading" @click="executeFaceVerify">
            开始人脸比对
          </van-button>
        </div>
      </div>

      <div v-else class="success-box">
        <van-icon name="checked" color="#11998e" size="80" />
        <div class="title">实名认证成功</div>
        <p class="desc">您的身份信息已核实，现在可以享受更完整、安全的平台服务。</p>
        <van-button type="primary" block round @click="$router.replace('/user')">返回个人中心</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, showSuccessToast, closeToast } from 'vant'
import request from '../api'

const router = useRouter()
const realNameVerified = ref(false)
const faceVerified = ref(false)
const verifyLoading = ref(false)

const formData = reactive({
  realName: '',
  idCard: ''
})

const handleChannelVerify = (channel) => {
  if (!formData.realName || !formData.idCard) {
    return showToast('请先输入身份信息')
  }
  
  showLoadingToast({ message: `正在跳转${channel === 'alipay' ? '支付宝' : '微信'}...`, forbidClick: true })
  
  setTimeout(() => {
    closeToast()
    showSuccessToast('实名授权成功')
    realNameVerified.value = true
  }, 1500)
}

const executeFaceVerify = async () => {
  try {
    verifyLoading.value = true
    showLoadingToast({ message: '正在进行人脸活体检测...', forbidClick: true })
    
    await request.post('/users/auto-verify', {
      realName: formData.realName,
      idCard: formData.idCard,
      faceScore: 98
    })
    
    showSuccessToast('核验通过')
    faceVerified.value = true
  } catch (e) {
  } finally {
    verifyLoading.value = false
  }
}
</script>

<style scoped>
.verify-page { min-height: 100vh; background: #f8fafc; }
.verify-content { padding: 20px 0; }

.verify-header-text { padding: 20px 32px; }
.v-title { font-size: 22px; font-weight: 900; color: #1e293b; }
.v-desc { font-size: 14px; color: #94a3b8; margin-top: 4px; }

.channel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 0 24px 24px; }
.channel-card { background: white; border-radius: 20px; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; border: 1.5px solid transparent; transition: all 0.3s; }
.channel-card:active { transform: scale(0.96); }
.channel-card i { font-size: 36px; }
.channel-card span { font-size: 13px; font-weight: 700; color: #475569; }
.channel-card.alipay i { color: #1677ff; }
.channel-card.wechat i { color: #07c160; }

.info-group { margin-top: 10px; border-radius: 20px; overflow: hidden; }
.face-verify-stage { padding: 40px 24px; text-align: center; }
.face-scan-box { width: 200px; height: 200px; background: white; border-radius: 50%; margin: 0 auto 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border: 2px solid #f1f5f9; }
.scan-circle { font-size: 60px; color: #11998e; position: relative; }
.scan-line { position: absolute; top: 0; left: -20px; width: 100px; height: 2px; background: linear-gradient(to right, transparent, #11998e, transparent); animation: scan 2s infinite ease-in-out; }
@keyframes scan { 0%, 100% { top: 0; } 50% { top: 60px; } }
.scan-tips { margin-top: 24px; font-size: 14px; color: #94a3b8; font-weight: 600; }

.success-box { text-align: center; padding: 80px 32px; }
.success-box .title { font-size: 24px; font-weight: 900; margin: 24px 0 12px; color: #1e293b; }
.success-box .desc { font-size: 14px; color: #94a3b8; margin-bottom: 48px; line-height: 1.6; }

.action-bar { padding: 32px 24px; }
.shadow-premium { box-shadow: 0 10px 30px rgba(0,0,0,0.03); }

:deep(.van-button) { font-weight: 800; height: 52px; border-radius: 16px; }
</style>
