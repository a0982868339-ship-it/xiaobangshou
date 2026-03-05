#!/bin/bash

echo "=========================================="
echo "   小帮手 - 安全机制升级"
echo "=========================================="
echo ""
echo "本次升级包含："
echo "  ✅ 服务者三重认证（实名+人脸+背调）"
echo "  ✅ 服务过程GPS追踪"
echo "  ✅ 保险保障机制"
echo "  ✅ 投诉举报系统"
echo "  ✅ 信用评分系统"
echo ""
read -p "确定要升级吗？(输入 yes 确认): " confirm

if [ "$confirm" != "yes" ]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "请输入MySQL root密码："
read -s MYSQL_PASSWORD

echo ""
echo "正在应用安全升级..."

# 应用安全升级SQL
mysql -u root -p"$MYSQL_PASSWORD" xiaobangshou < database/security-upgrade.sql 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ 数据库安全升级成功"
else
    echo "❌ 升级失败"
    exit 1
fi

echo ""
echo "验证升级结果..."

mysql -u root -p"$MYSQL_PASSWORD" xiaobangshou <<EOF
SELECT 
    '新增表统计' as info,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'xiaobangshou' AND table_name = 'service_tracking') as '服务追踪表',
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'xiaobangshou' AND table_name = 'insurance_records') as '保险记录表',
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'xiaobangshou' AND table_name = 'complaints') as '投诉表',
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'xiaobangshou' AND table_name = 'provider_verify_logs') as '审核日志表';

SELECT '服务者表新增字段' as info;
DESCRIBE providers;
EOF

echo ""
echo "=========================================="
echo "   ✅ 安全升级完成！"
echo "=========================================="
echo ""
echo "新增功能："
echo "  1. 服务者认证系统（实名+人脸+背调）"
echo "  2. 服务过程GPS追踪"
echo "  3. 保险保障记录"
echo "  4. 投诉举报管理"
echo "  5. 服务者审核日志"
echo "  6. 服务评级标准"
echo ""
echo "下一步："
echo "  1. 查看安全设计文档: cat docs/security-design.md"
echo "  2. 启动系统: ./ALL_IN_ONE.sh"
echo ""

