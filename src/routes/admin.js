/**
 * 管理员路由
 * 需要 Admin API Key 才能访问
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Device = require('../models/Device');
const ProductLog = require('../models/ProductLog');
const LoginLog = require('../models/LoginLog');
const adminAuth = require('../middleware/adminAuth');

const PLAN_CONFIGS = {
  free: { maxDevices: 3, validDays: 30 },
  basic: { maxDevices: 5, validDays: 365 },
  premium: { maxDevices: 10, validDays: 365 },
  tb_bridge: { maxDevices: 15, validDays: 365 },
  image_pro: { maxDevices: 20, validDays: 365 },
  enterprise: { maxDevices: 50, validDays: 365 }
};

const VALID_PLANS = Object.keys(PLAN_CONFIGS);

// 所有管理员路由都需要 API Key 认证
router.use(adminAuth);

/**
 * 创建用户账号（管理员专用）
 * POST /api/admin/create-user
 * Headers: x-admin-api-key: your_api_key
 * Body: { username, email, password, plan?, maxDevices?, validDays?, income? }
 */
router.post('/create-user', async (req, res) => {
  try {
    const { username, email, password, plan, maxDevices, validDays, income } = req.body;
    
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

    const parsedIncome = income === undefined || income === null || income === '' ? 0 : Number(income);
    if (!Number.isFinite(parsedIncome) || parsedIncome < 0) {
      return res.status(400).json({
        success: false,
        message: '收入必须是大于等于 0 的数字'
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
    
    // 创建用户（密码会由 User 模型的 pre('save') 中间件自动加密）
    const user = new User({
      username,
      email,
      password,  // 直接传入明文密码，让模型自己加密
      isActive: true,
      income: parsedIncome
    });
    
    await user.save();
    
    // 根据 plan 参数确定订阅配置
    let subscriptionConfig = {
      plan: plan || 'free',
      maxDevices: maxDevices ?? 3,
      validDays: validDays ?? 30
    };
    
    // 预设的套餐配置
    // 如果指定了套餐，使用预设配置（除非显式覆盖）
    if (plan && PLAN_CONFIGS[plan]) {
      subscriptionConfig = {
        plan,
        maxDevices: maxDevices ?? PLAN_CONFIGS[plan].maxDevices,
        validDays: validDays ?? PLAN_CONFIGS[plan].validDays
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
      income: user.income,
      createdAt: new Date().toISOString()
    });
    
    // 计算剩余天数
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
    
    res.json({
      success: true,
      message: '用户创建成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          income: user.income,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        subscription: {
          plan: subscription.plan,
          maxDevices: subscription.maxDevices,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          validDays: subscriptionConfig.validDays,
          daysRemaining: daysRemaining,
          isValid: subscription.isValid()
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
    const totalRevenueAgg = await User.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$income' }
        }
      }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;
    
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
        stats: {
          totalRevenue
        },
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

/**
 * 切换单个用户订阅等级（管理员专用）
 * POST /api/admin/update-user-plan
 * Body: { userId, plan }
 */
router.post('/update-user-plan', async (req, res) => {
  try {
    const { userId, plan } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({
        success: false,
        message: 'userId 和 plan 是必填项'
      });
    }

    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: `无效套餐：${plan}`
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    let subscription = await Subscription.findOne({ userId: user._id }).sort({ endDate: -1 });
    const now = new Date();

    if (!subscription) {
      const startDate = now;
      const endDate = new Date(startDate.getTime() + PLAN_CONFIGS[plan].validDays * 24 * 60 * 60 * 1000);
      subscription = await Subscription.create({
        userId: user._id,
        plan,
        maxDevices: PLAN_CONFIGS[plan].maxDevices,
        startDate,
        endDate,
        isActive: true
      });
    } else {
      subscription.plan = plan;
      subscription.maxDevices = PLAN_CONFIGS[plan].maxDevices;
      subscription.isActive = subscription.endDate > now;
      await subscription.save();
    }

    return res.json({
      success: true,
      message: '用户订阅等级更新成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        subscription: {
          plan: subscription.plan,
          maxDevices: subscription.maxDevices,
          endDate: subscription.endDate,
          isActive: subscription.isActive
        }
      }
    });
  } catch (error) {
    console.error('[admin/update-user-plan] 更新失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新用户订阅等级失败',
      error: error.message
    });
  }
});

/**
 * 批量切换用户订阅等级（管理员专用）
 * POST /api/admin/batch-update-user-plan
 * Body: { userIds: string[], plan }
 */
router.post('/batch-update-user-plan', async (req, res) => {
  try {
    const { userIds, plan } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0 || !plan) {
      return res.status(400).json({
        success: false,
        message: 'userIds（数组）和 plan 是必填项'
      });
    }

    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: `无效套餐：${plan}`
      });
    }

    const uniqueUserIds = [...new Set(userIds.filter(Boolean).map((id) => String(id)))];
    const users = await User.find({ _id: { $in: uniqueUserIds } }).select('_id username email');
    const usersById = new Map(users.map((u) => [String(u._id), u]));

    const updated = [];
    const failed = [];
    const now = new Date();

    for (const id of uniqueUserIds) {
      const user = usersById.get(String(id));
      if (!user) {
        failed.push({ userId: id, reason: '用户不存在' });
        continue;
      }

      try {
        let subscription = await Subscription.findOne({ userId: user._id }).sort({ endDate: -1 });

        if (!subscription) {
          const startDate = now;
          const endDate = new Date(startDate.getTime() + PLAN_CONFIGS[plan].validDays * 24 * 60 * 60 * 1000);
          subscription = await Subscription.create({
            userId: user._id,
            plan,
            maxDevices: PLAN_CONFIGS[plan].maxDevices,
            startDate,
            endDate,
            isActive: true
          });
        } else {
          subscription.plan = plan;
          subscription.maxDevices = PLAN_CONFIGS[plan].maxDevices;
          subscription.isActive = subscription.endDate > now;
          await subscription.save();
        }

        updated.push({
          userId: String(user._id),
          email: user.email,
          username: user.username,
          plan: subscription.plan,
          maxDevices: subscription.maxDevices
        });
      } catch (error) {
        failed.push({ userId: String(user._id), email: user.email, reason: error.message });
      }
    }

    return res.json({
      success: true,
      message: `批量更新完成，成功 ${updated.length}，失败 ${failed.length}`,
      data: {
        targetPlan: plan,
        total: uniqueUserIds.length,
        updated,
        failed
      }
    });
  } catch (error) {
    console.error('[admin/batch-update-user-plan] 更新失败:', error);
    return res.status(500).json({
      success: false,
      message: '批量更新订阅等级失败',
      error: error.message
    });
  }
});

