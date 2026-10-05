function paginaDeErro(req, res, status, titulo, mensagem) {
    return res.status(status).render('403/erro', {
        titulo,
        mensagem,
        user: req.user && req.user.get ? req.user.get({ plain: true }) : (req.user || null)
    });
}

module.exports = {
    eAdmin: function (req, res, next) {
        if (typeof req.isAuthenticated !== 'function' || !req.isAuthenticated()) {
            const destino = encodeURIComponent(req.originalUrl || '/admin');
            return res.redirect(`/usuario/login?redirect=${destino}`);
        }

        if (!req.user || req.user.isAdmin != 1) {
            return paginaDeErro(
                req,
                res,
                403,
                'Acesso restrito',
                'Esta área é exclusiva para administradores. Sua conta não tem permissão para acessar.'
            );
        }

        return next();
    }
};