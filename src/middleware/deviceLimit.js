const Device = require('../models/Device');

// 设备冷却时间（毫秒）
const DEVICE_COOLDOWN = 10 * 60 * 1000; // 10分钟

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

    // 检查当前设备是否在冷却期内
    const currentDevice = await Device.findOne({ 
      userId: req.userId,
      deviceId: deviceId 
    });

    if (currentDevice && currentDevice.kickedOutAt) {
      const cooldownEnd = new Date(currentDevice.kickedOutAt.getTime() + DEVICE_COOLDOWN);
      const now = new Date();
      
      if (now < cooldownEnd) {
        const remainingMinutes = Math.ceil((cooldownEnd - now) / 60000);
        console.log(`[DeviceLimit] ⚠️ 设备 ${deviceId} 在冷却期内，还需等待 ${remainingMinutes} 分钟`);
        
        return res.status(429).json({ 
          success: false,
          message: `您的设备已被踢出，请等待 ${remainingMinutes} 分钟后再试`,
          cooldownEndsAt: cooldownEnd,
          remainingMinutes: remainingMinutes
        });
      }
    }

    // 同一账号只允许一个设备登录：禁用该用户的所有其他设备
    console.log(`[DeviceLimit] 用户 ${req.userId} 的设备 ${deviceId} 正在登录...`);
    
    const updateResult = await Device.updateMany(
      { 
        userId: req.userId, 
        deviceId: { $ne: deviceId },
        isActive: true  // 只更新当前活跃的设备
      },
      { 
        $set: { 
          isActive: false,
          kickedOutAt: new Date()  // 记录被踢出的时间
        } 
      }
    );
    
    console.log(`[DeviceLimit] 更新结果:`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });
    
    if (updateResult.modifiedCount > 0) {
      console.log(`[DeviceLimit] ✓ 设备 ${deviceId} 登录，已踢出用户 ${req.userId} 的 ${updateResult.modifiedCount} 个其他设备`);
    } else {
      console.log(`[DeviceLimit] 没有其他活跃设备需要踢出`);
    }

    // 检查设备是否已注册
    const existingDevice = await Device.findOne({ 
      userId: req.userId,
      deviceId: deviceId 
    });

    if (existingDevice) {
      // 设备已注册，更新活跃时间和状态，清除踢出记录
      existingDevice.isActive = true;
      existingDevice.lastActiveAt = new Date();
      existingDevice.kickedOutAt = null;  // 清除被踢出的记录
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
