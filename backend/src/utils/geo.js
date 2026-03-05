/**
 * 地理位置工具类
 */
class GeoUtils {
  /**
   * 计算两点间的距离 (单位: km)
   */
  calculateDistance(lat1, lon1, lat2, lng2) {
    if (!lat1 || !lon1 || !lat2 || !lng2) return 9999;
    
    const R = 6371; // 地球半径
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * 生成 SQL 距离计算片段 (用于 MySQL 原生筛选)
   * 结果单位为 km
   */
  getSqlDistance(lat, lng, latCol = 'lat', lngCol = 'lng') {
    if (lat === null || lng === null) return "0";
    const safeLat = parseFloat(lat);
    const safeLng = parseFloat(lng);
    if (isNaN(safeLat) || isNaN(safeLng)) return "0";
    return `(6371 * acos(greatest(-1, least(1, cos(radians(${safeLat})) * cos(radians(${latCol})) * cos(radians(${lngCol}) - radians(${safeLng})) + sin(radians(${safeLat})) * sin(radians(${latCol}))))))`;
  }
}

module.exports = new GeoUtils();
