const mongoose = require('mongoose');

const productLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalTitle: {
    type: String,
    required: true,
    trim: true
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true
  },
  optimizedTitle: {
    type: String,
    trim: true
  },
  action: {
    type: String,
    enum: ['optimizeTitle', 'runAllSteps', 'runSelectedSteps'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 创建复合索引用于查询优化
productLogSchema.index({ userId: 1, createdAt: -1 });

const ProductLog = mongoose.model('ProductLog', productLogSchema);

module.exports = ProductLog;
