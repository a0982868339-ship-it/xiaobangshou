<template>
  <div class="p-10 space-y-8">
    <el-card shadow="never" class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-5">
            <span class="text-xl font-black tracking-tight">区域管理</span>
            <el-breadcrumb separator="/" class="text-sm">
              <el-breadcrumb-item @click="handleBreadcrumbClick(null)">全国</el-breadcrumb-item>
              <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.code" @click="handleBreadcrumbClick(item)">
                {{ item.name }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="flex items-center gap-4">
            <el-input
              v-model="searchQuery.name"
              placeholder="全局搜索区域"
              class="w-52"
              clearable
              @input="handleSearch"
            />
            <el-checkbox v-model="searchQuery.onlyOpen" @change="handleSearch">只看已开通</el-checkbox>
          </div>
        </div>
      </template>

      <el-table :data="regions" v-loading="loading" style="width: 100%" border>
        <el-table-column prop="code" label="行政代码" width="120" />
        <el-table-column prop="name" label="区域名称" min-width="150">
          <template #default="{ row }">
            <el-button 
              v-if="row.level < 3 && !searchQuery.name" 
              link 
              type="primary" 
              @click="drillDown(row)"
            >
              {{ row.name }}
            </el-button>
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="层级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelTag(row.level)">{{ getLevelName(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="服务状态" width="180" align="center">
          <template #default="{ row }">
            <div class="flex flex-col items-center gap-1">
              <el-switch
                v-model="row.is_open"
                :active-value="1"
                :inactive-value="0"
                @change="(val) => handleToggleStatus(row, val)"
              />
              <el-button 
                v-if="row.level < 3"
                size="small" 
                link 
                type="warning" 
                @click="handleToggleStatus(row, row.is_open, true)"
              >
                级联更新
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="排序权重" width="150" align="center">
          <template #default="{ row }">
            <el-input-number
              v-model="row.sort"
              :min="0"
              :max="999"
              size="small"
              @change="(val) => handleUpdateSort(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="最后更新" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button v-if="row.level < 3 && !searchQuery.name" type="primary" size="small" @click="drillDown(row)">
              下级区域
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="mt-6 flex justify-end">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          layout="total, prev, pager, next"
          :total="total"
          @current-change="fetchRegions"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminRegions, toggleRegionStatus, updateRegionSort } from '../api/index.js'

const regions = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const breadcrumbs = ref([])
const currentParentCode = ref(null)

const searchQuery = reactive({
  name: '',
  onlyOpen: false
})

const handleSearch = () => {
  if (searchQuery.name) {
    currentParentCode.value = null
    breadcrumbs.value = []
  }
  page.value = 1
  fetchRegions()
}

const fetchRegions = async () => {
  loading.value = true
  try {
    const params = {
      name: searchQuery.name,
      isOpen: searchQuery.onlyOpen ? 1 : undefined,
      page: page.value,
      pageSize: pageSize.value
    }
    
    // 如果没有搜索，则按层级展示
    if (!searchQuery.name) {
      if (currentParentCode.value) {
        params.parentCode = currentParentCode.value
      } else {
        params.level = 1 // 初始显示省份
      }
    }

    const res = await getAdminRegions(params)
    regions.value = res.list || []
    total.value = res.total || 0
  } catch (error) {
    // 错误已由拦截器处理
  } finally {
    loading.value = false
  }
}

const drillDown = (row) => {
  currentParentCode.value = row.code
  breadcrumbs.value.push({ name: row.name, code: row.code, level: row.level })
  page.value = 1
  fetchRegions()
}

const handleBreadcrumbClick = (item) => {
  if (!item) {
    currentParentCode.value = null
    breadcrumbs.value = []
  } else {
    const index = breadcrumbs.value.findIndex(b => b.code === item.code)
    breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
    currentParentCode.value = item.code
  }
  searchQuery.name = '' // 清除搜索状态
  page.value = 1
  fetchRegions()
}

const handleToggleStatus = async (row, val, cascade = false) => {
  if (cascade) {
    try {
      await ElMessageBox.confirm(
        `确定要将 ${row.name} 及其下属所有区域的状态同步为 ${val ? '开通' : '关闭'} 吗？`,
        '级联更新确认',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
    } catch (e) {
      return
    }
  }

  try {
    await toggleRegionStatus(row.code, { isOpen: !!val, cascade })
    ElMessage.success(cascade ? '区域及下属状态已同步' : (val ? '区域已开通' : '区域已关闭'))
    if (cascade) fetchRegions() // 级联更新后刷新列表
  } catch (error) {
    row.is_open = val === 1 ? 0 : 1 // 失败回滚
  }
}

const handleUpdateSort = async (row, val) => {
  try {
    await updateRegionSort(row.code, { sort: val })
    ElMessage.success('排序已更新')
  } catch (error) {
    ElMessage.error('更新失败')
  }
}

const getLevelName = (level) => {
  const map = { 1: '省份', 2: '城市', 3: '区县' }
  return map[level] || '未知'
}

const getLevelTag = (level) => {
  const map = { 1: 'danger', 2: 'warning', 3: 'success' }
  return map[level] || 'info'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  fetchRegions()
})
</script>
