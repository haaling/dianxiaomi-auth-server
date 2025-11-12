const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
    // 移除 unique: true，改用复合唯一索引
  },
  deviceName: {
    type: String,
    required: true
  },
  deviceInfo: {
    browser: String,
    os: String,
    userAgent: String
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// 复合唯一索引：同一用户的同一设备只能注册一次
// 但不同用户可以使用同一个 deviceId（允许多账号登录）
deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// 更新最后活跃时间
deviceSchema.methods.updateActivity = function() {
  this.lastActiveAt = Date.now();
  return this.save();
};

module.exports = mongoose.model('Device', deviceSchema);
