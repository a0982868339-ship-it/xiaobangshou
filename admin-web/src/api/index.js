import request from '../utils/request'

// --- 服务相关 ---
export const getCategories = (params) => {
  return request.get('/services/categories', { params })
}

export const createCategory = (data) => request.post('/services/categories', data)
export const updateCategory = (id, data) => request.put(`/services/categories/${id}`, data)
export const deleteCategory = (id) => request.delete(`/services/categories/${id}`)

export const getServices = (params) => {
  return request.get('/services', { params: { ...params, isAdmin: 1 } })
}

export const createService = (data) => request.post('/services', data)
export const updateService = (id, data) => request.put(`/services/${id}`, data)
export const deleteService = (id) => request.delete(`/services/${id}`)

// --- 用户管理相关 ---
export const getUsers = (params) => {
  return request.get('/users', { params })
}

export const getUserStats = () => {
  return request.get('/users/stats')
}

export const updateUserStatus = (id, status) => {
  return request.put(`/users/${id}/status`, { status })
}

// --- 医院管理 ---
export const getHospitals = (params) => request.get('/hospitals', { params })
export const createHospital = (data) => request.post('/hospitals', data)
export const updateHospital = (id, data) => request.put(`/hospitals/${id}`, data)
export const deleteHospital = (id) => request.delete(`/hospitals/${id}`)

// --- 订单管理 ---
export const getAllOrdersAdmin = (params) => request.get('/orders/admin/all', { params })

// --- 服务者审核 ---
export const getProvidersAdmin = (params) => request.get('/providers/admin/all', { params })
export const auditProvider = (id, data) => request.put(`/providers/admin/${id}/audit`, data)

// --- 信用管理 ---
export const getProviderCreditLogs = (params) => request.get('/providers/admin/credit/logs', { params })
export const updateProviderCredit = (id, data) => request.put(`/providers/admin/${id}/credit`, data)

// --- 系统管理 ---
export const getDashboardStats = () => request.get('/system/admin/dashboard-stats')
export const getAdminRegions = (params) => request.get('/system/admin/regions', { params })
export const toggleRegionStatus = (code, data) => request.put(`/system/admin/regions/${code}/toggle`, data)
export const updateRegionSort = (code, data) => request.put(`/system/admin/regions/${code}/sort`, data)
