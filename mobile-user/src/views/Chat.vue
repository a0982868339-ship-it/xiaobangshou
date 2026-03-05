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

    <!-- 2. 订单上下文浮窗 (轻量质感) -->
    <div v-if="currentOrder" class="order-context-chip" @click="viewOrderById(currentOrder.id)">
      <div class="oc-tag">当前订单</div>
      <div class="oc-name">{{ currentOrder.service_name }}</div>
      <div class="oc-price">¥{{ currentOrder.total_price }}</div>
      <van-icon name="arrow" class="oc-arrow" />
    </div>

    <!-- 3. 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-for="(msg, index) in messageList" :key="msg.ID || index" class="message-item" :class="{ 'mine': msg.from === myUserId }">
        <div class="time-divider" v-if="shouldShowTime(msg, index)">
          <span>{{ formatTime(msg.time) }}</span>
        </div>

        <div class="msg-box">
          <van-image
            class="msg-avatar"
            :src="msg.from === myUserId ? myAvatar : targetAvatar"
            @click="msg.from !== myUserId && openProviderInfo()"
          />
          <div class="msg-content">
            <div v-if="msg.type === 'TIMTextElem'" class="bubble">
              {{ msg.payload.text }}
            </div>
            
            <div v-else-if="msg.type === 'TIMImageElem'" class="image-bubble" @click="previewImage(msg)">
              <van-image :src="msg.payload.imageInfoArray[1].url" radius="16" fit="contain" />
            </div>

            <div v-else-if="msg.type === 'TIMCustomElem' && msg.payload.data === 'order_card'" class="order-card-premium" @click="viewOrder(msg)">
              <div class="ocp-header">服务订单</div>
              <div class="ocp-body">
                <div class="ocp-name">{{ parseOrder(msg.payload.description).serviceName }}</div>
                <div class="ocp-price">¥{{ parseOrder(msg.payload.description).price }}</div>
              </div>
              <div class="ocp-footer">点击查看详情</div>
            </div>

            <div class="msg-info" v-if="msg.from === myUserId">
              <span class="read-status" :class="{ 'is-read': msg.isPeerRead }">
                {{ msg.isPeerRead ? '已读' : '未读' }}
              </span>
              <van-loading v-if="msg.status === 'unSend'" size="10px" />
              <van-icon v-else-if="msg.status === 'fail'" name="warning" color="#ee0a24" />
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
            placeholder="询问详情..."
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
          <div class="ext-item" @click="toggleOrderPicker">
            <div class="ext-icon"><van-icon name="orders-o" /></div>
            <span>发订单</span>
          </div>
        </div>
      </transition>
    </div>

    <!-- 订单选择器 -->
    <van-popup v-model:show="showOrderPicker" position="bottom" round style="height: 60%">
      <div class="order-picker-title">选择要发送的订单</div>
      <div class="order-list-mini">
        <div v-for="order in userOrders" :key="order.id" class="mini-order-card" @click="sendOrderCard(order)">
          <div class="mo-header">
            <span class="mo-no">订单: {{ order.order_no.slice(-8) }}</span>
            <van-tag plain type="primary">{{ getStatusText(order.status) }}</van-tag>
          </div>
          <div class="mo-body">
            <div class="mo-name">{{ order.service_name }}</div>
            <div class="mo-price">¥{{ order.total_price }}</div>
          </div>
        </div>
        <van-empty v-if="userOrders.length === 0" description="暂无订单记录" />
      </div>
    </van-popup>

    <!-- 隐藏的图片上传 input -->
    <input type="file" ref="imageInput" accept="image/*" style="display: none" @change="handleFileChange">

    <!-- 服务者信息弹窗 (同步美化版本) -->
    <van-popup v-model:show="showProviderInfo" round position="bottom" style="height: 75%">
      <div class="provider-info-panel" v-if="providerDetail">
        <div class="panel-top-bg"></div>
        <div class="panel-header">
          <van-image :src="targetAvatar" round width="80" height="80" class="panel-avatar" />
          <div class="panel-main-info">
            <div class="panel-name-row">
              <span class="panel-name">{{ providerDetail.name || targetName }}</span>
              <van-tag type="success" size="small" plain round v-if="providerDetail.verify_status === 1">已实名</van-tag>
            </div>
            <div class="panel-rating">
              <van-rate :model-value="Number(providerDetail.rating || 5)" readonly allow-half size="18" color="#ffd21e" />
              <span class="rating-text">{{ Number(providerDetail.rating || 5).toFixed(1) }}分</span>
            </div>
          </div>
        </div>

        <div class="panel-stats-grid">
          <div class="stat-box">
            <div class="stat-val">{{ providerDetail.completedCount || 0 }}</div>
            <div class="stat-label">服务单数</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">{{ providerDetail.experienceYears || 1 }}年</div>
            <div class="stat-label">从业经验</div>
          </div>
          <div class="stat-box">
            <div class="stat-val">100%</div>
            <div class="stat-label">好评率</div>
          </div>
        </div>

        <div class="panel-content">
          <div class="panel-section">
            <div class="section-title">评价标签</div>
            <div class="tags-container">
              <div v-for="tag in providerDetail.tags" :key="tag.label" class="didi-tag" :class="tag.type">
                {{ tag.label }} {{ tag.count }}
              </div>
            </div>
          </div>

          <div class="panel-section">
            <div class="section-title">资质认证</div>
            <div class="cert-list">
              <div class="cert-item">
                <van-icon name="checked" color="#07c160" />
                <span>实名身份已核实</span>
              </div>
              <div class="cert-item" v-if="providerDetail.health_cert_status === 1">
                <van-icon name="checked" color="#07c160" />
                <span>健康证明已验真</span>
              </div>
              <div class="cert-item">
                <van-icon name="checked" color="#07c160" />
                <span>平台服务险覆盖</span>
              </div>
              <div class="cert-item">
                <van-icon name="checked" color="#07c160" />
                <span>无忧售后保障</span>
              </div>
            </div>
          </div>

          <div class="panel-section" v-if="providerDetail.description">
            <div class="section-title">个人简介</div>
            <div class="panel-desc">{{ providerDetail.description }}</div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TIM from 'tim-js-sdk'
