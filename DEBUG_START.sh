#!/bin/bash

echo "=========================================="
echo "   小帮手 - 启动与调试脚本"
echo "=========================================="
echo ""

cd /Users/yangtianjun/xiaobangshou

# 1. 检查数据库
echo "1️⃣ 检查 MySQL 数据库..."
mysql -u root -proot -e "SELECT COUNT(*) as count FROM xiaobangshou.services;" 2>/dev/null && echo "   ✅ 数据库连接正常" || echo "   ❌ 数据库连接失败"

echo ""
echo "2️⃣ 启动后端 API (端口 3000)..."
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 3

# 测试后端
curl -s http://localhost:3000/health > /dev/null && echo "   ✅ 后端启动成功" || echo "   ❌ 后端启动失败"

echo ""
echo "3️⃣ 启动用户端 H5 (端口 9000)..."
cd mobile-user
npm run dev > ../logs/user.log 2>&1 &
cd ..
sleep 2

echo ""
echo "4️⃣ 启动服务者端 H5 (端口 9001)..."
cd mobile-provider
npm run dev > ../logs/provider.log 2>&1 &
cd ..
sleep 2

echo ""
echo "5️⃣ 启动管理后台 (端口 8080)..."
cd admin-web
npm run dev > ../logs/admin.log 2>&1 &
cd ..
sleep 3

echo ""
echo "=========================================="
echo "   🚀 所有服务已启动！"
echo "=========================================="
echo ""
echo "📱 用户端:     http://localhost:9000"
echo "👨‍💼 服务者端:  http://localhost:9001"
echo "🖥️  管理后台:   http://localhost:8080"
echo "🔌 后端 API:   http://localhost:3000"
echo ""
echo "=========================================="
echo "   🧪 快速测试"
echo "=========================================="
echo ""
echo "# 测试后端健康"
curl -s http://localhost:3000/health
echo ""
echo ""
echo "# 测试服务分类 API"
curl -s http://localhost:3000/api/services/categories | head -c 200
echo "..."
echo ""
echo ""
echo "=========================================="
echo "   📊 调试信息"
echo "=========================================="
echo ""
echo "查看日志："
echo "  后端日志: tail -f logs/backend.log"
echo "  用户端日志: tail -f logs/user.log"
echo "  服务者端日志: tail -f logs/provider.log"
echo ""
echo "停止服务："
echo "  kill $BACKEND_PID 或 pkill -f nodemon && pkill -f vite"
echo ""
echo "=========================================="
echo ""

trap "echo ''; echo '正在停止所有服务...'; kill $BACKEND_PID 2>/dev/null; pkill -f vite; echo '✅ 所有服务已停止'; exit 0" INT

wait
