const mongoose = require('mongoose');

const productLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  username: {
    type: String,
    trim: true,
    index: true
  },
  originalTitle: {
    type: String,
    trim: true,
    default: null
  },
  chineseTitle: {
    type: String,
    required: true,
    trim: true
  },
  englishTitle: {
    type: String,
    trim: true,
    default: null
  },
  storeName: {
    type: String,
    trim: true,
    default: null
  },
  loginAccount: {
    type: String,
    trim: true,
    index: true,
    default: null
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    enum: ['optimizeTitle', 'runAllSteps', 'runSelectedSteps', 'runTemplatePostSteps'],
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
productLogSchema.index({ username: 1, createdAt: -1 });
productLogSchema.index({ loginAccount: 1, createdAt: -1 });

const ProductLog = mongoose.model('ProductLog', productLogSchema);

module.exports = ProductLog;
