-- 安全升级SQL - 增加认证和保障字段
USE xiaobangshou;

-- 修改服务者表，增加安全认证字段
ALTER TABLE `providers` 
ADD COLUMN `id_card_front` VARCHAR(500) DEFAULT NULL COMMENT '身份证正面照' AFTER `certifications`,
ADD COLUMN `id_card_back` VARCHAR(500) DEFAULT NULL COMMENT '身份证反面照',
ADD COLUMN `face_verify_image` VARCHAR(500) DEFAULT NULL COMMENT '人脸识别照片',
ADD COLUMN `face_verify_status` TINYINT DEFAULT 0 COMMENT '人脸认证：0-未认证，1-已通过',
ADD COLUMN `criminal_record_check` TINYINT DEFAULT 0 COMMENT '无犯罪记录：0-未查，1-已验证',
ADD COLUMN `health_certificate` VARCHAR(500) DEFAULT NULL COMMENT '健康证照片',
ADD COLUMN `health_cert_expire` DATE DEFAULT NULL COMMENT '健康证过期时间',
ADD COLUMN `skill_certificates` JSON DEFAULT NULL COMMENT '技能证书（多张）',
ADD COLUMN `emergency_contact` VARCHAR(50) DEFAULT NULL COMMENT '紧急联系人',
ADD COLUMN `emergency_phone` VARCHAR(11) DEFAULT NULL COMMENT '紧急联系人电话',
ADD COLUMN `home_address` VARCHAR(200) DEFAULT NULL COMMENT '家庭住址',
ADD COLUMN `bank_card_no` VARCHAR(30) DEFAULT NULL COMMENT '银行卡号（加密）',
ADD COLUMN `bank_name` VARCHAR(50) DEFAULT NULL COMMENT '开户行',
ADD COLUMN `work_experience` TEXT DEFAULT NULL COMMENT '工作履历',
ADD COLUMN `referrer_name` VARCHAR(50) DEFAULT NULL COMMENT '推荐人姓名',
ADD COLUMN `referrer_phone` VARCHAR(11) DEFAULT NULL COMMENT '推荐人电话',
ADD COLUMN `insurance_policy_no` VARCHAR(50) DEFAULT NULL COMMENT '保险单号',
ADD COLUMN `insurance_expire` DATE DEFAULT NULL COMMENT '保险过期时间',
ADD COLUMN `credit_score` INT DEFAULT 100 COMMENT '信用分（100分制）',
ADD COLUMN `violation_count` INT DEFAULT 0 COMMENT '违规次数',
ADD COLUMN `complaint_count` INT DEFAULT 0 COMMENT '投诉次数';

-- 修改用户表，增加安全字段
ALTER TABLE `users`
ADD COLUMN `id_card_front` VARCHAR(500) DEFAULT NULL COMMENT '身份证正面（可选）' AFTER `id_card`,
ADD COLUMN `id_card_back` VARCHAR(500) DEFAULT NULL COMMENT '身份证反面（可选）',
ADD COLUMN `face_verify_status` TINYINT DEFAULT 0 COMMENT '人脸认证：0-未认证，1-已通过',
ADD COLUMN `emergency_contact` VARCHAR(50) DEFAULT NULL COMMENT '紧急联系人',
ADD COLUMN `emergency_phone` VARCHAR(11) DEFAULT NULL COMMENT '紧急联系电话';

-- 创建服务追踪表（记录服务全过程）
CREATE TABLE IF NOT EXISTS `service_tracking` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '追踪ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  `provider_id` BIGINT UNSIGNED NOT NULL COMMENT '服务者ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `tracking_type` VARCHAR(20) NOT NULL COMMENT '类型：arrive-到达，start-开始，photo-拍照，complete-完成',
  `tracking_time` DATETIME NOT NULL COMMENT '时间',
  `gps_longitude` DECIMAL(10,7) DEFAULT NULL COMMENT 'GPS经度',
  `gps_latitude` DECIMAL(10,7) DEFAULT NULL COMMENT 'GPS纬度',
  `photo_url` VARCHAR(500) DEFAULT NULL COMMENT '照片URL',
  `note` TEXT DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_provider_id` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务追踪表';

-- 创建保险保障表
CREATE TABLE IF NOT EXISTS `insurance_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '保险ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `provider_id` BIGINT UNSIGNED NOT NULL COMMENT '服务者ID',
  `insurance_type` VARCHAR(20) NOT NULL COMMENT '保险类型：accident-意外险，property-财产险',
  `insurance_amount` DECIMAL(10,2) NOT NULL COMMENT '保额',
  `policy_no` VARCHAR(50) DEFAULT NULL COMMENT '保单号',
  `status` TINYINT DEFAULT 1 COMMENT '状态：1-有效，2-已使用，3-已过期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='保险记录表';

