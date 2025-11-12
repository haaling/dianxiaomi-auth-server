# ⚠️ 问题修复指南

## 问题1: 登录框只能输入大写 ✅ 已修复

**原因:** CSS 的 `text-transform: uppercase` 导致
**解决:** 已将登录/注册输入框的 class 从 `license-input` 改为 `auth-input`

## 问题2: 登录时出现 JSON 解析错误 ⚠️

### 错误信息
```
Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

### 根本原因
**MongoDB 未运行** - 服务器无法连接数据库,导致启动失败或返回错误响应

### 解决方法

#### 步骤1: 启动 MongoDB

**macOS:**
```bash
# 使用 Homebrew 启动
brew services start mongodb-community

# 或者直接启动
mongod --config /opt/homebrew/etc/mongod.conf
```

**Linux:**
```bash
sudo systemctl start mongod
sudo systemctl enable mongod  # 开机自启
```

**Windows:**
```bash
net start MongoDB
```

#### 步骤2: 验证 MongoDB 是否运行

```bash
# 检查进程
ps aux | grep mongod

# 或者尝试连接
mongo  # 或 mongosh
```

#### 步骤3: 重启服务器

```bash
cd dianxiaomi-auth-server

# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm start
```

应该看到:
```
🚀 服务器运行在端口 3000
✅ MongoDB 连接成功
```

#### 步骤4: 创建测试账号

```bash
npm run create-test-users
```

#### 步骤5: 测试登录

在 Chrome 插件中使用:
```
邮箱: premium@example.com
密码: password123
```

---

## 快速诊断命令

```bash
# 在 dianxiaomi-auth-server 目录下运行
./scripts/check-status.sh
```

这会检查:
- ✅ MongoDB 是否运行
- ✅ Node.js 是否安装
- ✅ 配置文件是否存在
- ✅ 依赖是否安装
- ✅ 服务器是否运行

---

## 常见问题

### Q: MongoDB 安装后还是无法启动

**检查端口冲突:**
```bash
lsof -i :27017
```

**查看日志:**
```bash
# macOS
tail -f /opt/homebrew/var/log/mongodb/mongo.log

# Linux
tail -f /var/log/mongodb/mongod.log
```

### Q: 服务器启动失败

**检查端口占用:**
```bash
lsof -i :3000
```

**更换端口:**
编辑 `.env`:
```
PORT=3001
```

### Q: 仍然出现 JSON 错误

**检查服务器响应:**
```bash
curl http://localhost:3000/health
```

应该返回:
```json
{
  "success": true,
  "message": "服务器运行正常",
  "timestamp": "2025-11-12T..."
}
```

**检查浏览器控制台:**
1. 打开 Chrome 开发者工具 (F12)
2. 切换到 Console 标签
3. 查看红色错误信息
4. 复制完整错误信息以便诊断

---

## 改进措施

### 已添加的错误处理

1. **更详细的 JSON 解析错误提示**
   - 检查响应类型
   - 检查空响应
   - 提供具体错误信息

2. **控制台日志**
   - 登录过程的每一步都有日志
   - 便于追踪问题

3. **输入框修复**
   - 移除了大写转换
   - 支持正常输入

### 使用建议

1. **开发时保持 MongoDB 运行**
```bash
brew services start mongodb-community
```

2. **使用 nodemon 自动重启**
```bash
npm run dev  # 而不是 npm start
```

3. **定期检查系统状态**
```bash
./scripts/check-status.sh
```

---

## 测试清单

- [ ] MongoDB 正在运行
- [ ] 服务器成功启动(看到"MongoDB 连接成功")
- [ ] 测试账号已创建
- [ ] 浏览器控制台没有错误
- [ ] 可以正常输入邮箱和密码(小写)
- [ ] 登录成功

---

**如果按照以上步骤操作后仍有问题,请提供:**
1. 服务器启动时的完整输出
2. 浏览器控制台的错误信息
3. `./scripts/check-status.sh` 的输出结果
