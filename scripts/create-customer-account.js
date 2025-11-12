#!/usr/bin/env node
/**
 * 客户账号创建工具
 * 用于为客户创建账号和配置订阅计划
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../src/models/User');
const Subscription = require('../src/models/Subscription');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 订阅计划配置
const PLANS = {
  free: {
    name: '免费版',
    maxDevices: 3,
    validDays: 3,
    price: 0,
    features: ['基础优化']
  },
  basic: {
    name: '基础版',
    maxDevices: 5,
    validDays: 365,
    price: 199,
    features: ['基础优化', '高级功能']
  },
  premium: {
    name: '高级版',
    maxDevices: 10,
    validDays: 365,
    price: 499,
    features: ['基础优化', '高级功能', '智能定价', '批量操作']
  },
  enterprise: {
    name: '企业版',
    maxDevices: 50,
    validDays: 365,
    price: 1999,
    features: ['所有功能', 'API集成', '优先支持']
  }
};

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function displayPlans() {
  console.log('\n可用订阅计划：');
  console.log('═══════════════════════════════════════════════════');
  Object.entries(PLANS).forEach(([key, plan]) => {
    console.log(`\n[${key}] ${plan.name}`);
    console.log(`  价格: ¥${plan.price}/年`);
    console.log(`  设备数: ${plan.maxDevices}台`);
    console.log(`  有效期: ${plan.validDays}天`);
    console.log(`  功能: ${plan.features.join(', ')}`);
  });
  console.log('\n═══════════════════════════════════════════════════\n');
}

async function createCustomerAccount() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 已连接到数据库\n');

    console.log('╔═══════════════════════════════════════╗');
    console.log('║     店小蜜 - 客户账号创建工具        ║');
    console.log('╚═══════════════════════════════════════╝\n');

    // 获取客户信息
    const email = await question('📧 客户邮箱: ');
    
    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('\n⚠️  该邮箱已存在！');
      const update = await question('是否更新现有账号的订阅？(y/n): ');
      if (update.toLowerCase() !== 'y') {
        console.log('操作已取消');
        process.exit(0);
      }
      
      // 更新现有账号
      displayPlans();
      const plan = await question('选择订阅计划 (free/basic/premium/enterprise): ');
      
      if (!PLANS[plan]) {
        console.log('❌ 无效的订阅计划');
        process.exit(1);
      }

      const customDays = await question(`有效期天数 (默认${PLANS[plan].validDays}): `);
      const validDays = customDays ? parseInt(customDays) : PLANS[plan].validDays;

      // 更新订阅
      let subscription = await Subscription.findOne({ userId: existingUser._id });
      if (subscription) {
        subscription.plan = plan;
        subscription.startDate = new Date();
        subscription.endDate = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);
        subscription.maxDevices = PLANS[plan].maxDevices;
        await subscription.save();
      } else {
        subscription = new Subscription({
          userId: existingUser._id,
          plan,
          maxDevices: PLANS[plan].maxDevices,
          startDate: new Date(),
          endDate: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000)
        });
        await subscription.save();
      }

      console.log('\n✅ 订阅已更新！');
      console.log('\n账号信息：');
      console.log('═══════════════════════════════════════');
      console.log(`邮箱: ${existingUser.email}`);
      console.log(`订阅计划: ${PLANS[plan].name}`);
      console.log(`有效期至: ${subscription.endDate.toLocaleDateString('zh-CN')}`);
      console.log(`最大设备数: ${subscription.maxDevices}台`);
      console.log('═══════════════════════════════════════\n');
      
      process.exit(0);
    }

    const password = await question('🔑 密码 (至少6位): ');
    if (password.length < 6) {
      console.log('❌ 密码长度至少为6位');
      process.exit(1);
    }

    const customerName = await question('👤 客户姓名 (可选): ');
    const customerNote = await question('📝 备注信息 (可选): ');

    // 选择订阅计划
    displayPlans();
    const plan = await question('选择订阅计划 (free/basic/premium/enterprise): ');
    
    if (!PLANS[plan]) {
      console.log('❌ 无效的订阅计划');
      process.exit(1);
    }

    const customDays = await question(`有效期天数 (默认${PLANS[plan].validDays}): `);
    const validDays = customDays ? parseInt(customDays) : PLANS[plan].validDays;

    // 确认信息
    console.log('\n请确认以下信息：');
    console.log('═══════════════════════════════════════');
    console.log(`邮箱: ${email}`);
    console.log(`客户姓名: ${customerName || '未提供'}`);
    console.log(`订阅计划: ${PLANS[plan].name}`);
    console.log(`价格: ¥${PLANS[plan].price}`);
    console.log(`有效期: ${validDays}天`);
    console.log(`最大设备数: ${PLANS[plan].maxDevices}台`);
    console.log(`备注: ${customerNote || '无'}`);
    console.log('═══════════════════════════════════════\n');

    const confirm = await question('确认创建账号？(y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('操作已取消');
      process.exit(0);
    }

    // 创建用户
    const user = new User({
      username: customerName || email.split('@')[0], // 使用客户姓名或邮箱前缀作为用户名
      email,
      password
    });

    await user.save();
    console.log('\n✅ 用户创建成功！');

    // 创建订阅
    const subscription = new Subscription({
      userId: user._id,
      plan,
      maxDevices: PLANS[plan].maxDevices,
      startDate: new Date(),
      endDate: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000)
    });

    await subscription.save();
    console.log('✅ 订阅创建成功！');

    // 显示账号信息
    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║         账号创建成功！                ║');
    console.log('╚═══════════════════════════════════════╝\n');
    console.log('请将以下信息发送给客户：\n');
    console.log('═══════════════════════════════════════');
    console.log(`登录邮箱: ${email}`);
    console.log(`登录密码: ${password}`);
    console.log(`订阅计划: ${PLANS[plan].name}`);
    console.log(`有效期至: ${subscription.endDate.toLocaleDateString('zh-CN')}`);
    console.log(`可用设备数: ${subscription.maxDevices}台`);
    console.log('═══════════════════════════════════════\n');
    console.log('🔗 登录地址: 在Chrome插件中输入上述邮箱密码即可登录\n');

  } catch (error) {
    console.error('❌ 创建账号失败:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
  }
}

// 运行
createCustomerAccount();
