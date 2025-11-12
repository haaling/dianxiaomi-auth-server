const Subscription = require('../models/Subscription');

// 检查订阅状态
const checkSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ 
      userId: req.userId,
      isActive: true 
    }).sort({ endDate: -1 }); // 获取最新的订阅

    if (!subscription) {
      return res.status(403).json({ 
        success: false,
        message: '未找到有效订阅' 
      });
    }

    if (!subscription.isValid()) {
      subscription.isActive = false;
      await subscription.save();
      
      return res.status(403).json({ 
        success: false,
        message: '订阅已过期' 
      });
    }

    req.subscription = subscription;
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
