<template>
  <div class="p-10 space-y-8">
    <el-card class="bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xl font-black tracking-tight">服务项目管理</div>
            <div class="text-sm text-slate-500 font-medium">服务配置与价格维护</div>
          </div>
          <el-button type="primary" @click="handleAdd">新增服务项目</el-button>
        </div>
      </template>

      <el-table :data="services" v-loading="loading" class="w-full">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="封面" width="100">
          <template #default="{ row }">
            <el-image 
              v-if="row.cover_image"
              :src="row.cover_image" 
              :preview-src-list="[row.cover_image]"
              fit="cover" 
              class="w-14 h-14 rounded-xl border border-slate-200"
              preview-teleported
            />
            <span v-else class="text-slate-400">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="服务名称" min-width="150" />
        <el-table-column label="所属分类" width="150">
          <template #default="{ row }">
            <el-tag size="small" :type="row.category_id ? '' : 'info'">
              {{ getCategoryName(row.category_id) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="120">
          <template #default="{ row }">
            <span class="font-black text-slate-900">¥{{ row.base_price }}/{{ row.unit }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sales_count" label="销量" width="90" />
        <el-table-column label="启用状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-divider direction="vertical" />
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 服务项目编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑服务项目' : '新增服务项目'" width="650px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="space-y-2">
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入服务名称" />
        </el-form-item>

        <el-form-item label="封面图" prop="coverImage">
          <el-upload
            class="w-60 h-36 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden"
            action="/api/upload/image?type=service"
            :show-file-list="false"
            :on-success="handleUploadSuccess"
            :before-upload="beforeUpload"
            :headers="uploadHeaders"
          >
            <img v-if="form.coverImage" :src="form.coverImage" class="w-full h-full object-cover" />
            <el-icon v-else class="text-slate-400"><Plus /></el-icon>
          </el-upload>
          <div class="text-xs text-slate-500 mt-2">建议比例 16:9，大小不超过 10MB</div>
        </el-form-item>
        
        <el-form-item label="所属分类" prop="categoryId">
          <el-select v-model="form.categoryId" placeholder="请选择分类" class="w-full">
            <el-option
              v-for="item in categories"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="起步价 (元)" prop="basePrice">
              <el-input-number v-model="form.basePrice" :min="0" class="w-full" placeholder="用户端显示为：XX起" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计价单位" prop="unit">
              <el-input v-model="form.unit" placeholder="如：次、道、天" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="预计用时" prop="estimatedDuration">
              <el-input-number v-model="form.estimatedDuration" :min="0" placeholder="单位：分钟" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="起约门槛" prop="minOrderAmount">
              <el-input-number v-model="form.minOrderAmount" :min="0" placeholder="满多少元起约" class="w-full" />
              <div v-if="form.name.includes('做饭')" class="text-xs text-slate-500 mt-2">不含代买食材费</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio :label="1">上架中</el-radio>
                <el-radio :label="0">已下架</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="服务描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="简单描述服务内容" />
        </el-form-item>
        
        <el-form-item label="注意事项" prop="notice">
          <el-input v-model="form.notice" type="textarea" :rows="3" placeholder="用户下单前需注意的事项" />
        </el-form-item>

        <!-- 动态价格配置 (上门做饭/宠物特护等) -->
        <template v-if="form.name.includes('做饭') || form.name.includes('猫') || form.name.includes('遛狗') || form.name.includes('探访')">
          <el-divider content-position="left">附加项价格配置</el-divider>
          <div v-for="(item, index) in form.priceConfig" :key="index" class="flex items-center gap-3 mb-3">
            <el-input v-model="item.label" placeholder="项名称 (如: 30分钟标准遛)" class="w-44" />
            <el-input-number v-model="item.price" :min="0" placeholder="单价" class="w-32" />
            <el-input v-model="item.unit" placeholder="单位 (如: 次)" class="w-24" />
            <el-button type="danger" icon="Delete" circle @click="removePriceItem(index)" />
          </div>
          <el-button type="primary" plain icon="Plus" @click="addPriceItem" class="mt-2">添加配置项</el-button>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getServices, getCategories, createService, updateService, deleteService } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const submitLoading = ref(false)
const services = ref([])
const categories = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const uploadHeaders = {
  Authorization: `Bearer ${localStorage.getItem('token')}`
}

const form = ref({
  id: null,
  name: '',
  categoryId: '',
  basePrice: 0,
  unit: '次',
  description: '',
  estimatedDuration: 60,
  minOrderAmount: 0,
  notice: '',
  status: 1,
  coverImage: '',
  priceConfig: []
})

const rules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择所属分类', trigger: 'change' }],
  basePrice: [{ required: true, message: '请输入起步价', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入计价单位', trigger: 'blur' }]
}

const handleUploadSuccess = (response) => {
  if (response.success) {
    form.value.coverImage = response.data.url
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const beforeUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif'
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isJPG) {
    ElMessage.error('上传图片只能是 JPG/PNG/WEBP/GIF 格式!')
  }
  if (!isLt10M) {
    ElMessage.error('上传图片大小不能超过 10MB!')
  }
  return isJPG && isLt10M
}

const loadData = async () => {
  loading.value = true
  try {
    const [serviceRes, categoryRes] = await Promise.all([
      getServices({ pageSize: 1000 }),
      getCategories()
    ])
    services.value = serviceRes.list || []
    categories.value = categoryRes || []
  } catch (e) {
    console.error('加载数据失败:', e)
  }
  loading.value = false
}

const getCategoryName = (id) => {
  const category = categories.value.find(c => c.id === id)
  return category ? category.name : '未分类'
}

const handleAdd = () => {
  isEdit.value = false
  form.value = {
    id: null,
    name: '',
    categoryId: '',
    basePrice: 0,
    unit: '次',
    description: '',
    estimatedDuration: 60,
    minOrderAmount: 0,
    notice: '',
    status: 1,
    coverImage: '',
    priceConfig: [
      { label: '主菜', price: 30, unit: '道' },
      { label: '副菜', price: 20, unit: '道' },
      { label: '素菜', price: 15, unit: '道' },
      { label: '汤类', price: 15, unit: '道' }
    ]
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  let pc = []
  try {
    pc = typeof row.price_config === 'string' ? JSON.parse(row.price_config || '[]') : (row.price_config || [])
  } catch (e) { pc = [] }

  // 如果是做饭类服务且配置为空，自动填充默认模板方便编辑
  if (pc.length === 0 && row.name.includes('做饭')) {
    pc = [
      { label: '主菜', price: 30, unit: '道' },
      { label: '副菜', price: 20, unit: '道' },
      { label: '素菜', price: 15, unit: '道' },
      { label: '汤类', price: 15, unit: '道' }
    ]
  }
  if (pc.length === 0 && row.name.includes('探访')) {
    pc = [
      { label: '30分钟', price: 49, unit: '次' },
      { label: '60分钟', price: 99, unit: '次' },
      { label: '90分钟', price: 139, unit: '次' }
    ]
  }

  form.value = {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    basePrice: parseFloat(row.base_price),
    unit: row.unit,
    description: row.description,
    estimatedDuration: row.estimated_duration,
    minOrderAmount: row.min_order_amount || 0,
    notice: row.notice,
    status: row.status,
    coverImage: row.cover_image,
    priceConfig: pc
  }
  dialogVisible.value = true
}

const addPriceItem = () => {
  form.value.priceConfig.push({ label: '', price: 0, unit: '项' })
}

const removePriceItem = (index) => {
  form.value.priceConfig.splice(index, 1)
}

const handleStatusChange = async (row) => {
  try {
    await updateService(row.id, { status: row.status })
    ElMessage.success('状态已更新')
  } catch (e) {
    row.status = row.status === 1 ? 0 : 1
  }
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`确认删除服务项目 "${row.name}" 吗？`, '警告', { type: 'warning' }).then(async () => {
    try {
      await deleteService(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  }).catch(() => {})
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitLoading.value = true
    try {
      if (isEdit.value) {
        await updateService(form.value.id, form.value)
        ElMessage.success('修改成功')
      } else {
        await createService(form.value)
        ElMessage.success('添加成功')
      }
      dialogVisible.value = false
      loadData()
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      submitLoading.value = false
    }
  })
}

onMounted(loadData)
</script>
