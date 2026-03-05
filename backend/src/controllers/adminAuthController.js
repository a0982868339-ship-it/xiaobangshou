const logger = require('../utils/logger');
const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/response');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');

/**
 * 管理员账号密码登录
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 1. 查询管理员
    const [users] = await db.query(
      'SELECT id, username, password, real_name, role, status FROM admin_users WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return sendError(res, '管理员账号不存在');
    }
    
    const user = users[0];
    
    // 2. 验证状态
    if (user.status !== 1) {
      return sendError(res, '该账号已被禁用');
    }
    
    // 3. 验证密码 (使用 bcrypt 验证哈希后的密码)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, '密码错误');
    }
    
    // 4. 生成 Token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      isAdmin: true 
    });
    
    sendSuccess(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role
      }
    }, '登录成功');
    
  } catch (error) {
    logger.error('管理员登录失败:', error);
    sendError(res, '登录服务异常');
  }
};

/**
 * 获取当前管理员信息
 */
exports.getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, real_name as nickname, role FROM admin_users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) return sendError(res, '账号异常', 401);
    sendSuccess(res, users[0]);
  } catch (e) {
    sendError(res, '获取信息失败');
  }
};

/**
 * 修改管理员密码
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const adminId = req.user.id;

    // 1. 查询当前管理员
    const [users] = await db.query('SELECT password FROM admin_users WHERE id = ?', [adminId]);
    if (users.length === 0) return sendError(res, '账号不存在', 404);

    const user = users[0];

    // 2. 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return sendError(res, '旧密码不正确');

    // 3. 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. 更新数据库
    await db.query('UPDATE admin_users SET password = ? WHERE id = ?', [hashedPassword, adminId]);

    sendSuccess(res, null, '密码修改成功，请重新登录');
  } catch (error) {
    logger.error('修改管理员密码失败:', error);
    sendError(res, '修改失败');
  }
};
