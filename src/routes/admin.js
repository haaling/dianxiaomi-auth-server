/**
 * 管理员路由
 * 需要 Admin API Key 才能访问
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const adminAuth = require('../middleware/adminAuth');

// 所有管理员路由都需要 API Key 认证
router.use(adminAuth);

/**
 * 创建用户账号（管理员专用）
 * POST /api/admin/create-user
 * Headers: x-admin-api-key: your_api_key
 * Body: { username, email, password, plan?, maxDevices?, validDays? }
 */
router.post('/create-user', async (req, res) => {
  try {
    const { username, email, password, plan, maxDevices, validDays } = req.body;
    
    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码是必填项'
      });
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }
    
    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少为 6 位'
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? '该邮箱已被注册' : '该用户名已被使用'
      });
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const user = new User({
      username,
      email,
      password: hashedPassword,
      isActive: true
    });
    
    await user.save();
    
    // 根据 plan 参数确定订阅配置
    let subscriptionConfig = {
      plan: plan || 'free',
      maxDevices: maxDevices || 3,
      validDays: validDays || 30
    };
    
    // 预设的套餐配置
    const planConfigs = {
      free: { maxDevices: 3, validDays: 30 },
      basic: { maxDevices: 5, validDays: 365 },
      premium: { maxDevices: 10, validDays: 365 },
      enterprise: { maxDevices: 50, validDays: 365 }
    };
    
    // 如果指定了套餐，使用预设配置（除非显式覆盖）
    if (plan && planConfigs[plan]) {
      subscriptionConfig = {
        plan,
        maxDevices: maxDevices || planConfigs[plan].maxDevices,
        validDays: validDays || planConfigs[plan].validDays
      };
    }
    
    // 创建订阅
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + subscriptionConfig.validDays * 24 * 60 * 60 * 1000);
    
    const subscription = new Subscription({
      userId: user._id,
      plan: subscriptionConfig.plan,
      maxDevices: subscriptionConfig.maxDevices,
      startDate,
      endDate,
      isActive: true
    });
    
    await subscription.save();
    
    console.log('管理员创建用户成功:', {
      userId: user._id,
      email: user.email,
      plan: subscriptionConfig.plan,
      createdAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: '用户创建成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        subscription: {
          plan: subscription.plan,
          maxDevices: subscription.maxDevices,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          validDays: subscriptionConfig.validDays
        }
      }
    });
    
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({
      success: false,
      message: '创建用户失败',
      error: error.message
    });
  }
});

/**
 * 获取用户列表（管理员专用）
 * GET /api/admin/users?page=1&limit=20
 */
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments();
    
    // 获取每个用户的订阅信息
    const usersWithSubscription = await Promise.all(
      users.map(async (user) => {
        const subscription = await Subscription.findOne({ userId: user._id });
        return {
          ...user.toObject(),
          subscription: subscription ? {
            plan: subscription.plan,
            maxDevices: subscription.maxDevices,
            endDate: subscription.endDate,
            isActive: subscription.isActive
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        users: usersWithSubscription,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    });
  }
});

module.exports = router;
