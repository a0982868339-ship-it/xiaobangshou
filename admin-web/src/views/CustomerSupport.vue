<template>
  <div class="support-center p-10">
    <el-container class="support-container">
      <!-- 左侧：会话列表 -->
      <el-aside width="300px" class="session-sidebar">
        <div class="sidebar-header">
          <el-input v-model="searchUser" placeholder="搜索用户ID/昵称" prefix-icon="Search" size="small" />
        </div>
        <div class="session-list">
          <div 
            v-for="session in sessions" 
            :key="session.userID" 
            class="session-item"
            :class="{ 'active': activeSession?.userID === session.userID }"
            @click="selectSession(session)"
          >
            <el-badge :value="session.unreadCount" :hidden="session.unreadCount === 0" class="unread-badge">
              <div class="avatar">{{ (session.userProfile?.nick || session.userID || 'U').slice(0, 1) }}</div>
            </el-badge>
            <div class="session-info">
              <div class="top">
                <span class="name">{{ session.userProfile?.nick || session.userID }}</span>
                <span class="time">{{ formatTime(session.lastMessage.lastTime) }}</span>
              </div>
              <div class="last-msg">{{ session.lastMessage.messageForShow }}</div>
            </div>
          </div>
          <el-empty v-if="sessions.length === 0" description="暂无咨询" :image-size="60" />
        </div>
      </el-aside>

      <!-- 中间：对话视窗 -->
      <el-main class="chat-main">
        <template v-if="activeSession">
          <div class="chat-header">
            <span class="name">{{ activeSession.userProfile?.nick || '新用户' }}</span>
            <el-tag size="small" type="info">ID: {{ activeSession.peerId }}</el-tag>
          </div>
          <div class="msg-list" ref="msgListRef">
            <div v-for="(msg, i) in messageList" :key="i" class="msg-item" :class="{ 'mine': msg.from === myUserId }">
              <div class="msg-bubble">
                <!-- 文字消息 -->
                <div v-if="msg.type === 'TIMTextElem'" class="text">{{ msg.payload.text }}</div>
                
                <!-- 订单卡片 -->
                <div v-else-if="msg.type === 'TIMCustomElem' && msg.payload.data === 'order_card'" class="order-card">
                  <div class="oc-header">订单咨询</div>
                  <div class="oc-body">
                    <div class="oc-name">{{ JSON.parse(msg.payload.description).serviceName }}</div>
                    <div class="oc-price">¥{{ JSON.parse(msg.payload.description).price }}</div>
                  </div>
                </div>

                <div class="time">{{ formatTime(msg.time) }}</div>
              </div>
            </div>
          </div>
          <div class="input-area">
            <div class="tool-bar">
              <el-icon><Picture /></el-icon>
              <el-icon><FolderOpened /></el-icon>
            </div>
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="3"
              placeholder="请输入回复内容 (Ctrl + Enter 发送)"
              @keyup.ctrl.enter="sendMessage"
            />
            <div class="actions">
              <el-button type="primary" size="small" @click="sendMessage">发送回复</el-button>
            </div>
          </div>
        </template>
        <el-empty v-else description="请从左侧选择一个会话开始服务" />
      </el-main>

      <!-- 右侧：用户/订单快照 -->
      <el-aside width="280px" class="data-snapshot">
        <div v-if="activeSession && userSnapshot" class="snapshot-content">
          <div class="section-title">用户信息快照</div>
          <div class="info-card">
            <div class="row">
              <span>当前身份</span> 
              <el-tag size="mini">{{ userSnapshot.profile.user_type === 2 ? '服务者' : '普通用户' }}</el-tag>
            </div>
            <div class="row">
              <span>手机号码</span> 
              <span>{{ userSnapshot.profile.phone }}</span>
            </div>
            <div class="row">
              <span>注册时间</span> 
              <span>{{ new Date(userSnapshot.profile.created_at).toLocaleDateString() }}</span>
            </div>
            <div class="row">
              <span>累计消费</span> 
              <b class="text-gold">¥ {{ Number(userSnapshot.profile.total_spent || 0).toFixed(2) }}</b>
            </div>
          </div>
          
          <div class="section-title mt-20">最近订单</div>
          <div v-if="userSnapshot.recentOrders && userSnapshot.recentOrders.length > 0" class="recent-orders">
            <div v-for="order in userSnapshot.recentOrders" :key="order.id" class="mini-order-item">
              <div class="o-name">{{ order.service_name }}</div>
              <div class="o-meta">
                <span class="o-price">¥{{ Number(order.total_price || 0).toFixed(2) }}</span>
                <el-tag size="mini" :type="getStatusType(order.status)">
                  {{ getStatusText(order.status) }}
                </el-tag>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无订单记录" :image-size="40" />
        </div>
        <el-empty v-else description="选中会话查看用户详情" />
      </el-aside>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import request from '../utils/request'
