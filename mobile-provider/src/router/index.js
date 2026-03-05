import HelpCenter from "../views/HelpCenter.vue";
import Feedback from "../views/Feedback.vue";
import Withdraw from "../views/Withdraw.vue";
import HospitalSettings from "../views/HospitalSettings.vue";
import HealthCert from "../views/HealthCert.vue";
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue'),
      meta: { title: '接单大厅' }
    },
    {
      path: '/order',
      name: 'Order',
      component: () => import('../views/Order.vue'),
      meta: { title: '我的订单' }
    },
    {
      path: '/all-orders',
      name: 'AllOrders',
      component: () => import('../views/AllOrders.vue'),
      meta: { title: '接单历史' }
    },
    {
      path: '/order/:id',
      name: 'OrderDetail',
      component: () => import('../views/OrderDetail.vue'),
      meta: { title: '订单详情' }
    },
    {
      path: '/recurring-order/:id',
      name: 'RecurringOrderDetail',
      component: () => import('../views/RecurringOrderDetail.vue'),
      meta: { title: '周期订单详情' }
    },
    {
      path: '/recurring-session/:sessionId',
      name: 'RecurringSessionDetail',
      component: () => import('../views/RecurringSessionDetail.vue'),
      meta: { title: '服务执行详情' }
    },
    {
      path: '/earnings',
      name: 'Earnings',
      component: () => import('../views/Earnings.vue'),
      meta: { title: '我的收益' }
    },
    {
      path: '/city-select',
      name: 'CitySelect',
      component: () => import('../views/CitySelect.vue'),
      meta: { title: '选择城市' }
    },
    {
      path: '/user',
      name: 'User',
      component: () => import('../views/User.vue'),
      meta: { title: '我的' }
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { title: '登录' }
    },
    {
      path: '/verify',
      name: 'Verify',
      component: () => import('../views/Verify.vue'),
      meta: { title: '服务者认证' }
    },
    {
      path: '/service-settings',
      name: 'ServiceSettings',
      component: () => import('../views/ServiceSettings.vue'),
      meta: { title: '服务设置' }
    },
    {
      path: '/service-settings/type',
      name: 'ServiceType',
      component: () => import('../views/ServiceType.vue'),
      meta: { title: '服务类型' }
    },
    {
      path: '/service-area',
      name: 'ServiceArea',
      component: () => import('../views/ServiceArea.vue'),
      meta: { title: '服务区域' }
    },
    {
      path: '/bank-card',
      name: 'BankCard',
      component: () => import('../views/BankCard.vue'),
      meta: { title: '银行卡管理' }
    },
    {
      path: '/address-edit',
      name: 'AddressEdit',
      component: () => import('../views/AddressEdit.vue'),
      meta: { title: '地址编辑' }
    },
    {
      path: '/withdraw',
      name: 'Withdraw',
      component: Withdraw,
      meta: { title: '发起提现' }
    },
    {
      path: '/health-cert',
      name: 'HealthCert',
      component: HealthCert,
      meta: { title: '健康证上传' }
    },
    {
      path: '/help',
      name: 'HelpCenter',
      component: HelpCenter,
      meta: { title: '帮助中心' }
    },
    {
      path: '/feedback',
      name: 'Feedback',
      component: Feedback,
      meta: { title: '意见反馈' }
    },
    {
      path: '/hospital-settings',
      name: 'HospitalSettings',
      component: HospitalSettings,
      meta: { title: '熟悉医院设置' }
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/Settings.vue'),
      meta: { title: '设置' }
    },
    {
      path: '/settings/profile',
      name: 'EditProfile',
      component: () => import('../views/EditProfile.vue'),
      meta: { title: '个人信息' }
    },
    {
      path: '/settings/security',
      name: 'AccountSecurity',
      component: () => import('../views/AccountSecurity.vue'),
      meta: { title: '账户安全' }
    },
    {
      path: '/settings/change-password',
      name: 'ChangePassword',
      component: () => import('../views/ChangePassword.vue'),
      meta: { title: '修改密码' }
    },
    {
      path: '/chat',
      name: 'Chat',
      component: () => import('../views/Chat.vue'),
      meta: { title: '联系客户' }
    },
    {
      path: '/chat-list',
      name: 'ChatList',
      component: () => import('../views/ChatList.vue'),
      meta: { title: '消息列表' }
    },
    {
      path: '/my-card',
      name: 'MyCard',
      component: () => import('../views/MyCard.vue'),
      meta: { title: '我的名片' }
    },
    {
      path: '/reviews',
      name: 'Reviews',
      component: () => import('../views/Reviews.vue'),
      meta: { title: '我的评价' }
    },
    {
      path: '/certification',
      name: 'Certification',
      component: () => import('../views/Certification.vue'),
      meta: { title: '资质认证' }
    },
    {
      path: '/revenue-bill',
      name: 'RevenueBill',
      component: () => import('../views/RevenueBill.vue'),
      meta: { title: '收益账单' }
    },
    {
      path: '/work-order',
      name: 'WorkOrder',
      component: () => import('../views/WorkOrder.vue'),
      meta: { title: '我的工单' }
    },
    {
      path: '/work-order/create',
      name: 'WorkOrderCreate',
      component: () => import('../views/WorkOrderCreate.vue'),
      meta: { title: '提交工单' }
    },
    {
      path: '/notifications',
      name: 'NotificationList',
      component: () => import('../views/NotificationList.vue'),
      meta: { title: '消息通知' }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '小帮手-服务者'

  // 定义白名单页面（不需要登录即可访问）
  const whiteList = ['/login', '/help', '/about']
  const isWhiteList = whiteList.some(path => to.path.startsWith(path))

  // 检查登录状态
  const hasToken = localStorage.getItem('provider_token')

  if (isWhiteList) {
    // 如果已登录且访问登录页，重定向到首页
    if (to.path === '/login' && hasToken) {
      next('/')
    } else {
      next()
    }
  } else {
    // 非白名单页面，未登录则跳转登录
    if (hasToken) {
      next()
    } else {
      next(`/login?redirect=${to.path}`)
    }
  }
})

export default router