/**
 * 营收统计（管理员专用）
 * GET /api/admin/revenue-stats?range=today|month|all|custom&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/revenue-stats', async (req, res) => {
  try {
    const { range = 'month', startDate, endDate } = req.query;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const parseDate = (value, fallback) => {
      if (!value) return fallback;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? fallback : date;
    };

    let customStart = parseDate(startDate, null);
    let customEnd = parseDate(endDate, null);
    if (customEnd) {
      customEnd.setHours(23, 59, 59, 999);
    }

    const resolveFilter = () => {
      if (range === 'today') {
        return { createdAt: { $gte: todayStart, $lte: now } };
      }
      if (range === 'month') {
        return { createdAt: { $gte: monthStart, $lte: now } };
      }
      if (range === 'custom') {
        if (!customStart || !customEnd) {
          return null;
        }
        return { createdAt: { $gte: customStart, $lte: customEnd } };
      }
      return {};
    };

    const selectedFilter = resolveFilter();
    if (range === 'custom' && !selectedFilter) {
      return res.status(400).json({
        success: false,
        message: '自定义区间需提供有效的 startDate 和 endDate'
      });
    }

    const sumIncome = async (filter) => {
      const result = await User.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$income' } } }
      ]);
      return result[0]?.total || 0;
    };

    const [selectedRevenue, todayRevenue, monthRevenue, allRevenue, paidUserCount] = await Promise.all([
      sumIncome(selectedFilter),
      sumIncome({ createdAt: { $gte: todayStart, $lte: now } }),
      sumIncome({ createdAt: { $gte: monthStart, $lte: now } }),
      sumIncome({}),
      User.countDocuments({ income: { $gt: 0 } })
    ]);

    return res.json({
      success: true,
      data: {
        range,
        selectedRevenue,
        todayRevenue,
        monthRevenue,
        allRevenue,
        paidUserCount,
        startDate: customStart,
        endDate: customEnd
      }
    });
  } catch (error) {
    console.error('[admin/revenue-stats] 获取营收统计失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取营收统计失败',
      error: error.message
    });
  }
});

/**
 * 续期用户订阅（管理员专用）
 * POST /api/admin/renew-subscription
 * Headers: x-admin-api-key: your_api_key
 * Body: { email, plan?, validDays? }
 */
