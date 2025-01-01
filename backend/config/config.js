module.exports = {
    development: {
      username: 'root',
      password: '123456', // 确保与 MySQL 设置一致
      database: 'jd_data',
      host: '127.0.0.1',
      dialect: 'mysql',
      logging: console.log, // 开启日志，便于调试
    },
    test: {
      username: 'root',
      password: '123456',
      database: 'price_comparison_test',
      host: '127.0.0.1',
      dialect: 'mysql',
      logging: false, // 测试环境关闭日志
    },
    production: {
      username: 'root',
      password: '123456',
      database: 'price_comparison_prod',
      host: '127.0.0.1',
      dialect: 'mysql',
      logging: false,
    },
  };
  