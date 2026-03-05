const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

exports.getAddresses = async (req, res) => {
  try {
    const [addresses] = await db.query('SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [req.user.id]);
    sendSuccess(res, addresses);
  } catch (error) {
    sendError(res, '获取地址失败');
  }
};

exports.getAddressDetail = async (req, res) => {
  try {
    const [addresses] = await db.query('SELECT * FROM user_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (addresses.length === 0) return sendError(res, '地址不存在', 404);
    sendSuccess(res, addresses[0]);
  } catch (error) {
    sendError(res, '获取地址详情失败');
  }
};

exports.addAddress = async (req, res) => {
  try {
    const { contactName, contactPhone, address, detail, province, city, district, isDefault, lat, lng } = req.body;
    const addressDetail = address || detail;
    const is_default = isDefault ? 1 : 0;
    
    if (is_default === 1) {
      await db.query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }
    
    const [result] = await db.query(
      'INSERT INTO user_addresses (user_id, contact_name, contact_phone, address, province, city, district, is_default, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, contactName, contactPhone, addressDetail, province, city, district, is_default, lat || null, lng || null]
    );
    sendSuccess(res, { id: result.insertId }, '添加成功');
  } catch (error) {
    sendError(res, '添加失败: ' + error.message);
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { contactName, contactPhone, address, detail, province, city, district, isDefault, lat, lng } = req.body;
    const addressDetail = address || detail;
    const is_default = isDefault ? 1 : 0;

    if (is_default === 1) {
      await db.query('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }    await db.query(
      'UPDATE user_addresses SET contact_name=?, contact_phone=?, address=?, province=?, city=?, district=?, is_default=?, lat=?, lng=? WHERE id=? AND user_id=?',
      [contactName, contactPhone, addressDetail, province, city, district, is_default, lat || null, lng || null, id, req.user.id]
    );
    sendSuccess(res, null, '更新成功');
  } catch (error) {
    sendError(res, '更新失败');
  }
};exports.deleteAddress = async (req, res) => {
  try {
    await db.query('DELETE FROM user_addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    sendSuccess(res, null, '删除成功');
  } catch (error) {
    sendError(res, '删除失败');
  }
};
