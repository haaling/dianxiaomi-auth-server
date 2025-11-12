# 项目文件结构

```
dianxiaomi-auth-server/
│
├── 📄 配置文件
│   ├── package.json              # 项目依赖和脚本配置
│   ├── package-lock.json         # 依赖锁定文件
│   ├── .env                      # 环境变量（实际配置）
│   ├── .env.example              # 环境变量示例
│   └── .gitignore                # Git 忽略文件
│
├── 📚 文档文件
│   ├── README.md                 # 完整使用文档
│   ├── QUICK_START.md            # 快速启动指南
│   ├── PROJECT_SUMMARY.md        # 项目总结
│   ├── DEVELOPMENT.md            # 开发说明
│   └── FILE_STRUCTURE.md         # 本文件
│
├── 🧪 测试文件
│   ├── test-api.sh               # API 测试脚本
│   └── api-examples.http         # HTTP 请求示例
│
├── 📁 src/ (源代码目录)
│   │
│   ├── index.js                  # 主服务器入口文件
│   │
│   ├── 📁 config/                # 配置文件夹
│   │   └── database.js           # MongoDB 连接配置
│   │
│   ├── 📁 models/                # 数据库模型
│   │   ├── User.js               # 用户模型
│   │   ├── Subscription.js       # 订阅模型
│   │   └── Device.js             # 设备模型
│   │
│   ├── 📁 middleware/            # 中间件
│   │   ├── auth.js               # JWT 认证中间件
│   │   ├── subscription.js       # 订阅检查中间件
│   │   └── deviceLimit.js        # 设备限制中间件
│   │
│   └── 📁 routes/                # 路由处理
│       ├── auth.js               # 认证路由（注册/登录）
│       ├── subscription.js       # 订阅路由
│       └── device.js             # 设备路由
│
└── 📁 examples/ (Chrome插件示例)
    ├── chrome-extension-client.js  # 客户端 SDK
    ├── manifest.json                # Chrome 插件配置
    ├── popup.html                   # 弹窗界面
    └── popup.js                     # 弹窗逻辑
```

## 文件说明

### 核心文件

#### `src/index.js`
- 主服务器入口
- Express 应用配置
- 中间件注册
- 路由挂载
- 错误处理

#### `src/config/database.js`
- MongoDB 连接配置
- 连接错误处理

### 数据模型

#### `src/models/User.js`
- 用户数据结构
- 密码加密逻辑
- 密码验证方法
- JSON 序列化（移除敏感信息）

#### `src/models/Subscription.js`
- 订阅数据结构
- 订阅验证方法
- 时间戳自动更新

#### `src/models/Device.js`
- 设备数据结构
- 活跃时间更新
- 设备索引配置

### 中间件

#### `src/middleware/auth.js`
- JWT Token 验证
- 用户身份认证
- Token 过期处理

#### `src/middleware/subscription.js`
- 订阅状态检查
- 订阅过期处理
- 自动更新订阅状态

#### `src/middleware/deviceLimit.js`
- 设备数量检查
- 设备重复注册处理
- 设备限制验证

### 路由处理

#### `src/routes/auth.js`
- POST /api/auth/register - 用户注册
- POST /api/auth/login - 用户登录
- JWT Token 生成

#### `src/routes/subscription.js`
- GET /api/subscription/current - 获取当前订阅
- POST /api/subscription/subscribe - 创建/升级订阅
- GET /api/subscription/status - 检查订阅状态

#### `src/routes/device.js`
- POST /api/device/register - 注册设备
- GET /api/device/list - 获取设备列表
- POST /api/device/verify - 验证设备
- DELETE /api/device/:deviceId - 移除设备

### Chrome 插件示例

#### `examples/chrome-extension-client.js`
- AuthClient 类
- API 请求封装
- Token 管理
- 设备 ID 生成
- 完整的集成示例

#### `examples/manifest.json`
- Chrome 插件配置
- 权限声明
- 主机权限

#### `examples/popup.html`
- 插件弹窗界面
- 登录/注册表单
- 设备管理界面
- 订阅状态显示

#### `examples/popup.js`
- 界面逻辑处理
- 事件绑定
- 状态管理
- UI 更新

### 文档文件

#### `README.md`
- 完整的项目文档
- API 使用说明
- Chrome 插件集成示例
- 安全建议

#### `QUICK_START.md`
- 3步快速启动
- 快速测试方法
- 常见问题排查
- 验证清单

#### `PROJECT_SUMMARY.md`
- 功能特性列表
- 项目结构说明
- 技术栈介绍
- 下一步建议

#### `DEVELOPMENT.md`
- 架构设计
- 数据库设计
- 安全机制
- 部署指南
- 优化建议

### 测试文件

#### `test-api.sh`
- 自动化 API 测试脚本
- 完整的测试流程
- 使用 curl 和 jq

#### `api-examples.http`
- HTTP 请求示例集合
- 可用于 REST Client 扩展
- 或 Postman 导入

## 代码行数统计

```
文件类型          文件数    代码行数
------------------------------------
JavaScript         17       ~2000
JSON               2        ~50
Markdown           5        ~1500
HTML               1        ~200
Shell              1        ~100
------------------------------------
总计               26       ~3850
```

## 依赖包

### 生产依赖
- express - Web 框架
- mongoose - MongoDB ORM
- jsonwebtoken - JWT 认证
- bcryptjs - 密码加密
- dotenv - 环境变量
- cors - 跨域支持
- uuid - UUID 生成
- express-rate-limit - 速率限制

### 开发依赖
- nodemon - 自动重启

## 数据流向

```
Chrome 插件
    ↓ HTTP Request (JSON)
Express 路由
    ↓ 中间件处理
    ├─ authenticateToken (验证 JWT)
    ├─ checkSubscription (检查订阅)
    └─ checkDeviceLimit (检查设备)
    ↓
业务逻辑处理
    ↓ Mongoose
MongoDB 数据库
    ↓ 返回数据
业务逻辑处理
    ↓ JSON Response
Chrome 插件
```

## 扩展建议

可以添加的目录：
```
├── tests/                  # 单元测试
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   └── fixtures/          # 测试数据
│
├── utils/                 # 工具函数
│   ├── email.js          # 邮件发送
│   ├── validation.js     # 输入验证
│   └── logger.js         # 日志工具
│
├── scripts/              # 脚本工具
│   ├── seed.js          # 数据填充
│   └── migrate.js       # 数据迁移
│
└── public/               # 静态文件
    └── admin/           # 管理后台
```

## 更新日志

- 2025-11-12: 初始项目结构创建
