const Device = require('../models/Device');

// 检查设备数量限制
const checkDeviceLimit = async (req, res, next) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ 
        success: false,
        message: '缺少设备ID' 
      });
    }

    // 同一账号只允许一个设备登录：禁用该用户的所有其他设备
    const updateResult = await Device.updateMany(
      { 
        userId: req.userId, 
        deviceId: { $ne: deviceId },
        isActive: true  // 只更新当前活跃的设备
      },
      { $set: { isActive: false } }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log(`[DeviceLimit] 设备 ${deviceId} 登录，已踢出用户 ${req.userId} 的 ${updateResult.modifiedCount} 个其他设备`);
    }

    // 检查设备是否已注册
    const existingDevice = await Device.findOne({ 
      userId: req.userId,
      deviceId: deviceId 
    });

    if (existingDevice) {
      // 设备已注册，更新活跃时间和状态
      existingDevice.isActive = true;
      existingDevice.lastActiveAt = new Date();
      await existingDevice.save();
      req.device = existingDevice;
      console.log(`[DeviceLimit] 现有设备 ${deviceId} 重新激活`);
      return next();
    }

    // 新设备，继续到路由处理函数创建记录
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: '检查设备限制时出错',
      error: error.message 
    });
  }
};

module.exports = checkDeviceLimit;
