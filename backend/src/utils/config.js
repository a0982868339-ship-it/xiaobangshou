const db = require('../config/database');

/**
 * 动态配置加载器
 * 实现：从数据库读取配置，并提供简单的缓存机制（1分钟）
 */
class ConfigLoader {
  constructor() {
    this.cache = {};
    this.lastFetch = 0;
    this.TTL = 60 * 1000; // 60秒缓存
  }

  async refresh() {
    try {
      const result = await db.query('SELECT config_key, config_value FROM system_configs');
      if (!result || !Array.isArray(result[0])) {
        console.warn('>> [ConfigLoader] 刷新配置得到空结果或非数组');
        return;
      }
      const rows = result[0];
      const newCache = {};
      rows.forEach(row => {
        newCache[row.config_key] = row.config_value;
      });
      this.cache = newCache;
      this.lastFetch = Date.now();
    } catch (e) {
      console.error('>> [ConfigLoader] 刷新配置失败:', e.message);
    }
  }

  async get(key, defaultValue = null) {
    // 如果缓存过期或为空，刷新
    if (Date.now() - this.lastFetch > this.TTL || Object.keys(this.cache).length === 0) {
      await this.refresh();
    }
    return this.cache[key] !== undefined ? this.cache[key] : defaultValue;
  }

  /**
   * 获取数值型配置
   */
  async getNumber(key, defaultValue = 0) {
    const val = await this.get(key, defaultValue);
    return parseFloat(val);
  }
}

module.exports = new ConfigLoader();
