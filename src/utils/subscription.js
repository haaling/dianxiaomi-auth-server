const Subscription = require('../models/Subscription');

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_STATE_CACHE_TTL_MS = Math.max(
  60 * 1000,
  parseInt(process.env.SUBSCRIPTION_STATE_CACHE_TTL_MS || `${24 * 60 * 60 * 1000}`, 10)
);
const SUBSCRIPTION_STATE_CACHE_MAX_ENTRIES = Math.max(
  100,
  parseInt(process.env.SUBSCRIPTION_STATE_CACHE_MAX_ENTRIES || '5000', 10)
);

const subscriptionStateCache = new Map();

const calculateDaysRemaining = (endDate) => {
  if (!endDate) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / DAY_IN_MS));
};

const buildCacheKey = (userId, activeOnly) => `${String(userId)}:${activeOnly ? 'active' : 'all'}`;

const pruneSubscriptionStateCache = () => {
  if (subscriptionStateCache.size <= SUBSCRIPTION_STATE_CACHE_MAX_ENTRIES) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of subscriptionStateCache.entries()) {
    if (entry.expiresAt <= now) {
      subscriptionStateCache.delete(key);
    }
  }

  while (subscriptionStateCache.size > SUBSCRIPTION_STATE_CACHE_MAX_ENTRIES) {
    const oldestKey = subscriptionStateCache.keys().next().value;
    if (!oldestKey) break;
    subscriptionStateCache.delete(oldestKey);
  }
};

const toSerializableSubscription = (subscription) => {
  if (!subscription) return null;
  return {
    _id: subscription._id,
    userId: subscription.userId,
    plan: subscription.plan,
    maxDevices: subscription.maxDevices,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    isActive: subscription.isActive,
    autoRenew: subscription.autoRenew,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  };
};

const rehydrateState = (state) => {
  if (!state || !state.hasSubscription || !state.subscription) {
    return {
      hasSubscription: false,
      isValid: false,
      daysRemaining: 0,
      subscription: null
    };
  }

  const endDate = state.subscription.endDate;
  const isValid = endDate > new Date();
  const daysRemaining = calculateDaysRemaining(endDate);

  return {
    hasSubscription: true,
    isValid,
    daysRemaining,
    subscription: {
      ...state.subscription,
      isActive: isValid
    }
  };
};

const invalidateSubscriptionStateCache = (userId) => {
  const base = String(userId);
  subscriptionStateCache.delete(`${base}:active`);
  subscriptionStateCache.delete(`${base}:all`);
};

const getSubscriptionStateCached = async (userId, { activeOnly = false, forceRefresh = false } = {}) => {
  const cacheKey = buildCacheKey(userId, activeOnly);
  const now = Date.now();

  if (!forceRefresh) {
    const cached = subscriptionStateCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return rehydrateState(cached.state);
    }
  }

  const latestSubscription = await getLatestSubscription(userId, { activeOnly });
  const normalizedState = await normalizeSubscriptionState(latestSubscription);

  const serializableState = normalizedState.hasSubscription
    ? {
        ...normalizedState,
        subscription: toSerializableSubscription(normalizedState.subscription)
      }
    : normalizedState;

  subscriptionStateCache.set(cacheKey, {
    state: serializableState,
    expiresAt: now + SUBSCRIPTION_STATE_CACHE_TTL_MS
  });
  pruneSubscriptionStateCache();

  return rehydrateState(serializableState);
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
  normalizeSubscriptionState,
  getSubscriptionStateCached,
  invalidateSubscriptionStateCache
};