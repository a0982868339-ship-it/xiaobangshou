<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">系统操作审计日志</div>
            <div class="text-sm text-slate-500 font-medium">审计与操作轨迹</div>
          </div>
          <el-button icon="Refresh" circle @click="loadData" />
        </div>
      </template>

      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="created_at" label="操作时间" width="180" :formatter="formatDate" />
        <el-table-column label="操作人" width="150">
          <template #default="{ row }">
            <b>{{ row.admin_name }}</b> (ID:{{ row.admin_id }})
          </template>
        </el-table-column>
        <el-table-column prop="action" label="动作指令" width="150">
          <template #default="{ row }">
            <el-tag effect="plain">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="details" label="数据快照 (Payload)" min-width="250" />
        <el-table-column prop="ip_address" label="来源IP" width="140" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../utils/request'

const list = ref([])
const loading = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    // 模拟数据展示，实际对接后端的 admin_op_logs
    list.value = [
      { admin_id: 1, admin_name: '超级管理员', action: 'UPDATE_CONFIG', details: '修改 SETTLE_DELAY_JUNIOR 为 72', ip_address: '192.168.1.1', created_at: new Date() },
      { admin_id: 2, admin_name: '财务岗01', action: 'SETTLE_ORDER', details: '强制结算订单 ORD-8821', ip_address: '192.168.1.15', created_at: new Date() }
    ]
  } catch (e) {}
  loading.value = false
}

const formatDate = (r, c, v) => new Date(v).toLocaleString()
onMounted(loadData)
</script>
