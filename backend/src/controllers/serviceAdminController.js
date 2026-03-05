const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

exports.createService = async (req, res) => {
  try {
    const { name, categoryId, description, basePrice, unit, estimatedDuration, minOrderAmount, notice, coverImage, status, priceConfig } = req.body;
    
    await db.query(
      `INSERT INTO services (name, category_id, description, base_price, unit, estimated_duration, min_order_amount, notice, cover_image, status, price_config) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, categoryId, description, basePrice, unit, estimatedDuration || 60, minOrderAmount || 0, notice, coverImage, status || 1, priceConfig ? JSON.stringify(priceConfig) : null]
    );
    sendSuccess(res, null, '添加成功');
  } catch (error) { 
    logger.error('>> [Admin/CreateService] Error:', error);
    sendError(res, '添加失败: ' + error.message); 
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, description, basePrice, unit, estimatedDuration, minOrderAmount, notice, coverImage, status, priceConfig } = req.body;

    await db.query(
      `UPDATE services SET 
        name=?, category_id=?, description=?, base_price=?, unit=?, 
        estimated_duration=?, min_order_amount=?, notice=?, cover_image=?, status=?, price_config=? 
      WHERE id=?`, 
      [name, categoryId, description, basePrice, unit, estimatedDuration, minOrderAmount || 0, notice, coverImage, status, priceConfig ? JSON.stringify(priceConfig) : null, id]
    );
    sendSuccess(res, null, '更新成功');
  } catch (error) { 
    logger.error(`>> [Admin/UpdateService] Error:`, error);
    sendError(res, '更新失败: ' + error.message); 
  }
};

exports.deleteService = async (req, res) => {
  try {
    await db.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    sendSuccess(res, null, '删除成功');
  } catch (error) { sendError(res, '删除失败'); }
};

// --- 分类管理 ---

exports.createCategory = async (req, res) => {
  try {
    const { name, icon, sort, parentId = 0 } = req.body;
    await db.query(
      'INSERT INTO service_categories (name, icon, sort, parent_id) VALUES (?, ?, ?, ?)',
      [name, icon, sort, parentId]
    );
    sendSuccess(res, null, '添加成功');
  } catch (error) {
    logger.error('添加分类失败:', error);
    sendError(res, '添加失败');
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, sort, status, parentId } = req.body;
    await db.query(
      'UPDATE service_categories SET name=?, icon=?, sort=?, status=?, parent_id=? WHERE id=?',
      [name, icon, sort, status, parentId, id]
    );
    sendSuccess(res, null, '更新成功');
  } catch (error) {
    logger.error('更新分类失败:', error);
    sendError(res, '更新失败');
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    // 检查是否有子分类
    const [children] = await db.query('SELECT id FROM service_categories WHERE parent_id = ?', [id]);
    if (children.length > 0) {
      return sendError(res, '该分类下有子分类，不能删除');
    }
    // 检查是否有服务关联
    const [services] = await db.query('SELECT id FROM services WHERE category_id = ?', [id]);
    if (services.length > 0) {
      return sendError(res, '该分类下有关联服务，不能删除');
    }
    
    await db.query('DELETE FROM service_categories WHERE id = ?', [id]);
    sendSuccess(res, null, '删除成功');
  } catch (error) {
    logger.error('删除分类失败:', error);
    sendError(res, '删除失败');
  }
};
