# 点小蜜 Chrome 插件认证服务器

一个完整的认证服务器，支持用户认证、订阅管理和设备数量限制，专为 Chrome 插件设计。

## 功能特性

### ✅ 用户认证系统
- 用户注册/登录
- JWT Token 认证
- 密码加密存储

### ✅ 订阅管理
- 月度订阅计划
- 订阅状态检查
- 订阅到期自动处理

### ✅ 设备限制
- 每个账号最多 X 台设备同时登录
- 设备指纹识别
- 设备管理（添加/删除）

### ✅ API接口
- 用户注册/登录
- 验证Token和订阅状态
- 设备绑定/解绑
- 订阅状态查询

## 技术栈

- **后端框架**: Node.js + Express
- **数据库**: MongoDB (Mongoose)
- **认证**: JWT
- **加密**: bcrypt
- **环境变量**: dotenv

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/dianxiaomi_auth
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
MAX_DEVICES_PER_USER=3
ALLOWED_ORIGINS=chrome-extension://your-extension-id
```

### 3. 启动 MongoDB

确保 MongoDB 已安装并运行：

```bash
# macOS (使用 Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 4. 运行服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动。

## API 文档

### 基础URL
```
http://localhost:3000/api
```

### 认证相关

#### 1. 用户注册
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "_id": "...",
      "username": "testuser",
      "email": "test@example.com"
    },
    "subscription": {
      "plan": "free",
      "maxDevices": 3,
      "endDate": "2025-12-12T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 2. 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": { ... },
    "subscription": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 订阅管理

#### 3. 获取当前订阅
```http
GET /api/subscription/current
Authorization: Bearer <token>
```

#### 4. 创建订阅
```http
POST /api/subscription/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan": "premium",
  "duration": 1
}
```

订阅计划：
- `free`: 免费版（3台设备）
- `basic`: 基础版（5台设备，$9.99/月）
- `premium`: 高级版（10台设备，$19.99/月）
- `enterprise`: 企业版（50台设备，$99.99/月）

#### 5. 检查订阅状态
```http
GET /api/subscription/status
Authorization: Bearer <token>
```

### 设备管理

#### 6. 注册设备
```http
POST /api/device/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceId": "unique-device-id-from-browser",
  "deviceName": "Chrome on MacBook Pro",
  "deviceInfo": {
    "browser": "Chrome",
    "os": "macOS",
    "userAgent": "Mozilla/5.0..."
  }
}
```

#### 7. 获取设备列表
```http
GET /api/device/list
Authorization: Bearer <token>
```

#### 8. 验证设备和Token
```http
POST /api/device/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceId": "unique-device-id-from-browser"
}
```

#### 9. 移除设备
```http
DELETE /api/device/:deviceId
Authorization: Bearer <token>
```

## Chrome 插件集成示例

### 获取设备ID
```javascript
// 在Chrome插件中生成唯一设备ID
async function getDeviceId() {
  let deviceId = await chrome.storage.local.get('deviceId');
  
  if (!deviceId.deviceId) {
    // 生成新的设备ID
    deviceId = crypto.randomUUID();
    await chrome.storage.local.set({ deviceId });
  }
  
  return deviceId.deviceId || deviceId;
}
```

### 用户登录
```javascript
async function login(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // 保存Token
    await chrome.storage.local.set({ 
      token: data.data.token,
      user: data.data.user 
    });
    return true;
  }
  
  return false;
}
```

### 注册设备
```javascript
async function registerDevice() {
  const { token } = await chrome.storage.local.get('token');
  const deviceId = await getDeviceId();
  
  const response = await fetch('http://localhost:3000/api/device/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      deviceId,
      deviceName: navigator.userAgent,
      deviceInfo: {
        browser: 'Chrome',
        os: navigator.platform,
        userAgent: navigator.userAgent
      }
    })
  });
  
  return await response.json();
}
```

### 验证权限
```javascript
async function verifyPermission() {
  const { token } = await chrome.storage.local.get('token');
  const deviceId = await getDeviceId();
  
  const response = await fetch('http://localhost:3000/api/device/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ deviceId })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('权限验证成功', data.data);
    return true;
  } else {
    console.log('权限验证失败', data.message);
    // 需要重新登录或注册设备
    return false;
  }
}
```

## 数据库模型

### User（用户）
- `username`: 用户名
- `email`: 邮箱
- `password`: 加密后的密码
- `createdAt`: 创建时间
- `lastLoginAt`: 最后登录时间
- `isActive`: 是否激活

### Subscription（订阅）
- `userId`: 用户ID
- `plan`: 订阅计划（free/basic/premium/enterprise）
- `maxDevices`: 最大设备数
- `startDate`: 开始日期
- `endDate`: 结束日期
- `isActive`: 是否激活
- `autoRenew`: 是否自动续费

### Device（设备）
- `userId`: 用户ID
- `deviceId`: 设备唯一ID
- `deviceName`: 设备名称
- `deviceInfo`: 设备信息
- `lastActiveAt`: 最后活跃时间
- `registeredAt`: 注册时间
- `isActive`: 是否激活

## 错误处理

所有API响应都遵循统一格式：

成功响应：
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

错误响应：
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息（仅开发环境）"
}
```

常见HTTP状态码：
- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未认证
- `403`: 无权限（订阅过期或设备超限）
- `404`: 资源不存在
- `500`: 服务器错误

## 安全建议

1. **生产环境必须修改**：
   - `JWT_SECRET`: 使用强随机字符串
   - `MONGODB_URI`: 使用有认证的MongoDB连接
   - `ALLOWED_ORIGINS`: 设置正确的Chrome插件ID

2. **HTTPS**：生产环境必须使用HTTPS

3. **速率限制**：已配置基础速率限制，可根据需求调整

4. **密码策略**：当前最小6位，可增强复杂度要求

5. **设备管理**：定期清理不活跃设备

## 开发调试

### 使用Postman测试

1. 导入环境变量
2. 先调用登录接口获取token
3. 在后续请求的Header中添加：
   ```
   Authorization: Bearer <your-token>
   ```

### 查看数据库

```bash
# 连接MongoDB
mongosh

# 切换到数据库
use dianxiaomi_auth

# 查看用户
db.users.find()

# 查看订阅
db.subscriptions.find()

# 查看设备
db.devices.find()
```

## 许可证

ISC

## 支持

如有问题，请提交 Issue。
