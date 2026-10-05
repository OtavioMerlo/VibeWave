const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('vibewave', 'otavio', 'SuaSenhaForte', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

module.exports = sequelize;