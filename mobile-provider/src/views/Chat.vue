<template>
  <div class="chat-page">
    <!-- 1. 极简品牌感导航栏 -->
    <van-nav-bar
      :title="targetName"
      left-arrow
      @click-left="$router.back()"
      fixed
      placeholder
      class="premium-nav"
    />

    <!-- 2. 订单上下文浮窗 (黑金/高级灰质感) -->
    <div v-if="currentOrder" class="order-context-chip" @click="viewOrderById(currentOrder.id)">
      <div class="oc-tag">当前订单</div>
      <div class="oc-name">{{ currentOrder.service_name }}</div>
      <div class="oc-price">¥{{ currentOrder.total_price }}</div>
      <van-icon name="arrow" class="oc-arrow" />
    </div>

    <!-- 3. 消息列表 (呼吸感布局) -->
    <div class="message-list" ref="messageListRef">
      <div v-for="(msg, index) in messageList" :key="msg.ID || index" class="message-item" :class="{ 'mine': msg.from === myUserId }">
        <!-- 时间分割线 -->
        <div class="time-divider" v-if="shouldShowTime(msg, index)">
          <span>{{ formatTime(msg.time) }}</span>
        </div>

        <div class="msg-box">
          <van-image
            class="msg-avatar"
            :src="msg.from === myUserId ? myAvatar : targetAvatar"
          />
          <div class="msg-content">
            <!-- 文字气泡 -->
            <div v-if="msg.type === 'TIMTextElem'" class="bubble">
              {{ msg.payload.text }}
            </div>
            
            <!-- 图片气泡 -->
            <div v-else-if="msg.type === 'TIMImageElem'" class="image-bubble" @click="previewImage(msg)">
              <van-image :src="msg.payload.imageInfoArray[1].url" radius="16" fit="contain" />
            </div>

            <!-- 订单卡片 (质感升级) -->
            <div v-else-if="msg.type === 'TIMCustomElem' && msg.payload.data === 'order_card'" class="order-card-premium" @click="viewOrder(msg)">
              <div class="ocp-header">服务订单</div>
              <div class="ocp-body">
                <div class="ocp-name">{{ parseOrder(msg.payload.description).serviceName }}</div>
                <div class="ocp-price">¥{{ parseOrder(msg.payload.description).price }}</div>
              </div>
              <div class="ocp-footer">点击查看详情</div>
            </div>

            <!-- 状态标识 -->
            <div class="msg-info" v-if="msg.from === myUserId">
              <span class="read-status" :class="{ 'is-read': msg.isPeerRead }">
                {{ msg.isPeerRead ? '已读' : '未读' }}
              </span>
              <van-loading v-if="msg.status === 'unSend'" size="10px" />
              <van-icon v-else-if="msg.status === 'fail'" name="warning" color="#ee0a24" @click="resendMessage(msg)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 磨砂质感底部栏 -->
    <div class="chat-footer-premium">
      <div class="input-panel">
        <div class="plus-btn" @click="showMoreActions = !showMoreActions" :class="{ 'active': showMoreActions }">
          <van-icon name="plus" />
        </div>
        <div class="input-container">
          <van-field
            v-model="inputText"
            placeholder="打个招呼吧..."
            :border="false"
            @keyup.enter="sendMessage"
            class="field-custom"
          />
        </div>
        <transition name="van-fade">
          <div v-if="inputText.trim()" class="send-btn-wrap" @click="sendMessage">
            <van-icon name="arrow-up" />
          </div>
        </transition>
      </div>
      
      <!-- 扩展功能 -->
      <transition name="van-slide-up">
        <div v-if="showMoreActions" class="ext-panel">
          <div class="ext-item" @click="chooseImage('album')">
            <div class="ext-icon"><van-icon name="photo" /></div>
            <span>照片</span>
          </div>
          <div class="ext-item" @click="chooseImage('camera')">
            <div class="ext-icon"><van-icon name="photograph" /></div>
            <span>拍照</span>
          </div>
        </div>
      </transition>
    </div>

    <input type="file" ref="imageInput" accept="image/*" style="display: none" @change="handleFileChange">
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TIM from 'tim-js-sdk'
import { initTIM as getGlobalTIM } from '../utils/im'
import request from '../api' 
import { showToast, showImagePreview } from 'vant'

const route = useRoute()
const router = useRouter()
const targetId = route.query.targetId 
const targetName = route.query.targetName || '客户'
const myUserId = ref('')
const inputText = ref('')
const messageList = ref([])
const messageListRef = ref(null)
const showMoreActions = ref(false)
const currentOrder = ref(null)
const imageInput = ref(null)
const myAvatar = ref('https://fastly.jsdelivr.net/npm/@vant/assets/ipad.jpeg')
const targetAvatar = ref('https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg')

let tim = null

const shouldShowTime = (msg, index) => {
  if (index === 0) return true
  return msg.time - messageList.value[index - 1].time > 300
}

