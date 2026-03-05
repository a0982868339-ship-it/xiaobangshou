<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">🏥 医院数据管理中心</div>
            <div class="text-sm text-slate-500 font-medium">医院基础信息维护</div>
          </div>
          <el-button type="primary" @click="handleAdd">新增医院</el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" class="mt-4 mb-4 flex flex-wrap gap-4">
        <el-form-item label="服务城市">
          <el-select 
            v-model="queryParams.city" 
            placeholder="选择城市筛选" 
            clearable 
            filterable
            @change="handleQuery" 
            class="w-44"
          >
            <el-option v-for="item in availableCities" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input 
            v-model="queryParams.keyword" 
            placeholder="搜医院名称" 
            clearable 
            @input="handleQuery" 
            class="w-64"
          />
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="list" v-loading="loading" class="w-full" size="small">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="city" label="城市" width="120" />
        <el-table-column prop="name" label="医院名称" min-width="200" />
        <el-table-column prop="level" label="等级" width="120">
          <template #default="{ row }">
            <el-tag :type="row.level === '三级甲等' ? 'danger' : 'info'">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="详细地址" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="mt-6 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 编辑/新增对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑医院信息' : '录入新医院'" width="500px">
      <el-form :model="form" label-width="80px" class="space-y-2">
        <el-form-item label="城市" required>
          <el-input v-model="form.city" placeholder="如：北京市" />
        </el-form-item>
        <el-form-item label="医院名称" required>
          <el-input v-model="form.name" placeholder="输入完整名称" />
        </el-form-item>
        <el-form-item label="医院等级">
          <el-select v-model="form.level" class="w-full">
            <el-option label="三级甲等" value="三级甲等" />
            <el-option label="三级乙等" value="三级乙等" />
            <el-option label="二级甲等" value="二级甲等" />
            <el-option label="二级乙等" value="二级乙等" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="详细地址">
          <el-input v-model="form.address" type="textarea" placeholder="具体地理位置" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { getHospitals, createHospital, updateHospital, deleteHospital } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const availableCities = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const queryParams = reactive({
  city: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = ref({ id: null, city: '', name: '', level: '三级甲等', address: '' })

const loadData = async () => {
  loading.value = true
  try {
    const res = await getHospitals({
      ...queryParams,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    // 这里的 res 结构已由后端重写
    list.value = res.list
    pagination.total = res.pagination.total
    availableCities.value = res.cities
  } catch (e) {
    console.error('加载医院列表失败:', e)
  }
  loading.value = false
}

const handleQuery = () => {
  pagination.page = 1
  loadData()
}

const handleAdd = () => {
  isEdit.value = false
  form.value = { id: null, city: '', name: '', level: '三级甲等', address: '' }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要从数据库中永久删除医院 "${row.name}" 吗？`, '极密警告', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await deleteHospital(row.id)
    ElMessage.success('删除成功')
    loadData()
  })
}

const submitForm = async () => {
  if (!form.value.city || !form.value.name) return ElMessage.warning('城市和医院名称不能为空')
  try {
    if (isEdit.value) await updateHospital(form.value.id, form.value)
    else await createHospital(form.value)
    ElMessage.success('数据已同步至云端')
    dialogVisible.value = false
    loadData()
  } catch (e) {}
}

onMounted(loadData)
</script>
