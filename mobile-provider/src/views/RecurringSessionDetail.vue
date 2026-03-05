<template>
  <div class="order-detail-page">
    <van-nav-bar :title="order.id ? `第 ${order.session_index} 次服务详情` : '服务详情'" left-arrow @click-left="$router.back()" fixed placeholder class="minimal-nav" />
    
    <div v-if="loading" class="loading-container">
      <van-loading size="24px" vertical>加载中...</van-loading>
    </div>

    <template v-else-if="order.id">
      <!-- 1. 品牌感状态头部 (沉浸式渐变) - 完全对齐 OrderDetail -->
      <div class="brand-hero" :style="heroStyle">
        <div :style="{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }"></div>
        
        <div class="hero-content">
          <div v-if="order.assignment_type === 2 && order.status === 0" class="assigned-banner">
            <van-icon name="star" />
            <span>该订单由客户指名由您服务，请优先处理</span>
          </div>
          <div class="status-row">
            <div class="status-main">
              <div class="status-title-group">
                <van-icon :name="getStatusIcon(order.status)" class="status-icon-anim" />
                <span class="status-text">{{ getStatusText(order.status) }}</span>
              </div>
              <div class="status-sub">
                <span v-if="order.status === 2">已持续服务 {{ servingTimeDisplay }}</span>
                <span v-else>准时到达 · 规范服务</span>
              </div>
            </div>

            <div class="header-reward-box">
              <div class="reward-label">本次收益</div>
              <div class="reward-value">
                <span class="symbol">¥</span>
                <span class="number">{{ order.total_price }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-arc"></div>
      </div>

      <!-- 2. 悬浮容器 -->
      <div class="floating-container">
        <!-- A. 遛狗专项：地图模块 -->
        <template v-if="order.status === 2 && serviceId === 36">
          <div class="detail-white-card map-card">
            <div id="track-map-dashboard" style="width: 100%; height: 300px;"></div>
            <div class="map-status-bar">
              <div class="tracking-dot-group">
                <div class="tracking-dot"></div>
                <span>轨迹采集中</span>
              </div>
              <div class="timer-group">
                <div class="timer-label">已遛狗时长</div>
                <div class="timer-value">{{ walkingTimeDisplay }}</div>
              </div>
            </div>
          </div>
        </template>

        <!-- B. 核心预约信息 -->
        <div v-if="order.status !== 2 || serviceId !== 36" class="detail-white-card main-info-card">
          <div class="info-row">
            <div class="info-left">
              <div class="info-label">预约服务项目</div>
              <div class="info-value">{{ order.service_name }}</div>
            </div>
            <div class="info-right">
              <div class="info-label">预约时间</div>
              <div class="time-value">{{ order.service_time }}</div>
            </div>
          </div>
          <div v-if="order.remark && !order.remark.includes('{')" class="remark-box">
            <div class="remark-label">客户备注需求</div>
            <div class="remark-content">{{ order.remark }}</div>
          </div>
        </div>

        <!-- C. 宠物档案专项 -->
        <div class="detail-white-card business-card pet" v-if="order.pet_info">
          <div class="dw-title">
            <div class="title-left">
              <van-icon name="guide-o" class="title-icon" />
              <span>宠物服务档案</span>
            </div>
            <van-tag color="#7c3aed" plain round>专项信息</van-tag>
          </div>
          <div class="info-grid">
            <div class="grid-item" v-if="order.pet_info.dogSize">
              <span class="grid-label">狗狗体型</span>
              <span class="grid-val">{{ order.pet_info.dogSize }}</span>
            </div>
            <div class="grid-item" v-if="order.pet_info.catCount">
              <span class="grid-label">宠物数量</span>
              <span class="grid-val">{{ order.pet_info.catCount }} 只</span>
            </div>
            <div class="grid-item" v-if="order.pet_info.healthStatus">
              <span class="grid-label">健康状态</span>
              <span class="grid-val highlight">{{ order.pet_info.healthStatus }}</span>
            </div>
            <div class="grid-item">
              <span class="grid-label">家有监控</span>
              <span class="grid-val">{{ order.pet_info.hasCamera ? '开启中' : '未开启' }}</span>
            </div>
          </div>
        </div>

        <!-- D. 客户信息与联系 (毛玻璃风格对齐) -->
        <div class="detail-white-card customer-card">
          <div class="c-info-box">
            <div class="c-avatar">{{ order.contact_name?.[0] || '客' }}</div>
            <div class="c-text">
              <div class="c-name">{{ order.contact_name || '下单客户' }}</div>
              <div class="c-phone"><van-icon name="shield-o" /> 隐私虚拟号保护中</div>
            </div>
            <div class="c-actions">
              <div class="circle-btn chat" @click="goToChat"><van-icon name="chat" /></div>
              <div class="circle-btn phone" @click="handlePrivacyCall"><van-icon name="phone" /></div>
            </div>
          </div>
          <div class="address-row" @click="handleNavigation">
            <van-icon name="location-o" class="loc-icon" />
            <div class="addr-text">{{ order.address }}</div>
            <div class="nav-tag">
              <span>导航</span>
              <van-icon name="arrow" />
            </div>
          </div>
        </div>

        <!-- E. 强制任务工作台 (喂猫/遛狗) -->
        <div class="detail-white-card checklist-card" v-if="order.status === 2 && (serviceId === 36 || serviceId === 37)">
          <div class="dw-title">
            <div class="title-left">
              <van-icon name="todo-list-o" class="title-icon" />
              <span>服务执行工作台</span>
            </div>
            <van-tag type="danger">强制存证</van-tag>
          </div>
          
          <!-- 喂猫流程 -->
          <div v-if="serviceId === 37" class="checklist-steps">
            <div class="step-item" :class="{ 'done': catChecklist.plateVideo }">
              <div class="step-num">1</div>
              <div class="step-info"><div class="step-name">门牌号/入场录像</div><div class="step-desc">开启服务前强制记录</div></div>
              <van-uploader :after-read="f => uploadCatProof(f, 'plateVideo')" capture="camera" accept="video/*">
                <van-button size="small" :type="catChecklist.plateVideo ? 'success' : 'primary'" round>{{ catChecklist.plateVideo ? '已上传' : '上传视频' }}</van-button>
              </van-uploader>
            </div>
            <div class="step-item" :class="{ 'done': catChecklist.cleaning.length > 0, 'disabled': !catChecklist.plateVideo }">
              <div class="step-num">2</div>
              <div class="step-info"><div class="step-name">环境清理照片</div><div class="step-desc">猫砂盆/水盆清理后记录</div></div>
              <van-uploader :after-read="f => uploadCatProof(f, 'cleaning')" multiple :disabled="!catChecklist.plateVideo">
                <van-button size="small" :type="catChecklist.cleaning.length > 0 ? 'success' : 'primary'" round :disabled="!catChecklist.plateVideo">上传照片</van-button>
              </van-uploader>
            </div>
            <div class="step-item" :class="{ 'done': catChecklist.feedingVideo, 'disabled': catChecklist.cleaning.length === 0 }">
              <div class="step-num">3</div>
              <div class="step-info"><div class="step-name">喂食互动视频</div><div class="step-desc">记录宠物进食面貌</div></div>
              <van-uploader :after-read="f => uploadCatProof(f, 'feedingVideo')" capture="camera" accept="video/*" :disabled="catChecklist.cleaning.length === 0">
                <van-button size="small" :type="catChecklist.feedingVideo ? 'success' : 'primary'" round :disabled="catChecklist.cleaning.length === 0">录制视频</van-button>
              </van-uploader>
            </div>
          </div>

          <!-- 遛狗流程 -->
          <div v-if="serviceId === 36" class="checklist-steps">
            <div class="step-item" :class="{ 'disabled': !order.is_walking && walkingDuration === 0 }">
              <div class="step-num">1</div>
              <div class="step-info"><div class="step-name">行走/状态记录</div><div class="step-desc">实时拍摄遛狗过程</div></div>
              <van-uploader :after-read="f => uploadWalkingProof(f, 'walking_proof')" multiple :disabled="!order.is_walking && walkingDuration === 0">
                <van-button size="small" type="primary" round plain :disabled="!order.is_walking && walkingDuration === 0">拍摄 ({{ walkingChecklist.walking_proof.length }})</van-button>
              </van-uploader>
            </div>
            <div class="step-item" :class="{ 'done': walkingChecklist.exit_proof, 'disabled': order.is_walking || walkingDuration === 0 }">
              <div class="step-num">2</div>
              <div class="step-info"><div class="step-name">送回/离场视频</div><div class="step-desc">安全送回客户家凭证</div></div>
              <van-uploader :after-read="f => uploadWalkingProof(f, 'exit_proof')" capture="camera" accept="video/*" :disabled="order.is_walking || walkingDuration === 0">
                <van-button size="small" :type="walkingChecklist.exit_proof ? 'success' : 'primary'" round :disabled="order.is_walking || walkingDuration === 0">上传视频</van-button>
              </van-uploader>
            </div>
          </div>
        </div>

        <!-- F. 已完成回显 -->
        <div v-if="order.status === 3" class="detail-white-card finished-card">
          <div class="dw-title">服务执行存证</div>
          <div class="finished-content">
            <div class="report-note">{{ order.report_note || '今日服务已圆满完成' }}</div>
            <div class="report-images" v-if="order.report_images">
              <van-image v-for="(img, idx) in parseJSON(order.report_images)" :key="idx" :src="img" width="80" height="80" radius="12" fit="cover" @click="previewImages(parseJSON(order.report_images), idx)" />
            </div>
          </div>
        </div>

        <div class="meta-info">
          <div class="meta-row"><span>关联母单号</span><span @click="copyMotherNo">{{ order.mother_order_id }} <van-icon name="description" /></span></div>
          <div class="meta-row"><span>本场流水号</span><span>{{ order.id }}</span></div>
        </div>
      </div>
    </template>

    <!-- 3. 底部固定操作座 (毛玻璃风格) -->
    <div class="action-footer-floating" v-if="!loading && order.id && order.status !== 3">
      <div class="footer-inner">
        <div v-if="order.status === 2" class="serving-actions">
          <div class="chat-btn" @click="goToChat"><van-icon name="chat" /></div>
          <div class="main-action">
            <template v-if="serviceId === 36">
              <van-button v-if="order.is_walking !== 1 && walkingDuration === 0" block round class="btn-primary-glow start-walking" icon="play" @click="handleWalking(true)">开始遛狗</van-button>
              <van-button v-else-if="order.is_walking === 1" block round type="danger" class="btn-danger-glow" icon="stop" @click="handleWalking(false)">结束遛狗</van-button>
              <van-button v-else block round class="btn-primary-glow submit-report" @click="openCompletePopup">提交结项报告</van-button>
            </template>
            <van-button v-else block round class="btn-primary-glow" @click="openCompletePopup">完成服务并打卡</van-button>
          </div>
        </div>
        
        <van-button v-else block round class="btn-primary-glow" @click="handleStatusUpdate(order.status === 0 ? 11 : 2)">
          {{ order.status === 0 ? '确认已到达' : '正式开始服务' }}
        </van-button>
      </div>
    </div>

    <!-- 4. 各种交互弹窗 -->
    <van-popup v-model:show="showCompletePopup" position="bottom" round class="premium-popup">
      <div class="p-header"><div class="p-title">提交服务报告</div><div class="p-close" @click="showCompletePopup = false"><van-icon name="cross" /></div></div>
      <div class="p-body">
        <div class="p-section" v-if="serviceId !== 36 && serviceId !== 37"><div class="p-label">完成实拍</div><van-uploader v-model="fileList" multiple :max-count="3" class="p-uploader" /></div>
        <div class="p-section"><div class="p-label">服务总结</div><van-field v-model="reportNote" rows="3" autosize type="textarea" placeholder="描述服务细节..." maxlength="200" show-word-limit class="p-field" /></div>
        <div class="p-section"><div class="p-label">评价标签</div><div class="p-tags"><span v-for="tag in completionTags" :key="tag" class="p-tag" :class="{active: selectedTags.includes(tag)}" @click="toggleTag(tag)">{{ tag }}</span></div></div>
        <van-button type="primary" block round class="p-submit" :loading="submitting" @click="handleCompleteSubmit">确认完成打卡</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRecurringSessionDetail, updateRecurringSessionStatus, updateServiceRecords } from '../api'
