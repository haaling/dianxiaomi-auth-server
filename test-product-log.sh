#!/bin/bash

# 产品日志 API 测试脚本

# 配置
API_BASE_URL="https://dianxiaomi-auth-server-production.up.railway.app/api"
# 请替换为实际的 token
TOKEN="your_token_here"

echo "========================================="
echo "产品日志 API 测试"
echo "========================================="
echo ""

# 测试1: 记录产品日志
echo "1. 测试记录产品日志..."
curl -X POST "${API_BASE_URL}/product/log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "originalTitle": "测试产品标题 - iPhone 15 Pro Max",
    "sourceUrl": "https://www.aliexpress.com/item/123456.html",
    "optimizedTitle": "【优化版】iPhone 15 Pro Max - 256GB",
    "action": "optimizeTitle"
  }' | jq '.'
echo ""
echo ""

# 测试2: 获取产品日志列表
echo "2. 测试获取产品日志列表..."
curl -X GET "${API_BASE_URL}/product/logs?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
echo ""
echo ""

# 测试3: 获取统计数据
echo "3. 测试获取统计数据..."
curl -X GET "${API_BASE_URL}/product/stats" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.'
echo ""
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