router.post('/renew-subscription', async (req, res) => {
  try {
    const { email, plan, validDays } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: '邮箱是必填项' 
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }
    
    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        message: '该用户没有订阅记录' 
      });
    }
    
    // 续期逻辑：endDate 往后延长 validDays 天，套餐可变更
    const now = new Date();
    const currentEnd = subscription.endDate > now ? subscription.endDate : now;
    const days = validDays !== undefined && validDays !== null ? parseInt(validDays) : 30;
    
    subscription.endDate = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);
    if (plan) subscription.plan = plan;
    subscription.isActive = true;
    
    await subscription.save();
    
    // 计算剩余天数
    const daysRemaining = Math.max(0, Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24)));
    
    console.log('管理员续期用户订阅:', {
      userId: user._id,
      email: user.email,
      renewDays: days,
      newEndDate: subscription.endDate.toISOString()
    });
    
    return res.json({
      success: true,
      message: '续期成功',
      data: {
        user: {
          email: user.email,
          username: user.username
        },
        subscription: {
          plan: subscription.plan,
          endDate: subscription.endDate,
          maxDevices: subscription.maxDevices,
          daysRemaining: daysRemaining,
          isValid: subscription.isValid()
        }
      }
    });
    
  } catch (error) {
    console.error('[admin/renew-subscription] 续期失败:', error);
    return res.status(500).json({ 
      success: false, 
      message: '续期失败', 
      error: error.message 
    });
  }
});

/**
 * 修改用户密码（管理员专用）
 * POST /api/admin/update-password
 * Headers: x-admin-api-key: your_api_key
 * Body: { email, newPassword }
 */
router.post('/update-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '邮箱和新密码是必填项'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度至少为 6 位'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    user.password = newPassword;
    await user.save();

    console.log('管理员修改用户密码成功:', {
      userId: user._id,
      email: user.email,
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: '密码修改成功',
      data: {
        user: {
          email: user.email,
          username: user.username
        }
      }
    });
  } catch (error) {
    console.error('[admin/update-password] 修改密码失败:', error);
    return res.status(500).json({
      success: false,
      message: '修改密码失败',
      error: error.message
    });
  }
});

/**
 * 扣减用户订阅时长（管理员专用）
 * POST /api/admin/deduct-days
 * Headers: x-admin-api-key: your_api_key
 * Body: { email, days }
 */
router.post('/deduct-days', async (req, res) => {
  try {
    const { email, days } = req.body;
    
    if (!email || !days) {
      return res.status(400).json({
        success: false,
        message: '邮箱和扣减天数是必填项'
      });
    }
    
    const deductDays = parseInt(days);
    if (isNaN(deductDays) || deductDays <= 0) {
      return res.status(400).json({
        success: false,
        message: '扣减天数必须是大于0的整数'
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    let subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: '该用户没有订阅记录'
      });
    }
    
    // 扣减逻辑：endDate 往前减少 days 天
    const newEndDate = new Date(subscription.endDate.getTime() - deductDays * 24 * 60 * 60 * 1000);
    const oldEndDate = subscription.endDate;
    
    subscription.endDate = newEndDate;
    await subscription.save();
    
    // 计算剩余天数
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((newEndDate - now) / (1000 * 60 * 60 * 24)));
    
    console.log('管理员扣减用户时长:', {
      userId: user._id,
      email: user.email,
      deductDays: deductDays,
      oldEndDate: oldEndDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
      daysRemaining: daysRemaining
    });
    
    res.json({
      success: true,
      message: `成功扣减 ${deductDays} 天`,
      data: {
        user: {
          email: user.email,
          username: user.username
        },
        subscription: {
          plan: subscription.plan,
          maxDevices: subscription.maxDevices,
          oldEndDate: oldEndDate,
          newEndDate: newEndDate,
          daysRemaining: daysRemaining,
          isValid: subscription.isValid()
        }
      }
    });
    
  } catch (error) {
    console.error('[admin/deduct-days] 扣减时长失败:', error);
    res.status(500).json({
      success: false,
      message: '扣减时长失败',
      error: error.message
    });
  }
});

