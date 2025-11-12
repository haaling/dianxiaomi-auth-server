#!/usr/bin/env node
/**
 * 账号管理工具 - 查看所有客户账号
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Subscription = require('../src/models/Subscription');
const Device = require('../src/models/Device');

const PLANS = {
  free: '免费版',
  basic: '基础版',
  premium: '高级版',
  enterprise: '企业版'
};

async function listAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║              店小蜜 - 客户账号列表                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const users = await User.find().sort({ createdAt: -1 });
    
    if (users.length === 0) {
      console.log('暂无客户账号');
      process.exit(0);
    }

    console.log(`共有 ${users.length} 个客户账号\n`);

    for (const user of users) {
      const subscription = await Subscription.findOne({ userId: user._id });
      const devices = await Device.find({ userId: user._id, isActive: true });
      
      const isExpired = subscription ? !subscription.isValid() : true;
      const status = isExpired ? '❌ 已过期' : '✅ 有效';
      
      console.log('─────────────────────────────────────────────────────');
      console.log(`📧 邮箱: ${user.email}`);
      console.log(`👤 姓名: ${user.profile?.name || '未设置'}`);
      console.log(`📅 注册时间: ${user.createdAt.toLocaleDateString('zh-CN')}`);
      
      if (subscription) {
        console.log(`📦 订阅计划: ${PLANS[subscription.plan] || subscription.plan}`);
        console.log(`⏰ 有效期: ${subscription.startDate.toLocaleDateString('zh-CN')} - ${subscription.endDate.toLocaleDateString('zh-CN')}`);
        console.log(`🔌 设备数: ${devices.length}/${subscription.maxDevices}`);
        console.log(`📊 状态: ${status}`);
      } else {
        console.log(`📦 订阅计划: 未订阅`);
        console.log(`📊 状态: ❌ 无订阅`);
      }
      
      if (user.profile?.note) {
        console.log(`📝 备注: ${user.profile.note}`);
      }
      
      if (devices.length > 0) {
        console.log(`📱 活跃设备:`);
        devices.forEach((device, index) => {
          const lastActive = device.lastActiveAt 
            ? new Date(device.lastActiveAt).toLocaleString('zh-CN')
            : '未知';
          console.log(`   ${index + 1}. ${device.deviceName} (最后活跃: ${lastActive})`);
        });
      }
      console.log('');
    }

    // 统计信息
    const totalUsers = users.length;
    const activeSubscriptions = await Subscription.countDocuments({
      endDate: { $gte: new Date() }
    });
    const totalDevices = await Device.countDocuments({ isActive: true });

    console.log('═════════════════════════════════════════════════════');
    console.log('📊 统计信息：');
    console.log(`   总用户数: ${totalUsers}`);
    console.log(`   有效订阅: ${activeSubscriptions}`);
    console.log(`   活跃设备: ${totalDevices}`);
    console.log('═════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

listAccounts();
