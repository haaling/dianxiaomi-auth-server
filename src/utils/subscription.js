const Subscription = require('../models/Subscription');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const calculateDaysRemaining = (endDate) => {
  if (!endDate) {
    return 0;
  }

  return Math.max(0, Math.ceil((new Date(endDate) - Date.now()) / DAY_IN_MS));
};

const getLatestSubscription = async (userId) => {
  return Subscription.findOne({ userId }).sort({ endDate: -1 });
};

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
  normalizeSubscriptionState
};