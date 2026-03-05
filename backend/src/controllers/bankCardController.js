const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');

exports.getBankCards = async (req, res) => {
  try {
    const [list] = await db.query('SELECT * FROM bank_cards WHERE user_id = ? ORDER BY is_default DESC', [req.user.id]);
    sendSuccess(res, list);
  } catch (e) { sendError(res, '获取失败'); }
};

exports.addBankCard = async (req, res) => {
  try {
    const { bankName, cardNo, realName, isDefault } = req.body;
    if (isDefault) {
      await db.query('UPDATE bank_cards SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }
    await db.query(
      'INSERT INTO bank_cards (user_id, bank_name, card_no, real_name, is_default) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, bankName, cardNo, realName, isDefault ? 1 : 0]
    );
    sendSuccess(res, null, '添加成功');
  } catch (e) { sendError(res, '添加失败'); }
};

exports.deleteBankCard = async (req, res) => {
  try {
    await db.query('DELETE FROM bank_cards WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    sendSuccess(res, null, '删除成功');
  } catch (e) { sendError(res, '删除失败'); }
};
