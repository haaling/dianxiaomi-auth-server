# 安全账号管理指南

## 概述

为了防止恶意用户伪造注册，系统已实施以下安全措施:

1. **关闭公开注册**: `/api/auth/register` 接口已禁用
2. **管理员专用接口**: 新增 `/api/admin/create-user` 接口，需要 API Key 认证
3. **登录功能保持开放**: 客户仍可正常登录

## 配置步骤

### 1. 生成 Admin API Key

生成一个强随机字符串作为 API Key:

```bash
# 方法 1: 使用 OpenSSL
openssl rand -hex 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 方法 3: 在线生成
# 访问: https://www.uuidgenerator.net/guid
```

### 2. 在 Railway 配置环境变量

1. 访问 Railway 项目: https://railway.app
2. 选择你的项目 `dianxiaomi-auth-server`
3. 进入 **Variables** 标签
4. 点击 **New Variable**
5. 添加变量:
   - **Name**: `ADMIN_API_KEY`
   - **Value**: 你生成的随机字符串（例如: `a1b2c3d4e5f6...`）
6. 点击 **Save**
7. Railway 会自动重新部署

### 3. 本地配置（可选）

如果需要在本地测试，在 `.env` 文件中添加:

```bash
ADMIN_API_KEY=你的API密钥
```

**注意**: 不要将 `.env` 文件提交到 Git！

## 创建客户账号

### 方法 1: 使用脚本（推荐）

```bash
# 设置 API Key
export ADMIN_API_KEY='你的API密钥'

# 运行创建脚本
chmod +x scripts/create-account-via-api.sh
./scripts/create-account-via-api.sh
```

脚本会交互式地询问:
- 用户名
- 邮箱
- 密码
- 套餐类型（free/basic/premium/enterprise/自定义）

### 方法 2: 使用 curl 命令

```bash
curl -X POST 'https://dianxiaomi-auth-server-production.up.railway.app/api/admin/create-user' \
  -H 'Content-Type: application/json' \
  -H 'x-admin-api-key: 你的API密钥' \
  -d '{
    "username": "客户名",
    "email": "customer@example.com",
    "password": "secure_password",
    "plan": "basic"
  }'
```

### 方法 3: 使用 Node.js 脚本

创建 `create-user.js`:

```javascript
const fetch = require('node-fetch');

const API_URL = 'https://dianxiaomi-auth-server-production.up.railway.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

async function createUser(userData) {
  const response = await fetch(`${API_URL}/api/admin/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': ADMIN_API_KEY
    },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  console.log(data);
}

// 使用示例
createUser({
  username: 'customer1',
  email: 'customer@example.com',
  password: 'secure_password',
  plan: 'premium'
});
```

## 套餐配置

### 预设套餐

| 套餐 | 最大设备数 | 有效期 |
|------|-----------|--------|
| free | 3 | 30天 |
| basic | 5 | 365天 |
| premium | 10 | 365天 |
| enterprise | 50 | 365天 |

### 自定义套餐

可以指定自定义的 `maxDevices` 和 `validDays`:

```bash
curl -X POST 'https://dianxiaomi-auth-server-production.up.railway.app/api/admin/create-user' \
  -H 'Content-Type: application/json' \
  -H 'x-admin-api-key: 你的API密钥' \
  -d '{
    "username": "vip_customer",
    "email": "vip@example.com",
    "password": "password123",
    "plan": "custom",
    "maxDevices": 20,
    "validDays": 730
  }'
```

## 查看用户列表

```bash
curl -X GET 'https://dianxiaomi-auth-server-production.up.railway.app/api/admin/users?page=1&limit=20' \
  -H 'x-admin-api-key: 你的API密钥'
```

## API 接口说明

### 创建用户

**接口**: `POST /api/admin/create-user`

**Headers**:
- `Content-Type: application/json`
- `x-admin-api-key: <你的API密钥>`

**请求体**:
```json
{
  "username": "用户名（必填）",
  "email": "邮箱（必填）",
  "password": "密码（必填，最少6位）",
  "plan": "套餐类型（可选，默认free）",
  "maxDevices": "最大设备数（可选）",
  "validDays": "有效天数（可选）"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "用户创建成功",
  "data": {
    "user": {
      "id": "...",
      "username": "customer1",
      "email": "customer@example.com",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "subscription": {
      "plan": "premium",
      "maxDevices": 10,
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2026-01-01T00:00:00.000Z",
      "validDays": 365
    }
  }
}
```

### 获取用户列表

**接口**: `GET /api/admin/users?page=1&limit=20`

**Headers**:
- `x-admin-api-key: <你的API密钥>`

**查询参数**:
- `page`: 页码（可选，默认1）
- `limit`: 每页数量（可选，默认20）

## 安全建议

1. **妥善保管 API Key**
   - 不要在代码中硬编码
   - 不要提交到 Git 仓库
   - 使用环境变量或密钥管理系统

2. **定期轮换 API Key**
   - 每 3-6 个月更换一次
   - 如有泄露立即更换

3. **限制访问权限**
   - 只在可信环境中使用
   - 考虑添加 IP 白名单（未来功能）

4. **监控异常活动**
   - 定期检查 Railway 日志
   - 关注异常的创建用户请求

5. **客户密码安全**
   - 为客户生成强密码
   - 建议客户首次登录后修改密码（未来功能）

## 客户登录流程

1. **管理员**: 使用管理员接口创建账号
2. **管理员**: 将登录信息发送给客户（邮箱+密码）
3. **客户**: 在 Chrome 插件中使用邮箱和密码登录
4. **系统**: 验证成功后自动注册设备

## 故障排查

### API Key 无效

错误信息: `API Key 无效`

解决方案:
- 检查 Railway 环境变量中的 `ADMIN_API_KEY` 是否正确
- 确认请求头中的 key 与环境变量一致
- 重新部署后等待几秒钟让配置生效

### 缺少 API Key

错误信息: `缺少管理员 API Key`

解决方案:
- 在请求头中添加 `x-admin-api-key`
- 检查 key 名称是否正确（不是 `X-Admin-Api-Key` 或其他变体）

### 公开注册被禁用

错误信息: `公开注册已关闭，请联系管理员创建账号`

说明:
- 这是正常行为，表示安全措施生效
- 客户看到此信息后应联系你获取账号
- 使用管理员接口为客户创建账号

## 更新日志

- **2025-01-12**: 实施管理员 API Key 认证机制
- **2025-01-12**: 禁用公开注册接口
- **2025-01-12**: 新增管理员专用账号创建接口
