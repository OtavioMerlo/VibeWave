const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

// Configuração do armazenamento
const storage = multer.memoryStorage();

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Apenas imagens são permitidas!'));
};

// Configuração do upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware para processar a imagem
const processImage = async (req, res, next) => {
  if (!req.file) return next();
  
  try {
    const filename = `artist-${Date.now()}.jpeg`;
    const imagePath = path.join(__dirname, '../public/uploads/artists', filename);
    
    await sharp(req.file.buffer)
      .resize(800, 800)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(imagePath);
    
    req.body.photoUrl = `/uploads/artists/${filename}`;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, processImage };