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

    // 检查设备是否已注册
    const existingDevice = await Device.findOne({ 
      userId: req.userId,
      deviceId: deviceId 
    });

    if (existingDevice) {
      // 设备已注册，更新活跃时间
      await existingDevice.updateActivity();
      req.device = existingDevice;
      return next();
    }

    // 新设备登录：将该用户的所有其他设备设为不活跃（踢出）
    await Device.updateMany(
      { userId: req.userId, deviceId: { $ne: deviceId } },
      { $set: { isActive: false } }
    );
    
    console.log(`[DeviceLimit] 新设备 ${deviceId} 登录，已踢出用户 ${req.userId} 的所有其他设备`);

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
