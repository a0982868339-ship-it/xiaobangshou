# 小帮手 (XiaoBangShou) — O2O 喂猫遛狗陪诊平台

[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql)](https://www.mysql.com/)

> 一个面向本地生活服务的全链路 O2O 履约系统，覆盖用户端、服务者端、管理后台与后端核心能力。

---

## 一句话概览

小帮手通过 **LBS 智能调度 + 订单全流程实时同步 + 资金担保结算** 构建家政服务闭环，兼顾 C 端体验、B 端效率与平台治理能力。

---

## 适用场景与商业价值

- O2O平台搭建（陪诊、宠物照护、跑腿）
- 城市级服务调度系统
- SaaS 化服务履约中台

价值体现：
- **匹配效率提升**：基于距离与资质综合排序，提高首单响应速度
- **履约透明化**：服务节点打卡 + 实时状态同步
- **资金安全**：担保交易与分账结算

---

## 演示与素材

- 用户端下单流程视频：`docs/demos/user_demo.gif`（替换为实际链接）
- 服务者接单流程视频：`docs/demos/provider_demo.gif`（替换为实际链接）
- 管理后台数据大屏：`docs/demos/admin_demo.gif`（替换为实际链接）

---

## 系统架构总览

```mermaid
graph TD
    U[用户端 H5] -->|下单/支付| API
    P[服务者端 H5] -->|抢单/打卡| API
    A[管理后台] -->|运营/审核| API

    subgraph Backend
      API[Express API]
      Auth[认证与权限]
      Order[订单引擎]
      Dispatch[LBS 调度]
      Pay[支付与结算]
      Notify[Socket/通知]
      Jobs[异步任务]
    end

    subgraph Data
      MySQL[(MySQL)]
      Redis[(Redis)]
    end

    API --> MySQL
    Dispatch --> Redis
    Jobs --> Redis
    Notify --> SocketIO
```

---

## 技术栈与组件

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端用户端 | Vue 3 + Vite + Vant | H5 移动端 |
| 前端服务者端 | Vue 3 + Vite + Vant | H5 移动端 |
| 管理后台 | Vue 3 + Vite + Element Plus | 运营管理后台 |
| 后端 | Node.js + Express | REST API |
| 数据库 | MySQL 8.0 | 业务数据 |
| 缓存/队列 | Redis + BullMQ | 锁、队列 |
| 实时通信 | Socket.io | 状态同步、通知 |
| 地图 | 高德地图 | LBS、位置计算 |

---

## 模块级架构（技术视角）

### 核心服务
- 订单查询与聚合：`backend/src/services/OrderQueryService.js`
- 订单创建与计价：`backend/src/services/OrderCreationService.js` + `PricingEngine.js`
- 订单状态变更：`backend/src/services/OrderStatusService.js`
- 支付与取消：`backend/src/services/OrderPaymentService.js`
- 周期订单：`backend/src/services/RecurringOrderService.js`
- 订单治理引擎：`backend/src/services/orderEngine.js`
- 结算扫描引擎：`backend/src/services/settlementEngine.js`

### 事件与通知
- 事件总线：`backend/src/utils/eventBus.js`
- 事件订阅：`backend/src/subscribers/orderSubscriber.js`
- 通知服务：`backend/src/services/NotificationService.js`
- Socket 通道：`backend/src/utils/socket.js`

### 安全与合规
- JWT 认证：`backend/src/middlewares/auth.js`
- 请求限流：`backend/src/app.js`（rateLimit）
- 数据脱敏：`backend/src/utils/masking.js`

---

## 核心业务流程

### 订单生命周期（状态机）

```
10 待支付 -> 0 待接单 -> 1 已接单 -> 11 已到达 -> 2 服务中 -> 3 已完成 -> 5 已评价
                       \-> 4 已取消
                       \-> 12 取消协商中
```

### 履约链路
1. 用户下单 → 系统计价 → 订单生成
2. 支付完成 → 订单进入待接单池
3. 服务者接单 → 到达打卡 → 开始服务 → 完成上传
4. 用户确认 → 结算到账 → 评价闭环

---

## 数据模型概览

核心表（简化）：
- `users` 用户
- `providers` 服务者档案
- `orders` 订单主表
- `order_reviews` 评价
- `order_schedules` 周期单排期
- `recurring_orders` 周期订单主表
- `wallet_records` 钱包流水

表结构定义：`database/schema.sql`

---

## 目录结构

```
xiaobangshou/
├── backend/            后端服务
├── mobile-user/        用户端 H5
├── mobile-provider/    服务者端 H5
├── admin-web/          管理后台
└── database/           SQL 脚本
```

---

## 快速启动（本地）

### 1) 环境要求
- Node.js 18+
- MySQL 8.0
- Redis

### 2) 初始化数据库
```bash
mysql -u root -p xiaobangshou < database/schema.sql
```

### 3) 启动后端
```bash
cd backend
npm install
npm run dev
```

### 4) 启动前端
```bash
cd mobile-user
npm install
npm run dev
```

```bash
cd mobile-provider
npm install
npm run dev
```

```bash
cd admin-web
npm install
npm run dev
```

说明：
- 用户端默认 `9000` 端口
- 服务者端默认 `9001` 端口
- 管理后台默认 Vite 端口（未指定时为 5173）
- 后端 API 默认 `3000` 端口

---

## 配置与环境变量

建议通过 `.env` 管理以下参数：

| Key | 说明 |
| --- | --- |
| `JWT_SECRET` | JWT 签名密钥 |
| `REDIS_HOST` / `REDIS_PORT` | Redis 连接 |
| `REDIS_PASSWORD` | Redis 密码 |
| `CORS_ORIGIN` | 允许跨域来源 |

---

## 可观测性与运维

- 运行日志：`backend/logs/`
- 订单超时治理引擎：启动后自动运行
- 通知与队列：BullMQ + Redis

---

## 安全策略

- JWT 鉴权 + 角色权限控制
- 关键字段脱敏处理
- 请求限流与安全头策略

---

## 常见问题

### 1) 前端能访问但订单状态不同步
检查 Socket 是否连接成功，或通过轮询兜底刷新。

### 2) 订单无法创建
确认数据库结构与后端版本一致，检查 `orders` 表字段。

---

## 版权与说明

Copyright © 2024 XiaoBangShou Tech. All Rights Reserved.
商业机密，严禁外泄。
