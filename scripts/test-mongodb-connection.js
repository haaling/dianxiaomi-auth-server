#!/usr/bin/env node
/**
 * 测试 MongoDB 连接
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🔍 测试 MongoDB 连接...\n');
  
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ 错误: 未找到 MONGODB_URI 环境变量');
    console.log('请在 .env 文件中配置 MONGODB_URI');
    process.exit(1);
  }
  
  console.log('📝 连接信息:');
  // 隐藏密码显示
  const safeUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
  console.log('   URI:', safeUri);
  console.log('');
  
  try {
    console.log('⏳ 正在连接...');
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ 连接成功!');
    console.log('   Host:', conn.connection.host);
    console.log('   Database:', conn.connection.name);
    console.log('   状态:', conn.connection.readyState === 1 ? '已连接' : '未知');
    
    // 测试数据库操作
    console.log('\n🔍 测试数据库操作...');
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`✅ 找到 ${collections.length} 个集合:`, collections.map(c => c.name).join(', ') || '(无)');
    
    await mongoose.connection.close();
    console.log('\n✅ 测试完成，连接已关闭');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ 连接失败!');
    console.error('错误类型:', error.name);
    console.error('错误信息:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 可能的原因:');
      console.log('   1. MongoDB 集群地址错误');
      console.log('   2. 网络连接问题');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n💡 可能的原因:');
      console.log('   1. 用户名或密码错误');
      console.log('   2. 密码中的特殊字符未正确编码');
      console.log('   3. 用户权限不足');
    } else if (error.message.includes('timed out')) {
      console.log('\n💡 可能的原因:');
      console.log('   1. MongoDB Atlas 网络访问未配置 0.0.0.0/0');
      console.log('   2. 防火墙阻止连接');
      console.log('   3. 连接字符串错误');
    }
    
    console.log('\n🔧 解决步骤:');
    console.log('   1. 检查 .env 中的 MONGODB_URI 格式');
    console.log('   2. 确保 MongoDB Atlas Network Access 允许所有 IP (0.0.0.0/0)');
    console.log('   3. 确认数据库用户已创建且密码正确');
    
    process.exit(1);
  }
}

testConnection();
