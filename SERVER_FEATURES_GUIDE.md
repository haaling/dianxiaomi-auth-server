# 服务器端功能验证实施指南

## 概述

本指南展示如何将核心功能从客户端迁移到服务器端执行，从根本上防止绕过鉴权。

## 已实现的功能

### 1. 服务器端路由 (`src/routes/features.js`)

✅ **功能权限验证**
- 自动检查用户订阅等级
- 拒绝未授权的功能调用

✅ **请求签名验证**
- 时间戳检查（60秒内有效）
- 防重放攻击
- 可扩展 HMAC 签名

✅ **异常行为检测**
- 频率限制（每分钟20次）
- 调用记录追踪
- 自动拦截异常请求

✅ **核心功能示例**
- `adjustPrice` - 价格计算算法在服务器
- 防止客户端篡改定价逻辑

### 2. 客户端调用示例 (`utils/server-features.js`)

✅ **安全请求封装**
```javascript
// 自动添加签名和设备ID
await secureRequest('/adjust-price', {
  cost: 100,
  formula: 'standard',
  discount: 10
});
```

✅ **改造对比示例**
- 改造前：本地计算（可被绕过）
- 改造后：服务器计算（无法绕过）

## 快速开始

### 步骤 1: 启动服务器

```bash
cd /Users/bilibili/dxm/dianxiaomi-auth-server

# 确保 MongoDB 运行中
brew services start mongodb-community@8.0

# 创建测试账号（如果还没创建）
npm run create-test-users

# 启动服务器
npm start
```

### 步骤 2: 测试功能验证 API

```bash
# 先登录获取 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "premium@example.com",
    "password": "password123"
  }'

# 记下返回的 token，替换下面的 YOUR_TOKEN

# 验证功能权限
curl -X POST http://localhost:3000/api/features/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "feature": "adjustPriceAndStock"
  }'
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "feature": "adjustPriceAndStock",
    "hasPermission": true,
    "currentPlan": "premium",
    "requiredPlan": "premium",
    "reason": null
  }
}
```

### 步骤 3: 测试价格调整 API

```bash
# 生成签名信息
TIMESTAMP=$(date +%s000)
DEVICE_ID="test-device-123"
SIGNATURE="test-signature"  # 生产环境需要真实签名

# 调用价格调整
curl -X POST http://localhost:3000/api/features/adjust-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Signature: $SIGNATURE" \
  -H "X-Device-Id: $DEVICE_ID" \
  -d '{
    "cost": 100,
    "formula": "standard",
    "discount": 10
  }'
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "originalCost": 100,
    "calculatedPrice": 130,
    "discount": 10,
    "finalPrice": 117
  }
}
```

### 步骤 4: 在扩展中使用

1. **在 popup.js 或 content.js 中导入：**

```javascript
// 如果使用 ES6 模块
import { adjustPrice, checkPermission } from './utils/server-features.js';

// 如果使用 script 标签引入
// <script src="utils/server-features.js"></script>
```

2. **调用核心功能：**

```javascript
// 点击按钮时
document.getElementById('adjustPriceBtn').addEventListener('click', async () => {
  try {
    // 服务器端执行价格计算
    const newPrice = await adjustPrice(100, 'standard', 10);
    
    console.log('计算后的价格:', newPrice);
    alert(`新价格: $${newPrice}`);
    
  } catch (error) {
    alert(error.message);
  }
});
```

3. **检查权限：**

```javascript
async function showFeatureButton(featureName) {
  const hasPermission = await checkPermission(featureName);
  
  const btn = document.getElementById(`${featureName}Btn`);
  if (btn) {
    btn.disabled = !hasPermission;
    if (!hasPermission) {
      btn.title = '需要升级订阅';
    }
  }
}

// 页面加载时检查
showFeatureButton('adjustPriceAndStock');
showFeatureButton('translateContent');
```

## 安全机制说明

### 1️⃣ 多层验证

```
客户端请求
    ↓
JWT Token 验证 (authenticateToken)
    ↓
订阅状态验证 (checkSubscription)
    ↓
功能权限验证 (checkFeaturePermission)
    ↓
请求签名验证 (verifySignature)
    ↓
异常行为检测 (detectAbnormalBehavior)
    ↓
执行核心逻辑
```

