#!/bin/bash

# 小帮手平台一键启动脚本
# 使用方法: bash START_NOW.sh

echo "------------------------------------------"
echo "🚀 正在初始化小帮手全量服务..."
echo "------------------------------------------"

# 1. 环境清理
echo ">> [1/5] 清理残留进程..."
pkill -9 node 2>/dev/null
pkill -9 vite 2>/dev/null
pkill -9 nodemon 2>/dev/null
sleep 2

# 创建日志目录
mkdir -p logs

# 2. 启动后端 API (端口 3000)
echo ">> [2/5] 启动后端 API (3000)..."
cd backend && npm run dev > ../logs/backend.log 2>&1 &
sleep 6

# 3. 启动用户端 (端口 9000)
echo ">> [3/5] 启动移动端-用户 (9000)..."
cd mobile-user && npm run dev > ../logs/user.log 2>&1 &
sleep 2

# 4. 启动服务者端 (端口 9001)
echo ">> [4/5] 启动移动端-服务者 (9001)..."
cd mobile-provider && npm run dev > ../logs/provider.log 2>&1 &
sleep 2

# 5. 启动管理后台 (端口 8080)
echo ">> [5/5] 启动管理后台 (8080)..."
cd admin-web && npm run dev > ../logs/admin.log 2>&1 &
sleep 5

echo "------------------------------------------"
echo "✅ 所有服务已尝试拉起！"
echo "------------------------------------------"
echo "🔌 后端 API:   http://localhost:3000"
echo "👤 用户端:     http://localhost:9000"
echo "👨‍💼 服务者端:   http://localhost:9001"
echo "🖥️ 管理后台:   http://localhost:8080"
echo "------------------------------------------"
echo "💡 如果页面无法访问，请稍等 10 秒让 Vite 完成编译。"
echo "📄 查看日志:   tail -f logs/backend.log"
echo "------------------------------------------"
