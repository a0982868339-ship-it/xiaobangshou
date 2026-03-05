<template>
  <div class="provider-verify p-10 space-y-8">
    <el-tabs v-model="activeTab" class="verify-tabs" @tab-change="handleTabChange">
      <!-- 版面一：人工审核通道 -->
      <el-tab-pane label="人工照片审核" name="manual">
        <el-card shadow="never" class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <template #header>
            <div class="header-content">
              <span>✍️ 待处理人工审核申请</span>
              <el-tag type="warning">需要管理员比对手持照</el-tag>
            </div>
          </template>

          <el-table :data="manualProviders" v-loading="loading" border style="width: 100%">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="申请人信息" width="200">
              <template #default="{ row }">
                <div class="user-info-cell">
                  <div class="u-name">{{ row.real_name }}</div>
                  <div class="u-phone">{{ row.phone }}</div>
                  <div class="u-idcard">{{ row.id_card }}</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="证件照片 (点击放大)" min-width="360">
              <template #default="{ row }">
                <div class="photo-group">
                  <div class="photo-item">
                    <el-image 
                      :src="row.id_card_front" 
                      :preview-src-list="[row.id_card_front, row.id_card_back, row.id_card_handheld]"
                      fit="cover"
                      class="mini-photo"
                    />
                    <span>正面</span>
                  </div>
                  <div class="photo-item">
                    <el-image 
                      :src="row.id_card_back" 
                      :preview-src-list="[row.id_card_back, row.id_card_front, row.id_card_handheld]"
                      fit="cover"
                      class="mini-photo"
                    />
                    <span>反面</span>
                  </div>
                  <div class="photo-item highlight">
                    <el-image 
                      :src="row.id_card_handheld" 
                      :preview-src-list="[row.id_card_handheld, row.id_card_front, row.id_card_back]"
                      fit="cover"
                      class="mini-photo large"
                    />
                    <span>手持照</span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column prop="created_at" label="提交时间" width="170" :formatter="formatDate" />

            <el-table-column label="审核操作" width="180" fixed="right" align="center">
              <template #default="{ row }">
                <el-button-group>
                  <el-button type="success" size="small" @click="handleAudit(row, 1)">通过</el-button>
                  <el-button type="danger" size="small" @click="openRejectDialog(row)">驳回</el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 版面二：自动核验记录 -->
      <el-tab-pane label="支付宝核验记录" name="auto">
        <el-card shadow="never" class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <template #header>
            <div class="header-content">
              <span>🤖 自动核验审计日志</span>
              <el-tag type="success">支付宝实时接口驱动</el-tag>
            </div>
          </template>

          <el-table :data="autoProviders" v-loading="loading" border style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column label="人员信息" min-width="220">
              <template #default="{ row }">
                <div class="user-info-cell">
                  <div class="u-name"><strong>{{ row.real_name }}</strong></div>
                  <div class="u-idcard">{{ row.id_card }}</div>
                  <div class="u-phone">{{ row.phone }}</div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column label="核验状态" width="180">
              <template #default="{ row }">
                <el-tag type="success" effect="plain" class="status-tag">
                  <el-icon><CircleCheck /></el-icon>
                  <span>支付宝核实成功</span>
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="alipay_certify_id" label="支付宝流水号" min-width="200" />
            
            <el-table-column prop="updated_at" label="核实时间" width="180" :formatter="formatDate" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectVisible" title="驳回实名申请" width="400px">
      <el-form :model="rejectForm">
        <el-form-item label="驳回原因" required>
          <el-select v-model="rejectForm.reason" placeholder="请选择或输入原因" filterable allow-create>
            <el-option label="手持照片模糊，无法辨认信息" value="手持照片模糊，无法辨认信息" />
            <el-option label="身份证正反面上传颠倒" value="身份证正反面上传颠倒" />
            <el-option label="证件已过期" value="证件已过期" />
            <el-option label="非本人手持证件" value="非本人手持证件" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmReject" :loading="auditLoading">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { getProvidersAdmin, auditProvider } from '../api/index.js'
import { CircleCheck } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('manual')
const loading = ref(false)
const manualProviders = ref([])
const autoProviders = ref([])

const rejectVisible = ref(false)
const auditLoading = ref(false)
const currentSelectedRow = ref(null)
const rejectForm = reactive({ reason: '' })

const fetchManualData = async () => {
  loading.value = true
  try {
    // 获取人工方式(verify_method=2)且待审核(verify_status=0)的数据
    const data = await getProvidersAdmin({ verifyStatus: '0', verifyMethod: '2' })
    manualProviders.value = data || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const fetchAutoData = async () => {
  loading.value = true
  try {
    // 获取支付宝方式(verify_method=1)且已通过(verify_status=1)的数据
    const data = await getProvidersAdmin({ verifyStatus: '1', verifyMethod: '1' })
    autoProviders.value = data || []
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

const handleTabChange = (name) => {
  if (name === 'manual') fetchManualData()
  else fetchAutoData()
}

const handleAudit = async (row, status) => {
  const actionText = status === 1 ? '通过' : '驳回'
  try {
    await ElMessageBox.confirm(`确定要${actionText} ${row.real_name} 的实名申请吗？`, '审核确认')
    auditLoading.value = true
    await auditProvider(row.id, { status, reason: '管理员人工审核通过' })
    ElMessage.success('审核操作成功')
    fetchManualData()
  } catch (e) {
    console.log('取消或失败')
  } finally {
    auditLoading.value = false
  }
}

const openRejectDialog = (row) => {
  currentSelectedRow.value = row
  rejectForm.reason = ''
  rejectVisible.value = true
}

const confirmReject = async () => {
  if (!rejectForm.reason) return ElMessage.warning('请填写驳回原因')
  auditLoading.value = true
  try {
    await auditProvider(currentSelectedRow.value.id, { status: 2, reason: rejectForm.reason })
    ElMessage.success('已驳回申请')
    rejectVisible.value = false
    fetchManualData()
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    auditLoading.value = false
  }
}

const formatDate = (r, c, val) => val ? new Date(val).toLocaleString() : '-'

onMounted(() => {
  fetchManualData()
})
</script>

<script>
export default {
  name: 'IdentityVerify'
}
</script>

<style scoped>
.provider-verify { background: transparent; }
.verify-tabs :deep(.el-tabs__header) { margin-bottom: 20px; }

.header-content { display: flex; justify-content: space-between; align-items: center; }

.user-info-cell { line-height: 1.6; }
.u-name { font-size: 15px; color: #0f172a; font-weight: 600; }
.u-phone, .u-idcard { font-size: 12px; color: #94a3b8; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

.photo-group { display: flex; gap: 12px; align-items: center; }
.photo-item { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 11px; color: #909399; }
.mini-photo { width: 80px; height: 50px; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer; transition: transform 0.2s; }
.mini-photo:hover { transform: scale(1.05); }
.mini-photo.large { width: 100px; height: 65px; border-color: #4f46e5; }
.photo-item.highlight { color: #4f46e5; font-weight: bold; }

.status-tag { display: inline-flex; align-items: center; gap: 4px; }
</style>
