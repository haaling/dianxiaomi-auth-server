/**
 * 修复设备索引
 * 删除旧的 deviceId 唯一索引，创建新的 userId+deviceId 复合唯一索引
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixDeviceIndex() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dianxiaomi_auth');
    console.log('✅ 数据库连接成功');

    const db = mongoose.connection.db;
    const collection = db.collection('devices');

    // 查看现有索引
    console.log('\n📋 当前索引:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log('  -', JSON.stringify(index.key), index.unique ? '(unique)' : '');
    });

    // 删除旧的 deviceId 唯一索引
    try {
      console.log('\n🗑️  删除旧的 deviceId_1 索引...');
      await collection.dropIndex('deviceId_1');
      console.log('✅ 旧索引删除成功');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  索引不存在，跳过删除');
      } else {
        console.error('❌ 删除索引失败:', error.message);
      }
    }

    // 创建新的复合唯一索引
    console.log('\n🔨 创建新的复合唯一索引 (userId + deviceId)...');
    try {
      await collection.createIndex(
        { userId: 1, deviceId: 1 },
        { unique: true }
      );
      console.log('✅ 新索引创建成功');
    } catch (error) {
      if (error.code === 85 || error.code === 86) {
        console.log('ℹ️  索引已存在');
      } else {
        console.error('❌ 创建索引失败:', error.message);
      }
    }

    // 显示最新索引
    console.log('\n📋 最新索引:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(index => {
      console.log('  -', JSON.stringify(index.key), index.unique ? '(unique)' : '');
    });

    console.log('\n🎉 索引修复完成！');
    console.log('\n💡 现在一台设备可以登录多个账号了');
    
    await mongoose.connection.close();
    console.log('\n👋 数据库连接已关闭');

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

fixDeviceIndex();
