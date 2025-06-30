const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

const { User } = require('../models/Usuario');



router.get('/login', (req, res) => {
    res.render('usuarios/login');
});

router.post('/registro', async (req, res) => {
    console.log('Dados recebidos:', req.body);
    
    var erros = [];

    if(!req.body.nome || typeof req.body.nome == undefined || req.body.nome == null) {
        erros.push({texto: 'Nome inválido!'});
    }

    if(!req.body.email || typeof req.body.email == undefined || req.body.email == null) {
        erros.push({texto: 'Email inválido!'});
    }

    if(!req.body.senha || typeof req.body.senha == undefined || req.body.senha == null) {
        erros.push({texto: 'Senha inválida!'});
    }

    if(req.body.senha.length < 4) {
        erros.push({texto: 'Senha muito curta!'});
    }

    if(req.body.senha != req.body.senha2) {
        erros.push({texto: 'As senhas são diferentes!'});
    }

    if(erros.length > 0) {
        console.log('Erros de validação:', erros);
        return res.render('usuarios/login', {erros: erros});
    }

    try {
        const usuario = await User.findOne({ where: { email: req.body.email } });
        console.log('Usuário encontrado:', usuario);
        
        if(usuario) {
            console.log('Email já cadastrado');
            req.flash('error_msg', 'Já existe uma conta com esse email!');
            return res.redirect('/usuario/login');
        }

        // Corrigido: await para o hash da senha
        const hashedPassword = await bcrypt.hash(req.body.senha, 10);

        const novoUsuario = {
            name: req.body.nome,
            email: req.body.email,
            password: hashedPassword, // Usando o hash gerado
        };

        console.log('Tentando criar usuário:', novoUsuario);
        
        await User.create(novoUsuario);
        console.log('Usuário criado com sucesso');
        req.flash('success_msg', 'Usuário registrado com sucesso!');
        res.redirect('/usuario/login');
    } catch (err) {
        console.error('Erro:', err);
        req.flash('error_msg', 'Erro ao registrar usuário: ' + err.message);
        res.redirect('/usuario/login');
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Erro na autenticação:', err);
            return next(err);
        }
        if (!user) {
            req.flash('error_msg', info.message);
             return res.redirect('/usuario/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Erro no login:', err);
                return next(err);
            }
            return res.redirect('/home');
        });
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if(err) {
            return next(err);
        }
        req.flash('success_msg', 'Deslogado com sucesso!');
        res.redirect('/usuario/login');
    });
});



module.exports = router;