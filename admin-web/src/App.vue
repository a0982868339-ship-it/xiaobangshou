<template>
  <el-container :class="['min-h-screen', isDark ? 'bg-slate-900 text-slate-100' : 'bg-[#f8fafc] text-slate-900']">
    <el-aside v-if="showLayout" :width="isCollapse ? '68px' : '288px'" :class="['flex flex-col shadow-sm', isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200']">
      <div :class="['h-16 flex items-center px-5 gap-3', isDark ? 'border-b border-slate-800' : 'border-b border-slate-200']">
        <div class="text-2xl">🤝</div>
        <span v-if="!isCollapse" class="text-sm font-black tracking-tight">小帮手管理</span>
      </div>

      <el-menu
        :default-active="$route.path"
        router
        :collapse="isCollapse"
        class="flex-1 !bg-transparent !border-none"
        :collapse-transition="false"
      >
        <el-menu-item v-if="hasAccess('dashboard')" index="/">
          <el-icon><Monitor /></el-icon>
          <template #title>数据总览</template>
        </el-menu-item>

        <el-menu-item v-if="hasAccess('map')" index="/map">
          <el-icon><Location /></el-icon>
          <template #title>调度大屏</template>
        </el-menu-item>

        <!-- 业务管理 -->
        <el-sub-menu v-if="hasAccess('service') || hasAccess('category') || hasAccess('package')" index="service">
          <template #title>
            <el-icon><List /></el-icon>
            <span>业务管理</span>
          </template>
          <el-menu-item v-if="hasAccess('service')" index="/services">服务项目</el-menu-item>
          <el-menu-item v-if="hasAccess('category')" index="/categories">分类中心</el-menu-item>
          <el-menu-item v-if="hasAccess('package')" index="/packages">套餐方案</el-menu-item>
          <el-menu-item v-if="hasAccess('hospital')" index="/hospitals">医院管理</el-menu-item>
        </el-sub-menu>

        <!-- 用户中心 -->
        <el-sub-menu v-if="hasAccess('user') || hasAccess('role')" index="user-center">
          <template #title>
            <el-icon><User /></el-icon>
            <span>用户中心</span>
          </template>
          <el-menu-item v-if="hasAccess('user')" index="/users">用户管理</el-menu-item>
          <el-menu-item v-if="hasAccess('role')" index="/system/roles">角色管理</el-menu-item>
          <el-menu-item v-if="hasAccess('role')" index="/system/admins">账号权限</el-menu-item>
        </el-sub-menu>

        <!-- 入驻审核 -->
        <el-sub-menu v-if="hasAccess('verify_identity') || hasAccess('verify_health') || hasAccess('verify_cert')" index="verify">
          <template #title>
            <el-icon><Checked /></el-icon>
            <span>入驻审核</span>
          </template>
          <el-menu-item v-if="hasAccess('verify_identity')" index="/verify/identity">实名审核</el-menu-item>
          <el-menu-item v-if="hasAccess('verify_health')" index="/verify/health">健康证审核</el-menu-item>
          <el-menu-item v-if="hasAccess('verify_cert')" index="/verify/certifications/medical">医疗资质审核</el-menu-item>
          <el-menu-item v-if="hasAccess('verify_cert')" index="/verify/certifications/pet">宠物资质审核</el-menu-item>
          <el-menu-item v-if="hasAccess('verify_cert')" index="/verify/certifications/domestic">家政资质审核</el-menu-item>
          <el-menu-item v-if="hasAccess('verify_cert')" index="/verify/certifications/other">通用资质审核</el-menu-item>
        </el-sub-menu>

        <!-- 订单管理 -->
        <el-sub-menu v-if="hasAccess('order_all')" index="orders">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>订单管理</span>
          </template>
          <el-menu-item v-if="hasAccess('order_all')" index="/orders/all">全部订单</el-menu-item>
          <el-menu-item v-for="cat in menuCategories" :key="cat.id" :index="`/orders/category/${cat.id}`">
            {{ cat.name }}订单
          </el-menu-item>
        </el-sub-menu>

        <!-- 运营风控 -->
        <el-sub-menu v-if="hasAccess('finance') || hasAccess('privacy') || hasAccess('audit') || hasAccess('credit') || hasAccess('settings')" index="operations">
          <template #title>
            <el-icon><Management /></el-icon>
            <span>运营风控</span>
          </template>
          <el-menu-item v-if="hasAccess('finance')" index="/finance">财务看板</el-menu-item>
          <el-menu-item v-if="hasAccess('privacy')" index="/privacy">通讯风控</el-menu-item>
          <el-menu-item v-if="hasAccess('audit')" index="/audit">消息审计</el-menu-item>
          <el-menu-item v-if="hasAccess('credit')" index="/credit">信用管理</el-menu-item>
          <el-menu-item v-if="hasAccess('settings')" index="/settings/system">全局配置</el-menu-item>
          <el-menu-item v-if="hasAccess('settings')" index="/settings/banners">广告引擎</el-menu-item>
        </el-sub-menu>

        <!-- 后台支持 -->
        <el-sub-menu v-if="hasAccess('bi') || hasAccess('notifications') || hasAccess('support') || hasAccess('withdrawals') || hasAccess('article') || hasAccess('feedback') || hasAccess('region')" index="command-center">
          <template #title>
            <el-icon><DataBoard /></el-icon>
            <span>后台支持</span>
          </template>
          <el-menu-item v-if="hasAccess('bi')" index="/system/bi">BI中心</el-menu-item>
          <el-menu-item v-if="hasAccess('region')" index="/system/regions">区域管理</el-menu-item>
          <el-menu-item v-if="hasAccess('notifications')" index="/system/notifications">通知中心</el-menu-item>
          <el-menu-item v-if="hasAccess('support')" index="/system/support">在线客服</el-menu-item>
          <el-menu-item v-if="hasAccess('withdrawals')" index="/withdrawals">提现审核</el-menu-item>
          <el-menu-item v-if="hasAccess('article')" index="/articles">内容管理</el-menu-item>
          <el-menu-item v-if="hasAccess('feedback')" index="/feedbacks">工单管理</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container class="flex-1 relative">
      <el-header v-if="showLayout" :class="['sticky top-0 z-50 h-20 flex items-center justify-between px-8 transition-all duration-300 backdrop-blur-xl', isDark ? 'bg-slate-900/80 border-b border-slate-800 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)]' : 'bg-white/80 border-b border-slate-200/60 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]']">
        <div class="flex items-center gap-6">
          <button class="group p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all duration-300 active:scale-95" @click="isCollapse = !isCollapse">
            <el-icon class="group-hover:rotate-12 transition-transform"><Expand v-if="isCollapse" /><Fold v-else /></el-icon>
          </button>
          
          <el-breadcrumb separator="/" class="hidden md:block">
            <el-breadcrumb-item :to="{ path: '/' }" class="breadcrumb-item">
              <span class="text-slate-400 font-medium hover:text-blue-600 transition-colors">平台管理</span>
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title">
              <span class="text-slate-900 font-bold tracking-tight">{{ $route.meta.title }}</span>
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="flex items-center gap-4">
          <div :class="['flex items-center gap-2 p-1 rounded-2xl', isDark ? 'bg-slate-800' : 'bg-slate-100/50']">
            <button 
              @click="isDark = false" 
              :class="['p-1.5 rounded-xl transition-all', !isDark ? 'bg-white shadow-sm text-amber-500' : 'text-slate-400 hover:text-slate-200']"
            >
              <el-icon><Sunny /></el-icon>
            </button>
            <button 
              @click="isDark = true" 
              :class="['p-1.5 rounded-xl transition-all', isDark ? 'bg-slate-700 shadow-sm text-blue-400' : 'text-slate-400 hover:text-slate-600']"
            >
              <el-icon><Moon /></el-icon>
            </button>
          </div>

          <el-divider direction="vertical" class="!mx-2" />

          <el-dropdown @command="handleCommand" trigger="click">
            <div :class="['flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-2xl cursor-pointer transition-all border border-transparent', isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50 hover:border-slate-100']">
              <div class="relative">
                <el-avatar :size="36" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" class="shadow-sm" />
                <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
              </div>
              <div class="hidden sm:block">
                <div class="text-sm font-bold text-slate-900 leading-none mb-1">{{ adminName }}</div>
                <div class="text-[10px] font-bold text-blue-600 uppercase tracking-widest opacity-80">Super Admin</div>
              </div>
              <el-icon class="text-slate-400"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="custom-dropdown">
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  <span>个人中心</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout" class="!text-red-500">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出系统</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main :class="[showLayout ? 'p-10' : 'p-0', isDark ? 'bg-slate-900' : 'bg-[#f8fafc]']">
        <div :class="[showLayout ? 'bg-white rounded-[2rem] border border-slate-200 p-8 min-h-[calc(100vh-160px)] shadow-sm' : '']">
          <router-view v-if="!isRefreshing" />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Monitor, List, User, Checked, Expand, Fold, Moon, Sunny, ArrowDown, SwitchButton, Box, Location, Management, DataBoard, Search } from '@element-plus/icons-vue'

