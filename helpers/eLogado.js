module.exports = {
    eLogado: function (req, res, next) {
        if (typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
            return next();
        }

        const destino = req.originalUrl && req.originalUrl !== '/' ? req.originalUrl : '';
        const query = destino ? `?redirect=${encodeURIComponent(destino)}` : '';

        return res.redirect(`/usuario/login${query}`);
    }
};