<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">角色权限矩阵</div>
            <div class="text-sm text-slate-500 font-medium">角色与模块权限配置</div>
          </div>
          <el-button type="primary" icon="Plus" @click="handleAdd">自定义新角色</el-button>
        </div>
      </template>

      <el-table :data="roles" border stripe>
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="code" label="识别码" width="120">
          <template #default="{ row }"><span class="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase">{{ row.code }}</span></template>
        </el-table-column>
        <el-table-column label="权限配置详情">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-2">
              <el-tag v-for="p in row.permissions" :key="p" size="small" effect="light">
                {{ getPermLabel(p) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isSystem ? 'danger' : 'success'" size="small">
              {{ row.isSystem ? '核心系统' : '自定义' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑权限</el-button>
            <el-button v-if="!row.isSystem" type="danger" link @click="handleDelete(row)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 角色编辑对话框：全量模块授权 -->
    <el-dialog v-model="dialogVisible" :title="'权限矩阵配置 >> ' + (form.name || '新角色')" width="700px">
      <el-form :model="form" label-width="100px" class="space-y-2">
        <el-form-item label="角色名称" required>
          <el-input v-model="form.name" placeholder="如：区域运营主管" />
        </el-form-item>
        
        <el-divider content-position="left">模块授权 (全量功能列表)</el-divider>
        
        <el-form-item label="核心监测">
          <el-checkbox-group v-model="form.selectedPerms">
            <el-checkbox label="dashboard">数据总览</el-checkbox>
            <el-checkbox label="map">调度大屏</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="业务管理">
          <el-checkbox-group v-model="form.selectedPerms">
            <el-checkbox label="service">服务项目</el-checkbox>
            <el-checkbox label="category">分类中心</el-checkbox>
            <el-checkbox label="package">套餐方案</el-checkbox>
            <el-checkbox label="hospital">医院管理</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="用户中心">
          <el-checkbox-group v-model="form.selectedPerms">
            <el-checkbox label="user">用户管理</el-checkbox>
            <el-checkbox label="role">角色/账号权限</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="入驻审核">
          <el-checkbox-group v-model="form.selectedPerms">
            <el-checkbox label="verify_identity">实名审核</el-checkbox>
            <el-checkbox label="verify_health">健康证审核</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="订单管理">
          <el-checkbox-group v-model="form.selectedPerms">
            <el-checkbox label="order_all">全部订单</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="运营风控">
          <el-checkbox-group v-model="form.selectedPerms">
            <el-checkbox label="finance">财务看板</el-checkbox>
            <el-checkbox label="privacy">通讯风控</el-checkbox>
            <el-checkbox label="audit">消息审计</el-checkbox>
            <el-checkbox label="settings">全局策略/广告</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="后台支持">
          <el-checkbox-group v-model="form.selectedPerms">
            <el-checkbox label="bi">BI中心</el-checkbox>
            <el-checkbox label="notifications">通知中心</el-checkbox>
            <el-checkbox label="support">在线客服</el-checkbox>
            <el-checkbox label="withdrawals">提现审核</el-checkbox>
            <el-checkbox label="article">内容管理</el-checkbox>
            <el-checkbox label="feedback">意见反馈</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      
      <div class="text-xs text-slate-500 mt-3">管理员角色默认拥有全部模块访问权限</div>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSave">立即同步至权限链</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const roles = ref([
  { name: '超级管理员', code: 'admin', isSystem: true, permissions: ['dashboard', 'map', 'service', 'category', 'package', 'hospital', 'user', 'role', 'verify_identity', 'verify_health', 'order_all', 'finance', 'privacy', 'audit', 'settings', 'bi', 'notifications', 'support', 'withdrawals', 'article', 'feedback'] },
  { name: '财务专岗', code: 'finance', isSystem: true, permissions: ['dashboard', 'order_all', 'finance', 'bi', 'withdrawals'] },
  { name: '客服专岗', code: 'support', isSystem: true, permissions: ['dashboard', 'map', 'user', 'order_all', 'article', 'feedback', 'support'] },
  { name: '审核专岗', code: 'auditor', isSystem: true, permissions: ['verify_identity', 'verify_health', 'order_all', 'audit', 'privacy'] },
  { name: '运营专岗', code: 'operator', isSystem: true, permissions: ['service', 'category', 'hospital', 'order_all', 'article', 'notifications', 'feedback'] }
])

const permLabelMap = {
  dashboard: '数据总览', map: '调度大屏', service: '服务项目', category: '分类中心',
  package: '套餐方案', hospital: '医院管理', user: '用户管理', role: '角色/权限',
  verify_identity: '实名审核', verify_health: '健康证审核', order_all: '全部订单',
  finance: '财务看板', privacy: '通讯风控', audit: '消息审计', settings: '系统策略',
  bi: 'BI中心', notifications: '通知中心', support: '在线客服', withdrawals: '提现审核',
  article: '内容管理', feedback: '意见反馈'
}

const getPermLabel = (p) => permLabelMap[p] || p

const dialogVisible = ref(false)
const form = ref({ name: '', code: '', selectedPerms: [] })

const handleAdd = () => {
  form.value = { name: '', code: '', selectedPerms: [] }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  form.value = { name: row.name, code: row.code, selectedPerms: [...row.permissions] }
  dialogVisible.value = true
}

const submitSave = () => {
  ElMessage.success('角色权限矩阵已全量更新，相关账号权限已实时重置')
  dialogVisible.value = false
}

const handleDelete = (row) => { ElMessageBox.confirm('确定要移除该角色吗？') }
</script>
