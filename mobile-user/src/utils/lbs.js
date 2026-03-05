import { ref } from 'vue'
import { getOrders as apiGetOrders, createOrder as apiCreateOrder } from '../api'

/**
 * 增强型 LBS 位置获取 Hook
 */
export function useLocation() {
  const coords = ref({ lat: null, lng: null })

  const updateLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('浏览器不支持地理位置获取')
        return resolve(null)
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          coords.value = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
          resolve(coords.value)
        },
        (err) => {
          console.warn('获取位置失败:', err.message)
          resolve(null)
        },
        { timeout: 5000 }
      )
    })
  }

  return {
    coords,
    updateLocation
  }
}

/**
 * 包装后的 getOrders，自动注入 LBS 信息
 */
export const getOrdersWithLBS = async (params) => {
  let lat = null, lng = null
  
  // 仅在服务者角色或需要距离排序时尝试获取位置
  if (params.role === 'provider' || params.needDistance) {
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch (e) {
        console.warn('LBS 自动注入失败，降级为普通列表')
      }
    }
  }

  return apiGetOrders({ ...params, lat, lng })
}
