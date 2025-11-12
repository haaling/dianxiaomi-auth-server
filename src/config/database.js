const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 检查是否配置了数据库连接字符串
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  警告: 未配置 MONGODB_URI 环境变量');
      console.warn('⚠️  服务器将启动，但数据库功能不可用');
      console.warn('⚠️  请在 Railway Settings -> Variables 中配置 MONGODB_URI');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB 连接成功: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB 连接错误: ${error.message}`);
    console.error('⚠️  服务器将继续运行，但数据库功能不可用');
    // 不再退出进程，允许服务器继续运行用于健康检查
  }
};

module.exports = connectDB;
