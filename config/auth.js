const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { User } = require('../models/Usuario'); // Importando do seu arquivo

module.exports = function(passport) {
    passport.use(new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password' // Note que seu modelo usa 'password' não 'senha'
        },
        async (email, password, done) => {
            try {
                const user = await User.findOne({ where: { email: email } });
                
                if (!user) {
                    return done(null, false, { message: 'Email não cadastrado!' });
                }

                bcrypt.compare(password, user.password, (erro, batem) => {
                if(batem) {
                    return done(null, user);
                } else {
                    return done(null, false, {message: 'Senha incorreta!'});
                }
            });
            } catch (err) {
                console.error('Erro na autenticação:', err);
                return done(err);
            }
        }
    ));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findByPk(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};