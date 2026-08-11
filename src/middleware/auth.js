const jwt = require('jsonwebtoken');
const User = require('../models/User');

const AUTH_LOG_THROTTLE_MS = Math.max(
  1000,
  parseInt(process.env.AUTH_LOG_THROTTLE_MS || '60000', 10)
);
const AUTH_USER_CACHE_TTL_MS = Math.max(
  1000,
  parseInt(process.env.AUTH_USER_CACHE_TTL_MS || '5000', 10)
);
const AUTH_USER_CACHE_MAX_ENTRIES = Math.max(
  100,
  parseInt(process.env.AUTH_USER_CACHE_MAX_ENTRIES || '5000', 10)
);
const AUTH_LOG_TOKEN_EXPIRED = process.env.AUTH_LOG_TOKEN_EXPIRED === 'true';

const authLogThrottle = new Map();
const userCache = new Map();

const shouldLogAuthKey = (key) => {
  const now = Date.now();
  const lastLoggedAt = authLogThrottle.get(key) || 0;
  if (now - lastLoggedAt >= AUTH_LOG_THROTTLE_MS) {
    authLogThrottle.set(key, now);
    return true;
  }
  return false;
};

const pruneUserCache = () => {
  if (userCache.size <= AUTH_USER_CACHE_MAX_ENTRIES) {
    return;
  }

  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (value.expiresAt <= now) {
      userCache.delete(key);
    }
  }

  while (userCache.size > AUTH_USER_CACHE_MAX_ENTRIES) {
    const oldestKey = userCache.keys().next().value;
    if (!oldestKey) break;
    userCache.delete(oldestKey);
  }
};

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
      if (jwtError.name === 'TokenExpiredError') {
        if (AUTH_LOG_TOKEN_EXPIRED) {
          const logKey = `${jwtError.name}:${req.method}:${req.path}`;
          if (shouldLogAuthKey(logKey)) {
            console.info('[auth] JWT token expired:', {
              method: req.method,
              path: req.path,
              timestamp: new Date().toISOString(),
              sampled: true
            });
          }
        }
        return res.status(403).json({
          success: false,
          message: '令牌已过期'
        });
      }

      const logKey = `${jwtError.name}:${req.method}:${req.path}`;
      if (shouldLogAuthKey(logKey)) {
        // 保留采样日志便于排查无效 token/签名错误。
        console.warn('[auth] JWT verification failed:', {
          method: req.method,
          path: req.path,
          error: jwtError.name,
          message: jwtError.message,
          timestamp: new Date().toISOString(),
          sampled: true
        });
      }
      return res.status(403).json({ 
        success: false,
        message: '无效的令牌' 
      });
    }

    // 请求级缓存：如果 req.user 已由上游中间件填充则跳过后续查库和进程内缓存。
    if (req.user) {
      req.userId = decoded.userId;
      return next();
    }

    // 高频 /verify /status 请求使用短 TTL 缓存，减少重复查库。
    const cacheKey = String(decoded.userId);
    const now = Date.now();
    let user = null;
    const cached = userCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      user = cached.user;
    } else {
      const dbStart = Date.now();
      user = await User.findById(decoded.userId)
        .select('username isActive')
        .lean();
      const dbDuration = Date.now() - dbStart;

      if (dbDuration > 100) {
        console.warn(`[auth] User.findById slow query: ${dbDuration}ms`, {
          userId: decoded.userId,
          method: req.method,
          path: req.path
        });
      }

      userCache.set(cacheKey, {
        user,
        expiresAt: now + AUTH_USER_CACHE_TTL_MS
      });
      pruneUserCache();
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

    // 令牌即将过期时记录警告（剩余不足 1 天），便于诊断和提示客户端主动刷新
    if (decoded.exp) {
      const secondsRemaining = decoded.exp - Math.floor(Date.now() / 1000);
      if (secondsRemaining < 86400) { // 不足 24 小时
        const hoursRemaining = Math.max(0, Math.floor(secondsRemaining / 3600));
        console.warn('[auth] Token expiring soon:', {
          userId: decoded.userId,
          hoursRemaining,
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
          method: req.method,
          path: req.path
        });
      }
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
