# 🗄️ MongoDB Atlas 配置指南（5分钟完成）

## 第一步：注册 MongoDB Atlas

1. 访问：https://www.mongodb.com/cloud/atlas/register
2. 选择注册方式（推荐用 Google 账号快速注册）
3. 验证邮箱

## 第二步：创建免费集群

### 看起来你已经创建了集群！

从截图可以看到：
- ✅ 集群名称：`Cluster0`
- ✅ 区域：AWS / Hong Kong (ap-east-1)
- ✅ 类型：FREE (M0)
- ✅ 状态：正在运行

**如果还没有创建，步骤如下：**

1. 点击右上角绿色的 **"+ Create"** 按钮
2. 选择 **"M0 FREE"** 选项（永久免费，512MB）
3. 配置：
   - **Cloud Provider**: AWS
   - **Region**: 选择离你近的：
     - 🇭🇰 香港：`Hong Kong (ap-east-1)` ✅ 推荐
     - 🇸🇬 新加坡：`Singapore (ap-southeast-1)`
     - 🇯🇵 东京：`Tokyo (ap-northeast-1)`
   - **Cluster Name**: 保持默认 `Cluster0` 即可
4. 点击 **"Create Deployment"** 按钮
5. 等待 1-3 分钟创建完成

## 第三步：配置网络访问

### 允许所有 IP 访问（Railway 需要）

1. 左侧菜单找到 **"SECURITY"** 部分
2. 点击 **"Database & Network Access"** 或 **"Network Access"**
3. 切换到 **"IP Access List"** 标签
4. 点击 **"Add IP Address"** 按钮
5. 选择 **"Allow Access from Anywhere"**
   - 会自动填入：`0.0.0.0/0`
6. 点击 **"Confirm"**
7. 等待状态变为 "Active"（约10秒）

⚠️ **如果已经看到 `0.0.0.0/0` 在列表中，说明已经配置好了，跳过此步骤。**

## 第四步：创建数据库用户

1. 在 **"SECURITY"** 部分，点击 **"Database Access"**
2. 点击 **"Add New Database User"** 按钮
3. 配置：
   - **Authentication Method**: Password
   - **Username**: `dianxiaomi_admin`（或任意名称）
   - **Password**: 点击 **"Autogenerate Secure Password"**
   - ⚠️ **重要**：点击 **"Copy"** 并保存这个密码到记事本！
   - **Database User Privileges**: 选择 **"Built-in Role"** → **"Atlas admin"**
4. 点击 **"Add User"**

⚠️ **密码一定要保存好，之后无法再看到！**

## 第五步：获取连接字符串

### 从你的集群获取连接信息

1. 回到 **"DATABASE"** → **"Clusters"** 页面（就是你截图的页面）
2. 找到你的集群（Cluster0），点击 **"Connect"** 按钮
3. 会弹出连接方式选择，点击 **"Drivers"** 或 **"Connect your application"**
4. 配置：
   - **Driver**: Node.js
   - **Version**: 选择最新版本（6.0 or later）
5. 复制显示的连接字符串，格式类似：

```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 修改连接字符串

6. **替换占位符**：
   - 将 `<username>` 替换为你创建的用户名（如：`dianxiaomi_admin`）
   - 将 `<password>` 替换为刚才保存的密码
   - 在 `/?` 前添加数据库名 `/dianxiaomi_auth`

**最终格式示例：**
```
mongodb+srv://dianxiaomi_admin:你的密码@cluster0.xxxxx.mongodb.net/dianxiaomi_auth?retryWrites=true&w=majority
```

⚠️ **注意**：
- 密码中如果有特殊字符（如 `@`, `#`, `%` 等），需要进行 URL 编码
- 或者在创建用户时使用只包含字母和数字的密码

**保存这个完整的连接字符串！** 下一步会用到。

## 第六步：在 Railway 配置环境变量

1. 打开 Railway 项目：https://railway.app/
2. 点击你的 `dianxiaomi-auth-server` 服务
3. 切换到 **"Variables"** 标签
4. 点击 **"New Variable"**
5. 添加以下变量：

### 必填环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `3000` | 端口号 |
| `MONGODB_URI` | `mongodb+srv://dianxiaomi_admin:你的密码@...` | 上一步获取的连接字符串 |
| `JWT_SECRET` | `运行下面命令生成` | JWT 密钥 |
| `ALLOWED_ORIGINS` | `chrome-extension://*` | 允许的来源 |

### 生成 JWT_SECRET：

在本地终端运行：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

复制输出的字符串（类似：`a1b2c3d4e5f6...`），粘贴到 `JWT_SECRET` 的值中。

## 第七步：保存并重新部署

1. 配置完所有环境变量后
2. 点击 **"Deploy"** → **"Redeploy"**
3. 或者 Railway 会自动重新部署

## 第八步：验证部署成功

### 1. 查看日志
在 Railway 的 **"Logs"** 标签中，应该看到：
```
🚀 服务器运行在端口 3000
📝 环境: production
🔗 API地址: http://localhost:3000/api
✅ MongoDB 连接成功: dianxiaomi-cluster.xxxxx.mongodb.net
```

### 2. 获取部署域名
1. 在 **"Settings"** 标签
2. 找到 **"Domains"** 部分
3. 点击 **"Generate Domain"**
4. 会生成类似：`https://dianxiaomi-auth-server-production-xxxx.up.railway.app`

### 3. 测试健康检查
在浏览器访问：
```
https://你的域名.up.railway.app/health
```

应该返回：
```json
{
  "success": true,
  "message": "服务器运行正常",
  "timestamp": "2025-11-12T..."
}
```

## ✅ 完成检查清单

- [ ] MongoDB Atlas 账号已注册
- [ ] 免费集群已创建（M0 FREE）
- [ ] 网络访问已配置（0.0.0.0/0）
- [ ] 数据库用户已创建
- [ ] 连接字符串已获取并修改
- [ ] Railway 环境变量已配置
- [ ] 服务已重新部署
- [ ] 健康检查通过
- [ ] 部署域名已获取

## 🎯 下一步

完成以上步骤后：

1. **更新 Chrome 插件配置**
   编辑 `dianxiaomi/utils/auth-config.js`：
   ```javascript
   API_BASE_URL: 'https://你的Railway域名.up.railway.app/api'
   ```

2. **创建测试账号**
   在 Railway Shell 中运行：
   ```bash
   npm run create-customer
   ```

3. **在 Chrome 插件测试登录**

---

## 💡 常见问题

**Q: 密码忘记了怎么办？**
A: 在 Database Access 页面点击 "Edit" → "Edit Password" 重新生成

**Q: 连接失败 MongoNetworkError**
A: 检查 Network Access 是否允许 0.0.0.0/0

**Q: 免费额度够用吗？**
A: 512MB 够存储 5000+ 用户，每月免费

**Q: 如何备份数据？**
A: MongoDB Atlas 每天自动备份，免费版保留 2 天

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. Railway 日志截图
2. 错误信息
3. 完成到哪一步

祝你配置顺利！🎉