const router = useRouter()
const isCollapse = ref(false)
const isRefreshing = ref(false)
const isDark = ref(localStorage.getItem('admin_theme') === 'dark')
const menuCategories = ref([])

const adminName = computed(() => {
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}')
  return user.nickname || user.realName || '管理账户'
})

onMounted(async () => {
  try {
    const { getCategories } = await import('./api')
    const res = await getCategories({ parentId: 0 })
    menuCategories.value = res || []
  } catch (e) {}
})

watch(isDark, (val) => {
  localStorage.setItem('admin_theme', val ? 'dark' : 'light')
})

const userRole = computed(() => localStorage.getItem('admin_role') || 'admin')

// 权限映射表：定义每个角色能访问的模块 (严格对应后端权限)
const permissionMap = {
  admin: ['dashboard', 'map', 'service', 'category', 'package', 'user', 'role', 'admin_user', 'verify_identity', 'verify_health', 'verify_cert', 'order_all', 'order_cat', 'finance', 'privacy', 'audit', 'credit', 'settings', 'withdrawals', 'article', 'feedback', 'support', 'bi', 'notifications', 'region'],
  
  finance: ['dashboard', 'order_all', 'finance', 'withdrawals', 'bi'], // 财务岗
  
  auditor: ['dashboard', 'verify_identity', 'verify_health', 'verify_cert', 'order_all', 'audit', 'privacy', 'credit'], // 审核岗
  
  support: ['dashboard', 'map', 'user', 'order_all', 'article', 'feedback', 'support', 'credit'], // 客服岗
  
  operator: ['dashboard', 'service', 'category', 'hospital', 'order_all', 'article', 'feedback', 'notifications', 'region'] // 运营岗
}

