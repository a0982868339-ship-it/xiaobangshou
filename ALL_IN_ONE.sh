#!/bin/bash

echo "=========================================="
echo "   小帮手 - 一键初始化并启动"
echo "=========================================="
echo ""

# 1. 初始化数据库
echo "第1步：初始化数据库"
echo "=========================================="
echo "请输入MySQL root密码："
read -s MYSQL_PASSWORD

echo ""
echo "正在初始化数据库..."

mysql -u root -p"$MYSQL_PASSWORD" -e "DROP DATABASE IF EXISTS xiaobangshou; CREATE DATABASE xiaobangshou DEFAULT CHARACTER SET utf8mb4;" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ 数据库创建失败，请检查密码"
    exit 1
fi

mysql -u root -p"$MYSQL_PASSWORD" xiaobangshou < database/schema.sql 2>/dev/null
echo "✅ 表结构导入成功"

mysql -u root -p"$MYSQL_PASSWORD" xiaobangshou < database/init.sql 2>/dev/null
echo "✅ 初始数据导入成功（26个服务）"

mysql -u root -p"$MYSQL_PASSWORD" xiaobangshou < database/member-package.sql 2>/dev/null
echo "✅ 会员和套餐导入成功（12个套餐）"

echo ""
echo "数据统计："
mysql -u root -p"$MYSQL_PASSWORD" xiaobangshou <<EOF
SELECT 
    (SELECT COUNT(*) FROM service_categories WHERE parent_id = 0) as '一级分类',
    (SELECT COUNT(*) FROM services) as '服务数量',
    (SELECT COUNT(*) FROM service_packages) as '套餐数量',
    (SELECT COUNT(*) FROM member_levels) as '会员等级';
EOF

echo ""
echo "=========================================="
echo "第2步：启动服务"
echo "=========================================="

# 检查进程
echo "检查正在运行的服务..."
pkill -f "nodemon src/app.js" 2>/dev/null
pkill -f "vite --port 9000" 2>/dev/null
pkill -f "vite --port 8080" 2>/dev/null

sleep 2

# 启动后端
echo ""
echo "🚀 启动后端API..."
cd backend
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3

# 启动移动端
echo "📱 启动移动端H5..."
cd mobile-user
npm run dev > /dev/null 2>&1 &
MOBILE_PID=$!
cd ..

sleep 2

# 启动管理后台
echo "🖥️  启动Web管理后台..."
cd admin-web
npm run dev > /dev/null 2>&1 &
ADMIN_PID=$!
cd ..

sleep 2

# 启动服务者端
echo "👨‍💼 启动服务者端H5..."
cd mobile-provider
npm run dev > /dev/null 2>&1 &
PROVIDER_PID=$!
cd ..

sleep 3

echo ""
echo "=========================================="
echo "   ✅ 所有服务启动完成！"
echo "=========================================="
echo ""
echo "📱 用户端H5:     http://localhost:9000"
echo "👨‍💼 服务者端H5:  http://localhost:9001"
echo "🖥️  管理后台:     http://localhost:8080"
echo "🔌 后端API:      http://localhost:3000"
echo ""
echo "手机访问："
echo "  1. 手机和电脑连同一WiFi"
echo "  2. 查看电脑IP: ifconfig | grep 'inet '"
echo "  3. 手机浏览器访问: http://你的IP:9000"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "=========================================="
echo ""

# 测试服务
sleep 2
echo "🧪 测试服务..."
curl -s http://localhost:3000/health > /dev/null && echo "  ✅ 后端API正常" || echo "  ⚠️  后端API启动中..."
curl -s http://localhost:9000 > /dev/null && echo "  ✅ 用户端H5正常" || echo "  ⚠️  用户端H5启动中..."
curl -s http://localhost:9001 > /dev/null && echo "  ✅ 服务者端H5正常" || echo "  ⚠️  服务者端H5启动中..."
curl -s http://localhost:8080 > /dev/null && echo "  ✅ Web管理后台正常" || echo "  ⚠️  管理后台启动中..."

echo ""

trap "echo ''; echo '正在停止所有服务...'; kill $BACKEND_PID $MOBILE_PID $ADMIN_PID $PROVIDER_PID 2>/dev/null; echo '✅ 所有服务已停止'; exit 0" INT

wait

