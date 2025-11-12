const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const authenticateToken = require('../middleware/auth');

// 获取当前订阅信息
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      userId: req.userId,
      isActive: true 
    }).sort({ endDate: -1 });

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
    const subscription = await Subscription.findOne({ 
      userId: req.userId,
      isActive: true 
    }).sort({ endDate: -1 });

    if (!subscription) {
      return res.json({ 
        success: true,
        data: {
          hasSubscription: false,
          isValid: false
        }
      });
    }

    const isValid = subscription.isValid();
    
    // 如果订阅过期，更新状态
    if (!isValid && subscription.isActive) {
      subscription.isActive = false;
      await subscription.save();
    }

    res.json({
      success: true,
      data: {
        hasSubscription: true,
        isValid,
        plan: subscription.plan,
        endDate: subscription.endDate,
        daysRemaining: Math.ceil((subscription.endDate - Date.now()) / (1000 * 60 * 60 * 24))
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
