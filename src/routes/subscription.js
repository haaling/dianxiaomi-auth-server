const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const authenticateToken = require('../middleware/auth');
const {
  getLatestSubscription,
  getLatestActiveSubscription,
  normalizeSubscriptionState
} = require('../utils/subscription');

// 获取当前订阅信息
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const t0 = Date.now();
    // 命中 { userId, isActive, endDate } 复合索引：过滤 isActive:true 并按 endDate 降序
    const subscription = await getLatestActiveSubscription(req.userId);
    console.log(`[subscription] /current query took ${Date.now() - t0}ms (userId=${req.userId})`);

    if (!subscription) {
      return res.status(404).json({ 
        success: false,
        message: '未找到有效订阅' 
      });
    }

    res.json({
      success: true,
      data: {
        plan: subscription.plan,
        maxDevices: subscription.maxDevices,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isValid: subscription.isValid(),
        autoRenew: subscription.autoRenew
      }
    });
  } catch (error) {
    console.error('获取订阅信息错误:', error);
    res.status(500).json({ 
      success: false,
      message: '获取订阅信息失败',
      error: error.message 
    });
  }
});

// 创建或升级订阅
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { plan, duration } = req.body; // duration 单位：月

    // 验证计划类型
    const validPlans = {
      free: { maxDevices: 3, price: 0 },
      basic: { maxDevices: 5, price: 9.99 },
      premium: { maxDevices: 10, price: 19.99 },
      tb_bridge: { maxDevices: 15, price: 29.99 },
      image_pro: { maxDevices: 20, price: 39.99 },
      enterprise: { maxDevices: 50, price: 99.99 }
    };

    if (!validPlans[plan]) {
      return res.status(400).json({ 
        success: false,
        message: '无效的订阅计划' 
      });
    }

    const months = duration || 1;
    const endDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);

    // 停用旧订阅
    await Subscription.updateMany(
      { userId: req.userId, isActive: true },
      { isActive: false }
    );

    // 创建新订阅
    const subscription = new Subscription({
      userId: req.userId,
      plan,
      maxDevices: validPlans[plan].maxDevices,
      endDate
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      message: '订阅成功',
      data: {
        plan: subscription.plan,
        maxDevices: subscription.maxDevices,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        price: validPlans[plan].price * months
      }
    });
  } catch (error) {
    console.error('订阅错误:', error);
    res.status(500).json({ 
      success: false,
      message: '订阅失败',
      error: error.message 
    });
  }
});

// 检查订阅状态
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const t0 = Date.now();
    // getLatestSubscription（不带 activeOnly）以便 normalizeSubscriptionState 可写回过期状态
    const latestSubscription = await getLatestSubscription(req.userId);
    console.log(`[subscription] /status query took ${Date.now() - t0}ms (userId=${req.userId})`);
    const subscriptionState = await normalizeSubscriptionState(latestSubscription);

    if (!subscriptionState.hasSubscription) {
      return res.json({ 
        success: true,
        data: {
          hasSubscription: false,
          isValid: false
        }
      });
    }

    const subscription = subscriptionState.subscription;

    res.json({
      success: true,
      data: {
        hasSubscription: true,
        isValid: subscriptionState.isValid,
        plan: subscription.plan,
        endDate: subscription.endDate,
        daysRemaining: subscriptionState.daysRemaining
      }
    });
  } catch (error) {
    console.error('检查订阅状态错误:', error);
    res.status(500).json({ 
      success: false,
      message: '检查订阅状态失败',
      error: error.message 
    });
  }
});

module.exports = router;
