-- 小帮手数据库表结构设计
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS xiaobangshou DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE xiaobangshou;

-- 1. 用户表
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `phone` VARCHAR(11) NOT NULL COMMENT '手机号',
  `password` VARCHAR(255) DEFAULT NULL COMMENT '密码（加密）',
  `nickname` VARCHAR(50) DEFAULT NULL COMMENT '昵称',
  `avatar` VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  `gender` TINYINT DEFAULT 0 COMMENT '性别：0-未知，1-男，2-女',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `id_card` VARCHAR(18) DEFAULT NULL COMMENT '身份证号',
  `id_card_verified` TINYINT DEFAULT 0 COMMENT '实名认证：0-未认证，1-已认证',
  `balance` DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额',
  `points` INT DEFAULT 0 COMMENT '积分',
  `user_type` TINYINT DEFAULT 1 COMMENT '用户类型：1-普通用户，2-服务者，3-两者兼是',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(50) DEFAULT NULL COMMENT '最后登录IP',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_user_type` (`user_type`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 服务者信息表
CREATE TABLE `providers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '服务者ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '关联用户ID',
  `service_types` JSON DEFAULT NULL COMMENT '可提供的服务类型ID数组',
  `service_areas` JSON DEFAULT NULL COMMENT '服务区域（省市区）',
  `introduction` TEXT DEFAULT NULL COMMENT '个人介绍',
  `certifications` JSON DEFAULT NULL COMMENT '资质证书（图片URL数组）',
  `rating` DECIMAL(3,2) DEFAULT 5.00 COMMENT '评分（1-5）',
  `order_count` INT DEFAULT 0 COMMENT '完成订单数',
  `verify_status` TINYINT DEFAULT 0 COMMENT '审核状态：0-待审核，1-已通过，2-已拒绝',
  `verify_reason` VARCHAR(200) DEFAULT NULL COMMENT '审核原因',
  `status` TINYINT DEFAULT 1 COMMENT '接单状态：0-休息中，1-接单中',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_verify_status` (`verify_status`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务者信息表';

-- 3. 服务分类表
CREATE TABLE `service_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `parent_id` INT DEFAULT 0 COMMENT '父分类ID，0为顶级分类',
  `name` VARCHAR(50) NOT NULL COMMENT '分类名称',
  `icon` VARCHAR(200) DEFAULT NULL COMMENT '分类图标',
  `sort` INT DEFAULT 0 COMMENT '排序（数字越大越靠前）',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_sort` (`sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务分类表';

