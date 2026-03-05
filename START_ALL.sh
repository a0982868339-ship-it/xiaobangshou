#!/bin/bash

echo "=== 小帮手平台全量启动脚本 ==="
echo ""

# 1. 彻底杀死所有残留进程
echo ">> 清理残留进程..."
pkill -9 node 2>/dev/null
pkill -9 vite 2>/dev/null
pkill -9 nodemon 2>/dev/null
sleep 3

# 2. 启动后端 API
echo ">> 启动后端 API (3000)..."
cd /Users/yangtianjun/xiaobangshou/backend && npm run dev > ../logs/backend.log 2>&1 &
sleep 6

# 3. 启动用户端
echo ">> 启动用户端 (9000)..."
cd /Users/yangtianjun/xiaobangshou/mobile-user && npm run dev > ../logs/user.log 2>&1 &
sleep 3

# 4. 启动服务者端
echo ">> 启动服务者端 (9001)..."
cd /Users/yangtianjun/xiaobangshou/mobile-provider && npm run dev > ../logs/provider.log 2>&1 &
sleep 3

# 5. 启动管理后台
echo ">> 启动管理后台 (8080)..."
cd /Users/yangtianjun/xiaobangshou/admin-web && npm run dev > ../logs/admin.log 2>&1 &
sleep 5

# 6. 验证端口
echo ""
echo "=== 端口监听状态 ==="
lsof -i :3000 -i :8080 -i :9000 -i :9001 | grep LISTEN

echo ""
echo "=== 全部启动完成 ==="
echo ">> 后端 API: http://localhost:3000"
echo ">> 用户端: http://localhost:9000"
echo ">> 服务者端: http://localhost:9001"
echo ">> 管理后台: http://localhost:8080"
