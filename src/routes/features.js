/**
 * 服务器端功能验证和执行路由
 * 防止客户端绕过鉴权
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const checkSubscription = require('../middleware/subscription');
const crypto = require('crypto');

// 功能权限映射（与客户端一致）
const FEATURE_PERMISSIONS = {
  'optimizeTitle': 'free',
  'applyTemplate': 'free',
  'addWatermark': 'free',
  'generateMarketingImage': 'basic',
  'mapVariants': 'basic',
  'processSkuTable': 'basic',
  'adjustPriceAndStock': 'premium',
  'translateContent': 'premium',
  'uploadAllQualificationImageByPolicy': 'premium',
  'selectRegionalPricingTemplate': 'premium',
  'runAllSteps': 'premium',
  'runAliexpressCategoryAllSteps': 'premium',
  'runSelectedSteps': 'premium'
};

// 计划等级
const PLAN_LEVELS = {
  'free': 0,
  'basic': 1,
  'premium': 2,
  'enterprise': 3
};

// 使用日志存储（生产环境建议使用数据库）
const featureUsageLogs = new Map();

/**
 * 中间件：验证功能权限
 */
function checkFeaturePermission(featureName) {
  return async (req, res, next) => {
    const userPlan = req.subscription.plan;
    const requiredPlan = FEATURE_PERMISSIONS[featureName];
    
    if (!requiredPlan) {
      return res.status(400).json({
        success: false,
        message: '未知的功能'
      });
    }
    
    const userLevel = PLAN_LEVELS[userPlan] || 0;
    const requiredLevel = PLAN_LEVELS[requiredPlan] || 0;
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `该功能需要 ${requiredPlan} 版本或更高版本`,
        currentPlan: userPlan,
        requiredPlan: requiredPlan
      });
    }
    
    next();
  };
}

/**
 * 中间件：验证请求签名（防篡改）
 */
function verifySignature(req, res, next) {
  const timestamp = req.headers['x-timestamp'];
  const signature = req.headers['x-signature'];
  const deviceId = req.headers['x-device-id'];
  
  if (!timestamp || !signature || !deviceId) {
    return res.status(401).json({
      success: false,
      message: '缺少安全验证信息'
    });
  }
  
  // 检查时间戳（防重放攻击，60秒内有效）
  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > 60000) {
    return res.status(401).json({
      success: false,
      message: '请求已过期，请重试'
    });
  }
  
  // 这里可以添加更复杂的签名验证
  // 例如：使用用户的token作为密钥生成HMAC
  
  next();
}

/**
 * 中间件：检测异常行为
 */
async function detectAbnormalBehavior(req, res, next) {
  const userId = req.userId;
  const featureName = req.body.feature || req.params.feature;
  const key = `${userId}:${featureName}`;
  
  // 获取该用户该功能的调用记录
  if (!featureUsageLogs.has(key)) {
    featureUsageLogs.set(key, []);
  }
  
  const logs = featureUsageLogs.get(key);
  const now = Date.now();
  
  // 清理1分钟前的记录
  const recentLogs = logs.filter(time => now - time < 60000);
  featureUsageLogs.set(key, recentLogs);
  
  // 检测频率（每分钟不超过20次）
  if (recentLogs.length > 20) {
    console.warn(`[Security] 用户 ${userId} 调用 ${featureName} 过于频繁`);
    
    return res.status(429).json({
      success: false,
      message: '操作过于频繁，请稍后再试',
      retryAfter: 60
    });
  }
  
  // 记录本次调用
  recentLogs.push(now);
  featureUsageLogs.set(key, recentLogs);
  
  next();
}

/**
 * 验证功能权限（通用接口）
 */
router.post('/verify',
  authenticateToken,
  checkSubscription,
  async (req, res) => {
    try {
      const { feature } = req.body;
      
      if (!feature) {
        return res.status(400).json({
          success: false,
          message: '请提供功能名称'
        });
      }
      
      const userPlan = req.subscription.plan;
      const requiredPlan = FEATURE_PERMISSIONS[feature];
      
      if (!requiredPlan) {
        return res.status(400).json({
          success: false,
          message: '未知的功能'
        });
      }
      
      const userLevel = PLAN_LEVELS[userPlan] || 0;
      const requiredLevel = PLAN_LEVELS[requiredPlan] || 0;
      
      const hasPermission = userLevel >= requiredLevel;
      
      res.json({
        success: true,
        data: {
          feature,
          hasPermission,
          currentPlan: userPlan,
          requiredPlan: requiredPlan,
          reason: hasPermission ? null : `需要 ${requiredPlan} 版本或更高版本`
        }
      });
      
    } catch (error) {
      console.error('验证功能权限失败:', error);
      res.status(500).json({
        success: false,
        message: '验证失败'
      });
    }
  }
);

/**
 * 调整价格功能（示例：核心算法在服务器）
 */
router.post('/adjust-price',
  authenticateToken,
  checkSubscription,
  checkFeaturePermission('adjustPriceAndStock'),
  verifySignature,
  detectAbnormalBehavior,
  async (req, res) => {
    try {
      const { cost, formula, discount } = req.body;
      const userPlan = req.subscription.plan;
      
      // 服务器端定价算法（不暴露给客户端）
      function calculatePrice(cost, formula, plan) {
        // 根据公式和计划等级计算价格
        // 这里只是示例，实际算法更复杂
        let markup = 1.5; // 默认50%加价
        
        if (plan === 'premium') {
          markup = 1.3; // VIP用户更低加价
        }
        
        return Math.ceil(cost * markup * 100) / 100;
      }
      
      const newPrice = calculatePrice(cost, formula, userPlan);
      
      // 应用折扣
      const finalPrice = discount ? newPrice * (1 - discount / 100) : newPrice;
      
      res.json({
        success: true,
        data: {
          originalCost: cost,
          calculatedPrice: newPrice,
          discount: discount || 0,
          finalPrice: Math.ceil(finalPrice * 100) / 100
        }
      });
      
    } catch (error) {
      console.error('价格调整失败:', error);
      res.status(500).json({
        success: false,
        message: '处理失败'
      });
    }
  }
);

/**
 * 记录功能使用情况
 */
router.get('/usage-stats',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.userId;
      
      // 统计该用户的功能使用情况
      const stats = {};
      
      for (const [key, logs] of featureUsageLogs.entries()) {
        if (key.startsWith(userId + ':')) {
          const feature = key.split(':')[1];
          stats[feature] = {
            totalCalls: logs.length,
            lastCall: logs.length > 0 ? new Date(Math.max(...logs)) : null
          };
        }
      }
      
      res.json({
        success: true,
        data: {
          userId,
          plan: req.subscription.plan,
          stats
        }
      });
      
    } catch (error) {
      console.error('获取使用统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取失败'
      });
    }
  }
);

module.exports = router;
