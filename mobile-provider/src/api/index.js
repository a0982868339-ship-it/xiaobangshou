import axios from 'axios'
import { showToast } from 'vant'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('provider_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => {
    const res = response.data
    if (!res.success) {
      showToast(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res.data
  },
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('provider_token')
      localStorage.removeItem('provider_userInfo')
      showToast('登录已过期，请重新登录')
      window.location.href = '/login'
    } else {
      console.error('>> [API Error] Detailed:', error.response?.data || error.message)
      const message = error.response?.data?.message || error.message || '网络错误'
      showToast(message)
    }
    return Promise.reject(error)
  }
)

export const sendSms = (phone, captchaVerifyParam) => request.post('/auth/sms/send', { phone, captchaVerifyParam })
export const login = (data) => request.post('/auth/login/phone', data)
export const getUserInfo = () => request.get('/auth/me')

// --- 订单相关 ---
export const getPendingOrders = () => request.get('/orders?status=0&role=provider')
export const getMyOrders = (params) => request.get('/orders', { params: { ...params, role: 'provider' } })
export const getActivePartners = () => request.get('/orders/active-chat-partners?role=provider')
export const getOrderDetail = (id) => request.get(`/orders/${id}`)
export const getRecurringSessionDetail = (sessionId) => request.get(`/recurring/session/${sessionId}`)
export const acceptOrder = (id) => request.put(`/orders/${id}/accept`)
export const updateOrderStatus = (id, status, extraData = {}) => request.put(`/orders/${id}/status`, { status, ...extraData })
export const updateRecurringSessionStatus = (sessionId, status, extraData = {}) => {
  const map = { 11: 'arrive', 2: 'start', 3: 'complete' }
  const action = map[status]
  if (!action) return Promise.reject(new Error('未知状态'))
  return request.post(`/recurring/session/${sessionId}/${action}`, extraData)
}
export const updateServiceRecords = (id, data) => request.put(`/orders/${id}/service-records`, data)
export const getEarnings = () => request.get('/orders/earnings')

// --- 服务相关 ---
export const getCategories = (params) => request.get('/services/categories', { params })

// --- 通知相关 ---
export const getNotifications = (params) => request.get('/notifications', { params })
export const getUnreadNotifyCount = () => request.get('/notifications/unread')
export const markNotifyRead = (id) => request.put(`/notifications/${id}/read`)

// --- 系统相关 ---
export const getRegions = (params) => request.get('/system/regions', { params })

export default request
