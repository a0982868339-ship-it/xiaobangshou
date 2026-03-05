import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

const clearAuthAndRedirect = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('admin_role')
  localStorage.removeItem('admin_user')
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

const isAuthExpiredMessage = (msg) => {
  if (!msg) return false
  const text = String(msg).toLowerCase()
  return text.includes('token') && (text.includes('过期') || text.includes('expired') || text.includes('invalid') || text.includes('unauthorized'))
}

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
      const msg = res.message || '请求失败'
      ElMessage.error(msg)
      if (isAuthExpiredMessage(msg)) {
        clearAuthAndRedirect()
      }
      return Promise.reject(new Error(msg))
    }
    return res.data
  },
  error => {
    const msg = error.response?.data?.message || error.message || '网络错误'
    ElMessage.error(msg)
    const status = error.response?.status
    if (status === 401 || status === 403 || isAuthExpiredMessage(msg)) {
      clearAuthAndRedirect()
    }
    return Promise.reject(error)
  }
)

export default request