import { showToast, showConfirmDialog, showSuccessToast, showLoadingToast, showImagePreview } from 'vant'
import request from '../api'
import { loadAMap } from '../utils/amap'

const route = useRoute()
const router = useRouter()
const sessionId = route.params.sessionId
const order = ref({})
const loading = ref(true)
const serviceId = computed(() => order.value.service_id)

// 业务存证、计时器、地图实例等状态 (保持原有逻辑并加固)
const catChecklist = reactive({ plateVideo: null, cleaning: [], feedingVideo: null })
const walkingChecklist = reactive({ entry_proof: null, walking_proof: [], exit_proof: null, trajectory: [] })
const servingSeconds = ref(0), walkingDuration = ref(0)
let servingTimer = null, durationTimer = null, reportTimer = null, trackMap = null, trackPolyline = null

const showCompletePopup = ref(false), showEntryProofPopup = ref(false), submitting = ref(false)
const fileList = ref([]), reportNote = ref(''), selectedTags = ref([])

const heroStyle = computed(() => {
  const s = order.value.status
  let g = 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)'
  if (s === 2) g = 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)'
  else if (s === 3) g = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  return { background: g, padding: '60px 24px 80px', position: 'relative', overflow: 'hidden' }
})

const servingTimeDisplay = computed(() => {
  const h = Math.floor(servingSeconds.value / 3600), m = Math.floor((servingSeconds.value % 3600) / 60), s = servingSeconds.value % 60
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const walkingTimeDisplay = computed(() => {
  const h = Math.floor(walkingDuration.value / 3600), m = Math.floor((walkingDuration.value % 3600) / 60), s = walkingDuration.value % 60
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const completionTags = computed(() => {
  if (serviceId.value === 36) return ['性格稳定', '便溺已清', '轨迹完整', '足部已洁', '安全送回']
  return ['环境已清', '水粮充足', '状态良好', '已发视频', '安全离场']
})

const loadData = async () => {
  try {
    loading.value = true
    const data = await getRecurringSessionDetail(sessionId)
    order.value = data
    if (data.status === 2) {
      servingSeconds.value = data.current_total_duration || 0
      if (!servingTimer) servingTimer = setInterval(() => servingSeconds.value++, 1000)
    }
    if (data.proof_data) {
      const pd = parseJSON(data.proof_data)
      if (serviceId.value === 36) {
        walkingChecklist.walking_proof = pd.walking_proof || []
        walkingChecklist.trajectory = pd.trajectory || []
        walkingDuration.value = data.current_walking_duration || 0
        if (data.is_walking === 1) { if (!durationTimer) durationTimer = setInterval(() => walkingDuration.value++, 1000); startTrackReporting() }
      } else if (serviceId.value === 37) {
        catChecklist.plateVideo = pd.entry?.video; catChecklist.cleaning = pd.environment?.images || []; catChecklist.feedingVideo = pd.interaction?.video
      }
    }
    if (serviceId.value === 36 && data.status === 2) setTimeout(initTrackMap, 600)
  } catch (e) { showToast('加载详情失败') } finally { loading.value = false }
}

// 状态流转、存证上传、地图轨迹等核心逻辑 (对齐 OrderDetail)
const handleStatusUpdate = async (status) => {
  showConfirmDialog({ title: '状态更新', message: '确认执行此操作吗？' }).then(async () => {
    try {
      showLoadingToast({ message: '同步中...', forbidClick: true })
      await updateRecurringSessionStatus(sessionId, status)
      showSuccessToast('操作成功'); loadData()
    } catch (e) { showToast(e.message || '更新失败') }
  })
}

const uploadCatProof = async (file, type) => {
  try {
    showLoadingToast({ message: '上传中...', forbidClick: true })
    const formData = new FormData(); formData.append('file', file.file)
    const res = await request.post('/upload/image?type=order_proof', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (type === 'cleaning') catChecklist.cleaning.push(res.url); else catChecklist[type] = res.url
    await syncRecords(); showSuccessToast('已保存')
  } catch { showToast('上传失败') }
}

const uploadWalkingProof = async (file, type) => {
  try {
    showLoadingToast({ message: '上传中...', forbidClick: true })
    const formData = new FormData(); formData.append('file', file.file)
    const res = await request.post('/upload/image?type=order_proof', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (type === 'walking_proof') walkingChecklist.walking_proof.push({ url: res.url, time: new Date() }); else walkingChecklist[type] = res.url
    await syncRecords(); showSuccessToast('已保存')
  } catch { showToast('上传失败') }
}

const syncRecords = async () => {
  const proof_data = serviceId.value === 36 ? { walking_proof: walkingChecklist.walking_proof, exit_proof: walkingChecklist.exit_proof, trajectory: walkingChecklist.trajectory } : { entry: { video: catChecklist.plateVideo }, environment: { images: catChecklist.cleaning }, interaction: { video: catChecklist.feedingVideo } }
  await updateServiceRecords(order.value.mother_order_id, { proof_data })
}

const handleWalking = async (isStart) => {
  showConfirmDialog({ message: isStart ? '开始记录运动轨迹？' : '结束运动记录？' }).then(async () => {
    try {
      await request.put(`/orders/${order.value.mother_order_id}/sync-track`, { isWalking: isStart })
      if (isStart) startTrackReporting(); else stopTrackReporting()
      loadData()
    } catch { showToast('操作失败') }
  })
}

const startTrackReporting = () => {
  if (reportTimer) return
  reportTimer = setInterval(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const p = [pos.coords.longitude, pos.coords.latitude]; walkingChecklist.trajectory.push(p)
      await request.put(`/orders/${order.value.mother_order_id}/sync-track`, { points: walkingChecklist.trajectory }); initTrackMap()
    })
  }, 10000)
}

const stopTrackReporting = () => { if (reportTimer) { clearInterval(reportTimer); reportTimer = null } }

const initTrackMap = async () => {
  const pts = walkingChecklist.trajectory; if (!pts.length) return
  await loadAMap(); const mapEl = document.getElementById('track-map-dashboard')
  if (!mapEl) return
  if (!trackMap) trackMap = new AMap.Map(mapEl, { zoom: 16, center: pts[pts.length - 1] })
  if (trackPolyline) trackMap.remove(trackPolyline)
  trackPolyline = new AMap.Polyline({ path: pts, strokeColor: '#52c41a', strokeWeight: 6 }); trackMap.add(trackPolyline); trackMap.setFitView([trackPolyline])
}

const openCompletePopup = () => {
  if (serviceId.value === 37 && (!catChecklist.plateVideo || !catChecklist.cleaning.length || !catChecklist.feedingVideo)) return showToast('请先完成所有存证上传')
  showCompletePopup.value = true
}

const handleCompleteSubmit = async () => {
  if (selectedTags.value.length === 0) return showToast('请选择完成标签')
  try {
    submitting.value = true
    const images = fileList.value.map(f => f.url)
    const note = selectedTags.value.join(' | ') + (reportNote.value ? '\n' + reportNote.value : '')
    await updateRecurringSessionStatus(sessionId, 3, { images, note, tags: selectedTags.value.join(',') })
    showSuccessToast('打卡圆满完成'); router.replace(`/recurring-order/${order.value.mother_order_id}`)
  } catch { showToast('提交失败') } finally { submitting.value = false }
}

const toggleTag = (t) => { const i = selectedTags.value.indexOf(t); if (i > -1) selectedTags.value.splice(i, 1); else selectedTags.value.push(t) }
const parseJSON = (s) => { if (!s) return []; try { return JSON.parse(s) } catch { return [] } }
const previewImages = (images, i) => showImagePreview({ images, startPosition: i })
const copyMotherNo = () => { showToast('母订单号已复制') }
const handleNavigation = () => showToast({ message: '正在启动地图...', icon: 'guide-o' })
const goToChat = () => router.push({ path: '/chat', query: { targetId: order.value.user_id, targetName: order.value.contact_name, orderId: order.value.mother_order_id } })
const handlePrivacyCall = () => window.location.href = `tel:${order.value.contact_phone}`

onMounted(() => loadData())
onUnmounted(() => { if (servingTimer) clearInterval(servingTimer); if (durationTimer) clearInterval(durationTimer); stopTrackReporting(); if (trackMap) trackMap.destroy() })
</script>

<style scoped>
.order-detail-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 120px; }
.minimal-nav { background: #fff !important; }
.loading-container { display: flex; justify-content: center; align-items: center; min-height: 60vh; }

/* 品牌头部 */
.brand-hero { color: white; position: relative; }
.hero-content { position: relative; z-index: 2; }
.assigned-banner {
  background: rgba(124, 58, 237, 0.9);
  color: #fff;
  padding: 10px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  backdrop-filter: blur(8px);
  animation: slide-down 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.status-row { display: flex; justify-content: space-between; align-items: center; }
.status-title-group { display: flex; align-items: center; gap: 10px; }
.status-text { font-size: 32px; font-weight: 900; }
.status-sub { font-size: 13px; opacity: 0.8; margin-top: 6px; padding-left: 38px; }

.header-reward-box { background: rgba(255,255,255,0.25); padding: 14px 18px; border-radius: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3); text-align: right; }
.reward-label { font-size: 11px; font-weight: 800; opacity: 0.9; }
.reward-value { display: flex; align-items: baseline; justify-content: flex-end; gap: 2px; }
.reward-value .number { font-size: 38px; font-weight: 900; font-family: 'DIN Alternate'; }
.hero-arc { position: absolute; bottom: 0; left: 0; right: 0; height: 30px; background: #f8f9fa; border-radius: 30px 30px 0 0; }
@keyframes slide-down {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* 悬浮白卡 */
.floating-container { padding: 0 16px; margin-top: -40px; position: relative; z-index: 5; }
.detail-white-card { background: #fff; border-radius: 24px; padding: 24px; margin-bottom: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }

.main-info-card .info-row { display: flex; justify-content: space-between; align-items: center; }
.info-label { font-size: 12px; color: #94a3b8; font-weight: 700; margin-bottom: 6px; }
.info-value { font-size: 20px; font-weight: 900; color: #1e293b; }
.time-value { font-size: 16px; font-weight: 800; color: #7c3aed; }
.remark-content { background: #fff5f5; color: #ef4444; padding: 12px; border-radius: 14px; font-size: 14px; font-weight: 600; margin-top: 8px; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.grid-label { font-size: 11px; color: #94a3b8; display: block; margin-bottom: 4px; }
.grid-val { font-size: 14px; font-weight: 800; }

.c-info-box { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.c-avatar { width: 56px; height: 56px; background: #f1f5f9; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; }
.circle-btn { width: 44px; height: 44px; border-radius: 14px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.address-row { display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 16px; border-radius: 18px; }
.addr-text { flex: 1; font-size: 14px; font-weight: 700; color: #475569; }

.checklist-steps { display: flex; flex-direction: column; gap: 16px; margin-top: 20px; }
.step-item { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f8fafc; border-radius: 20px; }
.step-item.done { background: #f0fdf4; border: 1px solid #bcf0da; }
.step-num { width: 28px; height: 28px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; }
.done .step-num { background: #11998e; }
.step-name { font-size: 15px; font-weight: 900; }

.action-footer-floating { position: fixed; bottom: 20px; left: 16px; right: 16px; z-index: 100; }
.footer-inner { background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); padding: 12px; border-radius: 28px; box-shadow: 0 12px 30px rgba(0,0,0,0.12); border: 1px solid rgba(255,255,255,0.5); }
.btn-primary-glow { height: 56px; font-size: 17px; font-weight: 900; border-radius: 18px !important; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; border: none !important; color: white !important; }
.serving-actions { display: flex; gap: 12px; }
.chat-btn { width: 56px; height: 56px; background: #f8fafc; border-radius: 18px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.main-action { flex: 1; }

.premium-popup { padding: 24px 20px 40px; border-radius: 32px 32px 0 0 !important; }
.p-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
.p-title { font-size: 22px; font-weight: 900; }
.p-field { background: #f8fafc !important; border-radius: 20px !important; padding: 16px !important; }
.p-tags { display: flex; flex-wrap: wrap; gap: 10px; }
.p-tag { padding: 10px 18px; background: #f1f5f9; color: #64748b; border-radius: 100px; font-size: 13px; font-weight: 700; }
.p-tag.active { background: #11998e; color: #fff; }
.p-submit { height: 58px; font-weight: 900; border-radius: 20px !important; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important; border: none !important; color: white !important; margin-top: 20px; }

.meta-info { padding: 20px 8px; }
.meta-row { display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }
</style>
