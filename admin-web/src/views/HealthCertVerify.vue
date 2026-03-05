<template>
  <div class="health-cert-verify p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="header-content">
          <span>🩺 健康证专项审核</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="loadData">
        <el-tab-pane label="待审核" name="3"></el-tab-pane>
        <el-tab-pane label="已通过" name="1"></el-tab-pane>
        <el-tab-pane label="已拒绝" name="2"></el-tab-pane>
      </el-tabs>

        <el-table :data="list" v-loading="loading" class="w-full">
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column label="服务者" min-width="180">
          <template #default="{ row }">
              <div>
                <div class="text-sm font-semibold text-slate-900">{{ row.real_name || row.nickname }}</div>
                <div class="text-xs text-slate-400">{{ row.phone }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="health_cert_no" label="证件编号" width="180" />
        <el-table-column label="有效期至" width="180">
          <template #default="{ row }">
            <div :class="getExpireClass(row.health_cert_expire)">
              {{ formatDateOnly(null, null, row.health_cert_expire) }}
              <el-tag v-if="isExpired(row.health_cert_expire)" size="small" type="danger" effect="dark" class="ml-5">已过期</el-tag>
              <el-tag v-else-if="isSoonExpire(row.health_cert_expire)" size="small" type="warning" effect="light" class="ml-5">即将到期</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="提交时间" width="180" :formatter="formatDateTime" />
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="viewDetail(row)">查看照片</el-button>
            <template v-if="activeTab === '3'">
              <el-divider direction="vertical" />
              <el-button type="success" size="small" link @click="handleAudit(row.id, 1)">通过</el-button>
              <el-button type="danger" size="small" link @click="handleAudit(row.id, 2)">拒绝</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog v-model="dialogVisible" title="健康证照片核验" width="500px" center>
      <div v-if="currentData" class="photo-container">
        <div class="info-summary">
          <p><strong>持证人：</strong>{{ currentData.real_name }}</p>
          <p><strong>证件号：</strong>{{ currentData.health_cert_no }}</p>
        </div>
        <el-image 
          class="w-full h-[300px] rounded-2xl border border-slate-200" 
          :src="getFullImageUrl(currentData.health_cert_image)" 
          :preview-src-list="[getFullImageUrl(currentData.health_cert_image)]"
          fit="contain"
        >
          <template #error><div class="image-slot">未上传或图片失效</div></template>
        </el-image>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">返回</el-button>
          <template v-if="activeTab === '3'">
            <el-button type="danger" @click="handleAudit(currentData.id, 2)">驳回</el-button>
            <el-button type="success" @click="handleAudit(currentData.id, 1)">通过审核</el-button>
          </template>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('3') // 3 为待审核
const loading = ref(false)
const list = ref([])
const dialogVisible = ref(false)
const currentData = ref(null)

const getFullImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `http://localhost:3000${path}`;
}

const loadData = async () => {
  loading.value = true
  try {
    // 调用管理员接口获取所有服务者，但前端根据 health_cert_status 过滤
    // 实际生产建议后端增加针对健康证状态的过滤参数
    const res = await request.get('/providers/admin/all')
    list.value = res.filter(p => String(p.health_cert_status) === activeTab.value)
  } catch (e) {
    console.error('加载失败:', e)
  }
  loading.value = false
}

const viewDetail = (row) => {
  currentData.value = row
  dialogVisible.value = true
}

const handleAudit = (id, status) => {
  const action = status === 1 ? '通过' : '驳回'
  const confirmText = status === 1 ? '确定通过该服务者的健康证审核吗？' : '请输入驳回原因'
  
  if (status === 1) {
    ElMessageBox.confirm(confirmText, '健康证审核').then(async () => {
      await performAudit(id, status)
    })
  } else {
    ElMessageBox.prompt(confirmText, '驳回原因', {
      inputPlaceholder: '如：照片不清晰、证件过期等',
      required: true
    }).then(async ({ value }) => {
      await performAudit(id, status, value)
    })
  }
}

const performAudit = async (id, status, reason = '') => {
  try {
    await request.put(`/providers/admin/${id}/audit-health`, { status, reason })
    ElMessage.success('操作成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    console.error('审核失败:', e)
  }
}

const formatDateTime = (r, c, val) => val ? new Date(val).toLocaleString() : '-'
const formatDateOnly = (r, c, val) => val ? new Date(val).toLocaleDateString() : '-'

const isExpired = (date) => {
  if (!date) return false
  return new Date(date) < new Date()
}

const isSoonExpire = (date) => {
  if (!date) return false
  const expireDate = new Date(date)
  const today = new Date()
  const diffDays = (expireDate - today) / (1000 * 60 * 60 * 24)
  return diffDays > 0 && diffDays <= 30
}

const getExpireClass = (date) => {
  if (isExpired(date)) return 'expire-text danger-breath'
  if (isSoonExpire(date)) return 'expire-text warning'
  return ''
}

onMounted(loadData)
</script>

<style scoped>
.header-content { display: flex; justify-content: space-between; align-items: center; }
.photo-container { text-align: center; }
.info-summary { text-align: left; margin-bottom: 15px; padding: 12px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
.image-slot { display: flex; justify-content: center; align-items: center; height: 100%; color: #94a3b8; }
.dialog-footer { display: flex; justify-content: center; gap: 20px; }
.ml-5 { margin-left: 5px; }
.expire-text { font-weight: bold; }
.expire-text.danger-breath { color: #dc2626; animation: breath 2s infinite; }
.expire-text.warning { color: #d97706; }

@keyframes breath {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
