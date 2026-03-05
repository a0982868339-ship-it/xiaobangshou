# 🚀 腾讯云 IM 回调配置 - 最后一步

## ✅ 当前状态

- ✅ 后端服务正常运行（端口 3000）
- ✅ ngrok 已启动
- ✅ 公网地址：`https://5de8fe70bbfa.ngrok-free.app`

## ⚠️ 待完成

- ❌ **腾讯云 IM 回调 URL 未配置**（这就是为什么没有反应）

---

## 📋 配置步骤（5分钟搞定）

### Step 1: 访问腾讯云 IM 控制台

在浏览器打开：**https://console.cloud.tencent.com/im**

### Step 2: 找到你的应用

在应用列表中找到「小帮手」相关的应用，点击进入。

### Step 3: 进入回调配置

左侧菜单：**基础配置** → **回调配置** → 点击「编辑」按钮

### Step 4: 填写回调 URL

在回调 URL 输入框填写：

```
https://5de8fe70bbfa.ngrok-free.app/api/system/im/callback/after-send
```

⚠️ **注意**：
- 必须是完整的 HTTPS 地址
- 路径必须是 `/api/system/im/callback/after-send`
- 不要有多余的空格

### Step 5: 勾选回调事件

在「回调事件」列表中，找到并勾选：

- ✅ **单聊消息发送后回调** (After.Msg.SendMsg)

其他事件可以不勾选。

### Step 6: 保存配置

点击「保存」或「确定」按钮。

腾讯云可能会立即发送一个测试请求验证 URL 是否可访问。

---

## 🧪 验证配置是否生效

### 方法1: 发送测试消息

1. **用户A（C端）** 向 **用户B（服务者端）** 发送一条消息
2. 打开后端日志终端，应该立即看到：
   ```
   [IM] 消息推送成功: 1 -> 4
   ```

### 方法2: 查看 ngrok 请求日志

访问：**http://localhost:4040**

在 Web UI 中应该能看到来自腾讯云的 POST 请求。

### 方法3: 手动测试回调 URL

在终端执行：

```bash
curl -X POST https://5de8fe70bbfa.ngrok-free.app/api/system/im/callback/after-send \
  -H "Content-Type: application/json" \
  -d '{
    "MsgBody": [{"MsgType": "TIMTextElem", "MsgContent": {"Text": "测试消息"}}],
    "From_Account": "1",
    "To_Account": "4",
    "MsgSeq": 12345,
    "MsgRandom": 67890,
    "MsgTime": 1737789600
  }'
```

如果返回 `{"ActionStatus":"OK","ErrorCode":0}`，说明后端接口正常。

---

## 🎯 配置完成后的效果

配置成功后：

1. **C端用户发送消息** → 腾讯云 IM 接收
2. **腾讯云 IM** → 回调你的后端 `https://5de8fe70bbfa.ngrok-free.app/api/system/im/callback/after-send`
3. **后端** → 通过 Socket.io 推送给 B端用户
4. **B端用户** → 收到通知（前提是前端已集成 Socket 监听）

---

## ❌ 常见问题

**Q: 保存时提示"回调 URL 验证失败"？**

A: 可能原因：
1. ngrok 未运行或已断开
2. 后端服务未运行
3. URL 填写错误（检查是否有拼写错误）

解决方法：
```bash
# 检查 ngrok 是否运行
curl http://localhost:4040/api/tunnels

# 检查后端是否运行
curl http://localhost:3000/api/system/configs/public

# 测试回调 URL
curl -X POST https://5de8fe70bbfa.ngrok-free.app/api/system/im/callback/after-send
```

**Q: 配置成功但还是没反应？**

A: 检查：
1. 后端日志是否有 `[IM] 消息推送成功` 的输出
2. 前端是否已集成 Socket 监听（这是关键！）
3. Socket 是否已连接（日志应该有 `Socket Connected` 记录）

**Q: ngrok 地址会变吗？**

A: 免费版每次重启地址会变，需要重新配置腾讯云。
付费版或注册后可以获得固定域名。

---

## 📞 下一步

配置完成后，如果后端日志显示推送成功，但前端还是没反应，那就需要：

**集成前端 Socket 监听**

参考文档：`frontend-integration/README.md`

需要我帮你写前端代码吗？

---

## 🔧 临时测试方案（不需要配置腾讯云）

如果暂时不想配置腾讯云，可以在浏览器控制台直接测试 Socket 推送：

```javascript
// 在前端浏览器控制台执行
fetch('/api/system/test/push-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  },
  body: JSON.stringify({
    toUserId: '4',  // 接收方用户ID
    message: '这是一条测试消息'
  })
}).then(r => r.json()).then(console.log);
```

这样可以立即验证 Socket 推送是否正常工作。