-- 4. 服务项目表
CREATE TABLE `services` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '服务ID',
  `category_id` INT UNSIGNED NOT NULL COMMENT '分类ID',
  `name` VARCHAR(100) NOT NULL COMMENT '服务名称',
  `description` TEXT DEFAULT NULL COMMENT '服务描述',
  `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图',
  `images` JSON DEFAULT NULL COMMENT '服务图片数组',
  `base_price` DECIMAL(10,2) NOT NULL COMMENT '起步价',
  `unit` VARCHAR(20) DEFAULT '次' COMMENT '计价单位',
  `estimated_duration` INT DEFAULT NULL COMMENT '预计耗时（分钟）',
  `service_process` JSON DEFAULT NULL COMMENT '服务流程',
  `notice` TEXT DEFAULT NULL COMMENT '注意事项',
  `sales_count` INT DEFAULT 0 COMMENT '销量',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-下架，1-上架',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_sales_count` (`sales_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务项目表';

-- 5. 订单主表 (通用元数据)
CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `order_no` VARCHAR(32) NOT NULL COMMENT '订单号',
  `order_type` TINYINT DEFAULT 0 COMMENT '0-普通, 1-周期',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `provider_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '服务者ID',
  `service_id` INT UNSIGNED NOT NULL COMMENT '服务项目ID',
  `service_name` VARCHAR(100) NOT NULL COMMENT '服务名称',
  `category_name` VARCHAR(50) DEFAULT NULL COMMENT '分类名称',
  `service_time` DATETIME NOT NULL COMMENT '预约服务时间',
  `service_days` JSON DEFAULT NULL COMMENT '周期排期数组',
  `total_count` INT DEFAULT 1,
  `completed_count` INT DEFAULT 0,
  `service_address` VARCHAR(200) DEFAULT NULL,
  `city` VARCHAR(50) DEFAULT NULL,
  `service_longitude` DECIMAL(10,7) DEFAULT NULL,
  `service_latitude` DECIMAL(10,7) DEFAULT NULL,
  `contact_name` VARCHAR(50) DEFAULT NULL,
  `contact_phone` VARCHAR(11) DEFAULT NULL,
  `remark` TEXT DEFAULT NULL,
  `service_price` DECIMAL(10,2) NOT NULL,
  `platform_fee` DECIMAL(10,2) DEFAULT 0.00,
  `total_price` DECIMAL(10,2) NOT NULL,
  `status` TINYINT NOT NULL DEFAULT 10,
  `pay_status` TINYINT DEFAULT 0,
  `pay_time` DATETIME DEFAULT NULL,
  `confirm_status` TINYINT DEFAULT 0,
  `settlement_status` TINYINT DEFAULT 0,
  `settle_at` DATETIME DEFAULT NULL,
  `complete_time` DATETIME DEFAULT NULL,
  `started_at` DATETIME DEFAULT NULL,
  `arrived_at` DATETIME DEFAULT NULL,
  `is_arrived` TINYINT DEFAULT 0,
  `user_delete_status` TINYINT DEFAULT 0,
  `assignment_type` TINYINT DEFAULT 1 COMMENT '分配方式：1-系统匹配，2-用户指定',
  `proof_images` JSON DEFAULT NULL COMMENT '服务成果图',
  `completion_tags` JSON DEFAULT NULL COMMENT '服务完成标签',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_provider_id` (`provider_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单主表';

-- 6. 订单评价表
CREATE TABLE `order_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评价ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `provider_id` BIGINT UNSIGNED NOT NULL COMMENT '服务者ID',
  `rating` TINYINT NOT NULL COMMENT '评分：1-5',
  `content` TEXT DEFAULT NULL COMMENT '评价内容',
  `images` JSON DEFAULT NULL COMMENT '评价图片',
  `tags` JSON DEFAULT NULL COMMENT '评价标签',
  `reply_content` TEXT DEFAULT NULL COMMENT '回复内容',
  `reply_time` DATETIME DEFAULT NULL COMMENT '回复时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_id` (`order_id`),
  KEY `idx_provider_id` (`provider_id`),
  KEY `idx_rating` (`rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单评价表';

-- 7. 钱包流水表
CREATE TABLE `wallet_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '流水ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `order_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联订单ID',
  `type` TINYINT NOT NULL COMMENT '类型：1-充值，2-消费，3-收入，4-提现，5-退款',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '金额',
  `balance_before` DECIMAL(10,2) NOT NULL COMMENT '变动前余额',
  `balance_after` DECIMAL(10,2) NOT NULL COMMENT '变动后余额',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '描述',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_type` (`type`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='钱包流水表';

-- 8. 提现记录表
CREATE TABLE `withdrawal_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '提现ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '提现金额',
  `fee` DECIMAL(10,2) DEFAULT 0.00 COMMENT '手续费',
  `actual_amount` DECIMAL(10,2) NOT NULL COMMENT '实际到账金额',
  `withdraw_type` VARCHAR(20) NOT NULL COMMENT '提现方式：alipay，wechat，bank',
  `withdraw_account` VARCHAR(100) DEFAULT NULL COMMENT '提现账号',
  `withdraw_name` VARCHAR(50) DEFAULT NULL COMMENT '账户姓名',
  `status` TINYINT DEFAULT 0 COMMENT '状态：0-待审核，1-已通过，2-已拒绝，3-已完成',
  `reject_reason` VARCHAR(200) DEFAULT NULL COMMENT '拒绝原因',
  `audit_time` DATETIME DEFAULT NULL COMMENT '审核时间',
  `complete_time` DATETIME DEFAULT NULL COMMENT '完成时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提现记录表';

-- 9. 用户地址表
CREATE TABLE `user_addresses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '地址ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `contact_name` VARCHAR(50) NOT NULL COMMENT '联系人',
  `contact_phone` VARCHAR(11) NOT NULL COMMENT '联系电话',
  `province` VARCHAR(50) NOT NULL COMMENT '省',
  `city` VARCHAR(50) NOT NULL COMMENT '市',
  `district` VARCHAR(50) NOT NULL COMMENT '区',
  `address` VARCHAR(200) NOT NULL COMMENT '详细地址',
  `longitude` DECIMAL(10,7) DEFAULT NULL COMMENT '经度',
  `latitude` DECIMAL(10,7) DEFAULT NULL COMMENT '纬度',
  `is_default` TINYINT DEFAULT 0 COMMENT '是否默认：0-否，1-是',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户地址表';

-- 10. 系统消息表
CREATE TABLE `messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '用户ID，NULL表示系统通知',
  `type` TINYINT NOT NULL COMMENT '类型：1-系统通知，2-订单消息，3-活动消息',
  `title` VARCHAR(100) NOT NULL COMMENT '标题',
  `content` TEXT NOT NULL COMMENT '内容',
  `extra_data` JSON DEFAULT NULL COMMENT '额外数据（如订单ID）',
  `is_read` TINYINT DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统消息表';

-- 11. 管理员表
CREATE TABLE `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '管理员ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `role` VARCHAR(20) DEFAULT 'admin' COMMENT '角色：super_admin，admin，operator',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-禁用，1-正常',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 12. 系统配置表
CREATE TABLE `system_configs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` VARCHAR(50) NOT NULL COMMENT '配置键',
  `config_value` TEXT DEFAULT NULL COMMENT '配置值',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '描述',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 13. 居家办事详情扩展表
CREATE TABLE `order_ext_home` (
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联订单ID',
  `dish_details` JSON DEFAULT NULL COMMENT '菜品详情',
  `need_shopping` TINYINT DEFAULT 0 COMMENT '是否代买',
  `diners_count` INT DEFAULT 5 COMMENT '用餐人数',
  `flavor_prefs` JSON DEFAULT NULL COMMENT '口味偏好',
  PRIMARY KEY (`order_id`),
  CONSTRAINT `fk_ext_home_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='居家办事扩展详情';

-- 14. 宠物特护详情扩展表
CREATE TABLE `order_ext_pet` (
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联订单ID',
  `is_walking` TINYINT DEFAULT 0 COMMENT '是否正在遛狗',
  `walking_duration` INT DEFAULT 0 COMMENT '遛狗时长(秒)',
  `service_frequency` VARCHAR(50) DEFAULT NULL COMMENT '服务频次',
  `live_track` JSON DEFAULT NULL COMMENT '实时轨迹',
  PRIMARY KEY (`order_id`),
  CONSTRAINT `fk_ext_pet_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='宠物特护扩展详情';

-- 15. 陪护陪诊详情扩展表
CREATE TABLE `order_ext_medical` (
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '关联订单ID',
  `hospital_name` VARCHAR(100) DEFAULT NULL COMMENT '就诊医院',
  `patient_profile_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '就诊人档案ID',
  `medical_notes` TEXT DEFAULT NULL COMMENT '陪诊笔记',
  `medical_advice_text` TEXT DEFAULT NULL COMMENT '医嘱记录',
  PRIMARY KEY (`order_id`),
  CONSTRAINT `fk_ext_medical_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='陪护陪诊扩展详情';

-- 16. 服务者排班/忙碌时间表
CREATE TABLE IF NOT EXISTS `provider_schedules` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `provider_id` BIGINT UNSIGNED NOT NULL COMMENT '服务者ID',
  `order_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联订单ID',
  `start_time` DATETIME NOT NULL COMMENT '忙碌开始时间',
  `end_time` DATETIME NOT NULL COMMENT '忙碌结束时间',
  `type` TINYINT DEFAULT 1 COMMENT '1-订单锁定, 2-个人休息, 3-其他',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_provider_time` (`provider_id`, `start_time`, `end_time`),
  KEY `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务者排班/忙碌时间表';
