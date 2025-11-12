# 🚀 快速开始

## 本地测试

```bash
# 一键启动本地服务器
./start-local.sh

# 或手动启动
npm start
```

## 客户管理

```bash
# 创建客户账号
npm run create-customer

# 查看所有账号
npm run list-accounts
```

## 部署到生产环境

```bash
# 查看部署指南
./deploy-guide.sh

# 或阅读详细文档
cat DEPLOYMENT.md
```

## 订阅计划

| 计划 | 价格 | 设备数 | 有效期 |
|------|------|--------|--------|
| 免费版 | ¥0 | 3台 | 30天 |
| 基础版 | ¥199 | 5台 | 1年 |
| 高级版 | ¥499 | 10台 | 1年 |
| 企业版 | ¥1999 | 50台 | 1年 |

## 重要文件

- `DEPLOYMENT.md` - 详细部署指南
- `deploy-guide.sh` - 交互式部署向导
- `start-local.sh` - 本地快速启动
- `.env.example` - 环境变量模板

## 部署平台推荐

1. **Railway.app** ⭐ 推荐
   - 免费额度充足
   - 部署简单
   - 自动 HTTPS

2. **Render.com**
   - 免费层可用
   - 配置简单

3. **阿里云/腾讯云**
   - 国内速度快
   - 需要备案

## 数据库

推荐使用 **MongoDB Atlas** 免费层:
- 512MB 存储
- 全球部署
- 自动备份

## 下一步

1. ✅ 推送代码到 GitHub
2. ✅ 创建 MongoDB Atlas 数据库
3. ✅ 在 Railway 部署服务器
4. ✅ 更新 Chrome 插件配置
5. ✅ 创建测试客户账号
6. ✅ 开始售卖！

详细步骤请运行: `./deploy-guide.sh`