import TIMUploadPlugin from 'tim-upload-plugin'
import { initTIM as getGlobalTIM } from '../utils/im'
import request from '../api' // 假设你有 api 封装
import { showToast, showLoadingToast, closeToast, showImagePreview } from 'vant'

const route = useRoute()
const router = useRouter()
const targetId = route.query.targetId // 对方的 ID
const targetName = route.query.targetName || '聊天'
const myUserId = ref('')
const inputText = ref('')
const messageList = ref([])
const messageListRef = ref(null)
const showMoreActions = ref(false)
const imageInput = ref(null)
const currentOrder = ref(null)
const showProviderInfo = ref(false)
const providerDetail = ref(null)
const myAvatar = ref('https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg')
const targetAvatar = ref('https://fastly.jsdelivr.net/npm/@vant/assets/ipad.jpeg')
const showOrderPicker = ref(false)
const userOrders = ref([])

let tim = null

// --- 时间处理工具 ---
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  return isToday 
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const shouldShowTime = (msg, index) => {
  if (index === 0) return true;
  const prevMsg = messageList.value[index - 1];
  return msg.time - prevMsg.time > 300; 
}

// --- 图片处理 ---
const chooseImage = (type) => {
  if (type === 'camera') {
    imageInput.value.setAttribute('capture', 'camera');
  } else {
    imageInput.value.removeAttribute('capture');
  }
  imageInput.value.click();
}

const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const message = tim.createImageMessage({
    to: String(targetId),
    conversationType: TIM.TYPES.CONV_C2C,
    payload: { file }
  });
  
  sendMessageToSDK(message);
  showMoreActions.value = false;
  e.target.value = ''; 
}

// --- 订单处理 ---
const viewOrderById = (id) => {
  router.push(`/order/${id}`);
}

const loadOrderAndProvider = async () => {
  try {
    const orderId = route.query.orderId;
    if (orderId) {
      const res = await request.get(`/orders/${orderId}`);
      currentOrder.value = res.data || res;
    }
    
    // 如果是客服聊天，跳过加载服务者详情逻辑
    if (route.query.isSupport) {
      targetAvatar.value = 'https://fastly.jsdelivr.net/npm/@vant/assets/ipad.jpeg'; // 客服默认头像
      return;
    }

    // 加载服务者信息 (假设 targetId 是服务者 ID)
    const pRes = await request.get(`/providers/${targetId}`);
    const detail = pRes.data || pRes;
    providerDetail.value = detail;
    if (detail?.avatar) {
      targetAvatar.value = detail.avatar;
    }
    
    // 加载个人信息获取头像
    const uRes = await request.get('/auth/me');
    if (uRes.data?.avatar || uRes.avatar) {
      myAvatar.value = uRes.data?.avatar || uRes.avatar;
    }
  } catch (e) {
    console.error('加载信息失败:', e);
  }
}

const openProviderInfo = async () => {
  // 如果是客服，暂时不支持查看详情
  if (route.query.isSupport) return;
  
  showProviderInfo.value = true;
  // 如果之前没加载过详情，则加载
  if (!providerDetail.value) {
    try {
      const pRes = await request.get(`/providers/${targetId}`);
      providerDetail.value = pRes.data || pRes;
    } catch (e) {}
  }
}