const formatTime = (time) => {
  const date = new Date(time * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const options = { hour: '2-digit', minute: '2-digit', hour12: false }
  return isToday ? date.toLocaleTimeString([], options) : `${date.getMonth() + 1}-${date.getDate()} ${date.toLocaleTimeString([], options)}`
}

const chooseImage = (type) => {
  if (type === 'camera') imageInput.value.setAttribute('capture', 'camera')
  else imageInput.value.removeAttribute('capture')
  imageInput.value.click()
}

const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file || !tim) return
  const message = tim.createImageMessage({
    to: String(targetId),
    conversationType: TIM.TYPES.CONV_C2C,
    payload: { file }
  })
  sendMessageToSDK(message)
  showMoreActions.value = false
  e.target.value = ''
}

const viewOrderById = (id) => {
  const order = currentOrder.value
  if (order && String(order.id) === String(id)) {
    if (order.order_type == 1 || order.service_name?.includes('周期') || order.category_name?.includes('周期')) {
       const targetId = order.recurring_order_id || order.id
       return router.push(`/recurring-order/${targetId}`)
    }
  }
  router.push(`/order/${id}`)
}

const sendMessageToSDK = async (message) => {
  try {
    messageList.value.push(message)
    scrollToBottom()
    const response = await tim.sendMessage(message)
    const index = messageList.value.findIndex(m => m.ID === message.ID)
    if (index > -1) messageList.value[index] = response.data.message
  } catch (e) {
    message.status = 'fail'
    showToast(e.code === 80004 ? '消息包含敏感内容' : '发送失败')
  }
}

const loadContextData = async () => {
  try {
    const orderId = route.query.orderId
    if (orderId) {
      const res = await request.get(`/orders/${orderId}`)
      currentOrder.value = res.data || res
    }
    const [uRes, tRes] = await Promise.all([
      request.get('/auth/me'),
      request.get(`/users/${targetId}`).catch(() => ({}))
    ])
    myAvatar.value = uRes.avatar || myAvatar.value
    targetAvatar.value = tRes.avatar || targetAvatar.value
  } catch (e) {}
}

let onReady = null, onMsg = null, onRead = null

const initTIM = async (sdkAppID, userSig, userId) => {
  myUserId.value = userId
  tim = getGlobalTIM(sdkAppID)
  
  // 监听事件
  onReady = () => {
    console.log('[Chat] SDK 已就绪，加载聊天记录')
    loadHistory()
  }
  onMsg = (event) => {
    const list = event.data.filter(m => String(m.from) === String(targetId))
    if (list.length > 0) {
      messageList.value.push(...list)
      tim.setMessageRead({ conversationID: `C2C${targetId}` })
      scrollToBottom()
    }
  }
  onRead = (event) => {
    if (event.data[0].conversationID === `C2C${targetId}`) {
      messageList.value.forEach(msg => { if (msg.from === myUserId.value) msg.isPeerRead = true })
    }
  }
  
  tim.on(TIM.EVENT.SDK_READY, onReady)
  tim.on(TIM.EVENT.MESSAGE_RECEIVED, onMsg)
  tim.on(TIM.EVENT.MESSAGE_READ_BY_PEER, onRead)

  try {
    const loginInfo = await tim.getLoginUser()
    if (String(loginInfo.data) === String(userId)) {
      // 已登录，SDK_READY 事件会自动触发 loadHistory
      console.log('[Chat] 已登录，等待 SDK 就绪...')
    } else {
      // 如果已登录其他账号，先登出再登录
      if (loginInfo.data) await tim.logout()
      await tim.login({ userID: String(userId), userSig })
    }
  } catch (e) { 
    await tim.login({ userID: String(userId), userSig })
  }
}

// 已移除 waitForSDKReady - 改用 SDK_READY 事件自动触发

const loadHistory = async () => {
  try {
    const res = await tim.getMessageList({ conversationID: `C2C${targetId}` })
    messageList.value = res.data.messageList
    scrollToBottom()
    tim.setMessageRead({ conversationID: `C2C${targetId}` })
  } catch (e) {}
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || !tim) return
  const message = tim.createTextMessage({
    to: String(targetId),
    conversationType: TIM.TYPES.CONV_C2C,
    payload: { text }
  })
  inputText.value = ''
  await sendMessageToSDK(message)
}

const scrollToBottom = () => {
  nextTick(() => { if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight })
}

const previewImage = (msg) => showImagePreview([msg.payload.imageInfoArray[0].url])
const parseOrder = (desc) => { try { return JSON.parse(desc) } catch (e) { return {} } }

const viewOrder = (msg) => {
  const info = parseOrder(msg.payload.description)
  // 根据 serviceName 模糊判断周期单
  if (info.serviceName?.includes('周期')) {
    router.push(`/recurring-order/${info.id}`)
  } else {
    router.push(`/order/${info.id}`)
  }
}

