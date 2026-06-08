const {
  getSubscriptionStateCached
} = require('../utils/subscription');

// 检查订阅状态
const checkSubscription = async (req, res, next) => {
  try {
    // 使用短 TTL 缓存，避免高频 verify/status 每次都查库
    const subscriptionState = await getSubscriptionStateCached(req.userId, { activeOnly: true });

    if (!subscriptionState.hasSubscription) {
      return res.status(403).json({ 
        success: false,
        message: '未找到可用订阅',
        reasonCode: 'SUBSCRIPTION_REQUIRED'
      });
    }

    if (!subscriptionState.isValid) {
      return res.status(403).json({ 
        success: false,
        message: '订阅已过期，请先续费后再登录',
        reasonCode: 'SUBSCRIPTION_EXPIRED',
        daysRemaining: 0
      });
    }

    req.subscription = subscriptionState.subscription;
    req.subscriptionDaysRemaining = subscriptionState.daysRemaining;
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: '检查订阅状态时出错',
      error: error.message 
    });
  }
};

module.exports = checkSubscription;
