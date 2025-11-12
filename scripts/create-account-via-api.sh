#!/bin/bash

# 通过管理员 API 创建用户账号（安全版本）
# 需要配置 ADMIN_API_KEY 环境变量

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器地址
API_URL="${API_URL:-https://dianxiaomi-auth-server-production.up.railway.app}"

# 检查是否设置了 ADMIN_API_KEY
if [ -z "$ADMIN_API_KEY" ]; then
  echo -e "${RED}错误: 请先设置 ADMIN_API_KEY 环境变量${NC}"
  echo "示例: export ADMIN_API_KEY='your-secret-api-key'"
  exit 1
fi

echo -e "${GREEN}=== 点小蜜 - 创建客户账号 (安全版本) ===${NC}"
echo ""

# 读取用户输入
read -p "用户名: " username
read -p "邮箱: " email
read -sp "密码: " password
echo ""

# 读取套餐类型
echo ""
echo "套餐选择:"
echo "1) free - 免费版 (3设备, 30天)"
echo "2) basic - 基础版 (5设备, 365天)"
echo "3) premium - 高级版 (10设备, 365天)"
echo "4) enterprise - 企业版 (50设备, 365天)"
echo "5) 自定义"
read -p "请选择 (1-5): " plan_choice

case $plan_choice in
  1)
    plan="free"
    ;;
  2)
    plan="basic"
    ;;
  3)
    plan="premium"
    ;;
  4)
    plan="enterprise"
    ;;
  5)
    read -p "套餐名称: " plan
    read -p "最大设备数: " max_devices
    read -p "有效天数: " valid_days
    ;;
  *)
    echo -e "${RED}无效选择${NC}"
    exit 1
    ;;
esac

# 构建 JSON 数据
if [ "$plan_choice" = "5" ]; then
  json_data=$(cat <<EOF
{
  "username": "$username",
  "email": "$email",
  "password": "$password",
  "plan": "$plan",
  "maxDevices": $max_devices,
  "validDays": $valid_days
}
EOF
)
else
  json_data=$(cat <<EOF
{
  "username": "$username",
  "email": "$email",
  "password": "$password",
  "plan": "$plan"
}
EOF
)
fi

echo ""
echo -e "${YELLOW}正在创建账号...${NC}"

# 发送请求
response=$(curl -sS -X POST "${API_URL}/api/admin/create-user" \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: ${ADMIN_API_KEY}" \
  -d "$json_data" \
  --max-time 30)

# 检查响应
if echo "$response" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ 账号创建成功!${NC}"
  echo ""
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
  echo -e "${RED}✗ 创建失败${NC}"
  echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  exit 1
fi
