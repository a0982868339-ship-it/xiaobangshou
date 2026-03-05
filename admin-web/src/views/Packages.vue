<template>
  <div>
    <el-card>
      <template #header>
        <span style="font-size: 18px; font-weight: bold;">套餐管理</span>
      </template>

      <el-alert
        title="套餐数据说明"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px;"
      >
        数据库中已包含12个套餐，包括上门做饭包月、宠物喂养包月、保洁包月、按摩次卡等。
        套餐相关API接口待开发。
      </el-alert>

      <el-table :data="packages" style="width: 100%" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="套餐名称" min-width="250" />
        <el-table-column prop="package_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.package_type === 'monthly' ? 'success' : 'primary'">
              {{ row.package_type === 'monthly' ? '包月' : '次卡' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="times_count" label="次数" width="80" />
        <el-table-column prop="original_price" label="原价" width="100">
          <template #default="{ row }">
            ¥{{ row.original_price }}
          </template>
        </el-table-column>
        <el-table-column prop="package_price" label="套餐价" width="100">
          <template #default="{ row }">
            <el-tag type="danger" size="large">¥{{ row.package_price }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration_days" label="有效期(天)" width="100" />
      </el-table>

      <el-empty v-if="packages.length === 0 && !loading" description="套餐数据在数据库中，API接口待开发" />
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const loading = ref(false)
const packages = ref([])

// TODO: 调用API获取套餐列表
// const loadPackages = async () => {
//   const data = await getPackages()
//   packages.value = data
// }
</script>

