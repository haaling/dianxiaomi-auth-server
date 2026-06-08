const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 验证JWT Token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: '未提供认证令牌' 
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.warn('[auth] JWT verification failed:', {
        method: req.method,
        path: req.path,
        error: jwtError.name,
        message: jwtError.message,
        timestamp: new Date().toISOString()
      });
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(403).json({ 
          success: false,
          message: '令牌已过期' 
        });
      }
      return res.status(403).json({ 
        success: false,
        message: '无效的令牌' 
      });
    }

    // 请求级缓存：如果 req.user 已由上游中间件填充则跳过数据库查询
    if (req.user) {
      req.userId = decoded.userId;
      return next();
    }

    // 查找用户（.lean() 跳过 Mongoose 文档水化，减少每次查询的开销）
    const dbStart = Date.now();
    const user = await User.findById(decoded.userId).lean();
    const dbDuration = Date.now() - dbStart;

    if (dbDuration > 100) {
      console.warn(`[auth] User.findById slow query: ${dbDuration}ms`, {
        userId: decoded.userId,
        method: req.method,
        path: req.path
      });
    } else {
      console.debug(`[auth] User.findById: ${dbDuration}ms (userId=${decoded.userId})`);
    }

    if (!user || !user.isActive) {
      console.warn('[auth] User not found or inactive:', {
        userId: decoded.userId,
        found: !!user,
        isActive: user ? user.isActive : null,
        method: req.method,
        path: req.path
      });
      return res.status(401).json({ 
        success: false,
        message: '用户不存在或已被禁用' 
      });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('[auth] Unexpected error in authenticateToken:', {
      method: req.method,
      path: req.path,
      error: error.name,
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      success: false,
      message: '服务器错误' 
    });
  }
};

module.exports = authenticateToken;
