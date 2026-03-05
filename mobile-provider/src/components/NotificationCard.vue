<template>
  <Transition name="slide-down">
    <div v-if="visible" class="notification-card" :class="typeClass" @click="handleClick">
      <div class="notification-content">
        <div class="notification-icon">
          <van-icon :name="iconName" />
        </div>
        <div class="notification-body">
          <div class="notification-title">{{ title }}</div>
          <div class="notification-message">{{ message }}</div>
        </div>
        <div class="notification-close" @click.stop="handleClose">
          <van-icon name="cross" />
        </div>
      </div>
      <div v-if="showProgress" class="notification-progress">
        <div class="progress-bar" :style="{ width: progressWidth + '%' }"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Icon as VanIcon } from 'vant'

const props = defineProps({
  type: {
    type: String,
    default: 'info', // 'message', 'order', 'warning', 'info'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 4000 // 4秒自动关闭
  },
  onClick: {
    type: Function,
    default: null
  },
  onClose: {
    type: Function,
    default: null
  }
})

const visible = ref(false)
const progressWidth = ref(100)
const showProgress = computed(() => props.duration > 0)

let progressTimer = null
let closeTimer = null

const typeClass = computed(() => {
  const typeMap = {
    message: 'type-message',
    order: 'type-order',
    warning: 'type-warning',
    info: 'type-info'
  }
  return typeMap[props.type] || 'type-info'
})

const iconName = computed(() => {
  const iconMap = {
    message: 'chat-o',
    order: 'bag-o',
    warning: 'warning-o',
    info: 'info-o'
  }
  return iconMap[props.type] || 'info-o'
})

const show = () => {
  visible.value = true
  
  if (props.duration > 0) {
    // 启动进度条动画
    progressWidth.value = 100
    const startTime = Date.now()
    
    progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / props.duration) * 100)
      progressWidth.value = remaining
      
      if (remaining <= 0) {
        clearInterval(progressTimer)
      }
    }, 50)
    
    // 自动关闭
    closeTimer = setTimeout(() => {
      hide()
    }, props.duration)
  }
}

const hide = () => {
  visible.value = false
  if (progressTimer) clearInterval(progressTimer)
  if (closeTimer) clearTimeout(closeTimer)
  if (props.onClose) props.onClose()
}

const handleClick = () => {
  if (props.onClick) {
    props.onClick()
    hide()
  }
}

const handleClose = () => {
  hide()
}

onMounted(() => {
  show()
})

defineExpose({ show, hide })
</script>

<style scoped>
.notification-card {
  position: fixed;
  top: 60px;
  left: 12px;
  right: 12px;
  z-index: 9999;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

/* 类型样式 - 渐变背景 */
.type-message {
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.95) 0%, rgba(41, 128, 185, 0.95) 100%);
  color: white;
}

.type-order {
  background: linear-gradient(135deg, rgba(17, 153, 142, 0.95) 0%, rgba(56, 239, 125, 0.95) 100%);
  color: white;
}

.type-warning {
  background: linear-gradient(135deg, rgba(243, 156, 18, 0.95) 0%, rgba(230, 126, 34, 0.95) 100%);
  color: white;
}

.type-info {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
}

.notification-content {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 14px;
}

.notification-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.type-info .notification-icon {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 4px;
  line-height: 1.2;
}

.notification-message {
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.notification-close:hover {
  background: rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
}

.notification-progress {
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.6);
  transition: width 0.05s linear;
}

.type-info .progress-bar {
  background: linear-gradient(90deg, #3498db 0%, #2980b9 100%);
}

/* 滑入动画 */
.slide-down-enter-active {
  animation: slide-down-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-down-leave-active {
  animation: slide-down-out 0.3s cubic-bezier(0.4, 0, 1, 1);
}

@keyframes slide-down-in {
  0% {
    transform: translateY(-120%);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-down-out {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-120%);
    opacity: 0;
  }
}

/* 响应式 */
@media (min-width: 768px) {
  .notification-card {
    left: auto;
    right: 20px;
    max-width: 400px;
  }
}
</style>
