<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">🌟 服务者信用管理</div>
            <div class="text-sm text-slate-500 font-medium">信用分与违规监控</div>
          </div>
          <el-alert
            title="信用分低于 60 分的服务者将自动被系统限制接单"
            type="warning"
            :closable="false"
            show-icon
            class="w-[400px]"
          />
        </div>
      </template>

      <!-- 筛选工具栏 -->
      <div class="flex flex-wrap items-center gap-4 mb-6">
        <el-input
          v-model="filter.keyword"
          placeholder="搜索姓名/手机号"
          class="w-52"
          clearable
          @clear="loadData"
          @keyup.enter="loadData"
        />
        <el-select v-model="filter.level" placeholder="信用等级" clearable @change="loadData" class="w-40">
          <el-option label="优秀 (>90)" value="excellent" />
          <el-option label="良好 (80-90)" value="good" />
          <el-option label="一般 (60-80)" value="normal" />
          <el-option label="危险 (<60)" value="danger" />
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>

      <el-table :data="providers" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="服务者信息" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <el-avatar :size="32" :src="row.avatar">{{ row.real_name?.charAt(0) }}</el-avatar>
              <div>
                <div class="text-sm font-semibold text-slate-900">{{ row.real_name || row.nickname }}</div>
                <div class="text-xs text-slate-400">{{ row.phone }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="当前信用分" width="150" align="center">
          <template #default="{ row }">
            <el-statistic :value="row.credit_score">
              <template #suffix>
                <el-icon :color="getScoreColor(row.credit_score)">
                  <TrendCharts />
                </el-icon>
              </template>
            </el-statistic>
          </template>
        </el-table-column>

        <el-table-column label="信用等级" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getScoreTagType(row.credit_score)">
              {{ getScoreLevel(row.credit_score) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="order_count" label="完单数" width="100" align="center" />
        <el-table-column prop="violation_count" label="违规/投诉" width="120" align="center">
          <template #default="{ row }">
            <span class="text-red-600 font-semibold">{{ row.violation_count }}</span> / 
            <span class="text-amber-600 font-semibold">{{ row.complaint_count }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewLogs(row)">变更日志</el-button>
            <el-button 
              v-if="isAdmin"
              size="small" 
              type="warning" 
              @click="openAdjustDialog(row)"
            >手动调整</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 调整分数对话框 -->
    <el-dialog v-model="adjustDialog.visible" title="手动调整信用分" width="400px">
      <el-form :model="adjustForm" label-width="80px" class="space-y-2">
        <el-form-item label="服务者">
          <strong>{{ adjustDialog.providerName }}</strong>
        </el-form-item>
        <el-form-item label="调整分值">
          <el-input-number v-model="adjustForm.amount" :min="-100" :max="100" />
          <div class="text-xs text-slate-400 mt-2">正数为加分，负数为扣分</div>
        </el-form-item>
        <el-form-item label="调整类型">
          <el-select v-model="adjustForm.reasonType">
            <el-option label="手动修正" value="MANUAL_FIX" />
            <el-option label="申诉通过" value="APPEAL_SUCCESS" />
            <el-option label="严重违规" value="SEVERE_VIOLATION" />
            <el-option label="系统补偿" value="SYSTEM_COMPENSATION" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="adjustForm.remark" type="textarea" placeholder="请填写调整原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust" :loading="adjustDialog.loading">确定提交</el-button>
      </template>
    </el-dialog>

    <!-- 日志抽屉 -->
    <el-drawer v-model="logDrawer.visible" :title="`信用变更日志 - ${logDrawer.providerName}`" size="500px">
      <el-timeline v-if="logs.length > 0">
        <el-timeline-item
          v-for="log in logs"
          :key="log.id"
          :timestamp="formatDate(log.created_at)"
          :type="log.change_amount > 0 ? 'success' : 'danger'"
        >
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2 py-1 rounded-lg text-[10px] font-black uppercase" :class="log.change_amount > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
                {{ log.change_amount > 0 ? '+' : '' }}{{ log.change_amount }} 分
              </span>
              <span class="text-sm font-semibold text-slate-700">{{ getReasonText(log.reason_type) }}</span>
            </div>
            <div class="text-xs text-slate-500 mb-2" v-if="log.remark">{{ log.remark }}</div>
            <div class="text-xs text-slate-500">变更后分值：<strong class="text-slate-900">{{ log.current_score }}</strong></div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无信用变更记录" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { getProvidersAdmin, getProviderCreditLogs, updateProviderCredit } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { TrendCharts } from '@element-plus/icons-vue'

const loading = ref(false)
const providers = ref([])
const logs = ref([])

const isAdmin = computed(() => {
  return localStorage.getItem('admin_role') === 'admin'
})

const filter = reactive({
  keyword: '',
  level: ''
})

const adjustDialog = reactive({
  visible: false,
  loading: false,
  providerName: '',
  providerId: null
})

const adjustForm = reactive({
  amount: 0,
  reasonType: 'MANUAL_FIX',
  remark: ''
})

const logDrawer = reactive({
  visible: false,
  providerName: '',
  providerId: null
})

const loadData = async () => {
  loading.value = true
  try {
    const data = await getProvidersAdmin({ verifyStatus: 1 })
    // 前端简单过滤
    let list = data || []
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase()
      list = list.filter(p => 
        (p.real_name || '').toLowerCase().includes(kw) || 
        (p.phone || '').includes(kw)
      )
    }
    if (filter.level) {
      list = list.filter(p => {
        const s = p.credit_score
        if (filter.level === 'excellent') return s > 90
        if (filter.level === 'good') return s >= 80 && s <= 90
        if (filter.level === 'normal') return s >= 60 && s < 80
        if (filter.level === 'danger') return s < 60
        return true
      })
    }
    providers.value = list
  } catch (e) {
    ElMessage.error('加载失败')
  }
  loading.value = false
}

const getScoreColor = (score) => {
  if (score > 90) return '#67c23a'
  if (score >= 80) return '#409eff'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

const getScoreTagType = (score) => {
  if (score > 90) return 'success'
  if (score >= 80) return ''
  if (score >= 60) return 'warning'
  return 'danger'
}

const getScoreLevel = (score) => {
  if (score > 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 60) return '一般'
  return '危险'
}

const viewLogs = async (row) => {
  logDrawer.providerName = row.real_name || row.nickname
  logDrawer.providerId = row.id
  logDrawer.visible = true
  try {
    const data = await getProviderCreditLogs({ providerId: row.id })
    logs.value = data || []
  } catch (e) {
    ElMessage.error('获取日志失败')
  }
}

const openAdjustDialog = (row) => {
  adjustDialog.providerName = row.real_name || row.nickname
  adjustDialog.providerId = row.id
  adjustForm.amount = 0
  adjustForm.reasonType = 'MANUAL_FIX'
  adjustForm.remark = ''
  adjustDialog.visible = true
}

const submitAdjust = async () => {
  if (adjustForm.amount === 0) {
    return ElMessage.warning('请输入变动分值')
  }
  if (!adjustForm.remark) {
    return ElMessage.warning('请填写备注说明')
  }

  adjustDialog.loading = true
  try {
    await updateProviderCredit(adjustDialog.providerId, adjustForm)
    ElMessage.success('调整成功')
    adjustDialog.visible = false
    loadData()
  } catch (e) {
    ElMessage.error('调整失败')
  }
  adjustDialog.loading = false
}

const getReasonText = (type) => {
  const map = {
    'MANUAL_FIX': '手动修正',
    'APPEAL_SUCCESS': '申诉通过',
    'SEVERE_VIOLATION': '严重违规',
    'SYSTEM_COMPENSATION': '系统补偿',
    'ORDER_COMPLETED': '完成订单',
    'PROVIDER_CANCEL': '违约取消',
    'BAD_RATING': '收到差评'
  }
  return map[type] || type
}

const formatDate = (date) => {
  return new Date(date).toLocaleString()
}

onMounted(loadData)
</script>
