/**
 * 数据导入脚本：将 @vant/area-data 导入数据库 sys_regions 表
 * 使用方法：node scripts/importRegions.js
 */
const areaData = require('@vant/area-data');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 兼容不同版本的导入方式
const province_list = areaData.province_list || areaData.areaList.province_list;
const city_list = areaData.city_list || areaData.areaList.city_list;
const county_list = areaData.county_list || areaData.areaList.county_list;

async function importData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('开始导入数据...');

    try {
        // 0. 创建表（如果不存在）
        const createTableSql = `
        CREATE TABLE IF NOT EXISTS \`sys_regions\` (
          \`id\` int(11) NOT NULL AUTO_INCREMENT,
          \`code\` varchar(20) NOT NULL COMMENT '行政区划代码',
          \`name\` varchar(50) NOT NULL COMMENT '名称',
          \`parent_code\` varchar(20) DEFAULT NULL COMMENT '父级代码',
          \`level\` tinyint(1) NOT NULL COMMENT '层级: 1-省, 2-市, 3-区/县',
          \`pinyin\` varchar(100) DEFAULT NULL COMMENT '拼音全拼',
          \`initial\` char(1) DEFAULT NULL COMMENT '首字母',
          \`is_open\` tinyint(1) DEFAULT '0' COMMENT '是否开通服务',
          \`sort\` int(11) DEFAULT '0' COMMENT '排序权重',
          \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uk_code\` (\`code\`),
          KEY \`idx_parent\` (\`parent_code\`),
          KEY \`idx_level\` (\`level\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='全国行政区划表';
        `;
        await connection.query(createTableSql);

        // 1. 清空旧数据
        await connection.query('TRUNCATE TABLE sys_regions');

        const allData = [];

        // 导入省份 (Level 1)
        if (province_list) {
            for (const [code, name] of Object.entries(province_list)) {
                allData.push([code, name, null, 1]);
            }
        }

        // 导入城市 (Level 2)
        if (city_list) {
            for (const [code, name] of Object.entries(city_list)) {
                const parentCode = code.substring(0, 2) + '0000';
                allData.push([code, name, parentCode, 2]);
            }
        }

        // 导入区县 (Level 3)
        if (county_list) {
            for (const [code, name] of Object.entries(county_list)) {
                const parentCode = code.substring(0, 4) + '00';
                allData.push([code, name, parentCode, 3]);
            }
        }

        if (allData.length === 0) {
            console.log('未发现有效数据，请检查 @vant/area-data 结构');
            return;
        }

        // 批量插入
        const sql = 'INSERT INTO sys_regions (code, name, parent_code, level) VALUES ?';
        await connection.query(sql, [allData]);

        console.log(`成功导入 ${allData.length} 条数据！`);
        
    } catch (error) {
        console.error('导入失败:', error);
    } finally {
        await connection.end();
    }
}

importData();
