const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError, sendPage } = require('../utils/response');

const redis = require('../utils/redis');

exports.getCategories = async (req, res) => {
  try {
    const { parentId = 0 } = req.query;
    const cacheKey = `categories:${parentId}`;

    // 1. 尝试从 Redis 获取
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`>> [Cache] Hit for ${cacheKey}`);
      return sendSuccess(res, JSON.parse(cachedData));
    }

    // 2. 缓存未命中，查数据库
    const [categories] = await db.query(
      'SELECT * FROM service_categories WHERE parent_id = ? AND status = 1 ORDER BY sort DESC, id ASC',
      [parentId]
    );

    // 3. 存入 Redis (缓存 1 小时)
    await redis.set(cacheKey, JSON.stringify(categories), 'EX', 3600);
    console.log(`>> [Cache] Miss for ${cacheKey}, DB fetched and cached.`);

    sendSuccess(res, categories);
  } catch (error) {
    logger.error('获取分类失败:', error);
    sendError(res, '获取分类失败');
  }
};

exports.getServices = async (req, res) => {
  try {
    const {
      categoryId,
      keyword,
      city,
      district,
      status,
      page = 1,
      pageSize = 10,
      sortBy = 'sales_count'
    } = req.query;

    let sql = 'SELECT * FROM services WHERE 1=1';
    const params = [];

    // 如果没有传 status，默认只显示上架的 (1)
    if (status !== undefined && status !== '') {
      sql += ' AND status = ?';
      params.push(status);
    } else if (!req.query.isAdmin) {
      // 非管理后台请求，默认只看上架
      sql += ' AND status = 1';
    }

    if (categoryId) {
      sql += ' AND category_id = ?';
      params.push(categoryId);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    if (sortBy === 'price') {
      sql += ' ORDER BY base_price ASC';
    } else {
      sql += ' ORDER BY sales_count DESC, sort DESC';
    }

    const limitNum = parseInt(pageSize) || 10;
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [services] = await db.query(sql, params);

    // --- 智能兜底：如果该城市暂无上架服务，则返回默认展示服务 ---
    if (services.length === 0 && !req.query.isAdmin) {
      const [fallback] = await db.query('SELECT * FROM services LIMIT 10');
      services.push(...fallback);
    }

    // --- 核心逻辑：判断当前区域是否有服务者 ---
    if (city) {
      // ... 保持原有逻辑不变 ...
      // 获取当前城市和服务者
      const [providers] = await db.query(
        "SELECT service_types, service_areas FROM providers WHERE status = 1 AND verify_status = 1"
      );

      services.forEach(service => {
        service.is_available = providers.some(p => {
          try {
            const types = typeof p.service_types === 'string' ? JSON.parse(p.service_types || '[]') : (p.service_types || []);
            const area = typeof p.service_areas === 'string' ? JSON.parse(p.service_areas || '{}') : (p.service_areas || {});
            if (!area.city) return false;
            const pureProviderCity = area.city.replace('市', '');
            const pureQueryCity = city.replace('市', '');
            const cityMatch = pureProviderCity === pureQueryCity;
            let districtMatch = true;
            if (!area.allCity && district && area.districts) {
              districtMatch = area.districts.some(d => {
                const dName = typeof d === 'string' ? d : (d.name || '');
                return dName.includes(district) || district.includes(dName);
              });
            }
            return types.some(t => String(t) === String(service.id)) && cityMatch && districtMatch;
          } catch (e) { return false; }
        });
      });
    } else {
      services.forEach(s => s.is_available = true);
    }

    let countSql = 'SELECT COUNT(*) as total FROM services WHERE status = 1';
    const countParams = [];
    if (categoryId) { countSql += ' AND category_id = ?'; countParams.push(categoryId); }
    if (keyword) { countSql += ' AND (name LIKE ? OR description LIKE ?)'; const kw = `%${keyword}%`; countParams.push(kw, kw); }

    const [countResult] = await db.query(countSql, countParams);
    sendPage(res, services, countResult[0].total, pageNum, limitNum);
  } catch (error) {
    logger.error('获取服务列表失败:', error);
    sendError(res, '获取服务列表失败: ' + error.message, 500);
  }
};

exports.getServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('>> [Service/Detail] Request ID:', id);

    const [services] = await db.query(
      'SELECT s.*, c.name as category_name FROM services s LEFT JOIN service_categories c ON s.category_id = c.id WHERE s.id = ?',
      [id]
    );
    if (services.length === 0) return sendError(res, '服务不存在', 404);

    console.log('>> [Service/Detail] Found service:', { id: services[0].id, name: services[0].name, cover_image: services[0].cover_image });
    sendSuccess(res, services[0]);
  } catch (error) {
    logger.error('获取服务详情失败:', error);
    sendError(res, '获取服务详情失败');
  }
};
