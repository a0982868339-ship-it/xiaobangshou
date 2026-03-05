# 即时消息通知集成指南

本文档说明如何在前端集成实时消息通知功能，使得用户和服务者之间发送消息时能够实时弹出通知。

## 架构说明

```
用户A发消息 → 腾讯云IM → 后端Callback → Socket推送 → 用户B前端弹窗
```

## 后端已完成

✅ **后端部分已全部实现**：
- `imCallbackController.afterSendMsg` - 消息送达后的回调处理
- Socket.io 实时推送 (`NEW_MESSAGE` 和 `UNREAD_COUNT_UPDATE` 事件)
- 数据库表创建脚本（`chat_messages` 和 `chat_conversations`）

## 前端集成步骤

### 第一步：安装依赖

```bash
# 在 mobile-user 或 mobile-provider 目录下执行
npm install socket.io-client
```

### 第二步：复制 Socket 监听工具

将 `frontend-integration/socketListener.js` 复制到项目中：

```bash
# 用户端
cp frontend-integration/socketListener.js mobile-user/src/utils/socketListener.js

# 服务者端
cp frontend-integration/socketListener.js mobile-provider/src/utils/socketListener.js
```

### 第三步：在 App.vue 中初始化

**示例代码（App.vue 或 main.js）：**

```vue
<script>
import { initSocketListener, disconnectSocket } from '@/utils/socketListener';
import { getToken } from '@/utils/auth'; // 假设你有获取 token 的方法

export default {
  onLaunch() {
    const token = getToken();
    
    if (token) {
      // 初始化 Socket 监听
      initSocketListener({
        serverUrl: process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000',
        token: token,
        
        // 收到新消息的回调
        onNewMessage: (data) => {
          const { fromNickname, content, fromUserId } = data;
          
          // 显示通知（uni-app 示例）
          uni.showToast({
            title: `${fromNickname}: ${content}`,
            icon: 'none',
            duration: 3000
          });
          
          // 或使用自定义弹窗组件
          // this.$refs.chatPopup.show(data);
          
          // 可选：跳转到聊天页面
          // uni.navigateTo({ url: `/pages/chat/index?userId=${fromUserId}` });
        },
        
        // 未读计数更新的回调
        onUnreadUpdate: (data) => {
          // 更新全局未读计数（例如存储到 Vuex）
          // this.$store.commit('setUnreadCount', data.count);
          console.log('未读消息数:', data.count);
        }
      });
    }
  },
  
  onHide() {
    // 应用进入后台时可选择断开连接（节省资源）
    // disconnectSocket();
  }
}
</script>
```

### 第四步：配置环境变量

在 `.env` 文件中配置 API 地址：

```env
VUE_APP_API_BASE_URL=https://your-api-domain.com
```

### 第五步：后端配置腾讯云 IM 回调（重要）

登录腾讯云 IM 控制台，配置回调 URL：

```
回调类型: 单聊消息发送后回调
回调 URL: https://your-api-domain.com/api/system/im/callback/after-send
```

### 第六步：执行数据库迁移（可选）

如果需要离线消息和未读计数功能，执行以下 SQL：

```bash
mysql -u root -p your_database < backend/migrations/add_chat_tables.sql
```

---

## 高级定制

### 自定义通知样式

你可以创建自己的通知组件：

```vue
<template>
  <view class="chat-notification" v-if="visible" @click="handleClick">
    <image :src="avatar" class="avatar"></image>
    <view class="content">
      <text class="nickname">{{ nickname }}</text>
      <text class="message">{{ message }}</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      visible: false,
      nickname: '',
      message: '',
      avatar: '',
      fromUserId: ''
    }
  },
  methods: {
    show(data) {
      this.visible = true;
      this.nickname = data.fromNickname;
      this.message = data.content;
      this.avatar = data.fromAvatar;
      this.fromUserId = data.fromUserId;
      
      // 3秒后自动隐藏
      setTimeout(() => {
        this.visible = false;
      }, 3000);
    },
    handleClick() {
      // 跳转到聊天页面
      uni.navigateTo({
        url: `/pages/chat/index?userId=${this.fromUserId}`
      });
    }
  }
}
</script>

<style scoped>
.chat-notification {
  position: fixed;
  top: 20px;
  left: 20px;
  right: 20px;
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 9999;
  display: flex;
  align-items: center;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  margin-right: 12px;
}
.nickname {
  font-weight: bold;
  font-size: 14px;
}
.message {
  color: #666;
  font-size: 13px;
}
</style>
```

然后在 `onNewMessage` 中调用：

```javascript
onNewMessage: (data) => {
  this.$refs.chatNotification.show(data);
}
```

---

## 事件说明

### NEW_MESSAGE 事件

接收到的数据格式：

```javascript
{
  fromUserId: '发送者ID',
  fromNickname: '发送者昵称',
  fromAvatar: '发送者头像URL',
  content: '消息内容',
  msgType: 'text', // 或 'image'
  timestamp: 1234567890,
  messageId: '消息唯一ID'
}
```

### UNREAD_COUNT_UPDATE 事件

接收到的数据格式：

```javascript
{
  count: 5 // 未读消息总数
}
```

---

## 故障排查

1. **Socket 连接失败**  
   检查 token 是否有效，服务器地址是否正确

2. **收不到消息通知**  
   - 确认腾讯云 IM 回调已配置
   - 检查后端日志是否有 `[IM] 消息推送成功` 输出
   - 验证 Socket 是否已连接（查看浏览器控制台）

3. **数据库错误**  
   如果看到 `消息存储失败` 警告，执行数据库迁移脚本

---

## 注意事项

- ✅ 不影响现有业务逻辑和 UI
- ✅ 完全可选，不执行数据库迁移也能正常推送通知
- ✅ 支持用户端和服务者端双向通知
- ✅ 离线消息需要数据库表支持
