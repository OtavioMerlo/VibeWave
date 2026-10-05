const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const LIMITE_BYTES = 5 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
    const extensoesOk = ['.jpg', '.jpeg', '.png', '.webp'];
    const mimesOk = ['image/jpeg', 'image/png', 'image/webp'];

    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype).toLowerCase();

    if (extensoesOk.includes(ext) && mimesOk.includes(mime)) {
        return cb(null, true);
    }

    cb(new Error('Formato de imagem não permitido. Use JPG, PNG ou WEBP.'));
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: LIMITE_BYTES, files: 1 }
});

/* Recorta para no máximo 640x640 e converte para webp. */
async function processImage(req, res, next) {
    if (!req.file) return next();

    try {
        const arquivo = path.extname(req.file.originalname || '').toLowerCase();
        const destino = path.join(__dirname, '..', 'public', 'uploads', 'artistas');
        const nomeFinal = arquivo === '.webp' ? 'webp' : 'jpeg';

        const filename = `artista-${Date.now()}.${nomeFinal}`;

        let pipeline = sharp(req.file.buffer).rotate();

        pipeline =
            nomeFinal === 'webp'
                ? pipeline.resize(640, 640, { fit: 'cover', position: 'attention' }).webp({ quality: 82 })
                : pipeline.resize(640, 640, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true });

        await pipeline.toFile(path.join(destino, filename));

        req.body.foto = filename;
        next();
    } catch (err) {
        next(err);
    }
}

module.exports = { upload, processImage, LIMITE_BYTES };