const hasAccess = (module) => {
  const role = localStorage.getItem('admin_role') || 'admin'
  if (role === 'admin') return true
  const allowedModules = permissionMap[role] || []
  return allowedModules.includes(module)
}

const handleCommand = (command) => {
  if (command === 'logout') {
    localStorage.removeItem('token')
    localStorage.removeItem('admin_role')
    localStorage.removeItem('admin_user')
    ElMessage.success('已退出登录')
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/profile')
  }
}

const refreshPage = () => {
  isRefreshing.value = true
  nextTick(() => isRefreshing.value = false)
}

const showLayout = computed(() => {
  return router.currentRoute.value.path !== '/login'
})
</script>

<style>
.custom-dropdown {
  padding: 8px !important;
  border-radius: 16px !important;
  border: 1px solid rgba(226, 232, 240, 0.8) !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
}

.custom-dropdown .el-dropdown-menu__item {
  padding: 10px 16px !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  color: #475569 !important;
  gap: 10px !important;
  transition: all 0.2s !important;
}

.custom-dropdown .el-dropdown-menu__item:hover {
  background-color: #f1f5f9 !important;
  color: #2563eb !important;
}

.custom-dropdown .el-dropdown-menu__item i {
  font-size: 16px !important;
}

.breadcrumb-item :deep(.el-breadcrumb__inner.is-link) {
  font-weight: 500 !important;
}

/* 隐藏 element-plus 默认的 header 边框 */
.el-header {
  --el-header-padding: 0 32px;
}
</style>
