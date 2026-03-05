<template>
  <div class="privacy-manage p-10 space-y-8">
    <el-tabs v-model="activeTab" type="border-card" class="tech-tabs">
      <!-- 标签页 1：实时通讯监控 -->
      <el-tab-pane label="实时通讯监控" name="monitor">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card shadow="hover" class="stat-card glass-panel">
              <template #header>虚拟号池状态</template>
              <div class="stat-main">
                <span class="v neon-text-blue">{{ poolList.length }}</span><span class="u">个</span>
              </div>
              <el-progress :percentage="calculateUsage" status="success" :show-text="false" />
              <div class="stat-footer mt-10">当前活跃绑定：{{ bindingList.length }} / 空闲：{{ idleCount }}</div>
            </el-card>
          </el-col>
          <div class="stat-col-flex">
            <el-card shadow="hover" class="stat-card glass-panel mini">
              <template #header>今日通话频次</template>
              <div class="stat-main small"><span class="v text-gold">142</span><span class="u">次</span></div>
            </el-card>
            <el-card shadow="hover" class="stat-card glass-panel mini">
              <template #header>风险通话预警</template>
              <div class="stat-main small"><span class="v text-orange">3</span><span class="u">单</span></div>
            </el-card>
          </div>
        </el-row>

        <!-- 实时绑定列表 -->
        <el-card class="mt-20 glass-panel">
          <template #header>
            <div class="card-header">
              <span>实时通讯链路追踪 (AXB Active Monitoring)</span>
              <div class="header-actions">
                <span class="pulse-text"><i class="dot bg-green"></i> 实时审计中</span>
              </div>
            </div>
          </template>
          <el-table :data="bindingList" border stripe>
            <el-table-column prop="orderNo" label="关联订单" width="160" />
            <el-table-column label="通讯双方">
              <template #default="{ row }">
                <div class="users-info">
                  <el-tag size="small" effect="dark" class="u-tag">用 {{ row.userPhone }}</el-tag>
                  <div class="link-line"></div>
                  <el-tag size="small" type="success" effect="dark" class="p-tag">师 {{ row.providerPhone }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="privacyNo" label="隐私专线 (X)" width="150">
              <template #default="{ row }">
                <b class="text-blue">{{ row.privacyNo }}</b>
              </template>
            </el-table-column>
            <el-table-column label="通讯时长" width="120">
              <template #default="{ row }">
                <div class="duration-box" :class="{ 'warning': row.duration > 1800 }">
                  <el-icon class="clock-icon"><Timer /></el-icon>
                  <span>{{ formatDuration(row.duration) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="链路状态">
              <template #default>
                <div class="status-cell">
                  <span class="wave-anim"></span>
                  <span class="text-green">信号已接通</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="风控操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" plain @click="playRecording(row)">听取存证</el-button>
                <el-button type="danger" size="small" plain @click="forceRelease(row)">阻断</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 标签页 2：号池资源管理 -->
      <el-tab-pane label="号池资源管理" name="pool">
        <!-- ... 保持之前的批量添加逻辑 ... -->
        <div class="table-header">
          <el-button type="primary" icon="Plus" @click="openAddDialog">批量扩容号池</el-button>
          <el-button icon="Refresh" @click="loadPool">刷新资源列表</el-button>
        </div>
        <el-table :data="poolList" v-loading="loading" border class="mt-20">
          <el-table-column prop="phone_number" label="虚拟号 (X)" width="180"><template #default="{ row }"><b class="text-blue">{{ row.phone_number }}</b></template></el-table-column>
          <el-table-column prop="city" label="归属城市" width="120" />
          <el-table-column prop="provider" label="供应商" width="120" />
          <el-table-column label="当前状态" width="120"><template #default="{ row }"><el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column prop="created_at" label="入池时间" :formatter="formatDate" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status === 2" type="success" link @click="updateStatus(row, 0)">启用</el-button>
              <el-button v-if="row.status === 0" type="warning" link @click="updateStatus(row, 2)">禁用</el-button>
              <el-button type="danger" link @click="handleDelete(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 批量扩容对话框 -->
    <el-dialog v-model="dialogVisible" title="号池批量扩容 (Batch Add)" width="500px">
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="号码列表" required>
          <el-input v-model="addForm.phoneNumbers" type="textarea" :rows="6" placeholder="请在此输入号码，每行一个" />
        </el-form-item>
        <el-form-item label="归属城市"><el-input v-model="addForm.city" placeholder="三亚" /></el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="addForm.provider" style="width: 100%"><el-option label="阿里云 (Aliyun)" value="Aliyun" /><el-option label="腾讯云 (Tencent)" value="Tencent" /></el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitAdd">立即执行批量入池</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Timer } from '@element-plus/icons-vue'

const activeTab = ref('monitor')
const loading = ref(false)
const poolList = ref([])
const dialogVisible = ref(false)
const submitLoading = ref(false)
const addForm = ref({ phoneNumbers: '', city: '三亚', provider: 'Aliyun' })

// 模拟的实时绑定数据（包含时长秒数）
const bindingList = ref([
  { orderNo: 'ORD20260119882', userPhone: '138****9921', providerPhone: '139****0012', privacyNo: '170-5521-8890', duration: 325 },
  { orderNo: 'ORD20260119771', userPhone: '150****4432', providerPhone: '188****1123', privacyNo: '170-5521-8891', duration: 1842 },
])

let timer = null

// 核心：模拟实时计时
const startGlobalTimer = () => {
  timer = setInterval(() => {
    bindingList.value.forEach(item => {
      item.duration += 1
    })
  }, 1000)
}

const formatDuration = (s) => {
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

const activeBindingCount = computed(() => bindingList.value.length)
const idleCount = computed(() => poolList.value.filter(p => p.status === 0).length)
const calculateUsage = computed(() => poolList.value.length ? (activeBindingCount.value / poolList.value.length) * 100 : 0)

const loadPool = async () => {
  loading.value = true
  try {
    const res = await request.get('/system/admin/privacy/pool')
    poolList.value = res || []
  } catch (e) {}
  loading.value = false
}

const openAddDialog = () => {
  addForm.value = { phoneNumbers: '', city: '三亚', provider: 'Aliyun' }
  dialogVisible.value = true
}

const submitAdd = async () => {
  if (!addForm.value.phoneNumbers.trim()) return ElMessage.error('请填写号码列表')
  submitLoading.value = true
  try {
    await request.post('/system/admin/privacy/numbers', addForm.value)
    ElMessage.success('批量扩容指令执行成功')
    dialogVisible.value = false
    loadPool()
  } catch (e) {}
  submitLoading.value = false
}

const updateStatus = async (row, status) => {
  try {
    await request.put(`/system/admin/privacy/numbers/${row.id}`, { status })
    ElMessage.success('状态更新成功'); loadPool()
  } catch (e) {}
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要移除号码 ${row.phone_number} 吗？`, '移除确认').then(async () => {
    await request.delete(`/system/admin/privacy/numbers/${row.id}`)
    ElMessage.success('已移除'); loadPool()
  })
}

const playRecording = (row) => ElMessage.info('正在拉取云端语音存证数据...')
const forceRelease = (row) => ElMessage.warning('通讯链路已强制切断')

const getStatusText = (s) => ['空闲就绪', '忙碌中', '已禁用'][s]
const getStatusType = (s) => ['success', 'warning', 'danger'][s]
const formatDate = (r, c, v) => new Date(v).toLocaleString()

onMounted(() => {
  loadPool()
  startGlobalTimer()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.privacy-manage { background: transparent; }
.stat-col-flex { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.stat-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; }
.stat-card.mini { text-align: left; }
.stat-card.mini .stat-main.small .v { font-size: 24px; }
.stat-main .v { font-size: 36px; font-weight: 900; font-family: 'Inter', system-ui, sans-serif; color: #0f172a; }
.stat-main .u { font-size: 14px; margin-left: 5px; color: #94a3b8; }
.stat-footer { font-size: 12px; color: #94a3b8; }

.users-info { display: flex; align-items: center; justify-content: center; gap: 6px; }
.link-line { width: 30px; height: 2px; background: repeating-linear-gradient(90deg, #cbd5e1, #cbd5e1 4px, transparent 4px, transparent 8px); opacity: 0.6; }

/* 时长显示盒子 */
.duration-box { display: flex; align-items: center; gap: 5px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; color: #16a34a; font-weight: 700; }
.duration-box.warning { color: #d97706; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0.5; } }
.clock-icon { font-size: 18px; }

.status-cell { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.wave-anim { width: 8px; height: 8px; background: #16a34a; border-radius: 50%; position: relative; }
.wave-anim::after { content: ''; position: absolute; inset: -4px; border: 1px solid #16a34a; border-radius: 50%; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }

.neon-text-blue { color: #4f46e5; text-shadow: none; }
.text-gold { color: #d97706; }
.text-orange { color: #d97706; }
.text-blue { color: #2563eb; }
.text-green { color: #16a34a; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.bg-green { background: #16a34a; }
.mt-20 { margin-top: 20px; }
.mt-10 { margin-top: 10px; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

/* 深色模式下的特殊补丁 */
:deep(.el-tabs--border-card) {
  border: none;
}
</style>
