const db = require('../config/database');

/**
 * BaseRepository - 数据访问基类
 * 提供底层查询包装，支持主连与外部事务连接
 */
class BaseRepository {
    /**
     * 执行查询
     * @param {string} sql 
     * @param {Array} params 
     * @param {object} connection 可选的事务连接
     */
    static async query(sql, params, connection = null) {
        const executor = connection || db;
        return await executor.query(sql, params);
    }

    /**
     * 获取单行数据
     */
    static async first(sql, params, connection = null) {
        const [rows] = await this.query(sql, params, connection);
        return rows?.length > 0 ? rows[0] : null;
    }
}

module.exports = BaseRepository;
