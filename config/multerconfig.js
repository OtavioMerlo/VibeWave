const crypto = require('crypto');
const path = require('path');
const multer = require('multer');

/* Extensões liberadas por categoria. Qualquer outra é rejeitada para
   impedir que um upload *.html ou *.svg seja servido pela mesma origem. */
const TIPOS = {
    audio: {
        ext: ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac'],
        mime: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/x-flac'],
        limite: 50 * 1024 * 1024
    },
    imagem: {
        ext: ['.jpg', '.jpeg', '.png', '.webp'],
        mime: ['image/jpeg', 'image/png', 'image/webp'],
        limite: 5 * 1024 * 1024
    }
};

function extensao(file) {
    return path.extname(file.originalname || '').toLowerCase();
}

function criarFiltro(categoria) {
    const { ext, mime } = TIPOS[categoria];

    return function fileFilter(req, file, cb) {
        const okExt = ext.includes(extensao(file));
        const okMime = mime.includes(String(file.mimetype).toLowerCase());

        if (okExt && okMime) {
            return cb(null, true);
        }

        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    };
}

function criarStorage(caminho) {
    return multer.diskStorage({
        destination: (req, file, callback) => {
            callback(null, path.resolve(caminho));
        },
        filename: (req, file, callback) => {
            callback(null, `${Date.now()}_${crypto.randomUUID()}${extensao(file)}`);
        }
    });
}

module.exports = function multerUpload(caminho, categoria = 'imagem') {
    const tipo = TIPOS[categoria];

    if (!tipo) {
        throw new Error(`Categoria de upload desconhecida: ${categoria}`);
    }

    return multer({
        storage: criarStorage(caminho),
        fileFilter: criarFiltro(categoria),
        limits: {
            fileSize: tipo.limite,
            files: 1
        }
    });
};

module.exports.TIPOS = TIPOS;
module.exports.extensao = extensao;