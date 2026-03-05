#!/bin/bash

echo "=========================================="
echo "   🔧 正在恢复小帮手项目..."
echo "=========================================="

cd /Users/yangtianjun/xiaobangshou

# 恢复 backend/src
echo "1. 恢复后端源代码..."
mkdir -p backend/src/{config,controllers,middlewares,routes,utils}

# 恢复 client-user
echo "2. 恢复用户端..."
mkdir -p client-user/{pages/{index,category,order,user,login},components,static/styles,store,utils}

# 恢复 client-provider  
echo "3. 恢复服务者端..."
mkdir -p client-provider/{pages/{index,user},store,utils}

# 恢复文档
echo "4. 恢复文档文件..."
mkdir -p docs

echo ""
echo "=========================================="
echo "   ✅ 目录结构已恢复！"
echo "=========================================="
echo ""
echo "注意：源代码文件需要手动恢复或从备份中导入"
echo ""
echo "当前可用的部分："
echo "  ✅ admin-web (Web管理后台)"
echo "  ✅ database (数据库文件)"
echo "  ✅ backend/.env (配置文件)"
echo ""

