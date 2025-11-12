#!/usr/bin/env node
/**
 * 测试登录接口
 */

const SERVER_URL = 'https://dianxiaomi-auth-server-production.up.railway.app/api';

async function testLogin(email, password) {
  console.log('\n🔍 测试登录接口...');
  console.log('服务器地址:', SERVER_URL);
  console.log('邮箱:', email);
  console.log('密码:', '***');
  
  try {
    const response = await fetch(`${SERVER_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    console.log('\n📊 响应状态:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('\n📦 响应数据:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ 登录成功！');
      console.log('Token:', data.data.token.substring(0, 20) + '...');
      console.log('用户:', data.data.user);
      console.log('订阅:', data.data.subscription);
    } else {
      console.log('\n❌ 登录失败:', data.message);
    }
    
  } catch (error) {
    console.error('\n❌ 请求错误:', error.message);
  }
}

// 从命令行参数获取邮箱和密码
const email = process.argv[2] || 'hihaling@163.com';
const password = process.argv[3] || 'xl19951011';

testLogin(email, password);
