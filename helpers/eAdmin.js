module.exports = {
    eAdmin: function(req, res, next) {
        if(req.isAuthenticated() && req.user.isAdmin == 1) {
            return next();
        }
        req.flash('error_msg', 'Você precisa ser um administrador para acessar essa área!');
        res.redirect('/');
    }
};