# 测试账号使用指南

## 快速创建测试账号

### 方法1: 使用脚本自动创建 (推荐)

```bash
# 在 dianxiaomi-auth-server 目录下运行
cd dianxiaomi-auth-server
node scripts/create-test-user.js
```

这将自动创建4个测试账号,涵盖所有订阅计划。

### 方法2: 手动注册

在 Chrome 插件中点击"注册"按钮,填写信息即可。

## 📝 预设测试账号

### 1️⃣ 免费版账号 (FREE)
```
邮箱: test@example.com
密码: password123
```
**权限:**
- ✅ 优化标题
- ✅ 应用模板
- ✅ 添加水印
- ❌ 其他高级功能锁定

**限制:**
- 最多 3 台设备
- 有效期 30 天

---

### 2️⃣ 基础版账号 (BASIC)
```
邮箱: basic@example.com
密码: password123
```
**权限:**
- ✅ 免费版所有功能
- ✅ 生成营销图
- ✅ 重新对应变体
- ✅ 处理SKU名称
- ✅ 生成无线版描述
- ✅ 填充包装/其他信息
- ❌ Premium 功能锁定

**限制:**
- 最多 5 台设备
- 有效期 30 天

---

### 3️⃣ 高级版账号 (PREMIUM) ⭐ 推荐测试用
```
邮箱: premium@example.com
密码: password123
```
**权限:**
- ✅ 所有基础功能
- ✅ 调整价格库存
- ✅ 翻译全文内容
- ✅ 上传资质图片
- ✅ 选择区域调价模板
- ✅ 一键全流程(通用)
- ✅ 一键全流程(速卖通)
- ✅ 一键执行勾选流程

**限制:**
- 最多 10 台设备
- 有效期 365 天

---

### 4️⃣ 企业版账号 (ENTERPRISE)
```
邮箱: admin@example.com
密码: admin123456
```
**权限:**
- ✅ 所有功能无限制

**限制:**
- 最多 50 台设备
- 有效期 365 天

---

## 🧪 测试场景

### 场景1: 测试免费版功能限制

1. 使用 `test@example.com` 登录
2. 点击"优化标题" - ✅ 可用
3. 点击"调整价格库存" - ❌ 提示需要升级
4. 验证权限控制正常

### 场景2: 测试设备数量限制

1. 使用 `test@example.com` 登录 (设备1)
2. 在另一台电脑/浏览器登录 (设备2)
3. 再登录第三台 (设备3)
4. 尝试登录第四台 - ❌ 提示设备超限
5. 在设备1上打开"设备管理"
6. 移除设备2或设备3
7. 第四台可以成功登录

### 场景3: 测试订阅升级

1. 使用 `test@example.com` 登录 (免费版)
2. 注销登录
3. 使用 `premium@example.com` 登录 (高级版)
4. 验证所有功能都可用

### 场景4: 测试完整流程

1. 使用 `premium@example.com` 登录
2. 打开速卖通商品页面
3. 点击"一键全流程"
4. 验证所有步骤正常执行

---

## 🔧 使用 cURL 直接测试 API

### 登录获取 Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "premium@example.com",
    "password": "password123"
  }'
```

### 验证设备

```bash
# 替换 YOUR_TOKEN 为上面获取的 token
curl -X POST http://localhost:3000/api/device/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "deviceId": "test-device-123"
  }'
```

### 获取订阅状态

```bash
curl -X GET http://localhost:3000/api/subscription/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🗑️ 重置测试数据

如果需要重置所有测试账号:

```bash
# 重新运行创建脚本即可
node scripts/create-test-user.js
```

脚本会先删除现有测试账号,然后重新创建。

---

## 📊 账号对比表

| 功能 | FREE | BASIC | PREMIUM | ENTERPRISE |
|------|------|-------|---------|------------|
| 优化标题 | ✅ | ✅ | ✅ | ✅ |
| 应用模板 | ✅ | ✅ | ✅ | ✅ |
| 添加水印 | ✅ | ✅ | ✅ | ✅ |
| 生成营销图 | ❌ | ✅ | ✅ | ✅ |
| 重新对应变体 | ❌ | ✅ | ✅ | ✅ |
| 处理SKU | ❌ | ✅ | ✅ | ✅ |
| 调整价格库存 | ❌ | ❌ | ✅ | ✅ |
| 翻译内容 | ❌ | ❌ | ✅ | ✅ |
| 一键全流程 | ❌ | ❌ | ✅ | ✅ |
| 最大设备数 | 3 | 5 | 10 | 50 |
| 有效期 | 30天 | 30天 | 365天 | 365天 |

---

## ⚠️ 注意事项

1. **测试账号仅供开发测试使用**
2. **不要在生产环境使用这些账号**
3. **定期重置测试数据以保持数据库整洁**
4. **测试完成后建议清空设备列表**

---

## 🐛 故障排查

### 问题: 脚本运行失败

**错误:** "MongoServerError: connect ECONNREFUSED"

**解决:**
```bash
# 确保 MongoDB 正在运行
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 问题: 登录失败

**错误:** "邮箱或密码错误"

**检查:**
1. 确认脚本已成功创建账号
2. 确认密码输入正确(区分大小写)
3. 查看服务器日志

### 问题: 权限验证失败

**检查:**
1. Token 是否有效
2. 订阅是否过期
3. 浏览器控制台是否有错误

---

## 💡 开发提示

### 在浏览器控制台查看 Token

```javascript
chrome.storage.local.get('token', (data) => {
  console.log('Token:', data.token);
});
```

### 查看用户信息

```javascript
chrome.storage.local.get(['user', 'subscription'], (data) => {
  console.log('用户:', data.user);
  console.log('订阅:', data.subscription);
});
```

### 清除登录状态

```javascript
chrome.storage.local.clear(() => {
  console.log('已清除所有数据');
  location.reload();
});
```

---

**祝测试顺利!** 🎉
