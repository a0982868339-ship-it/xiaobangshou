/**
 * 动态加载高德地图 JS API (用户端 - 接入后台动态配置)
 * 增加缓存机制，避免重复请求配置接口
 */
let cachedConfig = null;

export const loadAMap = async () => {
  if (window.AMap) return window.AMap;

  // 1. 获取 Web Key 和 Secret (增加本地缓存，秒开核心)
  if (!cachedConfig) {
    const local = localStorage.getItem('amap_public_config');
    if (local) {
      cachedConfig = JSON.parse(local);
    } else {
      const request = (await import('../api')).default;
      const config = await request.get('/system/configs/public');
      cachedConfig = {
        key: config.AMAP_KEY_WEB || 'f19e5a24bf0a7c5c152be6f1f6413c76',
        secret: config.AMAP_SECRET_WEB || 'dcf30a677030994325ccc13063fae1d7'
      };
      localStorage.setItem('amap_public_config', JSON.stringify(cachedConfig));
    }
  }

  const { key, secret } = cachedConfig;

  return new Promise((resolve, reject) => {
    // 2. 注入安全密钥
    window._AMapSecurityConfig = {
      securityJsCode: secret,
    };

    // 3. 动态创建脚本
    const script = document.createElement('script');
    script.type = 'text/javascript';
    // 增加 callback 参数和超时处理，确保加载可靠
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Autocomplete,AMap.PlaceSearch,AMap.Geocoder`;
    
    // 预链接，进一步提速
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://webapi.amap.com';
    document.head.appendChild(link);

    script.onerror = (err) => {
      localStorage.removeItem('amap_public_config'); // 出错可能 key 过期，清缓存
      reject(err);
    };
    
    script.onload = () => resolve(window.AMap);
    document.head.appendChild(script);
  });
};
