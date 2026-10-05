const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Musica = sequelize.define('musics', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    titulo: {
        type: DataTypes.STRING,
        allowNull: false
    },

    artistId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'artists',
            key: 'id'
        }
    },

    genero: {
        type: DataTypes.STRING,
        defaultValue: 'Outro'
    },

    duracao: {
        type: DataTypes.INTEGER,
        allowNull: false
    },

    audio: {
        type: DataTypes.STRING,
        allowNull: false
    },

    capa: {
        type: DataTypes.STRING
    },

    letra: {
        type: DataTypes.TEXT
    },

    lancamento: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },

    status: {
        type: DataTypes.STRING,
        defaultValue: 'Ativa'
    }

}, {
    tableName: 'musics'
});

module.exports = Musica;
