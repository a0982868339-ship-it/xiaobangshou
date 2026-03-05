const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 获取医院列表 (支持城市筛选和分页)
 */
const redis = require('../utils/redis');

exports.getHospitals = async (req, res) => {
  try {
    const { city, district, keyword, page = 1, pageSize = 100 } = req.query;
    const cacheKey = `hospitals:${city || 'all'}:${district || 'all'}:${keyword || 'none'}:${page}:${pageSize}`;

    // 1. 尝试从 Redis 获取
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`>> [Cache] Hit for ${cacheKey}`);
      return sendSuccess(res, JSON.parse(cachedData));
    }

    let sql = 'SELECT * FROM hospitals WHERE 1=1';
    const params = [];

    if (city) {
      sql += ' AND city = ?';
      params.push(city);
    }
    // 注释掉区县筛选，因为目前数据库中医院数据大多没有区县信息，会导致筛选结果为空
    /*
    if (district) {
      sql += ' AND district = ?';
      params.push(district);
    }
    */
    if (keyword) {
      sql += ' AND name LIKE ?';
      params.push(`%${keyword}%`);
    }

    // 统计总数
    const countSql = `SELECT COUNT(*) as total FROM hospitals WHERE 1=1 ${city ? 'AND city = ?' : ''} ${keyword ? 'AND name LIKE ?' : ''}`;
    const countParams = [...(city ? [city] : []), ...(keyword ? [`%${keyword}%`] : [])];
    const [totalResult] = await db.query(countSql, countParams);
    const total = totalResult[0].total;

    // 排序和分页
    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

    const [list] = await db.query(sql, params);

    sendSuccess(res, {
      list,
      pagination: { total, page: parseInt(page), pageSize: parseInt(pageSize) }
    });
  } catch (error) {
    logger.error(error);
    sendError(res, '获取医院列表失败');
  }
};

/**
 * 新增医院
 */
exports.createHospital = async (req, res) => {
  try {
    const { city, name, level, address } = req.body;
    await db.query(
      'INSERT INTO hospitals (city, name, level, address) VALUES (?, ?, ?, ?)',
      [city, name, level, address]
    );
    sendSuccess(res, null, '添加成功');
  } catch (error) {
    sendError(res, '添加失败');
  }
};

/**
 * 更新医院
 */
exports.updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { city, name, level, address } = req.body;
    await db.query(
      'UPDATE hospitals SET city=?, name=?, level=?, address=? WHERE id=?',
      [city, name, level, address, id]
    );
    sendSuccess(res, null, '更新成功');
  } catch (error) {
    sendError(res, '更新失败');
  }
};

/**
 * 删除医院
 */
exports.deleteHospital = async (req, res) => {
  try {
    await db.query('DELETE FROM hospitals WHERE id = ?', [req.params.id]);
    sendSuccess(res, null, '删除成功');
  } catch (error) {
    sendError(res, '删除失败');
  }
};
