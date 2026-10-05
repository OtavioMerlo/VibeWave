const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'vibewave',
    process.env.DB_USER || 'otavio',
    process.env.DB_PASSWORD || 'SuaSenhaForte',
    {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        logging: false
    }
);

module.exports = sequelize;