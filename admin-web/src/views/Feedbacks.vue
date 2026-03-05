<template>
  <div class="p-10 space-y-8">
    <el-card shadow="never" class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div>
              <div class="text-xl font-black tracking-tight">🎧 客服工单中心</div>
              <div class="text-sm text-slate-500 font-medium">工单与响应状态</div>
            </div>
            <el-tag type="info">SLA 响应承诺：24小时</el-tag>
          </div>
          <div class="flex items-center">
            <el-radio-group v-model="statusFilter" @change="loadData" size="default">
              <el-radio-button :label="null">全部</el-radio-button>
              <el-radio-button :label="0">待处理</el-radio-button>
              <el-radio-button :label="1">处理中</el-radio-button>
              <el-radio-button :label="2">已解决</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" class="w-full">
        <el-table-column label="优先级" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" effect="dark" size="small">
              {{ priorityMap[row.priority] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="工单信息" min-width="250">
          <template #default="{ row }">
            <div class="space-y-1">
              <div class="text-xs font-black uppercase tracking-widest text-blue-600">[{{ categoryMap[row.category] || '其他' }}]</div>
              <div class="text-sm text-slate-700">{{ row.content }}</div>
              <div class="text-xs text-slate-400">{{ formatDate(row.created_at) }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="发起人" width="180">
          <template #default="{ row }">
            <div>
              <div class="text-sm font-semibold text-slate-900">{{ row.nickname }}</div>
              <div class="text-xs text-slate-400">{{ row.phone }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="处理人" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.admin_name" type="success" plain>{{ row.admin_name }}</el-tag>
            <span v-else class="text-xs text-slate-400">未指派</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-badge is-dot :hidden="row.status !== 0" class="status-badge">
              <span :class="'status-text-' + row.status">{{ statusMap[row.status] }}</span>
            </el-badge>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" type="primary" size="small" @click="handleAssign(row)">接单</el-button>
            <el-button v-if="row.status === 1" type="success" size="small" @click="handleReply(row)">回复</el-button>
            <el-button type="info" size="small" plain @click="viewLogs(row)">日志</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 回复对话框 -->
    <el-dialog v-model="replyDialog.visible" title="处理工单" width="500px">
      <el-form :model="replyDialog.form" label-width="80px" class="space-y-2">
        <el-form-item label="工单内容">
          <p class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600">{{ replyDialog.ticketContent }}</p>
        </el-form-item>
        <el-form-item label="回复内容" required>
          <el-input v-model="replyDialog.form.reply" type="textarea" :rows="4" placeholder="请详细输入处理结果..." />
        </el-form-item>
        <el-form-item label="处理状态">
          <el-radio-group v-model="replyDialog.form.status">
            <el-radio :label="2">已解决</el-radio>
            <el-radio :label="3">关闭工单</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitReply" :loading="replyDialog.loading">提交答复</el-button>
      </template>
    </el-dialog>

    <!-- 日志抽屉 -->
    <el-drawer v-model="logDrawer.visible" title="工单流转日志" size="400px">
      <el-timeline v-if="logs.length > 0">
        <el-timeline-item
          v-for="log in logs"
          :key="log.id"
          :timestamp="formatDate(log.created_at)"
          :type="log.action_type === 'ASSIGN' ? 'primary' : 'success'"
        >
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <strong>{{ log.operator_name }}</strong> 
              <el-tag size="small">{{ log.action_type }}</el-tag>
            </div>
            <div class="text-sm text-slate-600">{{ log.content }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无流转记录" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const loading = ref(false)
const statusFilter = ref(null)
const logs = ref([])

const priorityMap = { 1: '普通', 2: '紧急', 3: '特急' }
const categoryMap = { finance: '财务', order: '订单', tech: '技术', complaint: '投诉', other: '其他' }
const statusMap = { 0: '待处理', 1: '处理中', 2: '已解决', 3: '已关闭' }

const replyDialog = reactive({
  visible: false,
  loading: false,
  ticketId: null,
  ticketContent: '',
  form: { reply: '', status: 2 }
})

const logDrawer = reactive({ visible: false })

const loadData = async () => {
  loading.value = true
  try {
    const res = await request.get('/system/admin/feedbacks', {
      params: { status: statusFilter.value }
    })
    list.value = res
  } catch (e) {}
  loading.value = false
}

const handleAssign = async (row) => {
  try {
    await request.put(`/system/admin/tickets/${row.id}/assign`)
    ElMessage.success('工单已接手')
    loadData()
  } catch (e) {}
}

const handleReply = (row) => {
  replyDialog.ticketId = row.id
  replyDialog.ticketContent = row.content
  replyDialog.form.reply = ''
  replyDialog.form.status = 2
  replyDialog.visible = true
}

const submitReply = async () => {
  if (!replyDialog.form.reply) return ElMessage.warning('请输入回复内容')
  replyDialog.loading = true
  try {
    await request.put(`/system/admin/tickets/${replyDialog.ticketId}/reply`, replyDialog.form)
    ElMessage.success('答复成功')
    replyDialog.visible = false
    loadData()
  } catch (e) {}
  replyDialog.loading = false
}

const viewLogs = async (row) => {
  logDrawer.visible = true
  try {
    logs.value = await request.get(`/system/admin/tickets/${row.id}/logs`)
  } catch (e) {}
}

const getPriorityType = (p) => ['info', 'warning', 'danger'][p - 1] || 'info'
const formatDate = (val) => new Date(val).toLocaleString()

onMounted(loadData)
</script>
