<template>
  <div class="p-10 space-y-8">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 标签页 1：违规拦截日志 -->
      <el-tab-pane label="违规拦截日志" name="logs">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">实时审计流</div>
            <div class="text-sm text-slate-500 font-medium">敏感信息与违规拦截</div>
          </div>
          <div class="flex items-center gap-3">
            <el-button icon="Refresh" circle @click="loadLogs" />
            <el-tag type="danger" effect="dark">拦截监控中</el-tag>
          </div>
        </div>
        <el-table :data="auditLogs" v-loading="loadingLogs" border stripe class="mt-6">
          <el-table-column prop="created_at" label="触发时间" width="180" :formatter="formatDate" />
          <el-table-column label="发送者" width="180">
            <template #default="{ row }">
              <div class="flex flex-col">
                <div class="text-sm font-semibold text-slate-900">{{ row.nickname || 'Unknown' }}</div>
                <div class="text-xs text-slate-400">{{ row.phone || row.user_id }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="违规内容" min-width="250">
            <template #default="{ row }">
              <span class="text-red-600 font-semibold">{{ row.content }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="拦截原因" width="150">
            <template #default="{ row }">
              <el-tag type="warning" size="small">{{ row.reason }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-tag type="info">已阻断</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 标签页 2：词库动态管理 -->
      <el-tab-pane label="敏感词库配置" name="keywords">
        <div class="flex items-center justify-between mb-4">
          <el-button type="primary" icon="Plus" @click="dialogVisible = true">添加禁词</el-button>
          <div class="text-xs text-slate-500">全平台同步秒级拦截</div>
        </div>
        <el-table :data="keywordList" v-loading="loadingKeywords" border class="mt-6">
          <el-table-column prop="word" label="敏感关键词">
            <template #default="{ row }">
              <b class="text-blue-600">{{ row.word }}</b>
            </template>
          </el-table-column>
          <el-table-column prop="risk_level" label="拦截等级">
            <template #default="{ row }">
              <el-tag :type="row.risk_level >= 3 ? 'danger' : 'warning'">
                {{ row.risk_level >= 3 ? '强制拦截' : '常规拦截' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" :formatter="formatDate" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" link @click="handleDeleteKeyword(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加对话框 -->
    <el-dialog v-model="dialogVisible" title="新增风控指令" width="400px">
      <el-form :model="addForm" label-width="80px" class="space-y-2">
        <el-form-item label="关键词" required>
          <el-input v-model="addForm.word" placeholder="如：私下交易" />
        </el-form-item>
        <el-form-item label="拦截策略">
          <el-radio-group v-model="addForm.riskLevel">
            <el-radio :label="2">阻断消息发送</el-radio>
            <el-radio :label="3">阻断并记录日志</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitAdd">立即生效</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('logs')
const auditLogs = ref([])
const keywordList = ref([])
const loadingLogs = ref(false)
const loadingKeywords = ref(false)
const dialogVisible = ref(false)
const submitLoading = ref(false)
const addForm = ref({ word: '', riskLevel: 2 })

const loadLogs = async () => {
  loadingLogs.value = true
  try {
    const res = await request.get('/system/admin/audit/logs')
    auditLogs.value = res || []
  } catch (e) {}
  loadingLogs.value = false
}

const loadKeywords = async () => {
  loadingKeywords.value = true
  try {
    const res = await request.get('/system/admin/audit/keywords')
    keywordList.value = res || []
  } catch (e) {}
  loadingKeywords.value = false
}

const submitAdd = async () => {
  if (!addForm.value.word.trim()) return ElMessage.error('请填写关键词')
  submitLoading.value = true
  try {
    await request.post('/system/admin/audit/keywords', addForm.value)
    ElMessage.success('风控策略已全量同步')
    dialogVisible.value = false
    addForm.value.word = ''
    loadKeywords()
  } catch (e) {}
  submitLoading.value = false
}

const handleDeleteKeyword = (row) => {
  ElMessageBox.confirm(`确定要解除对“${row.word}”的拦截吗？`, '规则下架').then(async () => {
    await request.delete(`/system/admin/audit/keywords/${row.id}`)
    ElMessage.success('规则已失效')
    loadKeywords()
  })
}

const formatDate = (r, c, v) => new Date(v).toLocaleString()

onMounted(() => {
  loadLogs()
  loadKeywords()
})
</script>
