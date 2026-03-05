<template>
  <div class="order-list-page">
    <div class="page-header">
      <div class="header-top">
        <van-icon name="arrow-left" size="22" @click="$router.back()" class="back-icon" />
        <div class="header-title">全部接单历史</div>
        <div class="header-right"></div>
      </div>
    </div>

    <div class="list-content">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list 
          v-model:loading="loading" 
          :finished="finished" 
          finished-text="没有更多订单了" 
          @load="onLoad"
        >
          <div 
            v-for="item in orders" 
            :key="item.id" 
            class="premium-card"
            @click="handleOrderClick(item)"
          >
            <div class="card-top">
              <div class="order-no-wrap">
                <div class="order-no">#{{ item.order_no.slice(-8) }}</div>
                <div v-if="item.assignment_type === 2" class="assigned-mini-badge">被指定</div>
              </div>
              <div class="status-indicator" :class="'status-' + item.status">
                {{ getStatusText(item.status) }}
              </div>
            </div>
            
            <div class="card-middle">
              <div class="service-info">
                <div class="service-name">{{ item.service_name }}</div>
                <div class="price-box">
                  <span class="currency">¥</span>
                  <span class="amount">{{ ((item.total_price || 0) - (item.platform_fee || 0)).toFixed(2) }}</span>
                </div>
              </div>
              
              <div class="details-box">
                <div class="detail-item">
                  <van-icon name="location" class="item-icon" />
                  <span class="item-text">{{ item.service_address }}</span>
                </div>
                <div class="detail-item">
                  <van-icon name="clock" class="item-icon" />
                  <span class="item-text">{{ formatDate(item.service_time) }}</span>
                </div>
              </div>
            </div>

            <div class="card-bottom">
              <div class="footer-left-meta"></div>
              <div class="action-buttons">
                <van-button size="small" round @click.stop="handleOrderClick(item)" class="btn-detail">详情</van-button>
              </div>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
      
      <div v-if="orders.length === 0 && !loading" class="empty-state">
        <van-empty description="暂无接单记录" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyOrders } from '../api'

const router = useRouter()
const orders = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)

const onLoad = async () => {
  loading.value = true
  try {
    const data = await getMyOrders({ status: '-1' })
    orders.value = data || []
    finished.value = true
  } catch (e) {}
  loading.value = false
  refreshing.value = false
}

const onRefresh = () => {
  finished.value = false
  onLoad()
}

const getStatusText = (status) => ({ 
  0: '待接单', 
  1: '已接单', 
  2: '服务中', 
  3: '已完成', 
  4: '已取消', 
  5: '已完成',
  11: '已到达',
  12: '协商取消中'
}[status] || '未知')
const formatDate = (date) => new Date(date).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

const handleOrderClick = (item) => {
  if (item.order_type == 1 || item.service_name?.includes('周期') || item.category_name?.includes('周期')) {
    const targetId = item.recurring_order_id || item.id
    router.push(`/recurring-order/${targetId}`)
  } else {
    router.push(`/order/${item.id}`)
  }
}

onMounted(onLoad)
</script>

<style scoped>
.order-list-page { min-height: 100vh; background: #f8fafc; padding-bottom: 40px; }
.page-header { padding: 24px 20px 20px; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
.header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.back-icon { color: #1e293b; cursor: pointer; }
.header-title { font-size: 22px; font-weight: 900; color: #1e293b; flex: 1; }
.header-subtitle { font-size: 13px; color: #94a3b8; padding-left: 34px; }

.list-content { padding: 16px; }
.premium-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.03);
}
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.order-no-wrap { display: flex; align-items: center; gap: 8px; }
.order-no { font-family: 'DIN Alternate', monospace; font-size: 13px; color: #94a3b8; }
.assigned-mini-badge { font-size: 10px; color: #fff; background: #7c3aed; padding: 1px 6px; border-radius: 4px; font-weight: 800; }
.status-indicator { font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 100px; }
.status-0 { background: #fee2e2; color: #ef4444; }
.status-1 { background: #e0f2fe; color: #0ea5e9; }
.status-2 { background: #fef3c7; color: #d97706; }
.status-3, .status-5 { background: #f0fdf4; color: #22c55e; }

.card-middle { margin-bottom: 16px; }
.service-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.service-name { font-size: 18px; font-weight: 900; color: #1e293b; }
.price-box { display: flex; align-items: baseline; color: #ef4444; }
.price-box .amount { font-family: 'DIN Alternate', sans-serif; font-size: 22px; font-weight: 900; }

.details-box { display: flex; flex-direction: column; gap: 6px; }
.detail-item { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; }
.item-icon { color: #cbd5e1; }

.card-bottom { border-top: 1px solid #f1f5f9; padding-top: 16px; display: flex; justify-content: flex-end; }
.btn-detail { background: #f8fafc !important; color: #1e293b !important; border: 1px solid #f1f5f9 !important; font-weight: 700; }

.empty-state { padding-top: 100px; }
</style>
