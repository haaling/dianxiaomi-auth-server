/**
 * 创建测试账号脚本
 * 使用方法: node scripts/create-test-user.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 导入模型
const User = require('../src/models/User');
const Subscription = require('../src/models/Subscription');

// 测试账号配置
const testUsers = [
  {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    plan: 'free'
  },
  {
    username: 'premiumuser',
    email: 'premium@example.com',
    password: 'password123',
    plan: 'premium'
  },
  {
    username: 'basicuser',
    email: 'basic@example.com',
    password: 'password123',
    plan: 'basic'
  },
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123456',
    plan: 'enterprise'
  }
];

async function createTestUsers() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dianxiaomi_auth');
    console.log('✅ 数据库连接成功');

    // 清除现有测试账号(可选)
    console.log('\n🗑️  清除现有测试账号...');
    for (const testUser of testUsers) {
      await User.deleteOne({ email: testUser.email });
      console.log(`   - 已删除: ${testUser.email}`);
    }

    // 创建测试账号
    console.log('\n👥 创建测试账号...\n');
    
    for (const testUser of testUsers) {
      // 创建用户
      const user = new User({
        username: testUser.username,
        email: testUser.email,
        password: testUser.password
      });

      await user.save();
      console.log(`✅ 用户创建成功: ${testUser.username}`);
      console.log(`   邮箱: ${testUser.email}`);
      console.log(`   密码: ${testUser.password}`);

      // 创建订阅
      const subscriptionConfig = {
        free: { maxDevices: 3, days: 30 },
        basic: { maxDevices: 5, days: 30 },
        premium: { maxDevices: 10, days: 365 },
        enterprise: { maxDevices: 50, days: 365 }
      };

      const config = subscriptionConfig[testUser.plan];
      const subscription = new Subscription({
        userId: user._id,
        plan: testUser.plan,
        maxDevices: config.maxDevices,
        endDate: new Date(Date.now() + config.days * 24 * 60 * 60 * 1000)
      });

      await subscription.save();
      console.log(`   订阅计划: ${testUser.plan.toUpperCase()}`);
      console.log(`   设备限制: ${config.maxDevices} 台`);
      console.log(`   有效期至: ${subscription.endDate.toLocaleDateString('zh-CN')}`);
      console.log('');
    }

    console.log('🎉 测试账号创建完成!\n');
    console.log('=' .repeat(60));
    console.log('测试账号列表:');
    console.log('=' .repeat(60));
    console.log('');
    
    console.log('1. 免费版账号:');
    console.log('   邮箱: test@example.com');
    console.log('   密码: password123');
    console.log('   计划: FREE (3台设备, 30天)');
    console.log('');
    
    console.log('2. 基础版账号:');
    console.log('   邮箱: basic@example.com');
    console.log('   密码: password123');
    console.log('   计划: BASIC (5台设备, 30天)');
    console.log('');
    
    console.log('3. 高级版账号:');
    console.log('   邮箱: premium@example.com');
    console.log('   密码: password123');
    console.log('   计划: PREMIUM (10台设备, 365天)');
    console.log('');
    
    console.log('4. 企业版账号:');
    console.log('   邮箱: admin@example.com');
    console.log('   密码: admin123456');
    console.log('   计划: ENTERPRISE (50台设备, 365天)');
    console.log('');
    
    console.log('=' .repeat(60));
    console.log('');
    console.log('💡 提示: 使用这些账号登录 Chrome 插件进行测试');
    console.log('');

  } catch (error) {
    console.error('❌ 创建测试账号失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('👋 数据库连接已关闭');
  }
}

// 运行脚本
createTestUsers();
