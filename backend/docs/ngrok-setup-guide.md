# ngrok 内网穿透配置指南

## 📦 Step 1: 安装 ngrok

```bash
# macOS 使用 Homebrew 安装
brew install ngrok/ngrok/ngrok

# 如果没有 Homebrew，可以直接下载
# 访问 https://ngrok.com/download 下载 macOS 版本
```

## 🔑 Step 2: 注册并获取 authtoken（推荐）

注册后可以获得稳定的域名和更长的会话时间。

1. 访问 https://dashboard.ngrok.com/signup
2. 注册免费账号
3. 登录后访问 https://dashboard.ngrok.com/get-started/your-authtoken
4. 复制你的 authtoken

```bash
# 配置 authtoken（只需执行一次）
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## 🚀 Step 3: 启动后端服务

```bash
cd /Users/yangtianjun/xiaobangshou/backend
npm run dev
```

确保后端在 **3000** 端口正常运行。

## 🌐 Step 4: 启动 ngrok 映射

打开**新的终端窗口**，执行：

```bash
ngrok http 3000
```

你会看到类似输出：

```
ngrok                                                                   

Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.x.x
Region                        Asia Pacific (ap)
Latency                       12ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**重要：记下 Forwarding 的 HTTPS 地址**，例如：
```
https://abc123def456.ngrok-free.app
```

⚠️ **保持这个终端窗口打开**，关闭后映射会失效。

## ✅ Step 5: 测试 ngrok 是否正常

在浏览器访问：
```
https://abc123def456.ngrok-free.app/api/system/configs/public
```

如果能看到返回数据，说明 ngrok 配置成功！

## 🔧 Step 6: 配置腾讯云 IM 回调

### 6.1 登录腾讯云 IM 控制台

访问：https://console.cloud.tencent.com/im

### 6.2 进入回调配置

1. 左侧菜单选择「应用配置」
2. 找到你的应用（应该是 xiaobangshou 相关）
3. 点击「回调配置」

### 6.3 配置回调 URL

1. 点击「编辑」或「配置」
2. **回调 URL** 填写：
   ```
   https://abc123def456.ngrok-free.app/api/system/im/callback/after-send
   ```
   （替换为你的实际 ngrok 地址）

3. **勾选回调事件**：
   - ✅ **单聊消息发送后回调** (C2C.CallbackAfterSendMsg)
   - ✅ 单聊消息发送前回调 (可选)

4. 点击「保存」

### 6.4 验证回调配置

腾讯云可能会立即发送一个测试请求到你的回调 URL 进行验证。

如果验证失败，检查：
- ngrok 是否正常运行
- 后端服务是否正常运行
- URL 是否正确（注意 `/api/system/im/callback/after-send`）

## 🧪 Step 7: 测试消息推送

### 7.1 准备两个测试账号

- **用户A**（C端）：发送消息
- **用户B**（服务者端）：接收消息

### 7.2 用户A 发送消息

在 C端应用中，用户A 向用户B 发送一条消息。

### 7.3 查看后端日志

在运行后端的终端窗口，应该能看到：

```
[IM] 消息推送成功: userA_id -> userB_id
```

### 7.4 查看 ngrok 日志

在运行 ngrok 的终端窗口，应该能看到请求记录：

```
POST /api/system/im/callback/after-send   200 OK
```

### 7.5 验证前端

如果前端已集成 Socket 监听，用户B 应该：
- ✅ 收到消息通知
- ✅ 看到弹窗提醒
- ✅ 消息列表更新

## 🎨 Step 8: ngrok Web UI（可选）

ngrok 提供了一个本地 Web 界面，可以查看所有请求：

访问：http://localhost:4040

在这里你可以：
- 查看所有 HTTP 请求
- 检查请求和响应内容
- 重放请求（Replay）

## ⚠️ 常见问题

### Q1: ngrok 提示 "Session Expired"
**A**: 免费版 ngrok 会话有时间限制（约8小时）。重新运行 `ngrok http 3000` 即可。

### Q2: ngrok 地址每次都变
**A**: 免费版每次启动地址会变。注册账号后可以配置固定域名，或考虑付费版。

### Q3: 腾讯云回调验证失败
**A**: 检查：
1. 后端服务是否正常运行
2. ngrok 是否正常运行
3. URL 是否完全正确（包括 https://）
4. 后端是否有防火墙/安全组限制

### Q4: 看到日志但前端收不到
**A**: 前端 Socket 监听可能未正确初始化，参考 `frontend-integration/README.md`

### Q5: 本地开发够用了，但生产环境怎么办？
**A**: 部署到服务器后，使用真实域名配置腾讯云回调：
```
https://api.yourdomain.com/api/system/im/callback/after-send
```

## 📝 快速命令参考

```bash
# 1. 启动后端
cd /Users/yangtianjun/xiaobangshou/backend && npm run dev

# 2. 启动 ngrok（新终端窗口）
ngrok http 3000

# 3. 查看后端日志
tail -f /Users/yangtianjun/xiaobangshou/backend/logs/combined.log

# 4. 测试回调 URL（可选）
curl -X POST https://your-ngrok-url.ngrok-free.app/api/system/im/callback/after-send
```

## ✅ 完成检查清单

- [ ] ngrok 已安装
- [ ] ngrok 已启动，获得 HTTPS 地址
- [ ] 后端服务正常运行
- [ ] 腾讯云 IM 回调已配置
- [ ] 发送测试消息后，后端日志显示 `[IM] 消息推送成功`
- [ ] ngrok Web UI 显示回调请求
- [ ] 前端（可选）已集成 Socket 监听

---

**下一步：** 前端集成 Socket 监听，参考 `frontend-integration/README.md`
