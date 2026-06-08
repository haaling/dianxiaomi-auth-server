const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'tb_bridge', 'image_pro', 'enterprise'],
    default: 'free'
  },
  maxDevices: {
    type: Number,
    default: 3 // 默认最多3台设备
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 复合索引：加速 getLatestSubscription 按 userId 查询并按 endDate 排序
subscriptionSchema.index({ userId: 1, endDate: -1 });

// 检查订阅是否有效
subscriptionSchema.methods.isValid = function() {
  const now = new Date();
  return this.isActive && this.endDate > now;
};

// 更新时间戳
subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