### 2️⃣ 防篡改机制

- ✅ **时间戳检查**：请求必须在60秒内
- ✅ **设备绑定**：每个请求携带设备ID
- ✅ **签名验证**：防止参数被篡改
- ✅ **频率限制**：每分钟最多20次调用

### 3️⃣ 核心算法保护

```javascript
// ❌ 客户端可见 = 可被破解
function calculatePrice(cost) {
  return cost * 1.5;  // 算法暴露
}

// ✅ 服务器执行 = 无法破解
router.post('/adjust-price', async (req, res) => {
  // 算法在服务器，客户端看不到
  const price = serverSideCalculation(cost);
  res.json({ price });
});
```

## 迁移计划

### 阶段 1：高价值功能迁移（推荐立即实施）

需要迁移到服务器的功能：

- ✅ `adjustPriceAndStock` - 价格计算
- ⏳ `translateContent` - 内容翻译（调用AI API）
- ⏳ `runAllSteps` - 批量处理逻辑
- ⏳ `generateMarketingImage` - 图像处理

### 阶段 2：添加更多防护

1. **实现真实签名算法**

```javascript
// 使用 HMAC-SHA256
const crypto = require('crypto');

function generateSignature(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
}
```

2. **设备指纹增强**

```javascript
// 收集更多设备信息
const fingerprint = {
  deviceId: chrome.runtime.id,
  userAgent: navigator.userAgent,
  screen: `${screen.width}x${screen.height}`,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
};
```

3. **添加使用量统计**

```bash
# 查看使用统计
curl http://localhost:3000/api/features/usage-stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 阶段 3：监控和告警

```javascript
// 在服务器端添加日志
if (callsPerMinute > 20) {
  console.warn(`[ALERT] 用户 ${userId} 疑似异常调用`);
  // 发送邮件/短信告警
  sendAlert(`用户 ${userId} 功能调用异常`);
}
```

## 测试检查清单

- [ ] MongoDB 已启动
- [ ] 测试账号已创建
- [ ] 服务器运行无错误
- [ ] Premium 账号可以调用 `/adjust-price`
- [ ] Free 账号调用 `/adjust-price` 被拒绝
- [ ] 过期 token 被拒绝
- [ ] 时间戳过期被拒绝（60秒后）
- [ ] 频繁调用被限流（1分钟>20次）
- [ ] 扩展中可以正常调用 `adjustPrice()`

## 常见问题

### Q: 如何测试不同订阅等级？

```bash
# 使用不同账号登录
Free:      test@example.com / password123
Basic:     basic@example.com / password123
Premium:   premium@example.com / password123
Enterprise: admin@example.com / admin123456
```

### Q: 如何查看是否被限流？

检查服务器日志，会显示：
```
[Security] 用户 507f1f77bcf86cd799439011 调用 adjustPriceAndStock 过于频繁
```

### Q: 客户端报错 "请求已过期"？

检查客户端和服务器时间是否同步：
```javascript
console.log('本地时间:', new Date().toISOString());
```

### Q: 如何添加新的服务器端功能？

1. 在 `src/routes/features.js` 添加路由
2. 设置权限级别和中间件
3. 在客户端 `utils/server-features.js` 添加调用方法
4. 更新 `FEATURE_PERMISSIONS` 映射

## 效果对比

| 方案 | 客户端验证 | 服务器验证 |
|------|-----------|-----------|
| 安全级别 | ⭐ | ⭐⭐⭐⭐⭐ |
| 破解难度 | 简单（修改源码） | 几乎不可能 |
| 算法保护 | ❌ 完全暴露 | ✅ 完全隐藏 |
| 实时控制 | ❌ 需重新发布 | ✅ 即时生效 |
| 用量监控 | ❌ 无法统计 | ✅ 完整记录 |
| 异常检测 | ❌ 无法检测 | ✅ 实时检测 |

## 下一步

1. 重启服务器加载新路由
2. 测试 API 功能
3. 在扩展中集成 `utils/server-features.js`
4. 逐步迁移核心功能到服务器端
5. 监控使用情况和异常行为

---

**记住：客户端永远不可信，关键逻辑必须在服务器端执行！**
