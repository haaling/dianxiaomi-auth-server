# 部署指南

本指南将帮助你将店小秘认证服务器部署到生产环境。

## 📋 目录

1. [快速开始 - Railway 部署（推荐）](#railway-部署)
2. [MongoDB Atlas 配置](#mongodb-atlas-配置)
3. [更新 Chrome 插件配置](#更新-chrome-插件配置)
4. [客户账号管理](#客户账号管理)
5. [其他部署方式](#其他部署方式)

---

## 🚀 Railway 部署

Railway 提供免费额度，适合小规模应用，部署简单。

### 步骤 1: 准备代码仓库

1. 确保代码已推送到 GitHub
2. 检查 `.gitignore` 确保 `.env` 文件未被提交

### 步骤 2: 在 Railway 部署

1. 访问 [Railway.app](https://railway.app/)
2. 使用 GitHub 账号登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择你的 `dianxiaomi-auth-server` 仓库
5. Railway 会自动检测到 Node.js 项目并开始部署

### 步骤 3: 配置环境变量

在 Railway 项目设置中添加环境变量：

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=<你的MongoDB Atlas连接字符串>
JWT_SECRET=<生成一个强密码>
ALLOWED_ORIGINS=chrome-extension://*
```

生成强密码：
```bash
# 在本地终端运行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 步骤 4: 获取部署地址

部署成功后，Railway 会提供一个域名，例如：
```
https://your-app-name.up.railway.app
```

记录这个地址，稍后需要更新到 Chrome 插件配置中。

---

## 🗄️ MongoDB Atlas 配置

MongoDB Atlas 提供免费的 512MB 数据库，足够使用。

### 步骤 1: 创建账号

1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 注册并登录
3. 创建一个新的组织和项目

### 步骤 2: 创建免费集群

1. 点击 "Build a Database"
2. 选择 "FREE" (M0) 选项
3. 选择云服务商和地区（建议选择离用户最近的地区）
4. 命名集群（例如：dianxiaomi-cluster）
5. 点击 "Create"

### 步骤 3: 配置网络访问

1. 左侧菜单选择 "Network Access"
2. 点击 "Add IP Address"
3. 选择 "Allow Access from Anywhere" (0.0.0.0/0)
   - 生产环境建议只允许特定 IP
4. 点击 "Confirm"

### 步骤 4: 创建数据库用户

1. 左侧菜单选择 "Database Access"
2. 点击 "Add New Database User"
3. 选择 "Password" 认证方式
4. 输入用户名和强密码（记录下来）
5. 选择权限为 "Read and write to any database"
6. 点击 "Add User"

### 步骤 5: 获取连接字符串

1. 返回 "Database" 页面
2. 点击集群的 "Connect" 按钮
3. 选择 "Connect your application"
4. 复制连接字符串，格式如下：
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/dianxiaomi_auth?retryWrites=true&w=majority
```

5. 将 `<username>` 和 `<password>` 替换为实际值
6. 将此连接字符串配置到 Railway 的 `MONGODB_URI` 环境变量

---

## 🔧 更新 Chrome 插件配置

部署完成后，需要更新插件配置指向远程服务器。

### 修改 auth-config.js

编辑 `/dianxiaomi/utils/auth-config.js`：

```javascript
const AuthConfig = {
  SERVER: {
    // 将此处改为你的 Railway 部署地址
    API_BASE_URL: 'https://your-app-name.up.railway.app/api',
    
    // 其他配置保持不变...
  },
  // ...
};
```

### 重新加载插件

1. 打开 Chrome 扩展管理页面 (`chrome://extensions/`)
2. 找到你的插件
3. 点击刷新图标重新加载
4. 测试登录功能

---

## 👥 客户账号管理

部署完成后，你可以使用命令行工具为客户创建账号。

### 创建客户账号

```bash
# 在服务器或本地（配置好 .env）运行
npm run create-customer
```

按照提示输入：
- 客户邮箱
- 密码（至少6位）
- 客户姓名（可选）
- 备注信息（可选）
- 订阅计划（free/basic/premium/enterprise）
- 有效期天数

创建成功后，将账号信息发送给客户。

### 查看所有账号

```bash
npm run list-accounts
```

显示所有客户账号及其订阅状态、设备使用情况等。

### 订阅计划说明

| 计划 | 价格 | 设备数 | 有效期 | 功能 |
|------|------|--------|--------|------|
| 免费版 (free) | ¥0 | 3台 | 30天 | 基础优化 |
| 基础版 (basic) | ¥199 | 5台 | 365天 | 基础优化 + 高级功能 |
| 高级版 (premium) | ¥499 | 10台 | 365天 | 所有功能 + 智能定价 |
| 企业版 (enterprise) | ¥1999 | 50台 | 365天 | 所有功能 + API集成 + 优先支持 |

你可以根据实际情况调整价格和功能。

---

## 🌐 其他部署方式

### Render.com 部署

1. 访问 [Render.com](https://render.com/)
2. 连接 GitHub 仓库
3. 选择 "Web Service"
4. 配置如下：
   - Build Command: `npm install`
   - Start Command: `npm start`
   - 添加环境变量（同 Railway）
5. 点击 "Create Web Service"

### 阿里云/腾讯云部署

1. 购买 ECS 服务器（推荐 2核4G）
2. 安装 Node.js 和 MongoDB
3. 克隆代码到服务器
4. 配置 `.env` 文件
5. 使用 PM2 管理进程：

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start src/index.js --name dianxiaomi-auth

# 设置开机自启
pm2 startup
pm2 save
```

### Docker 部署

```bash
# 构建镜像
docker build -t dianxiaomi-auth-server .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e MONGODB_URI=<your-mongodb-uri> \
  -e JWT_SECRET=<your-jwt-secret> \
  --name dianxiaomi-auth \
  dianxiaomi-auth-server
```

---

## 🔒 安全建议

1. **强密码**: JWT_SECRET 使用至少 32 字节的随机字符串
2. **HTTPS**: 生产环境必须使用 HTTPS
3. **环境变量**: 永远不要将 `.env` 提交到 Git
4. **定期备份**: 定期备份 MongoDB 数据库
5. **监控日志**: 定期检查服务器日志，发现异常及时处理
6. **IP 限制**: MongoDB Atlas 建议只允许服务器 IP 访问

---

## 🆘 常见问题

### 1. 连接数据库失败

- 检查 MongoDB Atlas 的网络访问配置
- 确认连接字符串正确，用户名密码无误
- 检查数据库用户权限

### 2. CORS 错误

- 确保 `ALLOWED_ORIGINS` 包含 `chrome-extension://*`
- 或者在生产环境设置具体的插件 ID

### 3. 插件无法连接服务器

- 确认服务器已正确部署并运行
- 检查 `auth-config.js` 中的 `API_BASE_URL` 是否正确
- 在浏览器控制台查看具体错误信息

### 4. Railway 免费额度用完

- Railway 每月提供 $5 免费额度
- 可升级到付费计划或迁移到其他平台
- 优化代码减少资源消耗

---

## 📞 技术支持

如有问题，请检查：
1. 服务器日志
2. MongoDB 日志
3. Chrome 插件控制台

部署成功后，你就可以开始售卖账号给客户了！🎉
