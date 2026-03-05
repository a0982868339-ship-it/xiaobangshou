<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">广告引擎管理</div>
            <div class="text-sm text-slate-500 font-medium">Banner 与弹窗配置</div>
          </div>
          <el-button type="primary" @click="handleAdd">发布新广告/Banner</el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column label="预览" width="180">
          <template #default="{ row }">
            <el-image 
              :src="getFullUrl(row.image_url)" 
              class="w-36 h-14 rounded-xl border border-slate-200"
              fit="cover"
              :preview-src-list="[getFullUrl(row.image_url)]"
              preview-teleported
            />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="link_url" label="跳转链路 (路由/URL)" />
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="saveBanner(row)" />
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

    <!-- 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '修正广告参数' : '注入新广告'" width="500px">
      <el-form :model="form" label-width="80px" class="space-y-2">
        <el-form-item label="广告标题" required>
          <el-input v-model="form.title" placeholder="仅后台备注，不在前端显示" />
        </el-form-item>
        <el-form-item label="广告图片" required>
          <el-input v-model="form.imageUrl" placeholder="请输入图片完整 URL 或路径" />
          <div class="text-xs text-slate-500 mt-2">可通过上传中心获取路径后填写</div>
        </el-form-item>
        <el-form-item label="跳转链路">
          <el-input v-model="form.linkUrl" placeholder="如：/service/1 或 https://..." />
        </el-form-item>
        <el-form-item label="投放位置">
          <el-radio-group v-model="form.type">
            <el-radio :label="1">首页轮播</el-radio>
            <el-radio :label="2">全局弹窗</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="显示权重">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitSave">立即发布</el-button>
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
const submitLoading = ref(false)
const form = ref({ id: null, title: '', imageUrl: '', linkUrl: '', type: 1, sort: 0, status: 1 })

const loadData = async () => {
  loading.value = true
  try {
    const res = await request.get('/system/admin/banners')
    list.value = res || []
  } catch (e) {}
  loading.value = false
}

const handleAdd = () => {
  form.value = { id: null, title: '', imageUrl: '', linkUrl: '', type: 1, sort: 0, status: 1 }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  form.value = { 
    id: row.id, title: row.title, imageUrl: row.image_url, 
    linkUrl: row.link_url, type: row.type, sort: row.sort, status: row.status 
  }
  dialogVisible.value = true
}

const submitSave = async () => {
  if (!form.value.imageUrl) return ElMessage.error('请填写图片地址')
  submitLoading.value = true
  try {
    await request.post('/system/admin/banners', form.value)
    ElMessage.success('广告引擎已同步更新')
    dialogVisible.value = false
    loadData()
  } catch (e) {}
  submitLoading.value = false
}

const saveBanner = async (row) => {
  try {
    await request.post('/system/admin/banners', {
      id: row.id, title: row.title, imageUrl: row.image_url,
      linkUrl: row.link_url, type: row.type, sort: row.sort, status: row.status
    })
    ElMessage.success('状态已更新')
  } catch (e) {}
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要永久下架并删除该广告吗？').then(async () => {
    await request.delete(`/system/admin/banners/${row.id}`)
    ElMessage.success('已移除')
    loadData()
  })
}

const getFullUrl = (url) => url.startsWith('http') ? url : `http://localhost:3000${url}`
const getTypeText = (t) => t === 1 ? '首页轮播' : '全局弹窗'
const formatDate = (r, c, v) => new Date(v).toLocaleString()

onMounted(loadData)
</script>
