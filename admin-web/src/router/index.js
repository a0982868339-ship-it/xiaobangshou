import { createRouter, createWebHistory, RouterView } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { title: '管理员登录' }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { title: '数据总览', requiresAuth: true }
    },
    {
      path: '/map',
      name: 'MapDashboard',
      component: () => import('../views/MapDashboard.vue'),
      meta: { title: '调度大屏', requiresAuth: true }
    },
    {
      path: '/services',
      name: 'Services',
      component: () => import('../views/Services.vue'),
      meta: { title: '服务管理', requiresAuth: true }
    },
    {
      path: '/categories',
      name: 'Categories',
      component: () => import('../views/Categories.vue'),
      meta: { title: '分类管理', requiresAuth: true }
    },
    {
      path: '/packages',
      name: 'Packages',
      component: () => import('../views/Packages.vue'),
      meta: { title: '套餐管理', requiresAuth: true }
    },
    {
      path: '/verify',
      component: RouterView,
      meta: { title: '入驻审核', requiresAuth: true },
      children: [
        {
          path: 'identity',
          name: 'IdentityVerify',
          component: () => import('../views/IdentityVerify.vue'),
          meta: { title: '实名审核' }
        },
        {
          path: 'health',
          name: 'HealthCertVerify',
          component: () => import('../views/HealthCertVerify.vue'),
          meta: { title: '健康证审核' }
        },
        {
          path: 'certifications/:type',
          name: 'CertAudit',
          component: () => import('../views/CertAudit.vue'),
          meta: { title: '专项资质审核' }
        }
      ]
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('../views/Users.vue'),
      meta: { title: '用户管理', requiresAuth: true }
    },
    {
      path: '/orders',
      component: RouterView,
      meta: { title: '订单管理', requiresAuth: true },
      children: [
        {
          path: 'all',
          name: 'AllOrders',
          component: () => import('../views/Orders.vue'),
          meta: { title: '全部订单' }
        },
        {
          path: 'category/:id',
          name: 'CategoryOrders',
          component: () => import('../views/Orders.vue'),
          meta: { title: '分类订单' }
        }
      ]
    },
    {
      path: '/withdrawals',
      name: 'Withdrawals',
      component: () => import('../views/Withdrawals.vue'),
      meta: { title: '提现审核', requiresAuth: true }
    },
    {
      path: '/articles',
      name: 'Articles',
      component: () => import('../views/Articles.vue'),
      meta: { title: '内容管理', requiresAuth: true }
    },
    {
      path: '/feedbacks',
      name: 'Feedbacks',
      component: () => import('../views/Feedbacks.vue'),
      meta: { title: '意见反馈', requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Profile.vue'),
      meta: { title: '个人设置', requiresAuth: true }
    },
    {
      path: '/hospitals',
      name: 'Hospitals',
      component: () => import('../views/Hospitals.vue'),
      meta: { title: '医院管理', requiresAuth: true }
    },
    {
      path: '/finance',
      name: 'Finance',
      component: () => import('../views/Finance.vue'),
      meta: { title: '财务统计中心', requiresAuth: true }
    },
    {
      path: '/privacy',
      name: 'PrivacyComm',
      component: () => import('../views/PrivacyComm.vue'),
      meta: { title: '通讯风控中心', requiresAuth: true }
    },
    {
      path: '/audit',
      name: 'MessageAudit',
      component: () => import('../views/MessageAudit.vue'),
      meta: { title: '消息审计中心', requiresAuth: true }
    },
    {
      path: '/credit',
      name: 'CreditManage',
      component: () => import('../views/CreditManage.vue'),
      meta: { title: '信用管理', requiresAuth: true }
    },
    {
      path: '/settings/system',
      name: 'SystemSettings',
      component: () => import('../views/SystemSettings.vue'),
      meta: { title: '全局策略配置', requiresAuth: true }
    },
    {
      path: '/settings/banners',
      name: 'BannerManage',
      component: () => import('../views/BannerManage.vue'),
      meta: { title: '广告引擎管理', requiresAuth: true }
    },
    {
      path: '/system/bi',
      name: 'BIReports',
      component: () => import('../views/BIReports.vue'),
      meta: { title: 'BI 报表中心', requiresAuth: true }
    },
    {
      path: '/system/notifications',
      name: 'Notifications',
      component: () => import('../views/Notifications.vue'),
      meta: { title: '通知中心', requiresAuth: true }
    },
    {
      path: '/system/roles',
      name: 'RoleManage',
      component: () => import('../views/RoleManage.vue'),
      meta: { title: '角色权限管理', requiresAuth: true }
    },
    {
      path: '/system/admins',
      name: 'AdminUsers',
      component: () => import('../views/AdminUsers.vue'),
      meta: { title: '管理员权限管理', requiresAuth: true }
    },
    {
      path: '/system/regions',
      name: 'RegionManage',
      component: () => import('../views/RegionManage.vue'),
      meta: { title: '区域开通管理', requiresAuth: true }
    },
    {
      path: '/system/support',
      name: 'CustomerSupport',
      component: () => import('../views/CustomerSupport.vue'),
      meta: { title: '在线客服中心', requiresAuth: true }
    }
  ]
})

// 路由拦截：未登录跳转到登录页
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '小帮手后台'
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/')
  } else {
    next()
  }
})

export default router
