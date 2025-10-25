const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 4,
  queueLimit: 0,
  connectTimeout: 10000
});

// === CIERRE LIMPIO ===
process.on('SIGTERM', async () => {
  console.log('Cerrando pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

module.exports = pool;