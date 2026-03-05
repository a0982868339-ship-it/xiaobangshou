CREATE TABLE `sys_regions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL COMMENT '行政区划代码 (如 460200)',
  `name` varchar(50) NOT NULL COMMENT '名称 (如 三亚市)',
  `parent_code` varchar(20) DEFAULT NULL COMMENT '父级代码',
  `level` tinyint(1) NOT NULL COMMENT '层级: 1-省, 2-市, 3-区/县',
  `pinyin` varchar(100) DEFAULT NULL COMMENT '拼音全拼',
  `initial` char(1) DEFAULT NULL COMMENT '首字母',
  `is_open` tinyint(1) DEFAULT '0' COMMENT '是否开通服务',
  `sort` int(11) DEFAULT '0' COMMENT '排序权重',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_parent` (`parent_code`),
  KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='全国行政区划表';
