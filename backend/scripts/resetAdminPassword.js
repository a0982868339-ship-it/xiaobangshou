/**
 * 紧急修复脚本：重置管理员密码为 admin123
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function resetPassword() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('正在重置管理员密码...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const [result] = await connection.query(
            'UPDATE admin_users SET password = ? WHERE username = ?',
            [hashedPassword, 'admin']
        );

        if (result.affectedRows > 0) {
            console.log('密码重置成功！新密码为: admin123');
        } else {
            console.log('未找到 admin 账号，请检查用户名是否正确。');
        }

    } catch (error) {
        console.error('重置失败:', error);
    } finally {
        await connection.end();
    }
}

resetPassword();