const viewOrder = (msg) => {
  const order = parseOrder(msg.payload.description);
  router.push(`/order/${order.id}`);
}

const parseOrder = (desc) => {
  try { return JSON.parse(desc); } catch (e) { return {}; }
}

const previewImage = (msg) => {
  const url = msg.payload.imageInfoArray[0].url;
  showImagePreview([url]);
}

const toggleOrderPicker = async () => {
  showOrderPicker.value = true;
  if (userOrders.value.length === 0) {
    try {
      // 获取当前用户的所有订单
      const res = await request.get('/orders');
      userOrders.value = res.data || res;
    } catch (e) {}
  }
}

const sendOrderCard = (order) => {
  const message = tim.createCustomMessage({
    to: String(targetId),
    conversationType: TIM.TYPES.CONV_C2C,
    payload: {
      data: 'order_card',
      description: JSON.stringify({
        id: order.id,
        orderNo: order.order_no,
        serviceName: order.service_name,
        price: order.total_price
      }),
      extension: ''
    }
  });
  sendMessageToSDK(message);
  showOrderPicker.value = false;
  showMoreActions.value = false;
}

// 统一发送逻辑
const sendMessageToSDK = async (message) => {
  try {
    messageList.value.push(message);
    scrollToBottom();
    const response = await tim.sendMessage(message);
    
    // 手动触发状态更新，消除 Loading
    const index = messageList.value.findIndex(m => m.ID === message.ID);
    if (index > -1) {
      messageList.value[index] = response.data.message;
    }
  } catch (e) {
    console.error('发送失败:', e);
    message.status = 'fail';
    if (e.code === 80004) {
      showToast('消息包含敏感内容，发送失败');
    } else {
      showToast('发送失败');
    }
  }
}

// 定义全局监听器函数，用于清理
let onReadyGlobal = null
let onMessageReceivedGlobal = null
let onMessageReadByPeerGlobal = null

onUnmounted(() => {
  if (tim) {
    if (onReadyGlobal) tim.off(TIM.EVENT.SDK_READY, onReadyGlobal)
    if (onMessageReceivedGlobal) tim.off(TIM.EVENT.MESSAGE_RECEIVED, onMessageReceivedGlobal)
    if (onMessageReadByPeerGlobal) tim.off(TIM.EVENT.MESSAGE_READ_BY_PEER, onMessageReadByPeerGlobal)
  }
})

// 初始化 TIM
const initTIM = async (sdkAppID, userSig, userId) => {
  myUserId.value = userId
  tim = getGlobalTIM(sdkAppID)

  // 1. 监听 SDK Ready
  onReadyGlobal = () => {
    console.log('[Chat] SDK 已就绪，加载聊天记录')
    loadHistory()
  }
  tim.on(TIM.EVENT.SDK_READY, onReadyGlobal)

  // 2. 监听消息
  onMessageReceivedGlobal = (event) => {
    const list = event.data.filter(m => String(m.from) === String(targetId))
    if (list.length > 0) {
      messageList.value.push(...list)
      // 收到消息立即发送已读回执
      tim.setMessageRead({ conversationID: `C2C${targetId}` })
      scrollToBottom()
    }
  }
  tim.on(TIM.EVENT.MESSAGE_RECEIVED, onMessageReceivedGlobal)

  // 3. 监听对方已读回执
  onMessageReadByPeerGlobal = (event) => {
    if (event.data[0].conversationID === `C2C${targetId}`) {
      messageList.value.forEach(msg => {
        if (msg.from === myUserId.value) msg.isPeerRead = true
      })
    }
  }
  tim.on(TIM.EVENT.MESSAGE_READ_BY_PEER, onMessageReadByPeerGlobal)

  try {
    const loginInfo = await tim.getLoginUser();
    if (loginInfo.data === userId) {
      // 已登录，SDK_READY 事件会自动触发 loadHistory
      console.log('[Chat] 已登录，等待 SDK 就绪...')
    } else {
      await tim.login({ userID: userId, userSig });
    }
  } catch (e) {
    await tim.login({ userID: userId, userSig })
  }
}

// 已移除 waitForSDKReady - 改用 SDK_READY 事件自动触发

// 加载历史记录
const loadHistory = async () => {
  try {
    const res = await tim.getMessageList({ conversationID: `C2C${targetId}` })
    messageList.value = res.data.messageList
    scrollToBottom()
    // 标记已读，通知对方
    tim.setMessageRead({ conversationID: `C2C${targetId}` })
  } catch (e) {}
}

