-- 会员体系和套餐管理表
USE xiaobangshou;

-- 会员等级表
CREATE TABLE IF NOT EXISTS `member_levels` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `level` INT NOT NULL,
  `discount` DECIMAL(3,2) DEFAULT 1.00,
  `required_amount` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `member_levels` (`name`, `level`, `discount`, `required_amount`) VALUES
('普通用户', 1, 1.00, 0.00),
('银卡会员', 2, 0.95, 500.00),
('金卡会员', 3, 0.90, 1000.00),
('钻石会员', 4, 0.85, 3000.00);

-- 服务套餐表
CREATE TABLE IF NOT EXISTS `service_packages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `package_type` VARCHAR(20) NOT NULL,
  `times_count` INT DEFAULT NULL,
  `duration_days` INT DEFAULT NULL,
  `original_price` DECIMAL(10,2) NOT NULL,
  `package_price` DECIMAL(10,2) NOT NULL,
  `frequency_per_week` INT DEFAULT NULL,
  `status` TINYINT DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `service_packages` (`service_id`, `name`, `description`, `package_type`, `times_count`, `duration_days`, `original_price`, `package_price`, `frequency_per_week`) VALUES
(1, '上门做饭包月（每周2次）', '每周2次上门做饭服务，3菜1汤', 'monthly', 8, 30, 1024.00, 880.00, 2),
(1, '上门做饭包月（每周3次）', '每周3次上门做饭服务，3菜1汤', 'monthly', 12, 30, 1536.00, 1180.00, 3),
(1, '上门做饭10次卡', '10次上门做饭服务，90天有效', 'times', 10, 90, 1280.00, 1080.00, NULL),
(5, '宠物喂养包月（每天1次）', '每天1次上门喂养', 'monthly', 30, 30, 900.00, 600.00, 7),
(5, '宠物喂养包月（每天2次）', '每天2次上门喂养', 'monthly', 60, 30, 1800.00, 900.00, 14),
(14, '家庭保洁包月（每周1次）', '每周1次深度保洁', 'monthly', 4, 30, 480.00, 380.00, 1),
(14, '家庭保洁包月（每周2次）', '每周2次保洁', 'monthly', 8, 30, 960.00, 680.00, 2),
(2, '陪伴老人包月套餐', '每周2次陪伴老人', 'monthly', 8, 30, 480.00, 360.00, 2),
(19, '上门按摩4次卡', '4次60分钟全身按摩', 'times', 4, 30, 672.00, 600.00, NULL),
(19, '上门按摩10次卡', '10次60分钟全身按摩', 'times', 10, 60, 1680.00, 1380.00, NULL),
(22, '上门健身10次卡', '10次私教课程', 'times', 10, 90, 1500.00, 1200.00, NULL),
(22, '上门健身20次卡', '20次私教课程', 'times', 20, 120, 3000.00, 2000.00, NULL);

-- 优惠券表
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `coupon_type` VARCHAR(20) NOT NULL,
  `discount` DECIMAL(3,2) DEFAULT NULL,
  `cash_amount` DECIMAL(10,2) DEFAULT NULL,
  `min_amount` DECIMAL(10,2) DEFAULT 0.00,
  `total_count` INT DEFAULT NULL,
  `valid_days` INT DEFAULT 30,
  `status` TINYINT DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `coupons` (`name`, `coupon_type`, `cash_amount`, `min_amount`, `total_count`, `valid_days`) VALUES
('新人专享券', 'cash', 30.00, 50.00, 10000, 7),
('上门做饭满100减20', 'cash', 20.00, 100.00, 5000, 30),
('健康养生9折券', 'discount', NULL, 80.00, 3000, 15);

