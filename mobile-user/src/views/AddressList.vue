<template>
  <div class="address-page">
    <van-nav-bar title="我的服务地址" left-arrow @click-left="$router.back()" fixed placeholder />
    
    <div class="page-content">
      <div class="address-list">
        <div 
          v-for="item in list" 
          :key="item.id" 
          class="address-item shadow-card"
          :class="{ 'is-default': item.isDefault }"
          @click="onEdit(item)"
        >
          <div class="item-left">
            <div class="user-info">
              <span class="name">{{ item.name }}</span>
              <span class="tel">{{ hidePhone(item.tel) }}</span>
              <van-tag v-if="item.isDefault" type="primary" round size="mini" class="default-tag">默认</van-tag>
            </div>
            <div class="address-detail">{{ item.address }}</div>
          </div>
          <div class="item-right">
            <van-icon name="edit" class="edit-icon" />
          </div>
        </div>
      </div>

      <van-empty v-if="list.length === 0" description="您还没有添加服务地址" />

      <div class="add-footer">
        <van-button 
          type="primary" 
          block 
          round 
          icon="plus" 
          class="add-btn" 
          @click="onAdd"
        >
          新增服务地址
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAddresses } from '../api'

const router = useRouter()
const list = ref([])

const hidePhone = (p) => p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')

const loadData = async () => {
  try {
    const data = await getAddresses()
    list.value = data.map(item => ({
      id: item.id,
      name: item.contact_name,
      tel: item.contact_phone,
      address: `${item.province}${item.city}${item.district}${item.address}`,
      isDefault: item.is_default === 1
    }))
  } catch (e) {}
}

const onAdd = () => router.push('/address-edit')
const onEdit = (item) => router.push(`/address-edit?id=${item.id}`)

onMounted(loadData)
</script>

<style scoped>
.address-page { min-height: 100vh; background: #f7f8fa; }
.page-content { padding: 16px; }

.address-list { display: flex; flex-direction: column; gap: 16px; padding-bottom: 100px; }

.address-item {
  background: white;
  padding: 20px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.address-item:active { transform: scale(0.98); background: #f9f9f9; }
.address-item.is-default { border-color: #eefaf8; background: #fafffe; }

.item-left { flex: 1; overflow: hidden; }
.user-info { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.name { font-size: 16px; font-weight: bold; color: #323233; }
.tel { font-size: 14px; color: #646566; }
.default-tag { padding: 0 6px; }

.address-detail { font-size: 13px; color: #969799; line-height: 1.5; }

.item-right { padding-left: 16px; }
.edit-icon { font-size: 20px; color: #ccc; }

.add-footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 16px 20px calc(16px + var(--van-safe-area-bottom-height));
  background: white;
  box-shadow: 0 -4px 16px rgba(0,0,0,0.04);
}
.add-btn { height: 50px; font-weight: bold; font-size: 16px; border: none; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }

.shadow-card { box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
</style>
