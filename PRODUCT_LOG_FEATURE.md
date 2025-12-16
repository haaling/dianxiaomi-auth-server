# 产品日志功能文档

## 功能概述

产品日志功能用于记录用户在使用插件时的产品操作数据，包括原始标题、来源链接、优化后的标题等信息，方便后续进行数据分析和统计。

## 数据模型

### ProductLog

```javascript
{
  userId: ObjectId,           // 用户ID
  originalTitle: String,      // 原始产品标题
  sourceUrl: String,          // 产品来源链接
  optimizedTitle: String,     // 优化后的标题（可选）
  action: String,             // 操作类型：optimizeTitle | runAllSteps | runSelectedSteps
  createdAt: Date            // 创建时间
}
```

## API 接口

### 1. 记录产品日志

**POST** `/api/product/log`

**请求头：**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体：**
```json
{
  "originalTitle": "iPhone 15 Pro Max 256GB",
  "sourceUrl": "https://www.aliexpress.com/item/123456.html",
  "optimizedTitle": "【2024新款】iPhone 15 Pro Max 256GB 深空黑",
  "action": "optimizeTitle"
}
```

**响应：**
```json
{
  "success": true,
  "message": "产品日志已记录",
  "data": {
    "logId": "507f1f77bcf86cd799439011",
    "createdAt": "2024-12-16T10:30:00.000Z"
  }
}
```

### 2. 获取产品日志列表

**GET** `/api/product/logs?page=1&limit=20&action=optimizeTitle`

**查询参数：**
- `page`: 页码（默认：1）
- `limit`: 每页数量（默认：20）
- `action`: 操作类型过滤（可选）

**响应：**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "507f191e810c19729de860ea",
        "originalTitle": "iPhone 15 Pro Max",
        "sourceUrl": "https://www.aliexpress.com/item/123456.html",
        "optimizedTitle": "【2024新款】iPhone 15 Pro Max",
        "action": "optimizeTitle",
        "createdAt": "2024-12-16T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 3. 获取统计数据

**GET** `/api/product/stats`

**响应：**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byAction": {
      "optimizeTitle": 80,
      "runAllSteps": 50,
      "runSelectedSteps": 20
    },
    "recentActivities": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "originalTitle": "iPhone 15 Pro Max",
        "action": "optimizeTitle",
        "createdAt": "2024-12-16T10:30:00.000Z"
      }
    ]
  }
}
```

## 前端集成

### ProductLogService 使用示例

```javascript
// 服务已自动初始化为全局对象 window.productLogService

// 1. 记录操作日志
await window.productLogService.logProductAction('optimizeTitle', '优化后的标题');

// 2. 获取日志列表
const result = await window.productLogService.getProductLogs(1, 20, 'optimizeTitle');

// 3. 获取统计数据
const stats = await window.productLogService.getStats();
```

### 自动记录时机

产品日志会在以下操作完成时自动记录：

1. **优化标题**（optimizeTitle）：在标题优化成功后自动记录
2. **一键全流程**（runAllSteps）：在全流程执行完成后自动记录
3. **勾选流程**（runSelectedSteps）：在勾选流程执行完成后自动记录

### 数据采集

系统会自动从以下位置获取产品信息：

- **原始标题**：`#productBasicInfo .inputContainer input`
- **来源链接**：`#dxmInfo .source-inp-group input`

## 部署说明

### 后端部署

1. 已添加新的模型文件：`src/models/ProductLog.js`
2. 已添加新的路由文件：`src/routes/productLog.js`
3. 已在 `src/index.js` 中注册路由：`/api/product/*`

### 前端部署

1. 新增文件：`utils/product-log-service.js`
2. 已更新 `manifest.json` 的 content_scripts
3. 已更新 `build.js` 的混淆配置
4. 已在关键函数中集成日志记录

## 测试

运行测试脚本：

```bash
cd dianxiaomi-auth-server
chmod +x test-product-log.sh
./test-product-log.sh
```

注意：需要先替换脚本中的 `TOKEN` 为实际的认证令牌。

## 数据分析应用场景

1. **用户行为分析**：统计用户最常使用的功能
2. **产品优化效果**：对比原始标题和优化后标题
3. **来源分析**：统计用户主要从哪些平台获取产品
4. **使用频率分析**：了解用户活跃度和使用习惯
5. **A/B测试**：对比不同优化策略的效果

## 注意事项

1. 日志记录是异步的，不会阻塞主流程
2. 如果用户未登录，日志记录会静默失败（不影响功能使用）
3. 如果缺少必要信息（标题或链接），不会记录日志
4. 建议定期清理旧日志，避免数据库膨胀
