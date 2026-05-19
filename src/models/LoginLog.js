const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  username: {
    type: String,
    trim: true,
    default: null,
    index: true
  },
  ip: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  userAgent: {
    type: String,
    trim: true,
    default: null
  },
  loginAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

loginLogSchema.index({ email: 1, loginAt: -1 });
loginLogSchema.index({ ip: 1, loginAt: -1 });

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

module.exports = LoginLog;
