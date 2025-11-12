const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// 生成JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// 用户注册（已禁用 - 请使用管理员接口创建用户）
router.post('/register', async (req, res) => {
  // 为了安全，禁用公开注册
  // 管理员请使用 /api/admin/create-user 接口创建用户
  return res.status(403).json({
    success: false,
    message: '公开注册已关闭，请联系管理员创建账号'
  });
  
  /* 原注册代码已禁用
  try {
    const { username, email, password } = req.body;

    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: '请提供用户名、邮箱和密码' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: '密码长度至少为6个字符' 
      });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: '用户名或邮箱已被使用' 
      });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // 创建默认免费订阅（30天）
    const subscription = new Subscription({
      userId: user._id,
      plan: 'free',
      maxDevices: 3,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后
    });

    await subscription.save();

    // 生成Token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: user.toJSON(),
        subscription: {
          plan: subscription.plan,
          maxDevices: subscription.maxDevices,
          endDate: subscription.endDate
        },
        token
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ 
      success: false,
      message: '注册失败',
      error: error.message 
    });
  }
  */
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: '请提供邮箱和密码' 
      });
    }

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: '邮箱或密码错误' 
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: '邮箱或密码错误' 
      });
    }

    // 检查用户是否被禁用
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: '账户已被禁用' 
      });
    }

    // 更新最后登录时间
    user.lastLoginAt = Date.now();
    await user.save();

    // 获取订阅信息
    const subscription = await Subscription.findOne({ 
      userId: user._id,
      isActive: true 
    }).sort({ endDate: -1 });

    // 生成Token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: user.toJSON(),
        subscription: subscription ? {
          plan: subscription.plan,
          maxDevices: subscription.maxDevices,
          endDate: subscription.endDate,
          isValid: subscription.isValid()
        } : null,
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ 
      success: false,
      message: '登录失败',
      error: error.message 
    });
  }
});

module.exports = router;
