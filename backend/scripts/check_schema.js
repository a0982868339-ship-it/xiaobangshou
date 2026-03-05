
const db = require('../src/config/database');

async function check() {
    try {
        console.log('Checking providers table schema...');
        const [columns] = await db.query('SHOW COLUMNS FROM providers');
        console.log('Providers columns:', columns.map(c => c.Field));

        console.log('Checking orders table schema...');
        const [oColumns] = await db.query('SHOW COLUMNS FROM orders');
        console.log('Orders columns:', oColumns.map(c => c.Field));
        
        console.log('Checking services table schema...');
        const [sColumns] = await db.query('SHOW COLUMNS FROM services');
        console.log('Services columns:', sColumns.map(c => c.Field));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

check();
