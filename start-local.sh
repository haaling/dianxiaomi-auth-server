#!/bin/bash

# 店小秘认证系统 - 本地测试脚本

echo "🚀 启动本地测试环境..."
echo ""

# 检查 MongoDB
echo "📊 检查 MongoDB 状态..."
if brew services list | grep mongodb-community@8.0 | grep started > /dev/null; then
    echo "✅ MongoDB 正在运行"
else
    echo "⚠️  MongoDB 未运行，正在启动..."
    brew services start mongodb-community@8.0
    sleep 3
fi

echo ""

# 检查并停止占用 3000 端口的进程
echo "🔍 检查端口 3000..."
PORT_PID=$(lsof -ti:3000)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  端口 3000 被占用 (PID: $PORT_PID)，正在停止..."
    kill -9 $PORT_PID 2>/dev/null
    sleep 1
    echo "✅ 已停止旧进程"
fi

echo ""
echo "📝 环境信息："
echo "   工作目录: $(pwd)"
echo "   Node 版本: $(node -v)"
echo "   MongoDB: localhost:27017"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，从 .env.example 创建..."
    cp .env.example .env
    echo "✅ 已创建 .env 文件"
    echo ""
fi

echo "🔧 启动认证服务器..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动服务器
npm start

