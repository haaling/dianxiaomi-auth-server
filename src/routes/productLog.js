const express = require('express');
const router = express.Router();
const ProductLog = require('../models/ProductLog');
const { authenticateToken } = require('../middleware/auth');

// 记录产品操作日志
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const { originalTitle, sourceUrl, optimizedTitle, action } = req.body;

    // 验证必填字段
    if (!originalTitle || !sourceUrl || !action) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段：originalTitle, sourceUrl, action'
      });
    }

    // 验证 action 类型
    const validActions = ['optimizeTitle', 'runAllSteps', 'runSelectedSteps'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `无效的 action 类型，必须是: ${validActions.join(', ')}`
      });
    }

    // 创建日志记录
    const productLog = new ProductLog({
      userId: req.user.userId,
      originalTitle,
      sourceUrl,
      optimizedTitle,
      action
    });

    await productLog.save();

    res.json({
      success: true,
      message: '产品日志已记录',
      data: {
        logId: productLog._id,
        createdAt: productLog.createdAt
      }
    });
  } catch (error) {
    console.error('记录产品日志失败:', error);
    res.status(500).json({
      success: false,
      message: '记录产品日志失败',
      error: error.message
    });
  }
});

// 获取用户的产品日志（支持分页）
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = { userId: req.user.userId };
    if (action) {
      query.action = action;
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

// 获取统计数据
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 统计各类操作的数量
    const [totalLogs, actionStats, recentLogs] = await Promise.all([
      ProductLog.countDocuments({ userId }),
      ProductLog.aggregate([
        { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]),
      ProductLog.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('originalTitle action createdAt')
    ]);

    // 格式化统计数据
    const stats = {
      total: totalLogs,
      byAction: {},
      recentActivities: recentLogs
    };

    actionStats.forEach(stat => {
      stats.byAction[stat._id] = stat.count;
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
