#!/bin/bash

# ngrok 快速启动脚本 (增强版)
# 用于本地开发环境的内网穿透

echo "========================================="
echo "  🚀 启动 ngrok 内网穿透"
echo "========================================="
echo ""

# 1. 检查 ngrok 是否安装
if ! command -v ngrok &> /dev/null; then
    echo "❌ 错误: 未找到 ngrok 命令"
    echo "   请先安装 ngrok: brew install ngrok/ngrok/ngrok"
    echo "   或者访问 https://ngrok.com/download 下载"
    exit 1
fi

# 2. 检查是否配置了 authtoken
if ! ngrok config check &> /dev/null; then
    echo "⚠️  警告: 未检测到 ngrok authtoken"
    echo "   请登录 https://dashboard.ngrok.com 获取你的 authtoken"
    echo "   然后运行: ngrok config add-authtoken <YOUR_TOKEN>"
    echo ""
fi

# 3. 检查后端服务是否运行
if lsof -ti:3000 > /dev/null; then
    echo "✅ 后端服务已在 3000 端口运行"
else
    echo "⚠️  注意: 后端服务 (3000) 尚未启动"
    echo "   建议在另一个终端运行: npm run dev"
    echo ""
fi

echo "🌐 正在启动 ngrok..."
echo ""
echo "========================================="
echo "💡 使用说明："
echo "   1. 找到 Forwarding 后的地址 (例如: https://abc.ngrok-free.app)"
echo "   2. 将该地址填入 .env 的 ALIPAY_NOTIFY_URL 中："
echo "      ALIPAY_NOTIFY_URL=https://abc.ngrok-free.app/api/alipay/notify"
echo ""
echo "   3. 同样可用于腾讯云 IM 回调："
echo "      https://abc.ngrok-free.app/api/system/im/callback/after-send"
echo ""
echo "   4. 按 Ctrl+C 停止穿透"
echo "========================================="
echo ""

# 启动 ngrok
# 使用 --log=stdout 可以看到更多连接信息
ngrok http 3000
