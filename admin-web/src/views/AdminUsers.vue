<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">后台权限控制</div>
            <div class="text-sm text-slate-500 font-medium">RBAC 权限与角色配置</div>
          </div>
          <el-button type="primary" icon="UserFilled" @click="handleAdd">创建管理子账号</el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="username" label="登录账号" width="150" />
        <el-table-column prop="real_name" label="姓名" width="120" />
        <el-table-column label="所属岗位 (角色)" width="150">
          <template #default="{ row }">
            <el-tag :type="getRoleTag(row.role)">{{ getRoleText(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限范围">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-2">
              <el-tag v-for="p in getPerms(row.role)" :key="p" size="small" effect="plain">
                {{ p }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '活跃' : '冻结' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.role !== 'admin'" type="primary" link @click="handleEdit(row)">编辑角色</el-button>
            <el-button v-if="row.role !== 'admin'" type="danger" link @click="handleDelete(row)">销毁</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 管理员编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '修正岗位权限' : '创建新管理员'" width="450px">
      <el-form :model="form" label-width="80px" class="space-y-2">
        <el-form-item label="登录号" required v-if="!form.id">
          <el-input v-model="form.username" placeholder="建议使用拼音缩写" />
        </el-form-item>
        <el-form-item label="初始密码" required v-if="!form.id">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="form.realName" />
        </el-form-item>
        <el-form-item label="分岗角色" required>
          <el-select v-model="form.role" class="w-full">
            <el-option label="财务专岗 (仅看金流)" value="finance" />
            <el-option label="审核专岗 (仅看入驻/审计)" value="auditor" />
            <el-option label="运营专岗 (业务/内容)" value="operator" />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="text-xs text-slate-500 mt-4">不同角色登录后可见菜单将自动按职能屏蔽</div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSave">立即同步权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const form = ref({ id: null, username: '', password: '', realName: '', role: 'operator', status: 1 })

const roleMap = {
  admin: { text: '超级管理员', tag: 'danger', perms: ['全系统控制权'] },
  finance: { text: '财务专岗', tag: 'success', perms: ['财务看板', '提现审核', '订单账单'] },
  auditor: { text: '审核专岗', tag: 'warning', perms: ['实名审核', '健康证审核', '消息审计'] },
  operator: { text: '运营专岗', tag: '', perms: ['服务管理', '内容发布', '反馈处理'] }
}

const getRoleText = (r) => roleMap[r]?.text || '未知角色'
const getRoleTag = (r) => roleMap[r]?.tag || 'info'
const getPerms = (r) => roleMap[r]?.perms || []

const loadData = async () => {
  loading.value = true
  try {
    const res = await request.get('/system/admin/users')
    list.value = res || []
  } catch (e) {}
  loading.value = false
}

const handleAdd = () => {
  form.value = { id: null, username: '', password: '', realName: '', role: 'operator', status: 1 }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  form.value = { id: row.id, realName: row.real_name, role: row.role, status: row.status }
  dialogVisible.value = true
}

const submitSave = async () => {
  try {
    await request.post('/system/admin/users', form.value)
    ElMessage.success('管理员权限配置已更新')
    dialogVisible.value = false
    loadData()
  } catch (e) {}
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要注销并删除管理员 ${row.real_name} 吗？`, '注销确认').then(async () => {
    await request.delete(`/system/admin/users/${row.id}`)
    ElMessage.success('账号已永久下架')
    loadData()
  })
}

const formatDate = (r, c, v) => new Date(v).toLocaleDateString()

onMounted(loadData)
</script>
