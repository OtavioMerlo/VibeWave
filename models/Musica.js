const mongoose = require('mongoose');
const { Schema } = mongoose;

const MusicaSchema = new Schema({
    titulo: {
        type: String,
        required: [true, 'O título é obrigatório'],
        trim: true,
        maxlength: [100, 'Título muito longo (máx. 100 caracteres)']
    },
    artista: { // Nome no singular (convenção)
        type: Schema.Types.ObjectId,
        ref: 'artistas', // Referência ao model (inicial maiúscula)
        required: true
    },
    genero: {
        type: String,
        default: 'Outro'
    },
    duracao: { // Adicionei campo de duração
        type: Number, // Em segundos
        min: [1, 'Duração mínima de 1 segundo']
    },
    audio: {
        type: String,
        required: true,
        validate: {
            validator: v => /\.(mp3|wav|ogg)$/i.test(v),
            message: 'Formato de áudio inválido!'
        }
    },
    capa: { // Nome mais descritivo que "fotomusica"
        type: String,
        validate: {
            validator: v => /\.(jpg|jpeg|png|gif)$/i.test(v),
            message: 'Formato de imagem inválido!'
        }
    },
    letra: {
        type: String,
        trim: true
    },
    lancamento: { // Substitui "datanas" por campo mais adequado
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'Ativa'
    }
}, {
    timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

module.exports = mongoose.model('musicas', MusicaSchema);