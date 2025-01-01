// services/cache.js
const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const client = redis.createClient({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
});

client.on('error', (err) => {
  console.error('Redis 连接错误:', err);
});

client.on('connect', () => {
  console.log('已连接到 Redis');
});

const getCache = (key) => {
  return new Promise((resolve, reject) => {
    client.get(key, (err, data) => {
      if (err) reject(err);
      resolve(data);
    });
  });
};

const setCache = (key, value, expirationInSeconds = 3600) => {
  return new Promise((resolve, reject) => {
    client.setex(key, expirationInSeconds, value, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
};

module.exports = {
  getCache,
  setCache,
};
