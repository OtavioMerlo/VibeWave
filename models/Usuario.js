const Sequelize = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize('vibewave', 'root', 'otaviomerlo123@', {
    host: 'localhost',
    dialect: 'mysql',
});

const User = sequelize.define('users', {
    id: {
        type: Sequelize.INTEGER, // Corrigi de "INTEGER" para "INTEGER"
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    foto: {
        type: Sequelize.STRING,
        defaultValue: 'default.png'
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            len: [8, 100]
        }
    },
    createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
    },
    isAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
    }
}, {
    timestamps: false,
    tableName: 'users',
});

//User.sync({ force: true })

module.exports = {
    sequelize,
    User
};