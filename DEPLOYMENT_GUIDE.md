# 产品日志功能 - 快速部署指南

## ✅ 已完成的工作

### 后端（dianxiaomi-auth-server）

1. **新增文件**
   - ✅ `src/models/ProductLog.js` - 产品日志数据模型
   - ✅ `src/routes/productLog.js` - 产品日志路由和API
   - ✅ `test-product-log.sh` - API测试脚本
   - ✅ `PRODUCT_LOG_FEATURE.md` - 功能文档

2. **修改文件**
   - ✅ `src/index.js` - 注册产品日志路由

3. **API端点**
   - ✅ POST `/api/product/log` - 记录产品日志
   - ✅ GET `/api/product/logs` - 获取产品日志列表（支持分页）
   - ✅ GET `/api/product/stats` - 获取统计数据

### 前端（dianxiaomi）

1. **新增文件**
   - ✅ `utils/product-log-service.js` - 产品日志服务类

2. **修改文件**
   - ✅ `manifest.json` - 添加 product-log-service.js 到 content_scripts
   - ✅ `build.js` - 添加 product-log-service.js 到混淆列表
   - ✅ `content.js` - 在 runAllSteps 和 runSelectedSteps 中添加日志记录
   - ✅ `utils/steps-methods.js` - 在 optimizeTitle 中添加日志记录

3. **自动记录时机**
   - ✅ 优化标题完成后（包含优化后的标题）
   - ✅ 一键全流程完成后
   - ✅ 勾选流程完成后

## 🚀 部署步骤

### 1. 部署后端

```bash
cd /Users/bilibili/dxm/dianxiaomi-auth-server

# 检查修改
git status

# 提交更改
git add .
git commit -m "feat: 添加产品日志功能 - 记录产品操作数据用于分析"

# 推送到远程仓库（Railway会自动部署）
git push origin main
```

### 2. 构建和测试前端

```bash
cd /Users/bilibili/dxm/dianxiaomi

# 构建插件
npm run build:prod

# 检查构建产物
ls -la dist/
ls -la dist/utils/

# 确认以下文件存在：
# - dist/utils/product-log-service.js
# - dist/manifest.json（包含 product-log-service.js）
```

### 3. 测试功能

1. **加载插件到Chrome**
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist` 文件夹

2. **测试日志记录**
   - 打开店小蜜平台：https://www.dianxiaomi.com/
   - 确保已登录插件
   - 在产品编辑页面，确保填写了：
     * 产品标题
     * 来源链接（在 #dxmInfo .source-inp-group 下的 input）
   - 执行以下操作之一：
     * 点击"优化标题"按钮
     * 点击"一键全流程"按钮
     * 点击"勾选流程"按钮

3. **检查日志是否记录**
   - 打开浏览器控制台
   - 查看是否有日志记录成功的消息
   - 或使用 API 查询：
     ```bash
     curl -X GET "https://dianxiaomi-auth-server-production.up.railway.app/api/product/logs" \
       -H "Authorization: Bearer YOUR_TOKEN"
     ```

## 📊 验证数据

### 使用测试脚本

```bash
cd /Users/bilibili/dxm/dianxiaomi-auth-server

# 1. 获取你的登录 token
# 方法1: 从浏览器控制台
# chrome.storage.local.get(['authToken'], (r) => console.log(r.authToken))

# 方法2: 从 API 登录获取

# 2. 修改测试脚本中的 TOKEN
nano test-product-log.sh
# 替换 TOKEN="your_token_here" 为实际 token

# 3. 运行测试
chmod +x test-product-log.sh
./test-product-log.sh
```

### 预期结果

测试脚本应该显示：
1. ✅ 成功记录产品日志
2. ✅ 成功获取日志列表
3. ✅ 成功获取统计数据

## 🔍 数据查询示例

### 1. 查看最近的日志

```bash
curl -X GET "https://dianxiaomi-auth-server-production.up.railway.app/api/product/logs?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.data.logs[] | {title: .originalTitle, action: .action, time: .createdAt}'
```

### 2. 查看统计数据

```bash
curl -X GET "https://dianxiaomi-auth-server-production.up.railway.app/api/product/stats" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.data'
```

### 3. 筛选特定操作

```bash
# 只查看优化标题的日志
curl -X GET "https://dianxiaomi-auth-server-production.up.railway.app/api/product/logs?action=optimizeTitle" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.data'
```

## 📝 数据结构示例

成功记录后，MongoDB 中的数据：

```javascript
{
  "_id": ObjectId("675f1234567890abcdef1234"),
  "userId": ObjectId("675f0000111122223333"),
  "originalTitle": "Wireless Bluetooth Earphones TWS",
  "sourceUrl": "https://www.aliexpress.com/item/1234567890.html",
  "optimizedTitle": "【2024新款】无线蓝牙耳机 TWS 降噪音质超清",
  "action": "optimizeTitle",
  "createdAt": ISODate("2024-12-16T10:30:00.000Z")
}
```

## ⚠️ 注意事项

1. **日志记录不影响主流程**
   - 日志记录失败不会中断用户操作
   - 未登录时会静默跳过记录

2. **数据采集要求**
   - 必须有产品标题
   - 必须有来源链接
   - 两者缺一会跳过记录

3. **性能考虑**
   - 日志记录是异步的
   - 不会阻塞用户操作
   - 建议定期归档旧数据

## 🎯 下一步计划

1. 添加数据分析仪表板
2. 添加导出功能（CSV/Excel）
3. 添加数据可视化（图表）
4. 添加定时清理旧日志的功能
5. 添加数据备份功能

## 📚 相关文档

- 完整功能文档：`PRODUCT_LOG_FEATURE.md`
- API测试脚本：`test-product-log.sh`
- 数据模型：`src/models/ProductLog.js`
- API路由：`src/routes/productLog.js`
