const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

const { csrfVerify } = require('../helpers/csrf');
const User = require('../models/Usuario');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MINIMO_SENHA = 8;

function redirecionarSeguro(valor) {
    const destino = String(valor || '');
    /* Só aceita caminhos internos, bloqueia open redirect. */
    if (!destino.startsWith('/') || destino.startsWith('//')) return '/home';
    return destino;
}

router.use(csrfVerify);

router.get('/login', (req, res) => {
    res.render('usuarios/login', { erros: [], redirect: redirecionarSeguro(req.query.redirect) });
});

router.post('/registro', async (req, res) => {
    const erros = [];
    const redirect = redirecionarSeguro(req.body.redirect);

    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    if (!nome) erros.push({ texto: 'Nome inválido!' });
    if (!email || !EMAIL_RE.test(email)) erros.push({ texto: 'E-mail inválido!' });
    if (!senha) erros.push({ texto: 'Senha inválida!' });
    if (senha && senha.length < MINIMO_SENHA) {
        erros.push({ texto: `Senha muito curta! Use ao menos ${MINIMO_SENHA} caracteres.` });
    }
    if (senha !== String(req.body.senha2 || '')) {
        erros.push({ texto: 'As senhas são diferentes!' });
    }

    if (erros.length > 0) {
        return res.status(422).render('usuarios/login', { erros, redirect });
    }

    try {
        const existente = await User.findOne({ where: { email } });

        if (existente) {
            erros.push({ texto: 'Já existe uma conta com esse e-mail!' });
            return res.status(409).render('usuarios/login', { erros, redirect });
        }

        await User.create({
            name: nome,
            email,
            password: await bcrypt.hash(senha, 10)
        });

        req.flash('success_msg', 'Conta criada com sucesso! Faça login para continuar.');
        return res.redirect('/usuario/login');
    } catch (err) {
        console.error('Erro ao registrar usuário:', err);
        req.flash('error_msg', 'Erro ao registrar usuário.');
        return res.redirect('/usuario/login');
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Erro na autenticação:', err);
            return next(err);
        }

        if (!user) {
            req.flash('error_msg', (info && info.message) || 'Não foi possível entrar.');
            return res.redirect('/usuario/login');
        }

        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('Erro no login:', loginErr);
                return next(loginErr);
            }
            return res.redirect(redirecionarSeguro(req.body.redirect));
        });
    })(req, res, next);
});

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success_msg', 'Você saiu da sua conta.');
        return res.redirect('/usuario/login');
    });
});

module.exports = router;