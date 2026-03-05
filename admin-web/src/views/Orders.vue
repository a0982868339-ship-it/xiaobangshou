<template>
  <div class="space-y-8">
    <div class="grid grid-cols-4 gap-6">
      <div v-for="item in summaryStats" :key="item.label" class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
        <div class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{{ item.label }}</div>
        <div class="text-3xl font-black tracking-tight" :class="{
          'text-blue-600': item.class === 'blue',
          'text-amber-600': item.class === 'orange',
          'text-green-600': item.class === 'green',
          'text-red-600': item.class === 'red'
        }">{{ item.value }}</div>
        <el-icon class="absolute -right-6 -bottom-6 text-slate-900/5" size="72"><component :is="item.icon" /></el-icon>
      </div>
    </div>

    <el-card shadow="never" class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xl font-black tracking-tight">📦 {{ categoryName }}订单中心</span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black uppercase">共 {{ list.length }} 条记录</span>
          </div>
          <el-radio-group v-model="statusFilter" @change="loadData" size="default">
            <el-radio-button :label="null">全部订单</el-radio-button>
            <el-radio-button :label="0">待接单</el-radio-button>
            <el-radio-button :label="1">已接单</el-radio-button>
            <el-radio-button :label="2">服务中</el-radio-button>
            <el-radio-button :label="3">已完成</el-radio-button>
            <el-radio-button :label="4">已取消</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <!-- 高级搜索栏 -->
      <div class="flex flex-wrap items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
        <el-input 
          v-model="keyword" 
          placeholder="搜索订单号、姓名或手机号" 
          clearable 
          @keyup.enter="handleSearch"
          class="w-72"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="default"
          @change="loadData"
          class="w-72"
        />

        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <!-- 订单表格 -->
      <el-table 
        :data="list" 
        v-loading="loading" 
        style="width: 100%" 
        class="order-table"
        header-cell-class-name="table-header"
      >
        <!-- 订单基础信息 -->
        <el-table-column label="订单信息" width="220">
          <template #default="{ row }">
            <div class="space-y-2">
              <div class="text-sm font-black text-slate-900">{{ row.order_no }}</div>
              <div class="text-xs text-slate-400">{{ formatDate(row.created_at) }}</div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase">{{ row.cat_name || '通用' }}</span>
            </div>
          </template>
        </el-table-column>

        <!-- 客户信息 -->
        <el-table-column label="客户" width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <el-avatar :size="32" :src="row.user_avatar">{{ row.user_nickname?.charAt(0) }}</el-avatar>
              <div>
                <div class="text-sm font-semibold text-slate-900">{{ row.user_nickname || '匿名用户' }}</div>
                <div class="text-xs text-slate-400">{{ row.contact_phone || row.user_phone }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 服务内容 -->
        <el-table-column label="服务项目" min-width="180">
          <template #default="{ row }">
            <div class="space-y-1">
              <div class="text-sm font-semibold text-slate-900">{{ row.service_name }}</div>
              <div class="text-xs text-slate-400 flex items-center gap-1 truncate" :title="row.service_address">
                <el-icon><Location /></el-icon>
                <span class="truncate max-w-[200px]">{{ row.service_address }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 业务环节/进度 -->
        <el-table-column label="全链路进度" width="200" align="center">
          <template #default="{ row }">
            <div class="flex flex-col items-center gap-2">
              <div class="workflow-stages" :class="getStatusStagesClass(row.status)">
                <div class="stage-bar" :class="{ 'is-active': row.status >= 0 && row.status !== 4 }"></div>
                <div class="stage-bar" :class="{ 'is-active': row.status >= 1 && row.status !== 4 }"></div>
                <div class="stage-bar" :class="{ 'is-active': row.status >= 2 && row.status !== 4 }"></div>
                <div class="stage-bar" :class="{ 'is-active': row.status >= 3 && row.status !== 4 }"></div>
              </div>
              <div class="flex items-center gap-2">
                <span class="pulse-dot" :class="getStatusClass(row.status)"></span>
                <span class="text-xs font-black uppercase tracking-wider" :class="getStatusClass(row.status)">{{ getStatusText(row.status) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 金额 -->
        <el-table-column label="金额/费用" width="150">
          <template #default="{ row }">
            <div class="space-y-1">
              <div class="text-sm font-black text-slate-900">¥{{ row.total_price }}</div>
              <div class="text-[10px] text-slate-400 uppercase tracking-widest">佣金 ¥{{ row.platform_fee || '0.00' }}</div>
            </div>
          </template>
        </el-table-column>

        <!-- 服务者信息 -->
        <el-table-column label="接单人" width="180">
          <template #default="{ row }">
            <div v-if="row.provider_id" class="flex items-center gap-3">
              <el-avatar :size="32" :src="row.provider_avatar" class="provider-avatar">
                {{ (row.provider_real_name || row.provider_nickname)?.charAt(0) }}
              </el-avatar>
              <div>
                <div class="text-sm font-semibold text-slate-900">{{ row.provider_real_name || row.provider_nickname }}</div>
                <div class="text-xs text-amber-600">⭐ {{ row.provider_rating || '5.0' }}</div>
              </div>
            </div>
            <div v-else class="text-xs text-slate-400 italic">待抢单...</div>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 (预留) -->
      <div class="mt-6" v-if="list.length > 0">
        <el-pagination background layout="prev, pager, next" :total="list.length" />
      </div>
    </el-card>

    <!-- 订单详情抽屉 (学习大厂，侧边抽屉比弹窗更高级) -->
    <el-drawer
      v-model="detailVisible"
      title="订单全链路详情"
      size="600px"
      destroy-on-close
    >
      <div v-if="currentOrder" class="space-y-8">
        <div class="bg-white rounded-2xl border border-slate-200 p-6">
          <el-steps :active="getStepActive(currentOrder)" align-center>
            <el-step title="已下单" :description="formatDate(currentOrder.created_at)" />
            <el-step title="已接单" :description="currentOrder.provider_id ? '服务中' : '等待中'" />
            <el-step title="已完工" :description="currentOrder.status === 3 ? formatDate(currentOrder.updated_at) : ''" />
          </el-steps>
        </div>

        <div class="space-y-4">
          <div class="text-sm font-black uppercase tracking-widest text-slate-400">基本信息</div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="订单编号">{{ currentOrder.order_no }}</el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-tag :type="getStatusType(currentOrder.status)">{{ getStatusText(currentOrder.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="下单时间">{{ formatDate(currentOrder.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="服务时间">{{ formatDate(currentOrder.service_time) }}</el-descriptions-item>
            <el-descriptions-item label="服务地址">{{ currentOrder.service_address }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="space-y-4">
          <div class="text-sm font-black uppercase tracking-widest text-slate-400">财务明细</div>
          <div class="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
            <div class="flex justify-between text-sm font-medium text-slate-600">
              <span>服务原价</span>
              <span class="font-black text-slate-900">¥{{ currentOrder.service_price }}</span>
            </div>
            <div v-if="currentOrder.deposit_amount" class="flex justify-between text-sm font-medium text-slate-600">
              <span>预付押金</span>
              <span class="font-black text-slate-900">¥{{ currentOrder.deposit_amount }}</span>
            </div>
            <div class="flex justify-between text-sm font-medium text-slate-600">
              <span>平台抽成 ({{ ((currentOrder.platform_fee/currentOrder.total_price)*100).toFixed(0) }}%)</span>
              <span class="font-black text-slate-900">- ¥{{ currentOrder.platform_fee }}</span>
            </div>
            <el-divider />
            <div class="flex justify-between text-base font-black text-slate-900">
              <span>最终结算 (预计)</span>
              <span class="text-red-600">¥{{ (currentOrder.total_price - currentOrder.platform_fee).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <div v-if="currentOrder.provider_id" class="space-y-4">
          <div class="text-sm font-black uppercase tracking-widest text-slate-400">执行服务者</div>
          <div class="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
            <el-avatar :size="48" :src="currentOrder.provider_avatar">
              {{ (currentOrder.provider_real_name || currentOrder.provider_nickname)?.charAt(0) }}
            </el-avatar>
            <div class="flex-1">
              <div class="text-sm font-black text-slate-900">{{ currentOrder.provider_real_name || currentOrder.provider_nickname }}</div>
              <div class="text-xs text-amber-600">⭐ {{ currentOrder.provider_rating || '5.0' }} 评分</div>
            </div>
            <el-button type="primary" plain size="small" icon="Phone" @click="callPhone(currentOrder.provider_phone)">联系TA</el-button>
          </div>
        </div>

        <div v-if="currentOrder.medical_notes || currentOrder.grocery_actual_amount > 0" class="space-y-4">
          <div class="text-sm font-black uppercase tracking-widest text-slate-400">业务执行存证</div>
          <div class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div v-if="currentOrder.medical_notes">
              <div class="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">📝 医嘱记录</div>
              <div class="text-sm text-slate-600 leading-relaxed">{{ currentOrder.medical_notes }}</div>
            </div>
            <div v-if="currentOrder.grocery_actual_amount > 0">
              <div class="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">🛒 垫付报销</div>
              <div class="text-sm text-slate-600">
                金额：¥{{ currentOrder.grocery_actual_amount }} | 
                状态：{{ currentOrder.grocery_status === 3 ? '已结算' : '待处理' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAllOrdersAdmin } from '../api'
import { Search, Location, User, Avatar, Money, Document, Box, ShoppingCart, Warning, CircleCheck } from '@element-plus/icons-vue'

const route = useRoute()
const list = ref([])
const loading = ref(false)
const statusFilter = ref(null)
const keyword = ref('')
const dateRange = ref([])
const detailVisible = ref(false)
const currentOrder = ref(null)

const categoryName = computed(() => route.meta.title || '全部')

// 汇总卡片数据
const summaryStats = computed(() => {
  const total = list.value.length
  const pending = list.value.filter(o => o.status === 0).length
  const serving = list.value.filter(o => o.status === 2).length
  const revenue = list.value.filter(o => o.status === 3).reduce((sum, o) => sum + parseFloat(o.total_price), 0)

  return [
    { label: '总订单数', value: total, icon: 'Box', class: 'blue' },
    { label: '待处理', value: pending, icon: 'Warning', class: 'orange' },
    { label: '服务中', value: serving, icon: 'ShoppingCart', class: 'green' },
    { label: '累计成交', value: `¥${revenue.toFixed(2)}`, icon: 'Money', class: 'red' }
  ]
})

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      status: statusFilter.value,
      keyword: keyword.value,
      categoryId: route.params.id || null,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1]
    }
    list.value = await getAllOrdersAdmin(params)
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const handleSearch = () => loadData()
const resetSearch = () => {
  keyword.value = ''
  dateRange.value = []
  loadData()
}

const getStepActive = (row) => {
  if (row.status === 3 || row.status === 5) return 3
  if (row.status === 2 || row.status === 1) return 2
  return 1
}

const getStatusText = (s) => ['待接单', '已接单', '服务中', '已完成', '已取消', '已完成'][s] || '未知'
const getStatusType = (s) => ['warning', 'primary', 'info', 'success', 'danger', 'success'][s] || ''
const getStatusClass = (s) => ['status-pending', 'status-accepted', 'status-serving', 'status-done', 'status-cancelled', 'status-done'][s] || ''
const getStatusStagesClass = (s) => ['stages-pending', 'stages-accepted', 'stages-serving', 'stages-done', 'stages-cancelled', 'stages-done'][s] || ''

const formatDate = (val) => val ? new Date(val).toLocaleString('zh-CN', { 
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
}) : '-'

const viewDetail = (row) => {
  currentOrder.value = row
  detailVisible.value = true
}

const callPhone = (phone) => {
  if (phone) window.location.href = `tel:${phone}`
}

watch(() => route.params.id, () => loadData())
onMounted(loadData)
</script>

<style scoped>
.workflow-stages { display: flex; gap: 4px; width: 100%; justify-content: center; }
.stage-bar { height: 6px; width: 35px; background: rgba(148, 163, 184, 0.2); border-radius: 999px; transition: all 0.3s; }
.stages-pending .stage-bar.is-active { background: #d97706; }
.stages-pending .stage-bar.is-active:nth-child(1) { animation: pulse-orange 2s infinite; box-shadow: 0 0 8px rgba(217, 119, 6, 0.4); }
.stages-accepted .stage-bar.is-active { background: #2563eb; }
.stages-accepted .stage-bar.is-active:nth-child(2) { animation: pulse-blue 2s infinite; box-shadow: 0 0 8px rgba(37, 99, 235, 0.4); }
.stages-serving .stage-bar.is-active { background: #16a34a; }
.stages-serving .stage-bar.is-active:nth-child(3) { 
  background: linear-gradient(90deg, #16a34a 25%, #86efac 50%, #16a34a 75%); 
  background-size: 200% 100%;
  animation: working-flow 1.5s infinite linear;
  box-shadow: 0 0 8px rgba(22, 163, 74, 0.5);
}
.stages-done .stage-bar.is-active { background: #4f46e5; }
.stages-cancelled .stage-bar.is-active { background: #94a3b8; }
.pulse-dot { width: 6px; height: 6px; border-radius: 999px; }
.status-pending { color: #d97706; }
.status-pending.pulse-dot { background: #d97706; animation: pulse-orange 2s infinite; }
.status-accepted { color: #2563eb; }
.status-accepted.pulse-dot { background: #2563eb; animation: pulse-blue 2s infinite; }
.status-serving { color: #16a34a; }
.status-serving.pulse-dot { background: #16a34a; animation: pulse-green 2s infinite; }
.status-done { color: #4f46e5; }
.status-done.pulse-dot { background: #4f46e5; }
.status-cancelled { color: #94a3b8; }
.status-cancelled.pulse-dot { background: #94a3b8; }

@keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); } 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); } }
@keyframes pulse-orange { 0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(217, 119, 6, 0); } 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); } }
@keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); } 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); } }
@keyframes working-flow { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
