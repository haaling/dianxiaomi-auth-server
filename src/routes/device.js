const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const authenticateToken = require('../middleware/auth');
const checkSubscription = require('../middleware/subscription');
const checkDeviceLimit = require('../middleware/deviceLimit');

// 注册新设备
router.post('/register', authenticateToken, checkSubscription, checkDeviceLimit, async (req, res) => {
  try {
    const { deviceId, deviceName, deviceInfo } = req.body;

    if (!deviceId || !deviceName) {
      return res.status(400).json({ 
        success: false,
        message: '请提供设备ID和设备名称' 
      });
    }

    // 检查该用户是否已经在此设备上注册过
    const existingDevice = await Device.findOne({ 
      userId: req.userId,
      deviceId 
    });
    
    if (existingDevice) {
      // 设备已存在（中间件已经处理了禁用其他设备和重新激活此设备）
      // 这里只需要更新设备信息
      if (deviceName) existingDevice.deviceName = deviceName;
      if (deviceInfo) existingDevice.deviceInfo = deviceInfo;
      
      await existingDevice.save();
      
      return res.json({
        success: true,
        message: '设备已存在，信息已更新。其他设备已被踢出',
        data: existingDevice
      });
    }

    // 设备不存在，创建新设备记录（中间件已经禁用了其他设备）
    const device = new Device({
      userId: req.userId,
      deviceId,
      deviceName,
      deviceInfo: deviceInfo || {}
    });

    await device.save();

    res.status(201).json({
      success: true,
      message: '设备注册成功，其他设备已被踢出',
      data: device
    });
  } catch (error) {
    console.error('设备注册错误:', error);
    
    // 处理重复键错误
    if (error.code === 11000) {
      // 如果是重复键，说明该用户+设备的组合已存在
      // 尝试查找并返回现有设备
      try {
        const device = await Device.findOne({ 
          userId: req.userId,
          deviceId: req.body.deviceId 
        });
        
        if (device) {
          return res.json({
            success: true,
            message: '设备已存在',
            data: device
          });
        }
      } catch (findError) {
        console.error('查找设备失败:', findError);
      }
      
      return res.status(409).json({
        success: false,
        message: '设备注册冲突',
        error: '该设备可能已被注册'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: '设备注册失败',
      error: error.message 
    });
  }
});

// 获取用户的所有设备
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.find({ 
      userId: req.userId 
    }).sort({ lastActiveAt: -1 });

    res.json({
      success: true,
      data: {
        devices,
        total: devices.length,
        active: devices.filter(d => d.isActive).length
      }
    });
  } catch (error) {
    console.error('获取设备列表错误:', error);
    res.status(500).json({ 
      success: false,
      message: '获取设备列表失败',
      error: error.message 
    });
  }
});

// 移除设备（下线）
router.delete('/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;

    const device = await Device.findOne({ 
      userId: req.userId,
      deviceId 
    });

    if (!device) {
      return res.status(404).json({ 
        success: false,
        message: '设备不存在' 
      });
    }

    device.isActive = false;
    await device.save();

    res.json({
      success: true,
      message: '设备已下线',
      data: device
    });
  } catch (error) {
    console.error('移除设备错误:', error);
    res.status(500).json({ 
      success: false,
      message: '移除设备失败',
      error: error.message 
    });
  }
});

// 验证设备Token并更新活跃状态
router.post('/verify', authenticateToken, checkSubscription, async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({ 
        success: false,
        message: '请提供设备ID' 
      });
    }

    const device = await Device.findOne({ 
      userId: req.userId,
      deviceId,
      isActive: true 
    });

    if (!device) {
      return res.status(404).json({ 
        success: false,
        message: '设备未注册或已下线',
        needsRegistration: true
      });
    }

    // 更新设备活跃时间
    await device.updateActivity();

    // 计算剩余天数
    const now = new Date();
    const endDate = new Date(req.subscription.endDate);
    const daysRemaining = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
    
    res.json({
      success: true,
      message: 'Token有效',
      data: {
        device: device,
        subscription: {
          plan: req.subscription.plan,
          isValid: req.subscription.isValid(),
          endDate: req.subscription.endDate,
          maxDevices: req.subscription.maxDevices,
          daysRemaining: daysRemaining
        }
      }
    });
  } catch (error) {
    console.error('验证设备错误:', error);
    res.status(500).json({ 
      success: false,
      message: '验证设备失败',
      error: error.message 
    });
  }
});

module.exports = router;
