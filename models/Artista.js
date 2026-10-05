const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Artista = sequelize.define('artists', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },

    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },

    pais: {
        type: DataTypes.STRING,
        allowNull: false
    },

    genero_musical: {
        type: DataTypes.STRING,
        allowNull: false
    },

    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Ativo'
    },

    biografia: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    foto: {
        type: DataTypes.STRING,
        /* Sem foto => NULL. As views caem em /img/default.svg. */
        defaultValue: null
    },

    website: {
        type: DataTypes.STRING,
        allowNull: true
    },

    datanas: {
        type: DataTypes.DATE,
        allowNull: true
    },

    plataforma: {
        type: DataTypes.STRING,
        allowNull: true
    },

    handle: {
        type: DataTypes.STRING,
        allowNull: true
    }

}, {
    tableName: 'artists'
});

module.exports = Artista;
