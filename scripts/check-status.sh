#!/bin/bash

echo "🔍 检查 Chrome 插件鉴权系统状态..."
echo ""

# 检查 MongoDB
echo "1️⃣ 检查 MongoDB 状态..."
if pgrep -x "mongod" > /dev/null; then
    echo "   ✅ MongoDB 正在运行"
else
    echo "   ❌ MongoDB 未运行"
    echo "   💡 启动 MongoDB:"
    echo "      macOS: brew services start mongodb-community"
    echo "      Linux: sudo systemctl start mongod"
    echo ""
fi

# 检查 Node.js
echo "2️⃣ 检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js 已安装: $NODE_VERSION"
else
    echo "   ❌ Node.js 未安装"
    echo "   💡 请安装 Node.js: https://nodejs.org/"
    echo ""
fi

# 检查服务器目录
echo "3️⃣ 检查服务器文件..."
if [ -f "src/index.js" ]; then
    echo "   ✅ 服务器文件存在"
else
    echo "   ❌ 服务器文件不存在"
    echo "   💡 请确保在 dianxiaomi-auth-server 目录下运行"
    echo ""
fi

# 检查 .env 文件
echo "4️⃣ 检查配置文件..."
if [ -f ".env" ]; then
    echo "   ✅ .env 文件存在"
    
    # 检查必需的环境变量
    if grep -q "MONGODB_URI" .env && grep -q "JWT_SECRET" .env; then
        echo "   ✅ 配置项完整"
    else
        echo "   ⚠️  配置项可能不完整"
    fi
else
    echo "   ❌ .env 文件不存在"
    echo "   💡 复制 .env.example 到 .env:"
    echo "      cp .env.example .env"
    echo ""
fi

# 检查依赖
echo "5️⃣ 检查 npm 依赖..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules 存在"
else
    echo "   ❌ node_modules 不存在"
    echo "   💡 安装依赖: npm install"
    echo ""
fi

# 测试 MongoDB 连接
echo "6️⃣ 测试 MongoDB 连接..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.version()" --quiet > /dev/null 2>&1; then
        echo "   ✅ MongoDB 连接成功"
    else
        echo "   ❌ MongoDB 连接失败"
        echo "   💡 检查 MONGODB_URI 配置"
        echo ""
    fi
else
    echo "   ⚠️  mongosh 未安装,跳过连接测试"
fi

# 检查服务器是否运行
echo "7️⃣ 检查服务器状态..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "   ✅ 服务器正在运行"
    echo ""
    curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || echo "   服务器响应正常"
else
    echo "   ❌ 服务器未运行"
    echo "   💡 启动服务器: npm start"
    echo ""
fi

echo ""
echo "=" 
echo "📋 诊断完成"
echo ""
echo "💡 如果所有检查都通过,请尝试:"
echo "   1. npm start             # 启动服务器"
echo "   2. npm run create-test-users  # 创建测试账号"
echo ""
echo "🐛 如果仍有问题,请查看:"
echo "   - 服务器日志"
echo "   - 浏览器控制台 (F12)"
echo "   - Chrome 扩展错误页面"
echo ""
