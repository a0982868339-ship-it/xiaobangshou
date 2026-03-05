import axios from 'axios'
import { showToast, showDialog } from 'vant'
import { ORDER_STATUS, ORDER_TYPE } from '../utils/constants'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
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
    const status = error.response?.status
    const message = error.response?.data?.message || '网络错误'

    if (status === 402) {
      // 价格失效：触发全局事件通知 UI 刷新价格
      window.dispatchEvent(new CustomEvent('price-expired'))
      showToast('价格已变动，请确认后重新提交')
    } else if (status === 422) {
      // 非法请求：弹出交互式对话框
      showDialog({
        title: '下单受限',
        message: message + '\n如有疑问，请咨询在线客服。',
        confirmButtonText: '联系客服',
        showCancelButton: true,
        cancelButtonText: '我知道了'
      }).then((action) => {
        if (action === 'confirm') {
          window.location.href = '/customer-service' // 假设的客服路径
        }
      })
    } else {
      showToast(message)
    }
    
    return Promise.reject(error)
  }
)

/**
 * 订单相关 API 封装
 * 严格遵循 API 契约与 SSOT 常量
 */

/**
 * 创建订单
 * @param {Object} orderData 结构化订单数据
 */
export const createOrder = (orderData) => {
  // 基础 Payload 组装
  const payload = {
    serviceId: orderData.serviceId,
    serviceTime: orderData.serviceTime,
    addressId: orderData.addressId,
    contactName: orderData.contactName,
    contactPhone: orderData.contactPhone,
    remark: orderData.remark,
    totalPrice: orderData.totalPrice,
    city: orderData.city,
    serviceLatitude: orderData.serviceLatitude || null,
    serviceLongitude: orderData.serviceLongitude || null,
    orderType: orderData.orderType || ORDER_TYPE.NORMAL,
    
    // 陪诊/居家专项核心字段
    patientProfileId: orderData.patientProfileId,
    hospitalName: orderData.hospitalName,
    patientName: orderData.patientName,
    
    // 动态规格与透传字段
    serviceOptions: orderData.serviceOptions,
    dishDetails: orderData.dishDetails,
    needShopping: orderData.needShopping ? 1 : 0,
    depositAmount: orderData.depositAmount || 0
  }

  // 周期订单特定字段
  if (orderData.orderType === ORDER_TYPE.PERIODIC) {
    payload.serviceDays = orderData.serviceDays || []
  }

  // 补全陪诊其余字段
  if (orderData.hospitalName || orderData.patientName) {
    payload.patientGender = orderData.patientGender || 0
    payload.patientAge = orderData.patientAge
    payload.patientTags = orderData.patientTags || []
  }

  return request.post('/orders', payload)
}

/**
 * 获取订单列表
 * @param {Object} params { role, status, lat, lng }
 */
export const getOrders = (params) => {
  const query = { ...params }
  // 确保经纬度不存在时传 null 而非 undefined
  if (!query.lat) query.lat = null
  if (!query.lng) query.lng = null
  return request.get('/orders', { params: query })
}

export const getOrderDetail = (id) => request.get(`/orders/${id}`)
export const cancelOrder = (id) => request.put(`/orders/${id}/cancel`)
export const confirmOrder = (id) => request.put(`/orders/${id}/confirm`)
export const payOrder = (id) => request.put(`/orders/${id}/pay`)
export const updateOrderDeleteStatus = (id, status) => request.put(`/orders/${id}/delete-status`, { status })
export const disputeOrder = (id, reason) => request.put(`/orders/${id}/dispute`, { reason })
export const updateOrderStatus = (id, status) => request.put(`/orders/${id}/status`, { status })
export const getOrderStats = () => request.get('/orders/stats')
export const getActivePartners = () => request.get('/orders/active-chat-partners')

// --- 其他业务接口 ---
export const getCategories = (params) => request.get('/services/categories', { params })
export const getServices = (params) => request.get('/services', { params })
export const getServiceDetail = (id) => request.get(`/services/${id}`)
export const sendSms = (phone, captchaVerifyParam) => request.post('/auth/sms/send', { phone, captchaVerifyParam })
export const login = (data) => request.post('/auth/login/phone', data)
export const getUserInfo = () => request.get('/auth/me')
export const getPointsRecords = (params) => request.get('/users/points/records', { params })
export const checkIn = () => request.post('/users/points/checkin')
export const getAddresses = () => request.get('/address')
export const getAddressDetail = (id) => request.get(`/address/${id}`)
export const addAddress = (data) => request.post('/address', data)
export const updateAddress = (id, data) => request.put(`/address/${id}`, data)
export const deleteAddress = (id) => request.delete(`/address/${id}`)
export const getNotifications = (params) => request.get('/notifications', { params })
export const getUnreadNotifyCount = () => request.get('/notifications/unread')
export const markNotifyRead = (id) => request.put(`/notifications/${id}/read`)
export const getPatientProfiles = () => request.get('/patient-profiles')
export const getPatientProfileDetail = (id) => request.get(`/patient-profiles/${id}`)
export const createPatientProfile = (data) => request.post('/patient-profiles', data)
export const updatePatientProfile = (id, data) => request.put(`/patient-profiles/${id}`, data)
export const deletePatientProfile = (id) => request.delete(`/patient-profiles/${id}`)
export const getHospitals = (city) => request.get(`/common/hospitals?city=${city}`)

export default request
