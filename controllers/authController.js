const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,        // ← Asegúrate de tener el puerto
  waitForConnections: true,
  connectionLimit: 5,        // ← ¡AHORA SÍ! Máximo 5
  queueLimit: 0,
  connectTimeout: 10000,    // ← Buenas prácticas
  acquireTimeout: 10000
});

// === GRACEFUL SHUTDOWN (IMPORTANTE EN RENDER) ===
const shutdown = async () => {
  console.log('Cerrando pool de conexiones MySQL...');
  await pool.end();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = pool;