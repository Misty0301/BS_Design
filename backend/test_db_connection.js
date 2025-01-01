// test-db-connection.js
const mysql = require('mysql2/promise');
const config = require('./config/config.js').development;

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      user: config.username,
      password: config.password,
      database: config.database,
      port: config.port,
    });
    console.log('数据库连接成功');
    await connection.end();
  } catch (error) {
    console.error('数据库连接失败：', error.message);
  }
})();
