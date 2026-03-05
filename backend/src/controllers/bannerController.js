const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 管理员：获取所有 Banner
 */
exports.getAllBanners = async (req, res) => {
  try {
    const [list] = await db.query('SELECT * FROM banners ORDER BY sort DESC, created_at DESC');
    sendSuccess(res, list);
  } catch (error) {
    sendError(res, '获取失败');
  }
};

/**
 * 管理员：创建或更新 Banner
 */
exports.saveBanner = async (req, res) => {
  try {
    const { id, title, imageUrl, linkUrl, type, sort, status } = req.body;
    if (id) {
      await db.query(
        'UPDATE banners SET title=?, image_url=?, link_url=?, type=?, sort=?, status=? WHERE id=?',
        [title, imageUrl, linkUrl, type, sort, status, id]
      );
    } else {
      await db.query(
        'INSERT INTO banners (title, image_url, link_url, type, sort, status) VALUES (?, ?, ?, ?, ?, ?)',
        [title, imageUrl, linkUrl, type, sort, status]
      );
    }
    sendSuccess(res, null, '保存成功');
  } catch (error) {
    sendError(res, '操作失败');
  }
};

/**
 * 管理员：删除 Banner
 */
exports.deleteBanner = async (req, res) => {
  try {
    await db.query('DELETE FROM banners WHERE id = ?', [req.params.id]);
    sendSuccess(res, null, '已删除');
  } catch (error) {
    sendError(res, '删除失败');
  }
};

/**
 * 公开：App 获取启用的 Banner
 */
exports.getAppBanners = async (req, res) => {
  try {
    const { type = 1 } = req.query;
    const [list] = await db.query(
      'SELECT id, title, image_url, link_url FROM banners WHERE status = 1 AND type = ? ORDER BY sort DESC',
      [type]
    );
    sendSuccess(res, list);
  } catch (error) {
    sendError(res, '获取失败');
  }
};
