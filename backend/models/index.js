require('dotenv').config();
const Sequelize = require('sequelize');
const config = require('../config/config.js')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  port: config.port,
  logging: config.logging,
});

// 重试机制
const connectWithRetry = async (retries = 5, delay = 5000) => {
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log('数据库连接成功');
      return;
    } catch (error) {
      console.error('数据库连接失败，重试中...', error);
      retries -= 1;
      if (retries === 0) {
        console.error('多次重试后连接失败，请检查配置或服务状态。');
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

connectWithRetry();

module.exports = sequelize;
