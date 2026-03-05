<template>
  <div class="profile-container p-10 space-y-8">
    <el-row :gutter="24">
      <!-- 个人信息卡片 -->
      <el-col :span="10">
        <el-card class="box-card bg-white rounded-[2rem] border border-slate-200 shadow-sm" header="基础资料">
          <div class="user-avatar-section">
            <el-avatar :size="100" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <div class="user-id">ID: {{ userInfo.id }}</div>
            <el-tag type="success">{{ roleName }}</el-tag>
          </div>
          
          <el-form :model="profileForm" label-width="80px" class="mt-6 space-y-2">
            <el-form-item label="登录账号">
              <el-input v-model="profileForm.phone" disabled />
            </el-form-item>
            <el-form-item label="真实姓名">
              <el-input v-model="profileForm.nickname" placeholder="请输入姓名" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" @click="handleUpdateProfile">更新资料</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 安全设置卡片 -->
      <el-col :span="14">
        <el-card class="box-card bg-white rounded-[2rem] border border-slate-200 shadow-sm" header="安全设置">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="修改密码" name="password">
              <el-form :model="pwdForm" label-width="100px" class="max-w-[460px] pt-4 space-y-2">
                <el-form-item label="旧密码" required>
                  <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="验证身份" />
                </el-form-item>
                <el-form-item label="新密码" required>
                  <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="至少6位" />
                </el-form-item>
                <el-form-item label="确认新密码" required>
                  <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="再次输入" />
                </el-form-item>
                <el-form-item>
                  <el-button type="danger" :loading="pwdLoading" @click="handleUpdatePassword">立即修改</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            
            <el-tab-pane label="登录日志" name="logs">
              <el-table :data="recentLogs" size="small" stripe class="w-full">
                <el-table-column prop="time" label="登录时间" width="180" />
                <el-table-column prop="ip" label="IP地址" />
                <el-table-column prop="location" label="归属地" />
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import request from '../utils/request'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const pwdLoading = ref(false)
const activeTab = ref('password')
const userInfo = ref({})

const profileForm = ref({
  nickname: '',
  phone: ''
})

const pwdForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const recentLogs = ref([
  { time: new Date().toLocaleString(), ip: '127.0.0.1', location: '本地回环' },
  { time: '2026-01-17 14:20:11', ip: '192.168.1.105', location: '内部局域网' }
])

const roleName = computed(() => {
  const role = localStorage.getItem('admin_role') || 'admin'
  const map = { admin: '系统管理员', auditor: '提现审核员', agent: '区域代理' }
  return map[role] || '管理账户'
})

const loadUserData = async () => {
  try {
    const res = await request.get('/admin/auth/me')
    userInfo.value = res
    profileForm.value.nickname = res.nickname || res.username
    profileForm.value.phone = res.username // 后台使用用户名作为标识
  } catch (e) {
    ElMessage.error('获取资料失败')
  }
}

const handleUpdateProfile = async () => {
  loading.value = true
  try {
    await request.put('/users/profile', {
      nickname: profileForm.value.nickname
    })
    ElMessage.success('昵称更新成功')
    loadUserData()
  } catch (e) {}
  loading.value = false
}

const handleUpdatePassword = async () => {
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    return ElMessage.error('两次输入的新密码不一致')
  }
  if (pwdForm.value.newPassword.length < 6) {
    return ElMessage.error('新密码长度至少为6位')
  }

  pwdLoading.value = true
  try {
    await request.post('/admin/auth/change-password', {
      oldPassword: pwdForm.value.oldPassword,
      newPassword: pwdForm.value.newPassword
    })
    ElMessage.success('密码修改成功')
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (e) {}
  pwdLoading.value = false
}

onMounted(loadUserData)
</script>

<style scoped>
.profile-container { background: transparent; }
.box-card { margin-bottom: 20px; transition: transform 0.3s; }
.user-avatar-section { text-align: center; padding: 20px 0; border-bottom: 1px solid #e2e8f0; }
.user-id { margin: 15px 0 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #94a3b8; font-size: 14px; }
</style>
