# 点小蜜认证服务器 - 项目总结

## ✅ 已完成的功能

### 1. 用户认证系统
- ✅ 用户注册 (POST /api/auth/register)
- ✅ 用户登录 (POST /api/auth/login)
- ✅ JWT Token 认证
- ✅ 密码加密存储 (bcrypt)
- ✅ 密码强度验证

### 2. 订阅管理
- ✅ 创建订阅 (POST /api/subscription/subscribe)
- ✅ 获取当前订阅 (GET /api/subscription/current)
- ✅ 检查订阅状态 (GET /api/subscription/status)
- ✅ 订阅过期自动处理
- ✅ 四种订阅计划（free, basic, premium, enterprise）
- ✅ 自动创建30天免费试用

### 3. 设备管理
- ✅ 设备注册 (POST /api/device/register)
- ✅ 设备列表查询 (GET /api/device/list)
- ✅ 设备验证 (POST /api/device/verify)
- ✅ 设备移除 (DELETE /api/device/:deviceId)
- ✅ 设备数量限制检查
- ✅ 设备活跃时间更新

### 4. 中间件
- ✅ JWT Token 验证中间件
- ✅ 订阅状态检查中间件
- ✅ 设备限制检查中间件
- ✅ 速率限制（防止滥用）
- ✅ CORS 支持（Chrome 插件兼容）

### 5. 数据库模型
- ✅ User 模型（用户）
- ✅ Subscription 模型（订阅）
- ✅ Device 模型（设备）
- ✅ 密码自动加密
- ✅ 数据验证

### 6. Chrome 插件集成
- ✅ 完整的客户端SDK (chrome-extension-client.js)
- ✅ 设备ID生成和存储
- ✅ Token 自动管理
- ✅ 示例 Popup 界面
- ✅ 用户登录/注册界面
- ✅ 设备管理界面
- ✅ 订阅状态显示

## 📁 项目结构

```
dianxiaomi-auth-server/
├── package.json                 # 项目配置和依赖
├── .env.example                 # 环境变量示例
├── .env                         # 环境变量配置
├── .gitignore                   # Git 忽略文件
├── README.md                    # 完整文档
│
├── src/                         # 源代码目录
│   ├── index.js                 # 主服务器文件
│   │
│   ├── config/                  # 配置文件
│   │   └── database.js          # 数据库连接配置
│   │
│   ├── models/                  # 数据库模型
│   │   ├── User.js              # 用户模型
│   │   ├── Subscription.js      # 订阅模型
│   │   └── Device.js            # 设备模型
│   │
│   ├── middleware/              # 中间件
│   │   ├── auth.js              # JWT认证中间件
│   │   ├── subscription.js      # 订阅检查中间件
│   │   └── deviceLimit.js       # 设备限制中间件
│   │
│   └── routes/                  # 路由处理
│       ├── auth.js              # 认证路由
│       ├── subscription.js      # 订阅路由
│       └── device.js            # 设备路由
│
└── examples/                    # Chrome插件示例
    ├── chrome-extension-client.js   # 客户端SDK
    ├── manifest.json                # 插件配置
    ├── popup.html                   # 弹窗界面
    └── popup.js                     # 弹窗逻辑
```

## 🚀 快速启动指南

### 步骤 1: 启动 MongoDB

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 步骤 2: 配置环境变量

编辑 `.env` 文件，修改以下配置：

```env
JWT_SECRET=你的超级安全密钥
MONGODB_URI=mongodb://localhost:27017/dianxiaomi_auth
MAX_DEVICES_PER_USER=3
```

### 步骤 3: 启动服务器

```bash
# 开发模式（推荐）
npm run dev

# 生产模式
npm start
```

服务器将在 http://localhost:3000 启动。

### 步骤 4: 测试 API

访问 http://localhost:3000/health 检查服务器状态。

## 📋 API 端点总览

### 认证 API
- POST /api/auth/register - 用户注册
- POST /api/auth/login - 用户登录

### 订阅 API
- GET /api/subscription/current - 获取当前订阅
- POST /api/subscription/subscribe - 创建/升级订阅
- GET /api/subscription/status - 检查订阅状态

### 设备 API
- POST /api/device/register - 注册设备
- GET /api/device/list - 获取设备列表
- POST /api/device/verify - 验证设备和Token
- DELETE /api/device/:deviceId - 移除设备

## 🔒 安全特性

1. **密码安全**
   - bcrypt 加密存储
   - 最小长度验证
   - 从不在响应中返回密码

2. **Token 安全**
   - JWT Token 有效期：7天（可配置）
   - Token 验证中间件
   - 自动过期处理

3. **设备安全**
   - 设备数量限制
   - 设备指纹识别
   - 设备活跃状态跟踪

4. **速率限制**
   - 15分钟内最多100个请求
   - 防止暴力破解和滥用

5. **CORS 配置**
   - 支持 Chrome 插件跨域
   - 可配置允许的来源

## 🎯 Chrome 插件集成步骤

### 1. 复制示例文件

将 `examples/` 目录下的文件复制到你的 Chrome 插件项目中。

### 2. 修改配置

在 `chrome-extension-client.js` 中修改 API 地址：

```javascript
const authClient = new AuthClient('https://your-api-server.com/api');
```

### 3. 更新 manifest.json

添加服务器地址到 host_permissions：

```json
{
  "host_permissions": [
    "https://your-api-server.com/*"
  ]
}
```

### 4. 实现功能

参考 `popup.js` 实现登录、设备注册和权限验证。

## 📊 订阅计划说明

| 计划 | 设备数量 | 价格 |
|------|---------|------|
| Free | 3台 | 免费 |
| Basic | 5台 | $9.99/月 |
| Premium | 10台 | $19.99/月 |
| Enterprise | 50台 | $99.99/月 |

## 🔧 常见问题

### Q: 如何修改设备数量限制？

A: 修改 `.env` 文件中的 `MAX_DEVICES_PER_USER` 值。

### Q: Token 过期后怎么办？

A: 用户需要重新登录获取新的 Token。

### Q: 如何添加更多订阅计划？

A: 编辑 `src/routes/subscription.js` 中的 `validPlans` 对象。

### Q: MongoDB 连接失败？

A: 确保 MongoDB 正在运行，检查 `.env` 中的连接字符串是否正确。

### Q: 如何部署到生产环境？

A: 
1. 使用 HTTPS
2. 修改 JWT_SECRET 为强随机字符串
3. 配置生产环境的 MongoDB
4. 设置正确的 ALLOWED_ORIGINS
5. 使用 PM2 或类似工具运行服务器

## 📝 下一步建议

### 功能增强
- [ ] 邮箱验证功能
- [ ] 忘记密码/重置密码
- [ ] 用户资料管理
- [ ] 管理员后台
- [ ] 支付集成（Stripe/PayPal）
- [ ] 设备活跃度监控
- [ ] 日志记录和审计
- [ ] 双因素认证（2FA）

### 性能优化
- [ ] Redis 缓存 Token
- [ ] 数据库索引优化
- [ ] API 响应缓存
- [ ] 负载均衡

### 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] API 测试
- [ ] 性能测试

## 🤝 技术支持

如有问题，请：
1. 查阅 README.md 文档
2. 检查服务器日志
3. 验证环境配置
4. 提交 Issue

## 📄 许可证

ISC License

---

**项目创建时间**: 2025年11月12日  
**技术栈**: Node.js + Express + MongoDB + JWT  
**用途**: Chrome 插件认证服务器
