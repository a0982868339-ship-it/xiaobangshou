<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <keep-alive :include="['Home', 'Order', 'Earnings', 'ChatList', 'User']">
        <component :is="Component" :key="$route.fullPath" />
      </keep-alive>
    </router-view>
    <van-tabbar v-model="active" route v-if="showTabbar" class="premium-tabbar" :border="false" placeholder>
      <van-tabbar-item to="/" icon="records-o">
        <template #icon="props">
          <div class="tab-icon-wrap" :class="{ 'active': props.active }">
            <van-icon name="wap-home-o" />
          </div>
        </template>
        接单
      </van-tabbar-item>
      <van-tabbar-item to="/order">
        <template #icon="props">
          <div class="tab-icon-wrap" :class="{ 'active': props.active }">
            <van-icon name="description-o" />
          </div>
        </template>
        订单
      </van-tabbar-item>
      <van-tabbar-item to="/earnings">
        <template #icon="props">
          <div class="tab-icon-wrap" :class="{ 'active': props.active }">
            <van-icon name="gold-coin-o" />
          </div>
        </template>
        收益
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
  const token = localStorage.getItem('provider_token')
  if (token) {
    const socket = initSocket(token)
    
    // 监听新订单推送 (全量闭环：新单直弹)
    socket.on('NEW_ORDER', (data) => {
      showNotification({
        type: 'order',
        title: '🔔 发现新订单',
        message: `${data.serviceName}\n距离约 ${data.distance}km · 预计报酬 ¥${data.totalPrice}`,
        duration: 6000,
        onClick: () => {
          router.push(`/order/${data.orderId}`)
        }
      })
    })

    // 监听协商取消申请
    socket.on('CANCEL_REQUEST', (data) => {
      showNotification({
        type: 'warning',
        title: '⚠️ 订单取消申请',
        message: `用户申请取消订单：${data.serviceName}\n单号：${data.orderNo}`,
        duration: 6000,
        onClick: () => {
          router.push(`/order/${data.orderId}`)
        }
      })
    })

    // 监听新消息通知
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

    // 监听订单状态变更通知 (全局)
    window.addEventListener('order_status_update_global', (e) => {
      console.log('>> [Provider/App] Global Order Update Received:', e.detail)
      const { message, orderId } = e.detail
      showNotification({
        type: 'order',
        title: '订单动态',
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
  return !['Login', 'OrderDetail', 'Chat', 'Withdraw', 'Verify', 'HealthCert', 'HospitalSettings', 'MyCard', 'CitySelect'].includes(route.name)
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