// 违规词库配置
const BANNED_KEYWORDS = ['微信', '加我', '手机号', '电话', '联系方式', 'QQ', '扫码', '二维码', '支付宝', '转账', '私下', '外快'];
const PHONE_REGEX = /1[3-9]\d{9}/; // 匹配中国大陆手机号
const NUMBER_REGEX = /\d{7,11}/; // 匹配 7-11 位连续数字（可能是QQ或短号）

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text) return
  
  // --- 核心：多维风控拦截 ---
  // 优化：如果是客服聊天，放行联系方式拦截
  const isSupport = route.query.isSupport === '1' || route.query.isSupport === 1;
  if (!isSupport) {
    const foundWord = BANNED_KEYWORDS.find(word => text.includes(word));
    const hasContactInfo = PHONE_REGEX.test(text) || NUMBER_REGEX.test(text);

    if (foundWord || hasContactInfo) {
      showToast({
        message: '消息包含联系方式或违规词，已被系统拦截。请在平台内合规沟通。',
        duration: 3000,
        wordBreak: 'break-all'
      });
      return;
    }
  }
  
  const message = tim.createTextMessage({
    to: String(targetId),
    conversationType: TIM.TYPES.CONV_C2C,
    payload: { text: text }
  })

  inputText.value = ''
  await sendMessageToSDK(message)
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

onMounted(async () => {
  loadOrderAndProvider();
  try {
    const res = await request.get('/system/im-sig')
    const data = res.data || res
    const { sdkAppID, userSig, userId } = data
    await initTIM(sdkAppID, userSig, userId)
  } catch (e) {
    console.error('通信初始化失败', e)
  }
})

onUnmounted(() => {
  // 不再销毁 TIM 实例
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

/* 订单选择器 */
.order-picker-title { padding: 20px; text-align: center; font-size: 16px; font-weight: 800; color: #1a1a1a; border-bottom: 1px solid #f5f5f5; }
.order-list-mini { padding: 16px; overflow-y: auto; height: calc(100% - 60px); }
.mini-order-card { background: #f9f9f9; padding: 16px; border-radius: 16px; margin-bottom: 12px; }
.mo-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.mo-no { font-size: 12px; color: #999; }
.mo-body { display: flex; justify-content: space-between; align-items: center; }
.mo-name { font-size: 15px; font-weight: 800; color: #333; }
.mo-price { color: #ee0a24; font-weight: bold; }

/* 服务者信息弹窗 */
.provider-info-panel { padding: 0; background: #fff; }
.panel-top-bg { height: 80px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); position: relative; }
.panel-header { display: flex; flex-direction: column; align-items: center; margin-top: -40px; padding: 0 20px; position: relative; z-index: 1; }
.panel-avatar { border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: #fff; }
.panel-main-info { text-align: center; margin-top: 12px; width: 100%; }
.panel-name-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; }
.panel-name { font-size: 22px; font-weight: bold; color: #323233; }
.panel-rating { display: flex; align-items: center; justify-content: center; gap: 8px; }
.rating-text { font-size: 16px; color: #ff9900; font-weight: bold; }
.panel-stats-grid { display: flex; justify-content: space-around; background: #f8f9fa; border-radius: 16px; padding: 20px 10px; margin: 24px 20px; }
.stat-box { flex: 1; text-align: center; position: relative; }
.stat-box:not(:last-child)::after { content: ''; position: absolute; right: 0; top: 20%; height: 60%; width: 1px; background: #ddd; }
.stat-val { font-size: 20px; font-weight: 800; color: #323233; margin-bottom: 4px; }
.stat-label { font-size: 12px; color: #969799; }
.panel-content { padding: 0 20px 30px; }
.panel-section { margin-bottom: 24px; }
.section-title { font-size: 16px; font-weight: bold; color: #323233; margin-bottom: 12px; display: flex; align-items: center; }
.section-title::before { content: ''; width: 4px; height: 16px; background: #11998e; border-radius: 2px; margin-right: 8px; }
.tags-container { display: flex; flex-wrap: wrap; gap: 10px; }
.didi-tag { background: #f5f7fa; color: #646566; padding: 8px 14px; border-radius: 20px; font-size: 13px; border: 1px solid #eee; }
.didi-tag.success { background: #f0fff4; color: #07c160; border-color: #d1f2d9; }
.didi-tag.primary { background: #f0f7ff; color: #11998e; border-color: #d1e9ff; }
.didi-tag.warning { background: #fffaf0; color: #ff9900; border-color: #ffe8d1; }
.cert-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cert-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #07c160; background: #f0fff4; padding: 8px 12px; border-radius: 8px; }
.panel-desc { font-size: 14px; color: #666; line-height: 1.6; background: #f9f9f9; padding: 15px; border-radius: 12px; border: 1px solid #f0f0f0; }
</style>
