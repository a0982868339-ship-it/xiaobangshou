import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/category',
      name: 'Category',
      component: () => import('../views/Category.vue')
    },
    {
      path: '/order',
      name: 'Order',
      component: () => import('../views/Order.vue')
    },
    {
      path: '/all-orders',
      name: 'AllOrders',
      component: () => import('../views/AllOrders.vue'),
      meta: { title: '全部订单' }
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
      path: '/user',
      name: 'User',
      component: () => import('../views/User.vue')
    },
    {
      path: '/points',
      name: 'Points',
      component: () => import('../views/Points.vue'),
      meta: { title: '积分中心' }
    },
    {
      path: '/service/:id',
      name: 'ServiceDetail',
      component: () => import('../views/ServiceDetail.vue')
    },
    {
      path: '/service/home/:id',
      name: 'ServiceDetailHome',
      component: () => import('../views/ServiceDetailHome.vue')
    },
    {
      path: '/service/pet/:id',
      name: 'ServiceDetailPet',
      component: () => import('../views/ServiceDetailPet.vue')
    },
    {
      path: '/service/medical/:id',
      name: 'ServiceDetailMedical',
      component: () => import('../views/ServiceDetailMedical.vue')
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/address',
      name: 'AddressList',
      component: () => import('../views/AddressList.vue'),
      meta: { title: '我的地址' }
    },
    {
      path: '/address-edit',
      name: 'AddressEdit',
      component: () => import('../views/AddressEdit.vue'),
      meta: { title: '编辑地址' }
    },
    {
      path: '/wallet',
      name: 'Wallet',
      component: () => import('../views/Wallet.vue'),
      meta: { title: '我的钱包' }
    },
    {
      path: '/wallet/withdraw',
      name: 'Withdraw',
      component: () => import('../views/Withdraw.vue'),
      meta: { title: '申请提现' }
    },
    {
      path: '/coupon',
      name: 'Coupon',
      component: () => import('../views/Coupon.vue'),
      meta: { title: '优惠券' }
    },
    {
      path: '/member',
      name: 'MemberCenter',
      component: () => import('../views/MemberCenter.vue'),
      meta: { title: '会员中心' }
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
      meta: { title: '在线沟通' }
    },
    {
      path: '/chat-list',
      name: 'ChatList',
      component: () => import('../views/ChatList.vue'),
      meta: { title: '消息列表' }
    },
    {
      path: '/help',
      name: 'HelpCenter',
      component: () => import('../views/HelpCenter.vue'),
      meta: { title: '帮助中心' }
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('../views/About.vue'),
      meta: { title: '关于我们' }
    },
    {
      path: '/notifications',
      name: 'NotificationList',
      component: () => import('../views/NotificationList.vue'),
      meta: { title: '消息通知' }
    },
    {
      path: '/order-recycle',
      name: 'OrderRecycle',
      component: () => import('../views/OrderRecycle.vue'),
      meta: { title: '订单回收站' }
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
      path: '/address/picker',
      name: 'LocationPicker',
      component: () => import('../views/LocationPicker.vue'),
      meta: { title: '选择位置' }
    },
    {
      path: '/patient-profile',
      name: 'PatientProfileList',
      component: () => import('../views/PatientProfileList.vue'),
      meta: { title: '陪诊档案' }
    },
    {
      path: '/patient-profile/edit',
      name: 'PatientProfileEdit',
      component: () => import('../views/PatientProfileEdit.vue'),
      meta: { title: '编辑档案' }
    },
    {
      path: '/verify',
      name: 'Verify',
      component: () => import('../views/Verify.vue'),
      meta: { title: '实名认证' }
    }
  ]
})

export default router

