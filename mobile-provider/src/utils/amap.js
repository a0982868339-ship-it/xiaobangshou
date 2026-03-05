/**
 * 动态加载高德地图 JS API (服务者端 - 接入动态配置)
 */
export const loadAMap = async () => {
  if (window.AMap) return window.AMap;

  const { default: request } = await import('../api');
  let key = 'f19e5a24bf0a7c5c152be6f1f6413c76';
  let secret = 'dcf30a677030994325ccc13063fae1d7';

  try {
    const config = await request.get('/system/configs/public');
    if (config.AMAP_KEY_WEB) key = config.AMAP_KEY_WEB;
    if (config.AMAP_SECRET_WEB) secret = config.AMAP_SECRET_WEB;
  } catch (e) {
    console.warn('>> [AMap] 动态配置获取失败，尝试使用默认值');
  }

  return new Promise((resolve, reject) => {
    window._AMapSecurityConfig = {
      securityJsCode: secret,
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Geolocation,AMap.Geocoder`;
    script.onerror = reject;
    script.onload = () => resolve(window.AMap);
    document.head.appendChild(script);
  });
};
