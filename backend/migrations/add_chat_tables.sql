-- 聊天消息记录表（用于离线消息与未读计数）
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `from_user_id` VARCHAR(50) NOT NULL COMMENT '发送方用户ID',
  `to_user_id` VARCHAR(50) NOT NULL COMMENT '接收方用户ID',
  `content` TEXT COMMENT '消息内容',
  `msg_type` VARCHAR(20) DEFAULT 'text' COMMENT '消息类型: text/image/voice',
  `msg_seq` BIGINT COMMENT '腾讯云IM消息序列号',
  `msg_time` DATETIME COMMENT '消息发送时间',
  `is_read` TINYINT DEFAULT 0 COMMENT '是否已读: 0-未读 1-已读',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-删除 1-正常',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX `idx_to_user_read` (`to_user_id`, `is_read`),
  INDEX `idx_from_user` (`from_user_id`),
  INDEX `idx_msg_time` (`msg_time`),
  UNIQUE KEY `uk_msg_seq` (`msg_seq`, `from_user_id`, `to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='聊天消息记录表';

-- 会话列表表（可选，用于优化会话列表查询）
CREATE TABLE IF NOT EXISTS `chat_conversations` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `user_id` VARCHAR(50) NOT NULL COMMENT '用户ID',
  `peer_user_id` VARCHAR(50) NOT NULL COMMENT '对方用户ID',
  `peer_nickname` VARCHAR(100) COMMENT '对方昵称',
  `peer_avatar` VARCHAR(255) COMMENT '对方头像',
  `last_message` TEXT COMMENT '最后一条消息内容',
  `last_message_time` DATETIME COMMENT '最后消息时间',
  `unread_count` INT DEFAULT 0 COMMENT '未读消息数',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0-删除 1-正常',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY `uk_user_peer` (`user_id`, `peer_user_id`),
  INDEX `idx_last_time` (`user_id`, `last_message_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会话列表表';
