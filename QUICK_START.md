# 🚀 快速启动指南

## 前置要求

确保已安装：
- ✅ Node.js (v14 或更高版本)
- ✅ MongoDB (v4.0 或更高版本)
- ✅ npm 或 yarn

## 快速启动（3步）

### 步骤 1: 启动 MongoDB

```bash
# macOS (使用 Homebrew)
brew services start mongodb-community

# 或者手动启动
mongod --config /opt/homebrew/etc/mongod.conf
```

### 步骤 2: 安装依赖并启动服务器

```bash
# 已经安装完成！直接启动
npm run dev
```

### 步骤 3: 验证服务器

打开浏览器访问：http://localhost:3000/health

应该看到：
```json
{
  "success": true,
  "message": "服务器运行正常",
  "timestamp": "2025-11-12T..."
}
```

## 🎯 快速测试

### 方式一：使用 curl 测试

```bash
# 1. 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# 2. 登录并获取 Token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 方式二：使用测试脚本

```bash
# 给脚本添加执行权限
chmod +x test-api.sh

# 运行测试
./test-api.sh
```

### 方式三：使用 VS Code REST Client

1. 安装 VS Code 扩展：REST Client
2. 打开 `api-examples.http`
3. 点击 "Send Request" 测试各个 API

## 🔧 配置说明

### 环境变量（.env）

```env
# 服务器端口
PORT=3000

# 运行环境
NODE_ENV=development

# MongoDB 连接
MONGODB_URI=mongodb://localhost:27017/dianxiaomi_auth

# JWT 密钥（生产环境必须修改！）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# JWT 过期时间
JWT_EXPIRES_IN=7d

# 设备数量限制
MAX_DEVICES_PER_USER=3

# 允许的来源（Chrome 插件）
ALLOWED_ORIGINS=chrome-extension://your-extension-id
```

## 📋 可用的 npm 命令

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start

# 安装依赖
npm install
```

## 🔍 常见问题排查

### 问题 1: 服务器启动失败

**检查**：MongoDB 是否运行？

```bash
# 检查 MongoDB 状态
brew services list | grep mongodb

# 或者
ps aux | grep mongod
```

### 问题 2: 端口被占用

**解决**：修改 `.env` 中的 `PORT` 值

```env
PORT=3001
```

### 问题 3: MongoDB 连接失败

**检查**：
1. MongoDB 是否运行？
2. 连接字符串是否正确？
3. 防火墙是否阻止连接？

```bash
# 测试连接
mongosh mongodb://localhost:27017
```

### 问题 4: 依赖安装失败

**解决**：

```bash
# 清除缓存
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

## 📊 API 端点概览

### 认证相关
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 订阅相关
- `GET /api/subscription/current` - 当前订阅
- `GET /api/subscription/status` - 订阅状态
- `POST /api/subscription/subscribe` - 创建订阅

### 设备相关
- `POST /api/device/register` - 注册设备
- `GET /api/device/list` - 设备列表
- `POST /api/device/verify` - 验证设备
- `DELETE /api/device/:id` - 移除设备

## 🎨 Chrome 插件开发

### 步骤 1: 复制示例文件

```bash
cp -r examples/* /path/to/your/chrome-extension/
```

### 步骤 2: 修改配置

在 `chrome-extension-client.js` 中：

```javascript
const authClient = new AuthClient('http://localhost:3000/api');
```

### 步骤 3: 加载插件

1. 打开 Chrome：chrome://extensions/
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择插件目录

## 📚 更多文档

- 完整文档：`README.md`
- 项目总结：`PROJECT_SUMMARY.md`
- API 示例：`api-examples.http`

## 🆘 获取帮助

遇到问题？
1. 查看服务器日志
2. 检查环境配置
3. 阅读完整文档
4. 提交 Issue

## ✅ 验证清单

- [ ] MongoDB 正在运行
- [ ] 依赖已安装 (`npm install`)
- [ ] 环境变量已配置 (`.env`)
- [ ] 服务器成功启动
- [ ] 健康检查通过
- [ ] 可以注册和登录用户
- [ ] Chrome 插件可以连接服务器

---

**提示**：开发时推荐使用 `npm run dev`，它会在代码修改时自动重启服务器。
