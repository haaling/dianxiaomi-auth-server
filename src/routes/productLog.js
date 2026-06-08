const express = require('express');
const router = express.Router();
const ProductLog = require('../models/ProductLog');
const authenticateToken = require('../middleware/auth');

// 记录产品操作日志（公开接口）
// 这里直接短路返回，避免任何鉴权查库或日志落库开销。
router.post('/log', async (req, res) => {
  const action = req.body?.action || null;

  return res.json({
    success: true,
    message: '产品日志已忽略',
    data: {
      skipped: true,
      action
    }
  });
});

// 获取产品日志（仅管理员）
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user || req.user.username !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问，仅管理员可查询日志'
      });
    }

    const { page = 1, limit = 20, action, username, userId } = req.query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = {};
    if (action) {
      query.action = action;
    }
    if (username) {
      query.username = username;
    }
    if (userId) {
      query.userId = userId;
    }

    // 查询日志
    const [logs, total] = await Promise.all([
      ProductLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      ProductLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取产品日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取产品日志失败',
      error: error.message
    });
  }
});

// 获取统计数据（仅管理员）
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (!req.user || req.user.username !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问，仅管理员可查询统计数据'
      });
    }

    const { username, userId } = req.query;
    const matchCondition = {};
    if (username) matchCondition.username = username;
    if (userId) matchCondition.userId = new require('mongoose').Types.ObjectId(userId);

    // 统计各类操作的数量
    const [totalLogs, actionStats, userStats, recentLogs] = await Promise.all([
      ProductLog.countDocuments(matchCondition),
      ProductLog.aggregate([
        { $match: matchCondition },
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]),
      ProductLog.aggregate([
        { $match: matchCondition },
        { $group: { _id: '$username', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      ProductLog.find(matchCondition)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('chineseTitle englishTitle username loginAccount storeName action createdAt')
    ]);

    // 格式化统计数据
    const stats = {
      total: totalLogs,
      byAction: {},
      byUser: {},
      recentActivities: recentLogs
    };

    actionStats.forEach(stat => {
      stats.byAction[stat._id] = stat.count;
    });

    userStats.forEach(stat => {
      stats.byUser[stat._id || '匿名'] = stat.count;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
});

module.exports = router;
