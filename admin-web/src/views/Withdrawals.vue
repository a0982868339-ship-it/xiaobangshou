<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">提现申请审核</div>
            <div class="text-sm text-slate-500 font-medium">资金结算与审核流程</div>
          </div>
          <el-radio-group v-model="statusFilter" @change="loadData" size="small">
            <el-radio-button :label="null">全部</el-radio-button>
            <el-radio-button :label="0">待审核</el-radio-button>
            <el-radio-button :label="1">已通过</el-radio-button>
            <el-radio-button :label="2">已驳回</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="list" v-loading="loading">
        <el-table-column prop="created_at" label="申请时间" width="180" :formatter="formatDate" />
        <el-table-column label="申请人" width="150">
          <template #default="{ row }">
            {{ row.nickname }} ({{ row.phone }})
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            <span class="font-black text-red-600">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="打款信息">
          <template #default="{ row }">
            <div>姓名：{{ row.real_name }}</div>
            <div>银行：{{ row.bank_name }}</div>
            <div>卡号：{{ row.bank_card_no }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" type="primary" size="small" @click="handleReview(row, 1)">通过</el-button>
            <el-button v-if="row.status === 0" type="danger" size="small" @click="handleReview(row, 2)">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 驳回原因对话框 -->
    <el-dialog v-model="dialogVisible" title="审核处理" width="400px">
      <el-form>
        <el-form-item label="备注/原因">
          <el-input v-model="reviewForm.remark" type="textarea" placeholder="如果是驳回，请填写原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReview">确定</el-button>
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
const statusFilter = ref(0)
const dialogVisible = ref(false)
const reviewForm = ref({ id: null, status: 1, remark: '' })

const loadData = async () => {
  loading.value = true
  try {
    const params = {}
    if (statusFilter.value !== null) params.status = statusFilter.value
    const res = await request.get('/wallet/withdrawals', { params })
    list.value = res
  } catch (e) {
    console.error('加载提现列表失败:', e)
  }
  loading.value = false
}

const handleReview = (row, status) => {
  reviewForm.value = { id: row.id, status, remark: '' }
  if (status === 1) {
    ElMessageBox.confirm(`确认已线下打款 ¥${row.amount} 给 ${row.real_name} 吗？`, '通过确认').then(() => {
      submitReview()
    })
  } else {
    dialogVisible.value = true
  }
}

const submitReview = async () => {
  try {
    await request.put(`/wallet/withdrawals/${reviewForm.value.id}/review`, {
      status: reviewForm.value.status,
      remark: reviewForm.value.remark
    })
    ElMessage.success('处理成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {}
}

const getStatusText = (s) => ['待审核', '已通过', '已驳回'][s]
const getStatusType = (s) => ['', 'success', 'danger'][s]
const formatDate = (r, c, val) => new Date(val).toLocaleString()

onMounted(loadData)
</script>
