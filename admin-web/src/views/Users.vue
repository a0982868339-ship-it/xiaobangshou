<template>
  <div class="users-container p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-2xl font-black tracking-tight">👥 用户管理</span>
          <div>
            <el-input
              v-model="searchKeyword"
              placeholder="搜索手机号/昵称"
              class="w-72 mr-2.5"
              clearable
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="exportUsers">
              <el-icon><download /></el-icon>
              导出
            </el-button>
          </div>
        </div>
      </template>

      <!-- 统计信息 -->
      <el-row :gutter="24" class="mb-6">
        <el-col :span="6">
          <div class="summary-card bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div class="summary-icon" style="background: #667eea;">
              <el-icon :size="24"><user /></el-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ stats.total || 0 }}</div>
              <div class="summary-label">总用户</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="summary-card bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div class="summary-icon" style="background: #52c41a;">
              <el-icon :size="24"><check /></el-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ stats.verified || 0 }}</div>
              <div class="summary-label">已实名</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="summary-card bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div class="summary-icon" style="background: #409eff;">
              <el-icon :size="24"><clock /></el-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ stats.today || 0 }}</div>
              <div class="summary-label">今日新增</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="summary-card bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
            <div class="summary-icon" style="background: #e6a23c;">
              <el-icon :size="24"><star-filled /></el-icon>
            </div>
            <div class="summary-info">
              <div class="summary-value">{{ stats.vip || 0 }}</div>
              <div class="summary-label">会员用户</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 筛选器 -->
      <el-form :inline="true" class="mb-4">
        <el-form-item label="用户类型">
          <el-select v-model="filterType" placeholder="全部" @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="普通用户" value="1" />
            <el-option label="服务者" value="2" />
            <el-option label="两者兼是" value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="实名状态">
          <el-select v-model="filterVerified" placeholder="全部" @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="已实名" value="1" />
            <el-option label="未实名" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部" @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="正常" value="1" />
            <el-option label="禁用" value="0" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 用户列表 -->
      <el-table :data="users" v-loading="loading" class="w-full">
        <el-table-column prop="id" label="ID" width="70" />
        
        <el-table-column label="用户信息" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <el-avatar :size="40" :src="row.avatar || 'https://via.placeholder.com/40'" />
              <div>
                <div class="font-semibold text-slate-900">{{ row.nickname || '未设置' }}</div>
                <div class="text-xs text-slate-400">{{ row.phone }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="用户类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getUserTypeTag(row.user_type)" size="small">
              {{ getUserTypeText(row.user_type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="实名认证" width="100">
          <template #default="{ row }">
            <el-tag :type="row.id_card_verified ? 'success' : 'info'" size="small">
              {{ row.id_card_verified ? '已认证' : '未认证' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="balance" label="余额" width="120" align="right">
          <template #default="{ row }">
            <span class="font-black text-red-600">¥{{ row.balance || '0.00' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="points" label="积分" width="80" align="right" />

        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" text @click="viewUser(row)">
              详情
            </el-button>
            <el-button type="warning" size="small" text @click="editUser(row)">
              编辑
            </el-button>
            <el-button
              :type="row.status === 1 ? 'danger' : 'success'"
              size="small"
              text
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mt-6 text-right">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadUsers"
          @current-change="loadUsers"
        />
      </div>
    </el-card>

    <!-- 用户详情对话框 -->
    <el-dialog v-model="dialogVisible" title="用户详情" width="600px">
      <el-descriptions :column="2" border v-if="currentUser">
        <el-descriptions-item label="ID">{{ currentUser.id }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ currentUser.nickname }}</el-descriptions-item>
        <el-descriptions-item label="性别">
          {{ ['未知', '男', '女'][currentUser.gender || 0] }}
        </el-descriptions-item>
        <el-descriptions-item label="真实姓名">
          {{ currentUser.real_name || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="实名认证">
          <el-tag :type="currentUser.id_card_verified ? 'success' : 'info'">
            {{ currentUser.id_card_verified ? '已认证' : '未认证' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="账户余额">
          <span style="color: #f56c6c; font-weight: bold;">
            ¥{{ currentUser.balance || '0.00' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="积分">
          {{ currentUser.points || 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="用户类型">
          {{ getUserTypeText(currentUser.user_type) }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentUser.status === 1 ? 'success' : 'danger'">
            {{ currentUser.status === 1 ? '正常' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="注册时间" :span="2">
          {{ formatDate(currentUser.created_at) }}
        </el-descriptions-item>
        <el-descriptions-item label="最后登录" :span="2">
          {{ formatDate(currentUser.last_login_time) || '未登录' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, User, Check, Clock, StarFilled } from '@element-plus/icons-vue'

const loading = ref(false)
const searchKeyword = ref('')
const filterType = ref('')
const filterVerified = ref('')
const filterStatus = ref('')
const users = ref([])
const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0
})

const stats = ref({
  total: 0,
  verified: 0,
  today: 0,
  vip: 0
})

const dialogVisible = ref(false)
const currentUser = ref(null)

const loadUsers = async () => {
  loading.value = true
  try {
    const request = (await import('../utils/request')).default
    const res = await request.get('/users', {
      params: {
        page: pagination.value.page,
        pageSize: pagination.value.pageSize,
        keyword: searchKeyword.value,
        userType: filterType.value,
        isVerified: filterVerified.value,
        status: filterStatus.value
      }
    })
    users.value = res.list || []
    pagination.value.total = res.pagination?.total || 0
    
    // 获取统计数据
    const statsRes = await request.get('/users/stats')
    stats.value = {
      total: statsRes.users,
      verified: statsRes.users - 0, // 假设
      today: statsRes.newUsers,
      vip: 0
    }
  } catch (error) {
    console.error('加载用户失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  loadUsers()
}

const handleFilter = () => {
  pagination.value.page = 1
  loadUsers()
}

const viewUser = (user) => {
  currentUser.value = user
  dialogVisible.value = true
}

const editUser = (user) => {
  ElMessage.info('编辑功能开发中...')
}

const toggleStatus = (user) => {
  const action = user.status === 1 ? '禁用' : '启用'
  ElMessageBox.confirm(`确定要${action}该用户吗？`, '提示').then(async () => {
    try {
      const request = (await import('../utils/request')).default
      await request.put(`/users/${user.id}/status`, { status: user.status === 1 ? 0 : 1 })
      ElMessage.success(`${action}成功`)
      loadUsers()
    } catch (e) {}
  })
}

const exportUsers = () => {
  ElMessage.success('导出功能开发中...')
}

const getUserTypeText = (type) => {
  const map = { 1: '普通用户', 2: '服务者', 3: '两者兼是' }
  return map[type] || '未知'
}

const getUserTypeTag = (type) => {
  const map = { 1: 'primary', 2: 'success', 3: 'warning' }
  return map[type] || 'info'
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadUsers()
})
</script>
