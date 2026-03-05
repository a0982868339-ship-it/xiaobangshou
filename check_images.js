const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/Users/yangtianjun/xiaobangshou/backend/.env' });

async function checkBrokenImages() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'xiaobangshou'
  });

  try {
    const [rows] = await connection.execute('SELECT id, proof_images FROM orders WHERE proof_images IS NOT NULL');
    console.log(`Checking ${rows.length} orders...`);
    
    for (const row of rows) {
      let images;
      try {
        images = JSON.parse(row.proof_images);
      } catch (e) {
        continue;
      }
      
      if (!Array.isArray(images)) continue;
      
      for (const img of images) {
        const fullPath = path.join('/Users/yangtianjun/xiaobangshou/backend', img);
        if (!fs.existsSync(fullPath)) {
          console.log(`[BROKEN] Order ${row.id}: ${img}`);
          
          // Try to find it in other directories
          const basename = path.basename(img);
          const dirs = ['service', 'order_proof', 'avatar', 'cert', 'health', 'verify'];
          for (const dir of dirs) {
            // Search in date subdirectories
            const uploadRoot = '/Users/yangtianjun/xiaobangshou/backend/uploads';
            const dirPath = path.join(uploadRoot, dir);
            if (!fs.existsSync(dirPath)) continue;
            
            const subdirs = fs.readdirSync(dirPath);
            for (const subdir of subdirs) {
              const potentialPath = path.join(dirPath, subdir, basename);
              if (fs.existsSync(potentialPath)) {
                const newUrl = `/uploads/${dir}/${subdir}/${basename}`;
                console.log(`  -> Found at: ${newUrl}`);
                // I won't auto-update yet, just reporting
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkBrokenImages();
