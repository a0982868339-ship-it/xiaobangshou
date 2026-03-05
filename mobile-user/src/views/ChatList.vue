<template>
  <div class="chat-list-page">
    <van-nav-bar title="消息列表" fixed placeholder class="custom-nav" />
    
    <div class="page-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多消息了"
          @load="onLoad"
        >
          <div class="chat-container">
            <div 
              v-for="item in conversations" 
              :key="item.id" 
              class="chat-card shadow-card" 
              @click="goToChat(item)"
            >
              <div class="avatar-wrap">
                <div class="avatar-box">
                  <van-image round width="54" height="54" :src="item.avatar" fit="cover" />
                </div>
                <div v-if="item.unreadCount > 0" class="unread-badge">{{ item.unreadCount }}</div>
              </div>
              
              <div class="chat-content">
                <div class="chat-header">
                  <span class="nickname">{{ item.nickname }}</span>
                  <span class="time">{{ formatTime(item.lastTime) }}</span>
                </div>
                <div class="chat-body">
                  <span class="last-msg van-ellipsis">{{ item.lastMsg }}</span>
                </div>
              </div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>

      <van-empty v-if="conversations.length === 0 && !loading" description="暂无消息" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TIM from 'tim-js-sdk'
import { initTIM as getGlobalTIM } from '../utils/im'
import request from '../api'

const router = useRouter()
const loading = ref(false)
const finished = ref(true)
const refreshing = ref(false)
const conversations = ref([])
let tim = null

// --- 时间格式化 ---
const formatTime = (time) => {
  if (!time) return ''
  const date = new Date(time * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// --- 加载数据 (系统通知 + 所有真实对话) ---
const loadData = async () => {
  if (loading.value) return
  loading.value = true
  
  try {
    // 1. 获取 IM 签名并初始化
    const sigRes = await request.get('/system/im-sig')
    const { sdkAppID, userSig, userId } = sigRes.data || sigRes
    tim = getGlobalTIM(sdkAppID)
    
    // 原子级修复：确保登录成功后再获取列表
    if (tim) {
      try {
        const loginInfo = await tim.getLoginUser()
        if (String(loginInfo.data) !== String(userId)) {
          if (loginInfo.data) await tim.logout()
          await tim.login({ userID: String(userId), userSig })
        }
      } catch (err) {
        await tim.login({ userID: String(userId), userSig })
      }
      
      // 关键修复：等待 SDK 完全准备好
      await new Promise((resolve) => {
        // 监听 SDK_READY 事件
        tim.on(TIM.EVENT.SDK_READY, () => {
          resolve()
        })
        // 可能已经就绪，检查一下
        setTimeout(() => resolve(), 2000) // 2秒超时保护
      })
      
      // SDK 就绪后立即绑定消息监听（只绑定一次）
      if (!tim._chatListListenerBound) {
        tim.on(TIM.EVENT.MESSAGE_RECEIVED, onMessageReceived)
        tim._chatListListenerBound = true
        console.log('[ChatList] 已绑定 MESSAGE_RECEIVED 事件监听')
      }
    }

    // 2. 获取 IM 对话列表（现在 SDK 已就绪）
    const convRes = await tim.getConversationList()
    const rawConversations = convRes.data.conversationList

    // 3. 获取最新的系统通知
    const notifyRes = await request.get('/notifications', { params: { page: 1, pageSize: 1 } })
    const latestNotify = notifyRes.list?.[0]
    const unreadNotifyCount = await request.get('/notifications/unread')

    const combinedList = []

    // 4. 插入系统通知入口 (始终保留)
    if (latestNotify) {
      combinedList.push({
        id: 'SYSTEM_NOTIFY',
        type: 'SYSTEM',
        nickname: '系统消息通知',
        avatar: 'https://fastly.jsdelivr.net/npm/@vant/assets/ipad.jpeg',
        lastMsg: latestNotify.title + ': ' + latestNotify.content,
        lastTime: Math.floor(new Date(latestNotify.created_at).getTime() / 1000),
        unreadCount: unreadNotifyCount.data || unreadNotifyCount || 0
      })
    }

    // 5. 插入所有真实对话（移除业务过滤，显示所有聊天）
    rawConversations.forEach(conv => {
      combinedList.push({
        id: conv.userProfile.userID,
        type: 'C2C',
        nickname: conv.userProfile.nick || conv.userProfile.userID,
        avatar: conv.userProfile.avatar || 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg',
        lastMsg: conv.lastMessage.messageForShow,
        lastTime: conv.lastMessage.lastTime,
        unreadCount: conv.unreadCount
      })
    })

    conversations.value = combinedList
  } catch (e) {
    console.error('加载消息列表失败:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onRefresh = () => loadData()
const onLoad = () => {}

const goToChat = (item) => {
  if (item.id === 'SYSTEM_NOTIFY') {
    router.push('/notifications')
    return
  }
  router.push({
    path: '/chat',
    query: {
      targetId: item.id,
      targetName: item.nickname
    }
  })
}

// 监听消息到达实时刷新
const onMessageReceived = () => {
  console.log('[ChatList] 收到新消息，自动刷新列表')
  loadData()
}

onMounted(async () => {
  await loadData()
})

onUnmounted(() => {
  if (tim) {
    tim.off(TIM.EVENT.MESSAGE_RECEIVED, onMessageReceived)
  }
})
</script>

<script>
export default {
  name: 'ChatList'
}
</script>

<style scoped>
.chat-list-page {
  min-height: 100vh;
  background: #ffffff;
}

.custom-nav :deep(.van-nav-bar__title) {
  font-weight: 700;
  color: #1a1a1a;
}

.page-content {
  padding: 16px;
}

.chat-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-card {
  display: flex;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 20px;
  align-items: center;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.chat-card:active {
  transform: scale(0.98);
  background: #f2f2f2;
}

.avatar-wrap {
  position: relative;
  margin-right: 16px;
}

.avatar-box {
  padding: 2px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.unread-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #1a1a1a;
  color: white;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 2px solid #fff;
  padding: 0 4px;
}

.chat-content {
  flex: 1;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.nickname {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}

.time {
  font-size: 11px;
  color: #999;
}

.chat-body {
  display: flex;
  align-items: center;
}

.last-msg {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.shadow-card {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}
</style>