onMounted(async () => {
  loadContextData()
  try {
    const res = await request.get('/system/im-sig')
    const { sdkAppID, userSig, userId } = res.data || res
    await initTIM(sdkAppID, userSig, userId)
  } catch (e) {}
})

onUnmounted(() => {
  if (tim) {
    tim.off(TIM.EVENT.SDK_READY, onReady)
    tim.off(TIM.EVENT.MESSAGE_RECEIVED, onMsg)
    tim.off(TIM.EVENT.MESSAGE_READ_BY_PEER, onRead)
  }
})
</script>

<style scoped>
.chat-page { 
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
  display: flex; flex-direction: column; background: #f8f9fa; 
}

/* 1. 导航栏 */
.premium-nav { background: #f8f9fa !important; }
:deep(.van-nav-bar__title) { font-weight: 800; color: #1a1a1a; }

/* 2. 订单浮窗 */
.order-context-chip {
  position: absolute; top: 56px; left: 16px; right: 16px;
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px);
  padding: 12px 16px; border-radius: 20px; display: flex;
  align-items: center; gap: 10px; z-index: 100;
  box-shadow: 0 10px 25px rgba(0,0,0,0.04);
  border: 1px solid rgba(0,0,0,0.02);
}
.oc-tag { font-size: 10px; background: #11998e; color: white; padding: 2px 8px; border-radius: 8px; font-weight: 800; }
.oc-name { flex: 1; font-size: 14px; font-weight: 700; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-price { font-size: 15px; font-weight: 800; color: #ee0a24; font-family: 'DIN Alternate'; }
.oc-arrow { color: #ccc; font-size: 14px; }

/* 3. 消息列表 */
.message-list { flex: 1; overflow-y: auto; padding: 80px 16px 40px; display: flex; flex-direction: column; gap: 24px; }

.time-divider { align-self: center; margin: 8px 0; }
.time-divider span { font-size: 11px; color: #bbb; }

.msg-box { display: flex; gap: 12px; }
.mine .msg-box { flex-direction: row-reverse; }
.msg-avatar { width: 42px; height: 42px; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

.msg-content { display: flex; flex-direction: column; max-width: 72%; gap: 4px; }
.mine .msg-content { align-items: flex-end; }

/* 气泡升级 */
.bubble { 
  padding: 12px 16px; border-radius: 20px; background: white; 
  font-size: 15px; color: #1a1a1a; line-height: 1.5; 
  box-shadow: 0 4px 15px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.03);
}
.mine .bubble { 
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); 
  color: #fff; border: none; box-shadow: 0 8px 20px rgba(17, 153, 142, 0.15);
  border-bottom-right-radius: 4px;
}
.message-item:not(.mine) .bubble { border-bottom-left-radius: 4px; }

.image-bubble { border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 4px solid #fff; }

/* 订单卡片升级 */
.order-card-premium {
  width: 240px; background: white; border-radius: 20px; overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #f0f0f0;
}
.ocp-header { background: #f8f9fa; padding: 10px 16px; font-size: 11px; color: #999; font-weight: 800; letter-spacing: 1px; }
.ocp-body { padding: 16px; }
.ocp-name { font-size: 16px; font-weight: 800; color: #1a1a1a; margin-bottom: 6px; }
.ocp-price { color: #ee0a24; font-weight: 900; font-size: 20px; font-family: 'DIN Alternate'; }
.ocp-footer { padding: 12px; text-align: center; color: #11998e; font-size: 12px; font-weight: 800; background: #f0f9f8; }

.msg-info { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.read-status { font-size: 10px; color: #ccc; }
.read-status.is-read { color: #11998e; font-weight: 800; }

/* 4. 底部输入栏 */
.chat-footer-premium { 
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(30px);
  padding: 12px 16px calc(12px + var(--van-safe-area-bottom-height));
  border-top: 1px solid rgba(0,0,0,0.05);
}
.input-panel { display: flex; align-items: center; gap: 12px; }
.plus-btn { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #1a1a1a; background: #f0f2f5; transition: all 0.3s; }
.plus-btn.active { transform: rotate(45deg); background: #1a1a1a; color: #fff; }

.input-container { flex: 1; background: #f0f2f5; border-radius: 20px; padding: 4px 4px; }
.field-custom { background: transparent; padding: 6px 12px; }

.send-btn-wrap { 
  width: 36px; height: 36px; border-radius: 50%; background: #11998e; 
  display: flex; align-items: center; justify-content: center; 
  color: white; font-size: 20px; box-shadow: 0 4px 10px rgba(17, 153, 142, 0.3);
  cursor: pointer;
}

.ext-panel {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
  padding: 24px 8px 12px;
}
.ext-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ext-icon { 
  width: 60px; height: 60px; background: white; border-radius: 20px;
  display: flex; align-items: center; justify-content: center; font-size: 26px; color: #1a1a1a;
  box-shadow: 0 8px 20px rgba(0,0,0,0.03); border: 1px solid #f5f5f5;
}
.ext-item span { font-size: 12px; color: #666; font-weight: 500; }
</style>
