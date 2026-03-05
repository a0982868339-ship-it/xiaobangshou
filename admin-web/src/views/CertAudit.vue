<template>
  <div class="cert-audit-container p-10 space-y-8">
    <el-card shadow="never" class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="header-content">
          <span class="title">📜 {{ currentTypeName }}专项审核中心</span>
          <el-radio-group v-model="filterStatus" @change="loadData" size="default">
            <el-radio-button :label="null">全部</el-radio-button>
            <el-radio-button :label="0">待审核</el-radio-button>
            <el-radio-button :label="1">已通过</el-radio-button>
            <el-radio-button :label="2">已驳回</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" class="w-full" border stripe>
        <el-table-column label="服务者信息" width="200">
          <template #default="{ row }">
            <div class="provider-info">
              <div class="name">{{ row.provider_real_name || row.provider_nickname }}</div>
              <div class="phone">{{ row.provider_phone }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="证件信息" width="220">
          <template #default="{ row }">
            <el-tag size="small" type="info" class="mb-5">{{ getTypeText(row.type) }}</el-tag>
            <div class="cert-name">{{ row.name }}</div>
            <div class="cert-no" v-if="row.certificate_no">编号: {{ row.certificate_no }}</div>
          </template>
        </el-table-column>

        <el-table-column label="有效期" width="120">
          <template #default="{ row }">
            {{ row.expire_date ? formatDate(row.expire_date) : '长期有效' }}
          </template>
        </el-table-column>

        <el-table-column label="证件照片" min-width="200">
          <template #default="{ row }">
            <div class="image-list">
              <el-image
                v-for="(img, idx) in parseJSON(row.images)"
                :key="idx"
                :src="img"
                :preview-src-list="parseJSON(row.images)"
                fit="cover"
                class="cert-img"
                preview-teleported
              />
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <div v-if="row.status === 0">
              <el-button type="success" size="small" @click="handleAudit(row, 1)">通过</el-button>
              <el-button type="danger" size="small" @click="openRejectDialog(row)">驳回</el-button>
            </div>
            <div v-else class="audit-info">
              <span v-if="row.status === 2" class="reason" :title="row.reject_reason">
                查看驳回原因
              </span>
              <el-button v-else type="primary" link @click="handleAudit(row, 0)">重新审核</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 驳回原因弹窗 -->
    <el-dialog v-model="rejectVisible" title="驳回资质申请" width="400px">
      <el-form :model="rejectForm" label-position="top">
        <el-form-item label="驳回原因" required>
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            rows="3"
            placeholder="请简要说明驳回原因，方便服务者修改"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReject" :loading="submitting">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const list = ref([])
const loading = ref(false)
const filterStatus = ref(0) // 默认显示待审核
const rejectVisible = ref(false)
const submitting = ref(false)
const currentCert = ref(null)

const currentTypeName = computed(() => {
  const type = route.params.type
  const found = typeOptions.find(o => o.value === type)
  return found ? found.text : ''
})

const rejectForm = reactive({
  reason: ''
})

const getStatusText = (s) => ['待审核', '已通过', '已驳回'][s] || '未知'
const getStatusType = (s) => ['warning', 'success', 'danger'][s] || 'info'

const typeOptions = [
  { text: '医疗资质', value: 'medical' },
  { text: '家政资质', value: 'domestic' },
  { text: '宠物资质', value: 'pet' },
  { text: '通用资质', value: 'other' }
]

const getTypeText = (type) => {
  const found = typeOptions.find(o => o.value === type)
  return found ? found.text : '其他类型'
}

const parseJSON = (str) => {
  if (!str) return []
  try { return typeof str === 'string' ? JSON.parse(str) : str } catch (e) { return [] }
}

const formatDate = (val) => new Date(val).toLocaleDateString()
const formatDateTime = (val) => new Date(val).toLocaleString()

const loadData = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/providers/admin/certifications/all', {
      params: { 
        status: filterStatus.value,
        type: route.params.type || null
      }
    })
    list.value = res.data.data || res.data
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 监听路由参数变化，实现分类切换刷新
watch(() => route.params.type, () => {
  loadData()
})

const handleAudit = (row, status) => {
  const action = status === 1 ? '通过' : '重置为待审核'
  ElMessageBox.confirm(`确定要${action}该资质申请吗？`, '提示', {
    type: status === 1 ? 'success' : 'warning'
  }).then(async () => {
    try {
      await axios.put(`/api/providers/admin/certifications/${row.id}/audit`, { status })
      ElMessage.success('操作成功')
      loadData()
    } catch (e) {
      ElMessage.error('操作失败')
    }
  })
}

const openRejectDialog = (row) => {
  currentCert.value = row
  rejectForm.reason = ''
  rejectVisible.value = true
}

const submitReject = async () => {
  if (!rejectForm.reason) return ElMessage.warning('请填写驳回原因')
  submitting.value = true
  try {
    await axios.put(`/api/providers/admin/certifications/${currentCert.value.id}/audit`, {
      status: 2,
      reason: rejectForm.reason
    })
    ElMessage.success('已驳回')
    rejectVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.cert-audit-container { background: transparent; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 800; color: #0f172a; }
.provider-info .name { font-weight: 700; color: #0f172a; }
.provider-info .phone { font-size: 12px; color: #94a3b8; margin-top: 4px; }
.cert-name { font-weight: 600; margin-top: 5px; color: #0f172a; }
.cert-no { font-size: 12px; color: #64748b; margin-top: 2px; }
.image-list { display: flex; gap: 8px; flex-wrap: wrap; }
.cert-img { width: 60px; height: 60px; border-radius: 12px; cursor: zoom-in; border: 1px solid #e2e8f0; }
.mb-5 { margin-bottom: 5px; }
.audit-info .reason { font-size: 12px; color: #dc2626; cursor: help; text-decoration: underline; }
</style>
