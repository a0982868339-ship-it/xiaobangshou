<template>
  <div class="router-dispatcher">
    <!-- 智能转发中... -->
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getServiceDetail } from '../api'

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  const id = route.params.id
  try {
    const res = await getServiceDetail(id)
    const categoryId = res.category_id
    const name = res.name || ''

    // 智能转发逻辑：根据工种大类跳转到独立的物理隔离页面
    if (categoryId === 1 || name.includes('陪诊')) {
      router.replace(`/service/medical/${id}`)
    } else if (name.includes('做饭') || name.includes('厨')) {
      router.replace(`/service/home/${id}`)
    } else if (name.includes('猫') || name.includes('狗') || name.includes('遛') || name.includes('喂养')) {
      router.replace(`/service/pet/${id}`)
    } else {
      // 默认回退到居家办事页
      router.replace(`/service/home/${id}`)
    }
  } catch (e) {
    router.replace('/')
  }
})
</script>