import TIM from 'tim-js-sdk'
import { ElMessage } from 'element-plus'
import { Search, Picture, FolderOpened } from '@element-plus/icons-vue'

// 状态工具函数
const getStatusText = (status) => {
  const map = { 0: '待接单', 1: '已接单', 2: '服务中', 3: '已完成', 4: '已取消', 5: '已评价' }
  return map[status] || '未知'
}

const getStatusType = (status) => {
  const map = { 0: 'danger', 1: 'primary', 2: 'info', 3: 'success', 4: 'info', 5: 'success' }
  return map[status] || 'warning'
}

const sessions = ref([])
const activeSession = ref(null)
const userSnapshot = ref(null)
const messageList = ref([])
const inputText = ref('')
const myUserId = ref('') 
const searchUser = ref('')
let tim = null

const selectSession = async (session) => {
  console.log('[Support] 选中会话:', session)
  
  let peerId = ''
  if (session.userProfile?.userID) peerId = session.userProfile.userID
  else if (session.userID) peerId = session.userID
  else if (session.peerAccount) peerId = session.peerAccount
  else if (session.conversationID) peerId = session.conversationID.replace('C2C', '')
  
  if (!peerId) return ElMessage.warning('无法识别用户 ID')
  peerId = peerId.toString()
  
  userSnapshot.value = null
  activeSession.value = { ...session, peerId }
  messageList.value = []
  
  try {
    const res = await tim.getMessageList({ conversationID: session.conversationID })
    messageList.value = res.data.messageList
    tim.setMessageRead({ conversationID: session.conversationID })
    await loadUserSnapshot(peerId)
  } catch (e) { console.error('[Support] 加载详情失败:', e) }
  
  scrollToBottom()
}

const loadUserSnapshot = async (userId) => {
  try {
    const res = await request.get(`/users/${userId}/snapshot`)
    const data = res.data || res
    if (data && data.profile) {
      userSnapshot.value = data
      if (activeSession.value && !activeSession.value.userProfile?.nick) {
        if (!activeSession.value.userProfile) activeSession.value.userProfile = {}
        activeSession.value.userProfile.nick = data.profile.nickname || data.profile.phone
      }
    }
  } catch (e) { console.error('[Support] 加载快照失败:', e) }
}

const sendMessage = async () => {
  if (!inputText.value.trim() || !activeSession.value) return
  const peerId = activeSession.value.peerId
  const message = tim.createTextMessage({
    to: peerId,
    conversationType: TIM.TYPES.CONV_C2C,
    payload: { text: inputText.value }
  })
  
  try {
    messageList.value.push(message)
    const response = await tim.sendMessage(message)
    if (response.code === 0) {
      const index = messageList.value.findIndex(m => m.ID === message.ID)
      if (index > -1) messageList.value[index] = response.data.message
      inputText.value = ''
      scrollToBottom()
    }
  } catch (e) { ElMessage.error('发送失败: ' + (e.message || '参数校验失败')) }
}

