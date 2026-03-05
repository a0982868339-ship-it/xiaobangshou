<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <keep-alive :include="['Home', 'Category', 'Order', 'User']">
        <component :is="Component" :key="$route.fullPath" />
      </keep-alive>
    </router-view>
    <van-tabbar v-model="active" route v-if="showTabbar" class="premium-tabbar" :border="false" placeholder safe-area-inset-bottom>
      <van-tabbar-item to="/">
        <template #icon="props">
          <div class="tab-icon-wrap" :class="{ 'active': props.active }">
            <van-icon name="wap-home-o" />
          </div>
        </template>
        首页
      </van-tabbar-item>
      <van-tabbar-item to="/category">
        <template #icon="props">
          <div class="tab-icon-wrap" :class="{ 'active': props.active }">
            <van-icon name="apps-o" />
          </div>
        </template>
        分类
      </van-tabbar-item>
      <van-tabbar-item to="/order">
        <template #icon="props">
          <div class="tab-icon-wrap" :class="{ 'active': props.active }">
            <van-icon name="description-o" />
          </div>
        </template>
        订单
      </van-tabbar-item>
      <van-tabbar-item to="/chat-list">
        <template #icon="props">
          <div class="tab-icon-wrap" :class="{ 'active': props.active }">
            <van-icon name="chat-o" />
          </div>
        </template>
        消息
      </van-tabbar-item>
      <van-tabbar-item to="/user">
        <template #icon="props">
          <div class="tab-icon-wrap" :class="{ 'active': props.active }">
            <van-icon name="user-o" />
          </div>
        </template>
        我的
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, createApp, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { initSocket } from './utils/socket'
import NotificationCard from './components/NotificationCard.vue'

const route = useRoute()
const router = useRouter()
const active = ref(0)

// 显示通知卡片
const showNotification = (options) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  
  const app = createApp({
    render() {
      return h(NotificationCard, {
        ...options,
        onClose: () => {
          app.unmount()
          document.body.removeChild(container)
          if (options.onClose) options.onClose()
        }
      })
    }
  })
  
  app.mount(container)
}

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    const socket = initSocket(token)
    
    //监听新消息通知
    socket.on('NEW_MESSAGE', (data) => {
      const { fromNickname, content, fromUserId } = data
      showNotification({
        type: 'message',
        title: `💬 ${fromNickname}`,
        message: content.length > 50 ? content.substring(0, 50) + '...' : content,
        duration: 5000,
        onClick: () => {
          router.push({ path: '/chat', query: { targetId: fromUserId } })
        }
      })
    })

    // 监听订单状态变更通知 (通过 DOM 事件，确保幂等性处理后触发)
    window.addEventListener('order_status_update_global', (e) => {
      console.log('>> [App] Global Order Update Received:', e.detail)
      const { message, orderId } = e.detail
      showNotification({
        type: 'order',
        title: '订单状态更新',
        message: message,
        duration: 5000,
        onClick: () => {
          if (orderId) router.push(`/order/${orderId}`)
        }
      })
    })
  }
})

const showTabbar = computed(() => {
  // 只有一级主页面显示底部导航栏
  return ['Home', 'Category', 'Order', 'ChatList', 'User'].includes(route.name)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

/* 底部导航栏升级 */
.premium-tabbar {
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 64px !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(10px);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04) !important;
  border-radius: 20px 20px 0 0;
  z-index: 999 !important;
}

.tab-icon-wrap {
  width: 44px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  transition: all 0.3s;
  font-size: 22px;
}

.tab-icon-wrap.active {
  background: #eefaf8;
  color: #11998e;
}

:deep(.van-tabbar-item--active) {
  background: transparent !important;
  font-weight: bold;
}

:deep(.van-tabbar-item__text) {
  font-size: 11px;
  margin-top: 2px;
}
</style>

