const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/Users/yangtianjun/xiaobangshou/backend/.env' });

async function fixPaths() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'xiaobangshou'
  });

  try {
    const [rows] = await connection.execute('SELECT id, proof_images FROM orders WHERE proof_images IS NOT NULL');
    
    for (const row of rows) {
      let images;
      try {
        images = JSON.parse(row.proof_images);
      } catch (e) {
        continue;
      }
      
      if (!Array.isArray(images)) continue;
      
      let updated = false;
      const newImages = [];
      
      for (const img of images) {
        if (typeof img !== 'string') {
          newImages.push(img);
          continue;
        }
        
        const fullPath = path.join('/Users/yangtianjun/xiaobangshou/backend', img);
        if (!fs.existsSync(fullPath)) {
          // File not found at recorded path. Check if it's in 'service' instead of 'order_proof'
          if (img.includes('/uploads/order_proof/')) {
            const alternativePath = img.replace('/uploads/order_proof/', '/uploads/service/');
            const fullAlternativePath = path.join('/Users/yangtianjun/xiaobangshou/backend', alternativePath);
            
            if (fs.existsSync(fullAlternativePath)) {
              console.log(`Fixing order ${row.id}: ${img} -> ${alternativePath}`);
              newImages.push(alternativePath);
              updated = true;
              continue;
            }
          }
        }
        newImages.push(img);
      }
      
      if (updated) {
        await connection.execute('UPDATE orders SET proof_images = ? WHERE id = ?', [JSON.stringify(newImages), row.id]);
      }
    }
    
    console.log('Cleanup complete.');
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

fixPaths();
