// models/product.js
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    product_name: { // 重命名为数据库中的字段名
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    link: { // 重命名为数据库中的字段名
      type: DataTypes.STRING(500), // 从 TEXT 改为 STRING(500)
      allowNull: false,
      unique: true, // 根据需求设置唯一约束，假设 link 唯一
    },
    source_platform: { // 重命名为数据库中的字段名
      type: DataTypes.STRING(100),
      allowNull: false,
    },

  }, {
    tableName: 'products',
    timestamps: true,
    underscored: true, // 确保 created_at 和 updated_at 使用下划线
  });

  return Product;
};

