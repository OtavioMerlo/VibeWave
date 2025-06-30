const multer = require('multer');
const path = require("path");

function createStorage(caminho) {
    return multer.diskStorage({
        destination: (req, file, callback) => {
            callback(null, path.resolve(caminho));
        },
        filename: (req, file, callback) => {
            const time = new Date().getTime();
            callback(null, `${time}_${file.originalname}`);
        }
    });
}


module.exports = function(caminho) {
    const storage = createStorage(caminho);
    return multer({ storage: storage });
};