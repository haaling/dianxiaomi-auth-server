const Subscription = require('../models/Subscription');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const calculateDaysRemaining = (endDate) => {
  if (!endDate) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / DAY_IN_MS));
};

// activeOnly=true：仅查询 isActive:true 的记录，命中 { userId, isActive, endDate } 复合索引
// activeOnly=false（默认）：查询所有记录，命中 { userId, endDate } 索引（用于 normalizeSubscriptionState 写回场景）
const getLatestSubscription = async (userId, { activeOnly = false } = {}) => {
  const query = activeOnly ? { userId, isActive: true } : { userId };
  return Subscription.findOne(query).sort({ endDate: -1 });
};

// 快捷方法：仅获取最新的有效订阅（命中复合索引，避免全集合扫描）
const getLatestActiveSubscription = (userId) => getLatestSubscription(userId, { activeOnly: true });

const normalizeSubscriptionState = async (subscription) => {
  if (!subscription) {
    return {
      hasSubscription: false,
      isValid: false,
      daysRemaining: 0,
      subscription: null
    };
  }

  const daysRemaining = calculateDaysRemaining(subscription.endDate);
  const isValid = subscription.endDate > new Date();

  // 仅在 isActive 状态实际发生变化时才写入数据库，避免每次登录都触发不必要的写操作
  if (subscription.isActive !== isValid) {
    subscription.isActive = isValid;
    await subscription.save();
  }

  return {
    hasSubscription: true,
    isValid,
    daysRemaining,
    subscription
  };
};

module.exports = {
  calculateDaysRemaining,
  getLatestSubscription,
  getLatestActiveSubscription,
  normalizeSubscriptionState
};