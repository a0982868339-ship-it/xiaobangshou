-- ==========================================
-- 周期单系统数据库迁移
-- 创建日期: 2026-01-25
-- 说明: 完全独立的周期单系统，不影响现有单次订单
-- ==========================================

-- 1. 周期订单母表
CREATE TABLE IF NOT EXISTS recurring_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '周期单编号，格式：RO+时间戳',
  
  -- 关联信息
  user_id INT NOT NULL COMMENT '用户ID',
  provider_id INT DEFAULT NULL COMMENT '服务者ID',
  service_id INT NOT NULL COMMENT '服务项目ID（只能是36遛狗或37喂猫）',
  service_name VARCHAR(100) NOT NULL COMMENT '服务名称',
  
  -- 周期配置
  total_sessions INT NOT NULL COMMENT '总服务次数（如4次）',
  completed_sessions INT DEFAULT 0 COMMENT '已完成次数',
  session_interval INT DEFAULT 1 COMMENT '间隔天数（默认每天1次）',
  start_date DATE NOT NULL COMMENT '首次服务日期',
  
  -- 价格信息
  total_price DECIMAL(10,2) NOT NULL COMMENT '总价（如220元）',
  session_price DECIMAL(10,2) NOT NULL COMMENT '单次价格（如55元）',
  frozen_amount DECIMAL(10,2) DEFAULT 0 COMMENT '托管冻结金额（逐次减少）',
  
  -- 状态
  status TINYINT DEFAULT 0 COMMENT '0待支付 1进行中 2已完成 3已取消',
  pay_status TINYINT DEFAULT 0 COMMENT '0未支付 1已支付',
  pay_time DATETIME DEFAULT NULL COMMENT '支付时间',
  
  -- 服务信息（从原订单继承）
  address TEXT COMMENT '服务地址',
  contact_phone VARCHAR(20) COMMENT '联系电话',
  service_time TIME COMMENT '预约时间',
  remark TEXT COMMENT '备注信息（宠物信息JSON）',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX idx_user_id (user_id),
  INDEX idx_provider_id (provider_id),
  INDEX idx_status (status),
  INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='周期订单母表';

-- 2. 服务场次子表
CREATE TABLE IF NOT EXISTS recurring_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  recurring_order_id INT NOT NULL COMMENT '关联母订单ID',
  session_index INT NOT NULL COMMENT '第几次服务（1/2/3/4）',
  session_date DATE NOT NULL COMMENT '服务日期',
  service_time TIME COMMENT '预约时间',
  
  -- 价格
  price DECIMAL(10,2) NOT NULL COMMENT '本次服务价格',
  
  -- 状态流转
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending待服务 | punched已打卡 | confirmed已确认 | settled已结算 | cancelled已取消',
  
  -- 时间记录
  punch_time DATETIME DEFAULT NULL COMMENT '打卡时间',
  confirmed_time DATETIME DEFAULT NULL COMMENT '确认时间（用户确认或自动确认）',
  settled_time DATETIME DEFAULT NULL COMMENT '结算时间',
  
  -- 清单完成情况
  checklist_complete BOOLEAN DEFAULT FALSE COMMENT '服务清单是否全部完成',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 外键和索引
  FOREIGN KEY (recurring_order_id) REFERENCES recurring_orders(id) ON DELETE CASCADE,
  INDEX idx_session_date (session_date),
  INDEX idx_status (status),
  UNIQUE KEY uk_order_session (recurring_order_id, session_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='周期单服务场次表';

-- 3. 服务清单完成记录表
CREATE TABLE IF NOT EXISTS recurring_checklist_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL COMMENT '关联场次ID',
  checklist_item VARCHAR(100) NOT NULL COMMENT '清单项名称',
  completed BOOLEAN DEFAULT FALSE COMMENT '是否完成',
  completed_at DATETIME DEFAULT NULL COMMENT '完成时间',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键和索引
  FOREIGN KEY (session_id) REFERENCES recurring_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='周期单服务清单完成记录';

-- ==========================================
-- 说明：
-- 1. 这三张表完全独立，不影响现有的 orders 表
-- 2. frozen_amount 字段用于记录平台托管的剩余金额
-- 3. status 字段流转：pending → punched → confirmed → settled
-- 4. 只支持 service_id = 36(遛狗) 或 37(喂猫)
-- ==========================================