/**
 * 修改用户最大登录设备数（管理员专用）
 * POST /api/admin/update-max-devices
 * Headers: x-admin-api-key: your_api_key
 * Body: { email, maxDevices }
 */
router.post('/update-max-devices', async (req, res) => {
  try {
    const { email, maxDevices } = req.body;

    if (!email || maxDevices === undefined || maxDevices === null) {
      return res.status(400).json({
        success: false,
        message: '邮箱和最大设备数是必填项'
      });
    }

    const parsedMaxDevices = parseInt(maxDevices, 10);
    if (isNaN(parsedMaxDevices) || parsedMaxDevices <= 0) {
      return res.status(400).json({
        success: false,
        message: '最大设备数必须是大于0的整数'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const subscription = await Subscription.findOne({ userId: user._id });
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: '该用户没有订阅记录'
      });
    }

    subscription.maxDevices = parsedMaxDevices;
    await subscription.save();

    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24)));

    return res.json({
      success: true,
      message: '最大设备数已更新',
      data: {
        user: {
          email: user.email,
          username: user.username
        },
        subscription: {
          plan: subscription.plan,
          maxDevices: subscription.maxDevices,
          endDate: subscription.endDate,
          daysRemaining,
          isValid: subscription.isValid()
        }
      }
    });
  } catch (error) {
    console.error('[admin/update-max-devices] 更新失败:', error);
    return res.status(500).json({
      success: false,
      message: '更新失败',
      error: error.message
    });
  }
});

/**
 * 获取单个用户详情（管理员专用）
 * GET /api/admin/user/:email
 */
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const subscription = await Subscription.findOne({ userId: user._id });
    
    // 计算剩余天数
    let daysRemaining = 0;
    if (subscription) {
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24)));
    }
    
    res.json({
      success: true,
      data: {
        user: user.toObject(),
        subscription: subscription ? {
          plan: subscription.plan,
          maxDevices: subscription.maxDevices,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          isActive: subscription.isActive,
          isValid: subscription.isValid(),
          daysRemaining: daysRemaining
        } : null
      }
    });
    
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败',
      error: error.message
    });
  }
});

/**
 * 踢下线用户所有活跃设备（管理员专用）
 * POST /api/admin/kick-user
 * Headers: x-admin-api-key: your_api_key
 * Body: { email }
 */
router.post('/kick-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱是必填项'
      });
    }

    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const kickedOutAt = new Date();
    const updateResult = await Device.updateMany(
      {
        userId: user._id,
        isActive: true
      },
      {
        $set: {
          isActive: false,
          kickedOutAt
        }
      }
    );

    return res.json({
      success: true,
      message: updateResult.modifiedCount > 0 ? '已踢下线该账号的所有在线设备' : '该账号当前没有在线设备',
      data: {
        user: {
          email: user.email,
          username: user.username
        },
        kickedDevices: updateResult.modifiedCount,
        kickedOutAt
      }
    });
  } catch (error) {
    console.error('[admin/kick-user] 踢登失败:', error);
    return res.status(500).json({
      success: false,
      message: '踢登失败',
      error: error.message
    });
  }
});

/**
 * 清空用户设备踢登冷却时间（管理员专用）
 * POST /api/admin/clear-kick-cooldown
 * Headers: x-admin-api-key: your_api_key
 * Body: { email }
 */
