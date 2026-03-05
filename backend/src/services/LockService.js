const redis = require('../utils/redis');

/**
 * LockService - 基于 Redis 的分布式建议锁
 * 用于防止高并发下的重复请求与数据竞争
 */
class LockService {
    /**
     * 尝试获取锁
     * @param {string} key 锁的键名
     * @param {number} ttl 自动释放时间 (毫秒)，防止死锁
     * @returns {boolean} 是否获取成功
     */
    static async acquire(key, ttl = 5000) {
        const lockKey = `lock:${key}`;
        // 使用 NX (Not Exists) 确保只有一个客户端能设置成功，PX 设置过期时间
        const result = await redis.set(lockKey, Date.now(), 'PX', ttl, 'NX');
        return result === 'OK';
    }

    /**
     * 释放锁
     * @param {string} key 锁的键名
     */
    static async release(key) {
        const lockKey = `lock:${key}`;
        await redis.del(lockKey);
    }

    /**
     * 简单的包装器：在锁保护下执行逻辑
     * @param {string} key 锁的键名
     * @param {Function} task 执行的任务 (async)
     * @param {number} ttl 锁时长
     * @returns {any} 任务结果
     */
    static async wrap(key, task, ttl = 5000) {
        const locked = await this.acquire(key, ttl);
        if (!locked) throw new Error('操作过于频繁，请稍后再试');

        try {
            return await task();
        } finally {
            await this.release(key);
        }
    }
}

module.exports = LockService;
