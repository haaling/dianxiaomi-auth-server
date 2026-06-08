const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 调试：打印所有环境变量（仅在开发/调试时）
    console.log('🔍 检查环境变量...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MONGODB_URI 存在:', !!process.env.MONGODB_URI);
    
    // 检查是否配置了数据库连接字符串
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  警告: 未配置 MONGODB_URI 环境变量');
      console.warn('⚠️  服务器将启动，但数据库功能不可用');
      console.warn('⚠️  请在 Railway Settings -> Variables 中配置 MONGODB_URI');
      console.warn('⚠️  当前所有环境变量:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
      return;
    }

    console.log('⏳ 正在连接 MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 10,
    });
    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB 连接错误: ${error.message}`);
    console.error('⚠️  服务器将继续运行，但数据库功能不可用');
    // 不再退出进程，允许服务器继续运行用于健康检查
  }
};

module.exports = connectDB;
