require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

// 导入路由
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');
const deviceRoutes = require('./routes/device');

const app = express();

// 异步连接数据库（不阻塞服务器启动）
connectDB().catch(err => {
  console.error('数据库连接失败，但服务器继续运行:', err.message);
});

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS配置 - 支持Chrome插件
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [];

app.use(cors({
  origin: function(origin, callback) {
    // 允许没有origin的请求（如Postman）
    if (!origin) return callback(null, true);
    
    // 检查是否是chrome-extension开头的URL
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // 检查是否在允许列表中
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // 开发环境允许所有来源，生产环境请修改
    }
  },
  credentials: true
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});

app.use('/api/', limiter);

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/device', require('./routes/device'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/features', require('./routes/features'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

// 根路由
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '点小蜜认证服务器 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      subscription: '/api/subscription',
      device: '/api/device'
    }
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Railway 需要监听所有接口

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 监听地址: ${HOST}:${PORT}`);
  console.log(`🏥 健康检查: http://${HOST}:${PORT}/health`);
  console.log(`📡 API地址: http://${HOST}:${PORT}/api`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;
