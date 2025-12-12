# 管理员面板使用指南

## 📋 概述

管理员面板是一个可视化的后台管理界面，支持所有管理员 API 接口的调用，无需使用命令行或 Postman。

## 🌐 访问方式

### 在线访问（推荐）
直接在浏览器中打开 HTML 文件：
```bash
open examples/admin-panel.html
```

或者使用本地服务器：
```bash
cd examples
python3 -m http.server 8080
# 然后访问 http://localhost:8080/admin-panel.html
```

## 🔑 API Key 配置

1. 在页面顶部的 **Admin API Key** 输入框中输入你的管理员密钥
2. API Key 从环境变量 `ADMIN_API_KEY` 获取
3. 在 Railway 中可以查看或设置此环境变量

## 📚 功能模块

### 1. 创建用户 (Create User)

**功能：** 创建新的用户账号

**必填字段：**
- 用户名 (username)
- 邮箱 (email)
- 密码 (password)

**可选字段：**
- 套餐类型 (plan)：free / basic / premium / enterprise
- 最大设备数 (maxDevices)：留空则使用套餐默认值
- 有效天数 (validDays)：留空则使用套餐默认值

**套餐默认配置：**
- Free：3台设备，30天有效期
- Basic：5台设备，365天有效期
- Premium：10台设备，365天有效期
- Enterprise：50台设备，365天有效期

**API 接口：** `POST /api/admin/create-user`

---

### 2. 续期订阅 (Renew Subscription)

**功能：** 为已有用户延长订阅时长

**必填字段：**
- 用户邮箱 (email)
- 续期天数 (validDays)

**可选字段：**
- 变更套餐 (plan)：可以在续期的同时升级/降级套餐

**续期逻辑：**
- 从当前到期日期开始延长指定天数
- 如果订阅已过期，则从当前时间开始计算
- 可以同时变更套餐类型

**API 接口：** `POST /api/admin/renew-subscription`

---

### 3. 扣减时长 (Deduct Days) ⭐ 新增

**功能：** 从用户订阅中扣减指定天数

**必填字段：**
- 用户邮箱 (email)
- 扣减天数 (days)

**扣减逻辑：**
- 从到期日期减少指定天数
- 扣减后可能导致订阅立即过期
- 操作前会弹出确认对话框

**使用场景：**
- 用户违规需要处罚
- 退款后调整订阅时长
- 测试订阅过期功能

**API 接口：** `POST /api/admin/deduct-days`

**示例响应：**
```json
{
  "success": true,
  "message": "成功扣减 7 天",
  "data": {
    "user": {
      "email": "user@example.com",
      "username": "testuser"
    },
    "subscription": {
      "plan": "premium",
      "maxDevices": 10,
      "oldEndDate": "2025-12-31T00:00:00.000Z",
      "newEndDate": "2025-12-24T00:00:00.000Z",
      "daysRemaining": 12,
      "isValid": true
    }
  }
}
```

---

### 4. 查询用户 (Query User)

**功能：** 查询单个用户的详细信息

**必填字段：**
- 用户邮箱 (email)

**返回信息：**
- 用户基本信息（用户名、邮箱、创建时间等）
- 订阅详情（套餐、设备数、到期时间、剩余天数等）

**API 接口：** `GET /api/admin/user/:email`

---

### 5. 用户列表 (User List)

**功能：** 查看所有用户列表（分页）

**功能特性：**
- 自动分页显示（每页 20 条）
- 显示用户名、邮箱、套餐、剩余天数等
- 实时计算订阅状态（有效/过期）
- 支持刷新列表

**API 接口：** `GET /api/admin/users?page=1&limit=20`

---

## 🎨 界面特性

### 响应式设计
- 自动适配不同屏幕尺寸
- 表单字段自动排列

### 美观的结果展示
- ✅ 成功操作：绿色背景
- ❌ 失败操作：红色背景
- JSON 格式化显示
- 可滚动查看长内容

### 状态标记
- 🟢 有效订阅：绿色徽章
- 🔴 过期订阅：红色徽章
- 🔵 套餐类型：蓝色徽章

### 智能提示
- 必填字段提示
- 输入验证
- 操作确认对话框
- 表单自动清空（创建成功后）

## 🔧 技术实现

### API 配置
```javascript
const API_BASE_URL = 'https://dianxiaomi-auth-server-production.up.railway.app/api';
```

如需使用本地开发环境，修改为：
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

### 认证方式
所有请求都在 HTTP Header 中携带 API Key：
```javascript
headers: {
  'x-admin-api-key': apiKey,
  'Content-Type': 'application/json'
}
```

## 📝 使用示例

### 示例 1：创建测试用户
1. 切换到「创建用户」标签
2. 填写信息：
   - 用户名：`testuser`
   - 邮箱：`test@example.com`
   - 密码：`123456`
   - 套餐：`premium`
3. 点击「创建用户」按钮
4. 查看返回的用户信息和订阅详情

### 示例 2：续期 30 天
1. 切换到「续期订阅」标签
2. 填写信息：
   - 用户邮箱：`test@example.com`
   - 续期天数：`30`
3. 点击「续期订阅」按钮

### 示例 3：扣减 7 天
1. 切换到「扣减时长」标签
2. 填写信息：
   - 用户邮箱：`test@example.com`
   - 扣减天数：`7`
3. 点击「扣减时长」按钮
4. 在确认对话框中点击「确定」

### 示例 4：查看所有用户
1. 切换到「用户列表」标签
2. 点击「刷新列表」按钮
3. 使用上一页/下一页按钮浏览

## 🚀 部署建议

### 选项 1：本地使用
直接在浏览器中打开 HTML 文件，无需部署

### 选项 2：部署到服务器
可以将 `admin-panel.html` 部署到任何静态托管服务：
- GitHub Pages
- Vercel
- Netlify
- 或自己的 Web 服务器

### 安全建议
⚠️ **重要：** 此管理面板拥有完整的后台权限，请勿公开访问
- 使用强密码保护 API Key
- 定期更换 API Key
- 仅在可信网络环境下使用
- 考虑添加 IP 白名单限制

## 🛠️ 故障排除

### 问题 1：API Key 错误
**错误信息：** `Unauthorized` 或 `Invalid API Key`

**解决方法：**
- 检查 API Key 是否正确
- 确认 Railway 环境变量 `ADMIN_API_KEY` 已设置

### 问题 2：CORS 错误
**错误信息：** `CORS policy` 相关错误

**解决方法：**
- 确保服务器已配置正确的 CORS 策略
- 使用 `file://` 协议可能会遇到限制，建议使用 HTTP 服务器

### 问题 3：用户不存在
**错误信息：** `用户不存在`

**解决方法：**
- 检查邮箱是否拼写正确
- 先在「用户列表」中确认用户是否存在

## 📞 技术支持

如有问题，请查看：
- 服务器日志：Railway 控制台
- 浏览器控制台：F12 开发者工具
- API 文档：`SECURE_ACCOUNT_MANAGEMENT.md`

---

**最后更新：** 2025-12-12
**版本：** v1.0.0
