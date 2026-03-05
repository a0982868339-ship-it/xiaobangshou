#!/bin/bash
echo "========================================"
echo "  测试腾讯云 IM 回调接口"
echo "========================================"
echo ""
echo "正在测试..."
echo ""

curl -X POST https://5de8fe70bbfa.ngrok-free.app/api/system/im/callback/after-send \
  -H "Content-Type: application/json" \
  -d '{
    "MsgBody": [{"MsgType": "TIMTextElem", "MsgContent": {"Text": "这是一条测试消息"}}],
    "From_Account": "1",
    "To_Account": "4",
    "MsgSeq": 12345,
    "MsgRandom": 67890,
    "MsgTime": 1737789600
  }'

echo ""
echo ""
echo "如果返回 {\"ActionStatus\":\"OK\",\"ErrorCode\":0}"
echo "说明接口正常，可以配置到腾讯云了！"
echo ""
echo "配置地址："
echo "https://5de8fe70bbfa.ngrok-free.app/api/system/im/callback/after-send"
echo ""
