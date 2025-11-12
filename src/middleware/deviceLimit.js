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

    // 检查当前活跃设备数量
    const activeDeviceCount = await Device.countDocuments({ 
      userId: req.userId,
      isActive: true 
    });

    const maxDevices = req.subscription ? req.subscription.maxDevices : parseInt(process.env.MAX_DEVICES_PER_USER || 3);

    if (activeDeviceCount >= maxDevices) {
      return res.status(403).json({ 
        success: false,
        message: `已达到最大设备数量限制（${maxDevices}台）`,
        maxDevices: maxDevices,
        currentDevices: activeDeviceCount
      });
    }

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