-- 创建投诉举报表
CREATE TABLE IF NOT EXISTS `complaints` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '投诉ID',
  `order_id` BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  `complainant_id` BIGINT UNSIGNED NOT NULL COMMENT '投诉人ID',
  `complainant_type` TINYINT NOT NULL COMMENT '投诉人类型：1-用户，2-服务者',
  `respondent_id` BIGINT UNSIGNED NOT NULL COMMENT '被投诉人ID',
  `complaint_type` VARCHAR(20) NOT NULL COMMENT '投诉类型：service-服务质量，safety-安全问题，attitude-态度问题',
  `content` TEXT NOT NULL COMMENT '投诉内容',
  `evidence_images` JSON DEFAULT NULL COMMENT '证据图片',
  `status` TINYINT DEFAULT 0 COMMENT '状态：0-待处理，1-处理中，2-已解决，3-已关闭',
  `admin_reply` TEXT DEFAULT NULL COMMENT '平台回复',
  `handle_time` DATETIME DEFAULT NULL COMMENT '处理时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投诉举报表';

-- 创建服务者审核记录表
CREATE TABLE IF NOT EXISTS `provider_verify_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `provider_id` BIGINT UNSIGNED NOT NULL COMMENT '服务者ID',
  `verify_item` VARCHAR(50) NOT NULL COMMENT '审核项：id_card-身份证，face-人脸，criminal-无犯罪',
  `verify_status` TINYINT NOT NULL COMMENT '状态：0-待审核，1-通过，2-拒绝',
  `verify_result` TEXT DEFAULT NULL COMMENT '审核结果',
  `reject_reason` VARCHAR(200) DEFAULT NULL COMMENT '拒绝原因',
  `admin_id` INT UNSIGNED DEFAULT NULL COMMENT '审核管理员ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_provider_id` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务者审核记录表';

-- 创建服务评级标准表
CREATE TABLE IF NOT EXISTS `service_standards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标准ID',
  `service_id` INT UNSIGNED NOT NULL COMMENT '服务ID',
  `standard_item` VARCHAR(100) NOT NULL COMMENT '标准项',
  `description` TEXT DEFAULT NULL COMMENT '说明',
  `sort` INT DEFAULT 0 COMMENT '排序',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_service_id` (`service_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='服务评级标准表';

-- 插入上门做饭的服务标准
INSERT INTO `service_standards` (`service_id`, `standard_item`, `description`, `sort`) VALUES
(1, '持有健康证', '从事餐饮服务必须持有有效健康证', 100),
(1, '食材新鲜', '使用当日新鲜食材，提供购买凭证', 90),
(1, '厨房清洁', '服务前后保持厨房清洁，餐具消毒', 80),
(1, '服务过程拍照', '烹饪过程拍照记录，保证服务质量', 70);

-- 更新系统配置，增加安全相关配置
INSERT INTO `system_configs` (`config_key`, `config_value`, `description`) VALUES
('insurance_accident_amount', '500000', '意外险保额（元）'),
('insurance_property_amount', '100000', '财产险保额（元）'),
('insurance_food_safety_amount', '200000', '食品安全险保额（元）-餐饮类'),
('provider_deposit', '500', '服务者保证金（元）'),
('id_card_verify_required', '1', '是否必须身份证认证：0-否，1-是'),
('face_verify_required', '1', '是否必须人脸认证：0-否，1-是'),
('criminal_record_required', '1', '是否必须无犯罪记录：0-否，1-是'),
('health_cert_required_services', '[1,2,3,4]', '需要健康证的服务ID（上门做饭等）'),
('service_gps_tracking', '1', '是否开启GPS追踪：0-否，1-是'),
('service_photo_required', '1', '是否必须上传服务照片：0-否，1-是'),
('complaint_response_time', '24', '投诉响应时间（小时）'),
('credit_score_min', '60', '最低信用分（低于此分禁止接单）')
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`);

