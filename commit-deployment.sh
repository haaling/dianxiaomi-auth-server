#!/bin/bash

# 提交所有部署相关的文件到 Git

echo "📦 准备提交部署配置..."
echo ""

cd /Users/bilibili/dxm/dianxiaomi-auth-server

# 显示将要提交的文件
echo "📄 将提交以下文件："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Dockerfile (Docker 配置)"
echo "  ✓ railway.json (Railway 配置)"
echo "  ✓ render.yaml (Render 配置)"
echo "  ✓ DEPLOYMENT.md (部署文档)"
echo "  ✓ QUICK_START_DEPLOY.md (快速开始)"
echo "  ✓ deploy-guide.sh (部署向导)"
echo "  ✓ start-local.sh (本地启动)"
echo "  ✓ scripts/create-customer-account.js (客户管理)"
echo "  ✓ scripts/list-accounts.js (账号列表)"
echo "  ✓ package.json (新增命令)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 添加文件
git add Dockerfile railway.json render.yaml
git add DEPLOYMENT.md QUICK_START_DEPLOY.md
git add deploy-guide.sh start-local.sh
git add scripts/create-customer-account.js scripts/list-accounts.js
git add package.json

# 显示状态
echo "📊 Git 状态："
git status --short

echo ""
read -p "确认提交这些文件？(y/n): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    # 提交
    git commit -m "feat: 添加部署配置和客户管理工具

- 添加 Docker/Railway/Render 部署配置
- 添加客户账号创建和管理工具
- 添加详细部署文档
- 添加一键部署脚本"
    
    echo ""
    echo "✅ 已提交到本地仓库"
    echo ""
    
    read -p "是否推送到远程仓库？(y/n): " push
    
    if [ "$push" = "y" ] || [ "$push" = "Y" ]; then
        git push
        echo ""
        echo "✅ 已推送到 GitHub"
        echo ""
        echo "🎉 现在可以在 Railway 部署了！"
        echo ""
        echo "下一步："
        echo "  1. 访问 https://railway.app/"
        echo "  2. 连接你的 GitHub 仓库"
        echo "  3. 部署 dianxiaomi-auth-server"
    fi
else
    echo "❌ 已取消提交"
fi
