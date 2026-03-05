const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'xiaobangshou',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4'
});

pool.getConnection()
  .then(async connection => {
    console.log('✅ 数据库连接成功');

    // 自动更新表结构（资金结算阶梯化升级）
    try {
      await connection.query("CREATE TABLE IF NOT EXISTS `withdrawals` (`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `user_id` BIGINT UNSIGNED NOT NULL, `amount` DECIMAL(10,2) NOT NULL, `status` TINYINT NOT NULL DEFAULT 0, `bank_name` VARCHAR(50), `bank_card_no` VARCHAR(30), `real_name` VARCHAR(50), `remark` VARCHAR(200), `reviewed_at` DATETIME, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP, `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (`id`)) ENGINE=InnoDB;");
      console.log("✓ 已创建 withdrawals 表");
    } catch (e) { }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`wallet_records\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`user_id\` INT NOT NULL,
          \`order_id\` INT DEFAULT NULL,
          \`order_no\` VARCHAR(50) DEFAULT NULL,
          \`type\` TINYINT NOT NULL COMMENT '1-充值, 2-支出, 3-收益, 4-提现',
          \`amount\` DECIMAL(10,2) NOT NULL,
          \`available_at\` DATETIME DEFAULT NULL COMMENT '资金解冻时间',
          \`is_settled\` TINYINT DEFAULT 0 COMMENT '是否已结算',
          \`balance_after\` DECIMAL(10,2) NOT NULL,
          \`remark\` VARCHAR(255),
          \`status\` TINYINT DEFAULT 1,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("✓ 已创建 wallet_records 表");
    } catch (e) {
      console.error('创建 wallet_records 表失败:', e);
    }

    try {
      await connection.query("ALTER TABLE wallet_records ADD COLUMN available_at DATETIME DEFAULT NULL COMMENT '资金解冻时间' AFTER amount");
      console.log('✓ 已增加字段 available_at');
    } catch (e) { }

    try {
      await connection.query("ALTER TABLE wallet_records ADD COLUMN is_settled TINYINT DEFAULT 0 COMMENT '是否已结算' AFTER available_at");
      console.log('✓ 已增加字段 is_settled');
    } catch (e) { }

    // 自动更新表结构（内容管理与反馈系统升级）
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`articles\` (
          \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`title\` VARCHAR(200) NOT NULL COMMENT '标题',
          \`content\` LONGTEXT NOT NULL COMMENT '内容(HTML)',
          \`category\` VARCHAR(50) DEFAULT 'faq' COMMENT '类型: faq-常见问题, rule-服务规则, notice-公告',
          \`status\` TINYINT DEFAULT 1 COMMENT '1-显示, 0-隐藏',
          \`sort\` INT DEFAULT 0,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("✓ 已创建 articles 表");
    } catch (e) { }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`feedbacks\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`user_id\` BIGINT UNSIGNED NOT NULL,
          \`type\` VARCHAR(20) DEFAULT 'bug' COMMENT '类型: bug-程序错误, suggest-功能建议, other-其他',
          \`content\` TEXT NOT NULL COMMENT '内容',
          \`contact\` VARCHAR(100) DEFAULT NULL COMMENT '联系方式',
          \`status\` TINYINT DEFAULT 0 COMMENT '0-待处理, 1-已处理',
          \`reply\` TEXT DEFAULT NULL COMMENT '回复内容',
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("✓ 已创建 feedbacks 表");
    } catch (e) { }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`app_versions\` (
          \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`platform\` VARCHAR(20) NOT NULL COMMENT 'ios, android, h5',
          \`version\` VARCHAR(20) NOT NULL COMMENT '版本号如 1.0.1',
          \`is_force\` TINYINT DEFAULT 0 COMMENT '是否强制更新',
          \`content\` TEXT COMMENT '更新日志',
          \`url\` VARCHAR(500) COMMENT '下载地址',
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("✓ 已创建 app_versions 表");

      // 插入初始版本
      await connection.query("INSERT IGNORE INTO app_versions (id, platform, version, content) VALUES (1, 'h5', '1.0.0', '初始版本上线')");
    } catch (e) { }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`provider_certifications\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`provider_id\` INT NOT NULL,
          \`type\` VARCHAR(50) NOT NULL COMMENT '证件类型',
          \`name\` VARCHAR(100) NOT NULL COMMENT '证件名称',
          \`certificate_no\` VARCHAR(100) COMMENT '证件编号',
          \`expire_date\` DATE COMMENT '到期日期',
          \`images\` JSON DEFAULT NULL COMMENT '证件照片',
          \`status\` TINYINT NOT NULL DEFAULT 0 COMMENT '0-待审核, 1-通过, 2-拒绝',
          \`reject_reason\` VARCHAR(200) DEFAULT NULL COMMENT '拒绝原因',
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_provider_id\` (\`provider_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("✓ 已创建 provider_certifications 表");
    } catch (e) { }

    // 自动更新表结构（周期预约与 LBS 升级）
    // 注意：orders 表已完成垂直拆分重构，以下部分字段已迁移至扩展表
    const alterTable = async (table, column, definition) => {
      try {
        // 增加对已迁移字段的跳过逻辑，防止重构后启动报错
        const migratedFields = ['dish_details', 'walking_start_at', 'hospital_name', 'patient_name', 'medical_advice_text'];
        if (table === 'orders' && definition.includes('AFTER') && migratedFields.some(f => definition.includes(`AFTER ${f}`))) {
          return;
        }

        await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`✓ 已增加表 ${table} 字段 ${column}`);
      } catch (e) {
        if (e.errno !== 1060 && e.code !== 'ER_DUP_FIELDNAME') {
          // 忽略由于 AFTER 字段不存在导致的错误，因为我们已经重构了表结构
          if (e.errno === 1054 || e.code === 'ER_BAD_FIELD_ERROR') {
            return;
          }
          console.error(`✗ 增加表 ${table} 字段 ${column} 失败:`, e.message);
        }
      }
    };

    await alterTable('orders', 'order_type', "TINYINT DEFAULT 0 COMMENT '0-单次, 1-周期' AFTER order_no");
    await alterTable('orders', 'total_count', "INT DEFAULT 1 COMMENT '总服务次数' AFTER order_type");
    await alterTable('orders', 'completed_count', "INT DEFAULT 0 COMMENT '已完成次数' AFTER total_count");
    await alterTable('orders', 'service_latitude', "DECIMAL(10, 7) COMMENT '纬度' AFTER city");
    await alterTable('orders', 'service_longitude', "DECIMAL(10, 7) COMMENT '经度' AFTER service_latitude");
    await alterTable('orders', 'service_options', "JSON DEFAULT NULL COMMENT '配置项' AFTER dish_details");
    await alterTable('orders', 'service_days', "JSON DEFAULT NULL COMMENT '周期预约的日期数组' AFTER service_time");
    await alterTable('orders', 'user_delete_status', "TINYINT DEFAULT 0 COMMENT '0-正常, 1-回收站, 2-彻底隐藏' AFTER settlement_status");
    await alterTable('orders', 'hospital_name', "VARCHAR(100) DEFAULT NULL AFTER service_address");
    await alterTable('orders', 'city', "VARCHAR(50) DEFAULT '杭州市' AFTER service_address");
    await alterTable('orders', 'service_track', "JSON DEFAULT NULL COMMENT '轨迹坐标数组' AFTER proof_images");
    await alterTable('orders', 'live_track', "JSON DEFAULT NULL COMMENT '实时未结算轨迹' AFTER service_track");
    await alterTable('orders', 'is_walking', "TINYINT DEFAULT 0 COMMENT '是否正在行走中' AFTER status");
    await alterTable('orders', 'walking_start_at', "DATETIME DEFAULT NULL COMMENT '开始遛狗时间' AFTER is_walking");
    await alterTable('orders', 'walking_duration', "INT DEFAULT 0 COMMENT '最终运动时长(秒)' AFTER walking_start_at");
    await alterTable('orders', 'is_arrived', "TINYINT DEFAULT 0 AFTER is_walking");
    await alterTable('orders', 'accepted_at', "DATETIME DEFAULT NULL AFTER complete_time");
    await alterTable('orders', 'arrived_at', "DATETIME DEFAULT NULL AFTER accepted_at");
    await alterTable('orders', 'started_at', "DATETIME DEFAULT NULL AFTER arrived_at");

    // 周期单重构：大厂父子模型关键字段
    await alterTable('orders', 'parent_recurring_id', "BIGINT UNSIGNED DEFAULT NULL COMMENT '父周期单ID' AFTER order_type");
    await alterTable('orders', 'session_index', "INT DEFAULT NULL COMMENT '场次序号' AFTER parent_recurring_id");

    await alterTable('providers', 'work_status', "TINYINT DEFAULT 1 COMMENT '1-接单中, 0-休息中' AFTER status");
    await alterTable('providers', 'cuisine_tags', "JSON DEFAULT NULL AFTER introduction");
    await alterTable('providers', 'lat', "DECIMAL(10, 7) AFTER user_id");
    await alterTable('providers', 'lng', "DECIMAL(10, 7) AFTER lat");

    await alterTable('services', 'price_config', "JSON DEFAULT NULL AFTER notice");
    await alterTable('services', 'min_order_amount', "DECIMAL(10, 2) DEFAULT 0.00 AFTER price_config");
    await alterTable('hospitals', 'district', "VARCHAR(50) DEFAULT NULL AFTER city");
    await alterTable('users', 'role', "VARCHAR(20) DEFAULT 'user' COMMENT '角色' AFTER user_type");

    // 自动更新表结构（陪诊档案系统升级）
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`patient_profiles\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`user_id\` BIGINT UNSIGNED NOT NULL COMMENT '所属用户',
          \`name\` VARCHAR(50) NOT NULL COMMENT '就诊人姓名',
          \`age\` INT COMMENT '年龄',
          \`gender\` TINYINT DEFAULT 0 COMMENT '性别: 0-未知, 1-男, 2-女',
          \`hospital_name\` VARCHAR(100) COMMENT '常用/指定医院',
          \`tags\` JSON COMMENT '健康标签(如轮椅、慢性病)',
          \`remarks\` TEXT COMMENT '详细备注',
          \`is_default\` TINYINT DEFAULT 0,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_user_id\` (\`user_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("✓ 已创建 patient_profiles 表");
    } catch (e) { }

    await alterTable('orders', 'patient_name', "VARCHAR(50) DEFAULT NULL AFTER hospital_name");
    await alterTable('orders', 'patient_gender', "TINYINT DEFAULT 0 AFTER patient_name");
    await alterTable('orders', 'patient_age', "INT DEFAULT NULL AFTER patient_gender");
    await alterTable('orders', 'patient_tags', "JSON DEFAULT NULL AFTER patient_age");

    // 自动更新表结构（陪诊服务细节增强）
    await alterTable('orders', 'medical_advice_text', "TEXT COMMENT '医生医嘱文本' AFTER patient_tags");
    await alterTable('orders', 'medical_advice_images', "JSON COMMENT '医嘱照片' AFTER medical_advice_text");
    await alterTable('orders', 'bill_images', "JSON COMMENT '费用账单照片' AFTER medical_advice_images");
    await alterTable('orders', 'medication_reminder_text', "TEXT COMMENT '用药提醒文本' AFTER bill_images");
    await alterTable('orders', 'medication_reminder_images', "JSON COMMENT '用药提醒照片' AFTER medication_reminder_text");
    await alterTable('orders', 'proof_data', "JSON DEFAULT NULL COMMENT '结构化履约凭证' AFTER proof_images");

    // 确保 wallet_records 字段完整 (支付流水增强)
    await alterTable('wallet_records', 'order_no', "VARCHAR(50) AFTER order_id");
    await alterTable('wallet_records', 'remark', "VARCHAR(255) AFTER balance_after");
    await alterTable('wallet_records', 'status', "TINYINT DEFAULT 1 AFTER remark");

    // 确保 withdrawals 字段完整 (提现功能增强)
    await alterTable('withdrawals', 'fee', "DECIMAL(10,2) DEFAULT 0.00 AFTER amount");
    await alterTable('withdrawals', 'actual_received', "DECIMAL(10,2) DEFAULT 0.00 AFTER fee");
    await alterTable('withdrawals', 'withdraw_type', "VARCHAR(20) DEFAULT 'alipay' COMMENT 'alipay, wechat' AFTER actual_received");

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`wallet_records\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`user_id\` INT NOT NULL,
          \`order_id\` INT DEFAULT NULL,
          \`order_no\` VARCHAR(50) DEFAULT NULL,
          \`type\` TINYINT NOT NULL COMMENT '1-充值, 2-支出, 3-收益, 4-提现',
          \`amount\` DECIMAL(10,2) NOT NULL,
          \`available_at\` DATETIME DEFAULT NULL COMMENT '资金解冻时间',
          \`is_settled\` TINYINT DEFAULT 0 COMMENT '是否已结算',
          \`balance_before\` DECIMAL(10,2) NOT NULL,
          \`balance_after\` DECIMAL(10,2) NOT NULL,
          \`remark\` VARCHAR(255),
          \`status\` TINYINT DEFAULT 1,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("✓ 已确认 wallet_records 表");
    } catch (e) { }

    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`order_schedules\` (
          \`id\` INT PRIMARY KEY AUTO_INCREMENT,
          \`order_id\` BIGINT UNSIGNED NOT NULL,
          \`service_date\` DATE NOT NULL,
          \`service_time\` VARCHAR(20),
          \`status\` TINYINT DEFAULT 0 COMMENT '0-待服务, 1-已完成, 2-已跳过',
          \`proof_images\` JSON DEFAULT NULL,
          \`completed_at\` DATETIME DEFAULT NULL,
          \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log("✓ 已创建 order_schedules 表");
    } catch (e) { }

    // --- 数据初始化升级：仅在表为空时插入演示数据 ---
    try {
      const [existingCategories] = await connection.query("SELECT id FROM service_categories LIMIT 1");
      if (existingCategories.length === 0) {
        console.log(">> 正在初始化基础服务分类数据...");
        const categories = [
          { name: '银发无忧', icon: 'manager-o', sort: 65 },
          { name: '专业清洗', icon: 'brush-o', sort: 60 },
          { name: '整理收纳', icon: 'records-o', sort: 55 },
          { name: '科学育儿', icon: 'smile-o', sort: 50 },
          { name: '办公技术', icon: 'desktop-o', sort: 45 }
        ];

        for (const cat of categories) {
          const [res] = await connection.query(
            "INSERT INTO service_categories (name, icon, sort, status) VALUES (?, ?, ?, 1)",
            [cat.name, cat.icon, cat.sort]
          );
          const catId = res.insertId;

          // 为新分类插入演示服务
          if (cat.name === '银发无忧') {
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count) VALUES (?, '适老化改造咨询', '上门评估居家安全风险', 199, '次', 12)", [catId]);
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count) VALUES (?, '半失能助浴服务', '专业护理人员上门协助', 158, '次', 24)", [catId]);
          } else if (cat.name === '宠物特护') {
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count, status, price_config) VALUES (?, '专业上门遛狗', '1对1牵引，实时轨迹反馈', 45, '30分钟', 128, 1, ?)", [
              catId,
              JSON.stringify([
                { label: '30分钟标准遛', price: 45, unit: '次' },
                { label: '45分钟进阶遛', price: 60, unit: '次' },
                { label: '60分钟深度遛', price: 75, unit: '次' },
                { label: '大型犬额外服务', price: 15, unit: '只' }
              ])
            ]);
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count, status, price_config) VALUES (?, '猫咪上门喂养', '铲屎加餐换水，远程监控', 35, '次', 564, 1, ?)", [
              catId,
              JSON.stringify([
                { label: '基础喂养', price: 35, unit: '次' },
                { label: '增加一只猫', price: 5, unit: '只' }
              ])
            ]);
          } else if (cat.name === '专业清洗') {
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count) VALUES (?, '挂机空调深度洗', '高温蒸汽杀菌拆洗', 88, '台', 1240)", [catId]);
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count) VALUES (?, '油烟机强力拆洗', '深度除油恢复吸力', 168, '台', 856)", [catId]);
          } else if (cat.name === '整理收纳') {
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count) VALUES (?, '全屋衣橱整理', '空间规划与衣物分类', 150, '小时', 156)", [catId]);
          } else if (cat.name === '科学育儿') {
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count) VALUES (?, '专业催乳/通乳', '解决产后堵奶胀痛问题', 398, '次', 215)", [catId]);
          } else if (cat.name === '办公技术') {
            await connection.query("INSERT INTO services (category_id, name, description, base_price, unit, sales_count) VALUES (?, '电脑/WiFi报修', '修打印机/系统重装', 100, '次', 432)", [catId]);
          }
        }
        console.log("✓ 基础服务数据初始化完成");
      }
    } catch (e) {
      console.error('初始化新服务失败:', e);
    }

    connection.release();
  })
  .catch(err => {
    console.error('❌ 数据库连接失败:', err.message);
  });

module.exports = pool;