const initTIM = async () => {
  try {
    const res = await request.get('/system/im-sig')
    const sigData = res.data || res
    myUserId.value = sigData.userId.toString()
    tim = TIM.create({ SDKAppID: sigData.sdkAppID })
    tim.on(TIM.EVENT.CONVERSATION_LIST_UPDATED, (event) => { sessions.value = event.data })
    tim.on(TIM.EVENT.MESSAGE_RECEIVED, (event) => {
      if (activeSession.value && event.data[0].from === activeSession.value.peerId) {
        messageList.value.push(...event.data)
        scrollToBottom()
      }
    })
    await tim.login({ userID: sigData.userId.toString(), userSig: sigData.userSig })
  } catch (e) { ElMessage.error('IM 服务连接失败') }
}

const formatTime = (t) => t ? new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
const scrollToBottom = () => nextTick(() => { if (msgListRef.value) msgListRef.value.scrollTop = msgListRef.value.scrollHeight })

onMounted(initTIM)
onUnmounted(() => { if (tim) tim.logout() })
</script>

<style scoped>
.support-center { min-height: calc(100vh - 160px); background: transparent; margin: 0; }
.support-container { height: 100%; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; background: #ffffff; }
.session-sidebar { border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; background: #ffffff; }
.sidebar-header { padding: 16px; border-bottom: 1px solid #e2e8f0; }
.session-list { flex: 1; overflow-y: auto; }
.session-item { padding: 16px; display: flex; gap: 12px; cursor: pointer; transition: 0.2s; border-bottom: 1px solid #f1f5f9; }
.session-item:hover { background: #f8fafc; }
.session-item.active { background: #0f172a; color: #ffffff; }
.avatar { width: 40px; height: 40px; background: #4f46e5; color: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.session-info { flex: 1; min-width: 0; }
.session-info .top { display: flex; justify-content: space-between; margin-bottom: 5px; }
.session-info .name { font-weight: 700; font-size: 14px; color: inherit; }
.session-info .time { font-size: 11px; color: #94a3b8; }
.session-info .last-msg { font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-main { display: flex; flex-direction: column; padding: 0; background: #ffffff; }
.chat-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px; background: #ffffff; }
.chat-header .name { font-weight: 700; font-size: 16px; color: #0f172a; }
.msg-list { flex: 1; overflow-y: auto; padding: 20px; background: #f8fafc; }
.msg-item { display: flex; margin-bottom: 20px; }
.msg-item.mine { justify-content: flex-end; }
.msg-bubble { max-width: 70%; padding: 10px 15px; border-radius: 12px; background: #ffffff; color: #0f172a; position: relative; border: 1px solid #e2e8f0; }
.mine .msg-bubble { background: #0f172a; color: #ffffff; border: none; }
.msg-bubble .text { font-size: 14px; line-height: 1.6; }
.order-card { background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; width: 180px; margin-bottom: 5px; }
.oc-header { background: #f8fafc; padding: 5px 10px; font-size: 11px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
.oc-body { padding: 10px; }
.oc-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
.oc-price { font-size: 14px; color: #dc2626; font-weight: 700; }
.msg-bubble .time { font-size: 10px; opacity: 0.6; margin-top: 5px; text-align: right; }
.input-area { padding: 16px 20px; border-top: 1px solid #e2e8f0; background: #ffffff; }
.tool-bar { display: flex; gap: 15px; margin-bottom: 10px; color: #94a3b8; font-size: 18px; }
.actions { display: flex; justify-content: flex-end; margin-top: 10px; }
.data-snapshot { border-left: 1px solid #e2e8f0; padding: 20px; background: #ffffff; }
.section-title { font-size: 12px; font-weight: 800; color: #94a3b8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
.info-card { background: #f8fafc; padding: 15px; border-radius: 16px; border: 1px solid #e2e8f0; }
.info-card .row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; color: #64748b; }
.text-gold { color: #d97706; }
.mt-20 { margin-top: 20px; }
.mini-order-item { background: #f8fafc; padding: 10px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 10px; }
.mini-order-item .o-name { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 5px; }
.mini-order-item .o-meta { display: flex; justify-content: space-between; align-items: center; }
.mini-order-item .o-price { color: #dc2626; font-weight: 700; font-size: 14px; }
</style>
