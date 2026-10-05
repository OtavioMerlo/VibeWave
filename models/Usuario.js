const bcrypt = require('bcryptjs');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('users', {
    id: {
        type: DataTypes.INTEGER, // Corrigi de "INTEGER" para "INTEGER"
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    foto: {
        type: DataTypes.STRING,
        /* Sem avatar => NULL. As views caem em /img/default.svg. */
        defaultValue: null
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [8, 100]
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
}, {
    timestamps: false,
    tableName: 'users',
});

//User.sync({ force: true })

module.exports = User;