// models/favorite.js
module.exports = (sequelize, DataTypes) => {
    const Favorite = sequelize.define('Favorite', {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    }, {
      tableName: 'favorites',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'product_id'],
        },
      ],
    });
  
    return Favorite;
  };
  