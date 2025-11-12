#!/bin/bash

# API测试脚本
# 使用方法: chmod +x test-api.sh && ./test-api.sh

echo "========================================="
echo "点小蜜认证服务器 API 测试"
echo "========================================="
echo ""

API_URL="http://localhost:3000/api"

# 1. 测试健康检查
echo "1️⃣  测试健康检查..."
curl -s http://localhost:3000/health | jq .
echo ""

# 2. 测试用户注册
echo "2️⃣  测试用户注册..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$REGISTER_RESPONSE" | jq .

# 提取 Token
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token')
echo ""
echo "✅ Token: $TOKEN"
echo ""

# 3. 测试用户登录
echo "3️⃣  测试用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq .
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
echo ""

# 4. 测试获取订阅状态
echo "4️⃣  测试获取订阅状态..."
curl -s -X GET "$API_URL/subscription/status" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# 5. 测试设备注册
echo "5️⃣  测试设备注册..."
DEVICE_ID="test-device-$(date +%s)"
curl -s -X POST "$API_URL/device/register" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\",
    \"deviceName\": \"Test Device\",
    \"deviceInfo\": {
      \"browser\": \"Chrome\",
      \"os\": \"macOS\"
    }
  }" | jq .
echo ""

# 6. 测试设备验证
echo "6️⃣  测试设备验证..."
curl -s -X POST "$API_URL/device/verify" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"deviceId\": \"$DEVICE_ID\"
  }" | jq .
echo ""

# 7. 测试获取设备列表
echo "7️⃣  测试获取设备列表..."
curl -s -X GET "$API_URL/device/list" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

# 8. 测试订阅升级
echo "8️⃣  测试订阅升级（升级到 Premium）..."
curl -s -X POST "$API_URL/subscription/subscribe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "premium",
    "duration": 1
  }' | jq .
echo ""

# 9. 测试获取当前订阅
echo "9️⃣  测试获取当前订阅..."
curl -s -X GET "$API_URL/subscription/current" \
  -H "Authorization: Bearer $TOKEN" | jq .
echo ""

echo "========================================="
echo "✅ 测试完成！"
echo "========================================="
