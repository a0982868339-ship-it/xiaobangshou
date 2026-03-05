<template>
  <div class="p-10 space-y-8">
    <el-row :gutter="24">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <template #header>
            <div class="card-header">累计流水 <el-icon><Money /></el-icon></div>
          </template>
          <div class="stat-main">¥ {{ summary.totalVolume || '0.00' }}</div>
          <el-progress :percentage="70" :show-text="false" status="success" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card revenue">
          <template #header>
            <div class="card-header">平台纯益 <el-icon><DataAnalysis /></el-icon></div>
          </template>
          <div class="stat-main">¥ {{ summary.totalCommission || '0.00' }}</div>
          <div class="stat-sub">当前抽佣比例: 10% - 15%</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <template #header>
            <div class="card-header">待处理提现 <el-icon><Timer /></el-icon></div>
          </template>
          <div class="stat-main text-warning">¥ {{ summary.pendingWithdrawal || '0.00' }}</div>
          <el-button link type="warning" @click="$router.push('/withdrawals')">立即处理 ></el-button>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <template #header>
            <div class="card-header">安全准备金 <el-icon><Lock /></el-icon></div>
          </template>
          <div class="stat-main text-success">¥ {{ summary.platformBalance || '0.00' }}</div>
          <div class="stat-sub">可供运营调配资金</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 财务结算控制台 -->
    <el-card class="mt-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-xl font-black tracking-tight">手动结算控制台</span>
          <div class="flex items-center gap-3">
            <el-input v-model="searchOrder" placeholder="输入订单号搜索待结算单" class="w-64">
              <template #append><el-icon @click="searchOrderData"><Search /></el-icon></template>
            </el-input>
            <el-button type="danger" @click="toggleAutoSettlement">
              {{ autoSettlement ? '暂停自动结算' : '开启自动结算' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="pendingSettlements" border stripe>
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="service_name" label="服务项目" />
        <el-table-column prop="total_price" label="总金额" width="120">
          <template #default="{ row }">¥{{ row.total_price }}</template>
        </el-table-column>
        <el-table-column prop="platform_fee" label="平台抽成" width="100">
          <template #default="{ row }">¥{{ row.platform_fee }}</template>
        </el-table-column>
        <el-table-column prop="provider_income" label="应拨付服务者" width="120">
          <template #default="{ row }">
            <span class="text-success" style="font-weight: bold">¥{{ (row.total_price - row.platform_fee).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="结算状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.status === 3" type="warning">待拨付</el-tag>
            <el-tag v-else-if="row.status === 5" type="success">已结算</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button v-if="row.settlement_status === 0" type="danger" size="small" @click="toggleSettleLock(row, 1)">
                冻结
              </el-button>
              <el-button v-else-if="row.settlement_status === 1" type="success" size="small" @click="toggleSettleLock(row, 0)">
                解冻
              </el-button>
              
              <el-button v-if="row.settlement_status !== 2" type="primary" size="small" @click="handleManualSettle(row)">
                结算
              </el-button>
              <span v-else class="text-secondary">已闭环</span>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 趋势分析 -->
    <el-row :gutter="20" class="mt-20">
      <el-col :span="24">
        <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <template #header><span class="text-xl font-black tracking-tight">营收趋势分析</span> <span class="text-slate-400 text-sm ml-2">近7天</span></template>
          <div class="trend-container">
            <div v-for="t in trend" :key="t.date" class="trend-bar-item">
              <div class="bar-label">{{ t.date.slice(5) }}</div>
              <div class="bar-wrap">
                <div class="bar-fill volume" :style="{ height: (t.volume / maxVolume * 100) + '%' }"></div>
                <div class="bar-fill commission" :style="{ height: (t.commission / maxVolume * 100) + '%' }"></div>
              </div>
              <div class="bar-val">¥{{ t.volume }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Money, DataAnalysis, Timer, Lock, Search } from '@element-plus/icons-vue'

const summary = ref({})
const trend = ref([])
const pendingSettlements = ref([])
const searchOrder = ref('')
const autoSettlement = ref(true)

const maxVolume = computed(() => Math.max(...trend.value.map(t => parseFloat(t.volume)), 100))

const loadData = async () => {
  try {
    const res = await request.get('/wallet/finance/stats')
    summary.value = res.data.summary
    trend.value = res.data.trend
    
    // 获取待结算订单 (状态为已完成但未结算的订单)
    const ordersRes = await request.get('/orders/admin/all', { params: { status: 3 } })
    pendingSettlements.value = ordersRes.data.slice(0, 5) // 取前5条演示
  } catch (error) {}
}

const toggleAutoSettlement = () => {
  autoSettlement.value = !autoSettlement.value
  ElMessage.warning(autoSettlement.value ? '已恢复系统自动结算' : '已切换至人工干预模式')
}

const toggleSettleLock = async (order, status) => {
  try {
    await request.put(`/wallet/orders/${order.id}/settlement`, { status })
    ElMessage.success(status === 1 ? '已成功冻结该订单结算' : '已恢复自动结算')
    loadData()
  } catch (e) {}
}

const handleManualSettle = (order) => {
  ElMessageBox.confirm(
    `确认手动将订单 ${order.order_no} 的款项拨付给服务者吗？此操作不可撤回。`,
    '人工强制结算确认',
    { confirmButtonText: '立即拨付', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      await request.post(`/wallet/orders/${order.id}/manual-settle`)
      ElMessage.success('资金已拨付至服务者余额')
      loadData()
    } catch (e) {
      ElMessage.error(e.response?.data?.message || '结算失败')
    }
  })
}

onMounted(loadData)
</script>

<style scoped>
.stat-card { border-radius: 24px; background: #ffffff; border: 1px solid #e2e8f0; color: #0f172a; }
.card-header { display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: #64748b; }
.stat-main { font-size: 32px; font-weight: 900; margin: 12px 0; color: #0f172a; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
.stat-sub { font-size: 12px; color: #94a3b8; }
.revenue .stat-main { color: #2563eb; }

.trend-container {
  display: flex; height: 300px; align-items: flex-end; justify-content: space-around;
  padding: 40px 20px 20px; border-bottom: 2px solid #e2e8f0;
}
.trend-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; max-width: 80px; }
.bar-wrap { width: 40px; height: 200px; background: rgba(148, 163, 184, 0.2); border-radius: 8px; position: relative; display: flex; align-items: flex-end; }
.bar-fill { width: 100%; border-radius: 4px; position: absolute; bottom: 0; transition: height 0.6s ease; }
.bar-fill.volume { background: rgba(37, 99, 235, 0.5); z-index: 1; }
.bar-fill.commission { background: #4f46e5; z-index: 2; width: 60%; left: 20%; }
.bar-label { margin-bottom: 10px; font-size: 12px; color: #94a3b8; }
.bar-val { margin-top: 10px; font-size: 12px; font-weight: 700; color: #475569; }

.text-warning { color: #d97706; }
.text-success { color: #16a34a; }
.text-secondary { color: #94a3b8; font-size: 12px; }
.mt-20 { margin-top: 20px; }
</style>
