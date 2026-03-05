<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">全城通知中心</div>
            <div class="text-sm text-slate-500 font-medium">系统广播与消息触达</div>
          </div>
          <el-button type="primary" icon="Promotion" @click="dialogVisible = true">发起全量广播</el-button>
        </div>
      </template>

      <el-table :data="history" v-loading="loading" border stripe>
        <el-table-column prop="created_at" label="发送时间" width="180" :formatter="formatDate" />
        <el-table-column prop="title" label="通知标题" width="200" />
        <el-table-column prop="content" label="消息正文内容" min-width="300" />
        <el-table-column label="覆盖人群" width="120">
          <template #default="{ row }">
            <el-tag :type="getTargetTag(row.target_type)">
              {{ getTargetText(row.target_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触达状态" width="120">
          <template #default>
            <span class="text-green-600 text-xs font-semibold"><i class="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></i> 已发布</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link icon="Delete" @click="handleDelete(row)">撤回删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 发送通知对话框 -->
    <el-dialog v-model="dialogVisible" title="构建系统广播指令" width="500px">
      <el-form :model="form" label-width="80px" class="space-y-2">
        <el-form-item label="覆盖人群">
          <el-radio-group v-model="form.targetType">
            <el-radio :label="1">全平台用户</el-radio>
            <el-radio :label="2">仅服务者</el-radio>
            <el-radio :label="3">仅普通用户</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="通知标题" required>
          <el-input v-model="form.title" placeholder="如：系统维护通知" />
        </el-form-item>
        <el-form-item label="通知正文" required>
          <el-input v-model="form.content" type="textarea" :rows="4" placeholder="请描述通知的具体内容..." />
        </el-form-item>
      </el-form>
      <div class="text-xs text-slate-500 mt-2">发送后用户 App 将在系统通知模块实时展示</div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitSend">立即下发全平台</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Promotion, Delete } from '@element-plus/icons-vue'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const history = ref([])
const form = ref({ title: '', content: '', targetType: 1 })

const loadData = async () => {
  loading.value = true
  try {
    const res = await request.get('/system/admin/notifications')
    history.value = res || []
  } catch (e) {}
  loading.value = false
}

const submitSend = async () => {
  if (!form.value.title || !form.value.content) return ElMessage.error('请完善通知内容')
  submitting.value = true
  try {
    await request.post('/system/admin/notifications', form.value)
    ElMessage.success('系统通知已成功下发')
    dialogVisible.value = false
    loadData()
  } catch (e) {}
  submitting.value = false
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要撤回并删除这条通知吗？用户端将不再可见。', '警告', {
    type: 'warning',
    confirmButtonText: '确定撤回',
    cancelButtonText: '暂不处理'
  }).then(async () => {
    try {
      await request.delete(`/system/admin/notifications/${row.id}`)
      ElMessage.success('通知已成功撤回')
      loadData()
    } catch (e) {}
  })
}

const getTargetText = (type) => {
  const map = { 1: '全平台用户', 2: '仅服务者', 3: '仅普通用户' }
  return map[type] || '定向推送'
}

const getTargetTag = (type) => {
  const map = { 1: 'success', 2: 'warning', 3: 'primary' }
  return map[type] || 'info'
}

const formatDate = (r, c, v) => new Date(v).toLocaleString()

onMounted(loadData)
</script>
