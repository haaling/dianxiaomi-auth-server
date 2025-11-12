# 开发说明

本文档为开发者提供详细的技术说明和最佳实践。

## 🏗️ 架构设计

### 系统架构图

```
┌─────────────────┐
│  Chrome 插件     │
│  (Frontend)     │
└────────┬────────┘
         │ HTTPS/HTTP
         ↓
┌─────────────────┐
│  Express API    │
│  (Backend)      │
├─────────────────┤
│  • 认证路由      │
│  • 订阅路由      │
│  • 设备路由      │
└────────┬────────┘
         │ Mongoose
         ↓
┌─────────────────┐
│   MongoDB       │
│  (Database)     │
├─────────────────┤
│  • users        │
│  • subscriptions│
│  • devices      │
└─────────────────┘
```

### 数据流程

1. **用户注册/登录**
   ```
   用户 → API → 验证 → 数据库 → 生成JWT → 返回Token
   ```

2. **设备注册**
   ```
   插件 → API (带Token) → 验证Token → 检查设备限制 → 注册设备
   ```

3. **权限验证**
   ```
   插件 → API (带Token) → 验证Token → 检查订阅 → 检查设备 → 返回状态
   ```

## 🗄️ 数据库设计

### User Collection

```javascript
{
  _id: ObjectId,
  username: String,      // 用户名（唯一）
  email: String,         // 邮箱（唯一）
  password: String,      // 加密密码
  createdAt: Date,       // 创建时间
  lastLoginAt: Date,     // 最后登录
  isActive: Boolean      // 是否激活
}
```

### Subscription Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,      // 关联用户
  plan: String,          // 订阅计划
  maxDevices: Number,    // 最大设备数
  startDate: Date,       // 开始日期
  endDate: Date,         // 结束日期
  isActive: Boolean,     // 是否激活
  autoRenew: Boolean,    // 自动续费
  createdAt: Date,       // 创建时间
  updatedAt: Date        // 更新时间
}
```

### Device Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId,      // 关联用户
  deviceId: String,      // 设备唯一ID
  deviceName: String,    // 设备名称
  deviceInfo: {          // 设备信息
    browser: String,
    os: String,
    userAgent: String
  },
  lastActiveAt: Date,    // 最后活跃
  registeredAt: Date,    // 注册时间
  isActive: Boolean      // 是否激活
}
```

## 🔐 安全机制

### 1. 密码加密

使用 bcrypt 进行密码哈希：

```javascript
// 加密
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

// 验证
const isValid = await bcrypt.compare(password, hashedPassword);
```

### 2. JWT Token

Token 结构：

```javascript
{
  userId: "user_id_here",
  iat: 1699999999,  // 签发时间
  exp: 1700604799   // 过期时间（7天后）
}
```

### 3. 中间件流程

```
请求 → authenticateToken → checkSubscription → checkDeviceLimit → 处理器
```

## 📝 API 设计规范

### 统一响应格式

**成功响应**：
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**错误响应**：
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误（仅开发环境）"
}
```

### HTTP 状态码使用

- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未认证（缺少或无效Token）
- `403` - 无权限（订阅过期、设备超限等）
- `404` - 资源不存在
- `500` - 服务器错误

## 🔄 业务逻辑

### 用户注册流程

```javascript
1. 验证输入（用户名、邮箱、密码）
2. 检查用户是否已存在
3. 加密密码
4. 创建用户记录
5. 创建默认免费订阅（30天）
6. 生成JWT Token
7. 返回用户信息和Token
```

### 设备注册流程

```javascript
1. 验证Token（authenticateToken）
2. 检查订阅状态（checkSubscription）
3. 检查设备是否已注册
   - 已注册：更新活跃时间
   - 未注册：检查设备数量限制
4. 创建设备记录
5. 返回设备信息
```

### 权限验证流程

```javascript
1. 验证Token（authenticateToken）
2. 检查订阅状态（checkSubscription）
3. 检查设备是否存在且激活
4. 更新设备活跃时间
5. 返回验证结果和订阅信息
```

## 🧪 测试指南

### 单元测试建议

```javascript
// 测试用户注册
describe('User Registration', () => {
  test('应该成功注册新用户', async () => {
    // 测试代码
  });
  
  test('应该拒绝已存在的邮箱', async () => {
    // 测试代码
  });
});
```

### 集成测试流程

1. 注册用户
2. 登录获取Token
3. 注册设备
4. 验证设备
5. 测试设备限制
6. 测试订阅过期

### 性能测试

- 并发用户测试
- API 响应时间测试
- 数据库查询优化测试

## 🚀 部署指南

### 开发环境

```bash
# 启动 MongoDB
brew services start mongodb-community

# 运行开发服务器
npm run dev
```

### 生产环境

#### 1. 环境准备

```bash
# 安装生产依赖
npm ci --production

# 配置环境变量
export NODE_ENV=production
export JWT_SECRET=your-production-secret
export MONGODB_URI=mongodb://user:pass@host:27017/dbname
```

#### 2. 使用 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start src/index.js --name "dianxiaomi-auth"

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs dianxiaomi-auth
```

#### 3. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. HTTPS 配置（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

## 🔧 优化建议

### 性能优化

1. **数据库索引**
```javascript
// User model
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Device model
deviceSchema.index({ userId: 1, deviceId: 1 });
deviceSchema.index({ userId: 1, isActive: 1 });
```

2. **缓存策略**
```javascript
// 使用 Redis 缓存 Token 验证结果
const redis = require('redis');
const client = redis.createClient();

// 缓存订阅状态（5分钟）
await client.setex(`subscription:${userId}`, 300, JSON.stringify(subscription));
```

3. **连接池优化**
```javascript
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000
});
```

### 安全加固

1. **速率限制增强**
```javascript
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: '请求过于频繁'
});

app.use('/api/auth/login', strictLimiter);
```

2. **输入验证**
```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/auth/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ...
  }
);
```

3. **安全头部**
```javascript
const helmet = require('helmet');
app.use(helmet());
```

## 📊 监控和日志

### 日志记录

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 使用
logger.info('用户登录', { userId, email });
logger.error('数据库错误', { error: error.message });
```

### 性能监控

```javascript
const responseTime = require('response-time');

app.use(responseTime((req, res, time) => {
  console.log(`${req.method} ${req.url} - ${time}ms`);
}));
```

## 🐛 调试技巧

### 1. 使用 VS Code 调试

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.js",
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

### 2. MongoDB 查询调试

```javascript
mongoose.set('debug', true);
```

### 3. API 请求日志

```javascript
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
```

## 📚 扩展功能建议

### 1. 邮箱验证

```javascript
const nodemailer = require('nodemailer');

async function sendVerificationEmail(email, token) {
  const transporter = nodemailer.createTransport({...});
  await transporter.sendMail({
    to: email,
    subject: '验证您的邮箱',
    html: `点击链接验证: <a href="...">验证</a>`
  });
}
```

### 2. 忘记密码

```javascript
// 生成重置Token
const resetToken = crypto.randomBytes(32).toString('hex');
const resetTokenHash = crypto
  .createHash('sha256')
  .update(resetToken)
  .digest('hex');
```

### 3. 双因素认证

```javascript
const speakeasy = require('speakeasy');

// 生成密钥
const secret = speakeasy.generateSecret({ length: 20 });

// 验证
const verified = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userToken
});
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 版本历史

- **v1.0.0** (2025-11-12)
  - 初始版本
  - 用户认证系统
  - 订阅管理
  - 设备限制功能

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 查看文档

---

**最后更新**: 2025年11月12日
