<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">内容管理</div>
            <div class="text-sm text-slate-500 font-medium">帮助中心与规则配置</div>
          </div>
          <el-button type="primary" @click="handleAdd">新增文章</el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag>{{ categoryMap[row.category] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="发布时间" width="180" :formatter="formatDate" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑文章' : '新增文章'" width="800px">
      <el-form :model="form" label-width="80px" class="space-y-2">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入文章标题" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category">
            <el-option label="常见问题" value="faq" />
            <el-option label="服务规则" value="rule" />
            <el-option label="系统公告" value="notice" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="15" placeholder="请输入文章内容(支持HTML)" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
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
const dialogVisible = ref(false)
const categoryMap = { faq: '常见问题', rule: '服务规则', notice: '系统公告' }
const form = ref({ id: null, title: '', content: '', category: 'faq', sort: 0 })

const loadData = async () => {
  loading.value = true
  try {
    const res = await request.get('/system/admin/articles')
    list.value = res
  } catch (e) {}
  loading.value = false
}

const handleAdd = () => {
  form.value = { id: null, title: '', content: '', category: 'faq', sort: 0 }
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  try {
    const res = await request.get(`/system/articles/${row.id}`)
    form.value = res
    dialogVisible.value = true
  } catch (e) {}
}

const submitForm = async () => {
  try {
    if (form.value.id) {
      await request.put(`/system/admin/articles/${form.value.id}`, form.value)
    } else {
      await request.post('/system/admin/articles', form.value)
    }
    ElMessage.success('操作成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {}
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除这篇文章吗？', '提示').then(async () => {
    await request.delete(`/system/admin/articles/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  })
}

const formatDate = (r, c, val) => new Date(val).toLocaleString()
onMounted(loadData)
</script>