router.post('/clear-kick-cooldown', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱是必填项'
      });
    }

    const user = await User.findOne({ email }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const updateResult = await Device.updateMany(
      {
        userId: user._id,
        kickedOutAt: { $ne: null }
      },
      {
        $set: {
          kickedOutAt: null
        }
      }
    );

    return res.json({
      success: true,
      message: updateResult.modifiedCount > 0 ? '已清空该账号设备的踢登冷却时间' : '该账号当前没有需要清空的冷却时间',
      data: {
        user: {
          email: user.email,
          username: user.username
        },
        clearedDevices: updateResult.modifiedCount
      }
    });
  } catch (error) {
    console.error('[admin/clear-kick-cooldown] 清空冷却期失败:', error);
    return res.status(500).json({
      success: false,
      message: '清空冷却期失败',
      error: error.message
    });
  }
});

/**
 * 获取产品日志（管理员专用）
 * GET /api/admin/product-logs?page=1&limit=20&action=&username=&loginEmail=
 */
router.get('/product-logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, action, username, loginEmail, loginAccount, startDate, endDate } = req.query;
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;
    const loginEmailFilter = loginEmail || loginAccount;

    const query = {};
    if (action) query.action = action;
    if (username) query.username = username;
    if (loginEmailFilter) query.loginAccount = loginEmailFilter;

    const createdAtFilter = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        createdAtFilter.$gte = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        createdAtFilter.$lte = end;
      }
    }
    if (Object.keys(createdAtFilter).length > 0) {
      query.createdAt = createdAtFilter;
    }

    const [logs, total] = await Promise.all([
      ProductLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select('-__v'),
      ProductLog.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit)
        }
      }
    });
  } catch (error) {
    console.error('[admin/product-logs] 获取失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取产品日志失败',
      error: error.message
    });
  }
});

/**
 * 获取产品日志统计（管理员专用）
 * GET /api/admin/product-log-stats?username=&loginEmail=
 */
router.get('/product-log-stats', async (req, res) => {
  try {
    const { username, loginEmail, loginAccount, startDate, endDate } = req.query;
    const loginEmailFilter = loginEmail || loginAccount;
    const matchCondition = {};
    if (username) matchCondition.username = username;
    if (loginEmailFilter) matchCondition.loginAccount = loginEmailFilter;

    const createdAtFilter = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        createdAtFilter.$gte = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        createdAtFilter.$lte = end;
      }
    }
    if (Object.keys(createdAtFilter).length > 0) {
      matchCondition.createdAt = createdAtFilter;
    }

    const [totalLogs, actionStats, accountStats, recentLogs] = await Promise.all([
      ProductLog.countDocuments(matchCondition),
      ProductLog.aggregate([
        { $match: matchCondition },
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]),
      ProductLog.aggregate([
        { $match: matchCondition },
        { $group: { _id: '$loginAccount', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      ProductLog.find(matchCondition)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('chineseTitle englishTitle username loginAccount storeName sourceUrl action createdAt')
    ]);

    const stats = {
      total: totalLogs,
      byAction: {},
      byLoginAccount: {},
      recentActivities: recentLogs
    };

    actionStats.forEach((stat) => {
      stats.byAction[stat._id] = stat.count;
    });

    accountStats.forEach((stat) => {
      stats.byLoginAccount[stat._id || '匿名'] = stat.count;
    });

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[admin/product-log-stats] 获取失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取产品日志统计失败',
      error: error.message
    });
  }
});

/**
 * 获取登录日志（管理员专用）
 * GET /api/admin/login-logs?page=1&limit=20&email=&ip=&startDate=&endDate=
 */
router.get('/login-logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, email, ip, startDate, endDate } = req.query;
    const parsedPage = parseInt(page, 10) || 1;
    const parsedLimit = parseInt(limit, 10) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};
    if (email) {
      query.email = { $regex: String(email).trim(), $options: 'i' };
    }
    if (ip) {
      query.ip = { $regex: String(ip).trim(), $options: 'i' };
    }

    const loginAtFilter = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        loginAtFilter.$gte = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        loginAtFilter.$lte = end;
      }
    }
    if (Object.keys(loginAtFilter).length > 0) {
      query.loginAt = loginAtFilter;
    }

    const [logs, total] = await Promise.all([
      LoginLog.find(query)
        .sort({ loginAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select('-__v'),
      LoginLog.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages: Math.ceil(total / parsedLimit)
        }
      }
    });
  } catch (error) {
    console.error('[admin/login-logs] 获取失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取登录日志失败',
      error: error.message
    });
  }
});

module.exports = router;
