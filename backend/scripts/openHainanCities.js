/**
 * 专项脚本：将海南省所有城市（含省直辖县级市）标记为已开通
 */
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function openHainanCities() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('正在开启海南省所有城市服务...');

        // 1. 开启海南省地级市 (海口、三亚、三沙、儋州)
        const [res1] = await connection.query(
            "UPDATE sys_regions SET is_open = 1 WHERE code LIKE '46%' AND level = 2 AND name NOT LIKE '%省直辖%'"
        );
        console.log(`已开启地级市: ${res1.affectedRows} 个`);

        // 1.5 开启地级市下属的区 (海口市辖区、三亚市辖区等)
        const [res15] = await connection.query(
            "UPDATE sys_regions SET is_open = 1 WHERE (code LIKE '4601%' OR code LIKE '4602%' OR code LIKE '4604%') AND level = 3"
        );
        console.log(`已开启地级市下属区: ${res15.affectedRows} 个`);

        // 2. 开启海南省直辖县级市 (五指山、琼海、文昌等)
        // 在 sys_regions 中，这些通常被归类在 level=3，但业务上它们被视为“城市”
        const [res2] = await connection.query(
            "UPDATE sys_regions SET is_open = 1 WHERE code LIKE '4690%' AND level = 3"
        );
        console.log(`已开启省直辖县级单位: ${res2.affectedRows} 个`);

        // 3. 确保海南省本身也是开启状态（可选，视业务逻辑而定）
        await connection.query("UPDATE sys_regions SET is_open = 1 WHERE code = '460000'");

        console.log('海南省所有城市服务已成功开启！');

    } catch (error) {
        console.error('操作失败:', error);
    } finally {
        await connection.end();
    }
}

openHainanCities();
