<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">服务分类</div>
            <div class="text-sm text-slate-500 font-medium">分类层级与抽成比例</div>
          </div>
          <el-button type="primary" @click="handleAdd">新增分类</el-button>
        </div>
      </template>

      <el-table :data="categories" v-loading="loading" style="width: 100%" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="分类名称" min-width="150" />
        <el-table-column prop="parent_id" label="父分类ID" width="100" />
        <el-table-column prop="commission_rate" label="抽成比例(%)" width="120">
          <template #default="{ row }">
            <span class="font-black text-blue-600">{{ row.commission_rate || '10.00' }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="icon" label="图标" width="120" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 分类编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑分类' : '新增分类'"
      width="500px"
      @closed="handleDialogClosed"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="space-y-2">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="父级分类" prop="parentId">
          <el-select v-model="form.parentId" placeholder="选择父级分类" class="w-full">
            <el-option label="顶级分类" :value="0" />
            <el-option
              v-for="item in rootCategories"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <el-input v-model="form.icon" placeholder="请输入图标名称 (如 hospital-o)" />
        </el-form-item>
        <el-form-item label="抽成比例" prop="commissionRate">
          <el-input-number v-model="form.commissionRate" :min="0" :max="100" :precision="2" :step="0.5" />
          <span class="ml-2 text-slate-400">%</span>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="submitForm">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const submitLoading = ref(false)
const categories = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const form = ref({
  id: null,
  name: '',
  parentId: 0,
  icon: '',
  commissionRate: 10.00,
  sort: 0,
  status: 1
})

const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  icon: [{ required: true, message: '请输入图标名称', trigger: 'blur' }],
  commissionRate: [{ required: true, message: '请输入抽成比例', trigger: 'blur' }]
}

const rootCategories = computed(() => {
  return categories.value.filter(c => c.parent_id === 0)
})

const loadCategories = async () => {
  loading.value = true
  try {
    const data = await getCategories({})
    categories.value = data || []
  } catch (error) {
    console.error('加载分类失败:', error)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false
  form.value = {
    id: null,
    name: '',
    parentId: 0,
    icon: '',
    commissionRate: 10.00,
    sort: 0,
    status: 1
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  form.value = {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    icon: row.icon,
    commissionRate: row.commission_rate || 10.00,
    sort: row.sort,
    status: row.status
  }
  dialogVisible.value = true
}

const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除分类 "${row.name}" 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await deleteCategory(row.id)
      ElMessage.success('删除成功')
      loadCategories()
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败，请检查该分类下是否有子类或关联服务')
    }
  }).catch(() => {})
}

const handleDialogClosed = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        if (isEdit.value) {
          await updateCategory(form.value.id, {
            name: form.value.name,
            parentId: form.value.parentId,
            icon: form.value.icon,
            commissionRate: form.value.commissionRate,
            sort: form.value.sort,
            status: form.value.status
          })
          ElMessage.success('更新成功')
        } else {
          await createCategory({
            name: form.value.name,
            parentId: form.value.parentId,
            icon: form.value.icon,
            commissionRate: form.value.commissionRate,
            sort: form.value.sort
          })
          ElMessage.success('添加成功')
        }
        dialogVisible.value = false
        loadCategories()
      } catch (error) {
        console.error('保存失败:', error)
      } finally {
        submitLoading.value = false
      }
    }
  })
}

onMounted(() => {
  loadCategories()
})
</script>
