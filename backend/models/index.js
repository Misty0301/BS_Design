require('dotenv').config();
const Sequelize = require('sequelize');
const config = require('../config/config.js')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {
  sequelize,
  Sequelize,
  User: require('./user.js')(sequelize, Sequelize),
  Product: require('./product.js')(sequelize, Sequelize),
  Favorite: require('./favorite.js')(sequelize, Sequelize),
  Alert: require('./alert.js')(sequelize, Sequelize),
};

// 设置关联关系
db.User.belongsToMany(db.Product, { through: db.Favorite, foreignKey: 'user_id', as: 'FavoritedProducts' });
db.Product.belongsToMany(db.User, { through: db.Favorite, foreignKey: 'product_id', as: 'UsersWhoFavorited' });

db.User.hasMany(db.Alert, { foreignKey: 'user_id' });
db.Alert.belongsTo(db.User, { foreignKey: 'user_id' });

db.Product.hasMany(db.Alert, { foreignKey: 'product_id' });
db.Alert.belongsTo(db.Product, { foreignKey: 'product_id' });

module.exports = db;

// 数据库同步（仅限开发环境）
if (process.env.NODE_ENV === 'development') {
  sequelize.sync({ force: false })
    .then(() => console.log('数据库同步成功'))
    .catch((err) => console.error('数据库同步失败:', err));
}
