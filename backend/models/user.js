// models/user.js
const bcrypt = require('bcryptjs'); // 确保使用与控制器相同的 bcrypt 库

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: {
                    args: [3, 50],
                    msg: '用户名长度应在3到50个字符之间'
                },
                notEmpty: {
                    msg: '用户名不能为空'
                }
            }
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: { 
                isEmail: {
                    msg: '请输入有效的邮箱地址'
                },
                notEmpty: {
                    msg: '邮箱不能为空'
                }
            },
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                len: {
                    args: [6],
                    msg: '密码长度应至少为6个字符'
                },
                notEmpty: {
                    msg: '密码不能为空'
                }
            },
        },
    }, {
        tableName: 'users',
        timestamps: true,
        underscored: true,
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    });

    // 实例方法：验证密码
    User.prototype.comparePassword = async function(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    };

    return User;
};
