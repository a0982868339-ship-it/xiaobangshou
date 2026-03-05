const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');
const db = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return sendError(res, '未登录或token已过期', 401);
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 核心修复：根据 token 负载中的 isAdmin 标识判断查询哪张表
    if (decoded.isAdmin) {
      const [admins] = await db.query(
        'SELECT id, username, real_name as nickname, role, status FROM admin_users WHERE id = ?',
        [decoded.id]
      );
      if (admins.length === 0) return sendError(res, '管理员账号不存在', 401);
      if (admins[0].status !== 1) return sendError(res, '账号已被禁用', 403);
      req.user = admins[0];
    } else {
      const [users] = await db.query(
        'SELECT id, phone, role, user_type FROM users WHERE id = ?',
        [decoded.id]
      );
      if (users.length === 0) return sendError(res, '用户不存在', 401);
      req.user = users[0];
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, '无效的token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'token已过期', 401);
    }
    return sendError(res, '认证失败', 401);
  }
};

/**
 * 角色权限验证（高阶函数）
 * roles: 允许访问的角色数组，例如 ['admin', 'auditor']
 */
const roleCheck = (roles) => {
  return (req, res, next) => {
    if (!req.user) return sendError(res, '未授权访问', 401);
    if (roles.includes(req.user.role)) {
      next();
    } else {
      return sendError(res, '权限不足，无法访问', 403);
    }
  };
};

const optionalAuth = async (req, res, next) => {
  // ...保持原有逻辑不变...
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch (error) {
    next();
  }
};

const providerAuth = async (req, res, next) => {
  if (!req.user) {
    return sendError(res, '请先登录', 401);
  }
  if (req.user.user_type !== 2 && req.user.user_type !== 3) {
    return sendError(res, '仅服务者可访问', 403);
  }
  next();
};

module.exports = { authMiddleware, optionalAuth, providerAuth, roleCheck };
