// carregando modulos
const express = require('express');
const handlebars = require('handlebars');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const { eLogado } = require('./helpers/eLogado');
const { csrfToken } = require('./helpers/csrf');
const { Op } = require('sequelize');
const app = express();
const session = require('express-session');
const flash = require('connect-flash');
const usuario = require('./routes/login');
const admin = require('./routes/admin');
const passport = require('passport');
require('./config/auth')(passport);
const sequelize = require('./config/db');
const Musica = require('./models/Musica');
const Artista = require('./models/Artista');

Artista.hasMany(Musica, {
    foreignKey: 'artistId',
    as: 'musicas'
});

Musica.belongsTo(Artista, {
    foreignKey: 'artistId',
    as: 'artista'
});

// Configurando o app
const isProducao = process.env.NODE_ENV === 'production';

// Session
app.use(session({
    name: 'vibewave.sid',
    secret: process.env.SESSION_SECRET || '4!hrNR2QY0vC',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProducao,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Middleware
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user && req.user.get ? req.user.get({ plain: true }) : (req.user || null);
    next();
});

// Token CSRF disponivel para todos os templates
app.use(csrfToken);

// TEMPORARIO (diagnostico): registra o que o browser envia para /admin
const fsLog = require('fs');
app.use((req, res, next) => {
    if (req.method !== 'POST' && !req.originalUrl.includes('/admin')) return next();

    const linha = [
        new Date().toISOString(),
        req.method,
        req.originalUrl,
        'ct=' + (req.get('content-type') || '').slice(0, 60),
        'cookie=' + (req.get('cookie') ? 'sim' : 'nao'),
        'ref=' + (req.get('referer') || 'nenhum'),
        'orig=' + (req.get('origin') || 'nenhum')
    ].join(' | ');

    try { fsLog.appendFileSync('/tmp/opencode/req.log', linha + '\n'); } catch (e) {}

    res.on('finish', () => {
        try { fsLog.appendFileSync('/tmp/opencode/req.log', '    -> status=' + res.statusCode + ' loc=' + (res.get('Location') || '-') + '\n'); } catch (e) {}
    });

    next();
});

// body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Handlebars
app.engine('handlebars', exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials'
}));
app.set('view engine', 'handlebars');

handlebars.registerHelper('eq', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('neq', function (a, b, options) {
    return a !== b ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('formatDuracao', function (segundos) {
    if (segundos === null || segundos === undefined || isNaN(segundos)) return '0:00';
    const minutos = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
});

handlebars.registerHelper('inc', function (value) {
    return Number(value) + 1;
});

handlebars.registerHelper('concat', function (...valores) {
    /* O Handlebars anexa o objeto `options` como último argumento quando o
       helper usa rest params. Descartar para não vazar "[object Object]". */
    const ultimo = valores[valores.length - 1];
    if (ultimo && typeof ultimo === 'object' && ultimo.name === 'concat' && ultimo.hash) {
        valores.pop();
    }

    return valores.map((valor) => (valor === undefined || valor === null ? '' : String(valor))).join('');
});

handlebars.registerHelper('ternario', function (condicao, verdadeiro, falso) {
    return condicao ? verdadeiro : falso;
});

handlebars.registerHelper('gt', function (a, b, options) {
    return Number(a) > Number(b) ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('gte', function (a, b, options) {
    return Number(a) >= Number(b) ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('lt', function (a, b, options) {
    return Number(a) < Number(b) ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('dataTrack', function (musica) {
    const capa = musica.capa ? `/uploads/capamusica/${musica.capa}` : '/img/default.svg';
    const artista = musica.artista && musica.artista.nome ? musica.artista.nome : 'Artista desconhecido';

    const atributos = {
        'data-track-id': musica.id,
        'data-track-src': `/uploads/musicas/${musica.audio}`,
        'data-track-capa': capa,
        'data-track-titulo': musica.titulo,
        'data-track-artista': artista,
        'data-track-duracao': musica.duracao || 0
    };

    const html = Object.entries(atributos)
        .map(([chave, valor]) => `${chave}="${handlebars.escapeExpression(valor)}"`)
        .join(' ');

    return new handlebars.SafeString(html);
});

// Public
app.use(express.static(__dirname + '/public', { index: false, dotfiles: 'deny' }));

// Rotas

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/home', eLogado, async (req, res) => {
    try {
        const userData = req.user.get({ plain: true });

        const musicas = await Musica.findAll({
            include: [{
                model: Artista,
                as: 'artista'
            }]
        });

        res.render('homes/home', {
            user: userData,
            musicas: musicas.map((musica) => musica.get({ plain: true }))
        });
    } catch (err) {
        console.error('Erro ao carregar home:', err);
        res.status(500).render('404/erro');
    }
});

app.get('/api/player/:id', async (req, res) => {
    try {
        const musica = await Musica.findByPk(req.params.id, {
            include: [{ model: Artista, as: 'artista' }]
        });

        if (!musica) {
            return res.status(404).json({ error: 'Música não encontrada' });
        }

        res.json(musica.get({ plain: true }));
    } catch (err) {
        console.error('Erro ao buscar música:', err);
        res.status(500).json({ error: 'Erro ao buscar a música' });
    }
});

app.get('/teste', (req, res) => {
    res.render('tests/teste');
});

app.get('/lybrary', async (req, res) => {
    try {
        const [artistas, musicas] = await Promise.all([
            Artista.findAll({ order: [['nome', 'ASC']] }),
            Musica.findAll({
                include: [{ model: Artista, as: 'artista' }],
                order: [['id', 'DESC']]
            })
        ]);

        res.render('homes/lybrary', {
            artistas: artistas.map((a) => a.get({ plain: true })),
            musicas: musicas.map((m) => m.get({ plain: true }))
        });
    } catch (err) {
        console.error('Erro ao carregar biblioteca:', err);
        res.status(500).render('404/erro');
    }
});

app.get('/perfil', eLogado, (req, res) => {
    const userData = req.user.get({ plain: true });
    res.render('homes/perfil', { user: userData });
});

app.get('/player/:id', async (req, res) => {
    try {
        const musica = await Musica.findByPk(req.params.id, {
            include: [{ model: Artista, as: 'artista' }]
        });

        if (!musica) {
            return res.status(404).render('404/erro');
        }

        const musicaPlana = musica.get({ plain: true });

        const minutos = Math.floor(musicaPlana.duracao / 60);
        const segundos = Math.floor(musicaPlana.duracao % 60);
        const tempoFormatado = `${minutos}:${segundos.toString().padStart(2, '0')}`;

        res.render('homes/player', {
            musica: musicaPlana,
            tempo: tempoFormatado
        });
    } catch (err) {
        console.error('Erro ao buscar música:', err);
        res.status(500).render('404/erro');
    }
});

async function buscarMusicas() {
    const musicas = await Musica.findAll({
        include: [{ model: Artista, as: 'artista' }],
        order: [['id', 'DESC']]
    });
    return musicas.map((m) => m.get({ plain: true }));
}

app.get('/playlist', async (req, res) => {
    try {
        const musicas = await buscarMusicas();
        res.render('homes/playlist', {
            titulo: 'Favoritas',
            descricao: 'As músicas que você mais ama.',
            musicas
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('404/erro');
    }
});

app.get('/recentemente', async (req, res) => {
    try {
        const musicas = await buscarMusicas();
        res.render('homes/playlist', {
            titulo: 'Tocadas recentemente',
            descricao: 'O que você ouviu por último.',
            musicas
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('404/erro');
    }
});

app.get('/treino', async (req, res) => {
    try {
        const musicas = await buscarMusicas();
        res.render('homes/playlist', {
            titulo: 'Workout Mix',
            descricao: 'Energia para o seu treino.',
            musicas
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('404/erro');
    }
});

app.get('/search', async (req, res) => {
    try {
        const termo = String(req.query.q || '').trim().slice(0, 80);
        let musicas = [];
        let artistas = [];

        if (termo) {
            const like = `%${termo}%`;

            const [resultadosMusicas, resultadosArtistas] = await Promise.all([
                Musica.findAll({
                    where: {
                        [Op.or]: [
                            { titulo: { [Op.like]: like } },
                            { genero: { [Op.like]: like } },
                            { '$artista.nome$': { [Op.like]: like } }
                        ]
                    },
                    include: [{ model: Artista, as: 'artista', required: false }],
                    order: [['id', 'DESC']],
                    limit: 40
                }),
                Artista.findAll({
                    where: {
                        [Op.or]: [
                            { nome: { [Op.like]: like } },
                            { genero_musical: { [Op.like]: like } }
                        ]
                    },
                    order: [['nome', 'ASC']],
                    limit: 40
                })
            ]);

            musicas = resultadosMusicas.map((m) => m.get({ plain: true }));
            artistas = resultadosArtistas.map((a) => a.get({ plain: true }));
        }

        res.render('homes/search', { termo, musicas, artistas });
    } catch (err) {
        console.error('Erro na busca:', err);
        res.status(500).render('404/erro');
    }
});

app.get('/sucess', (req, res) => {
    res.render('sucess/sucess');
});

app.get('/404', (req, res) => {
    res.status(404).render('404/erro');
});

app.get('/403', (req, res) => {
    res.status(403).render('403/erro', {
        titulo: 'Acesso restrito',
        mensagem: 'Você não tem permissão para acessar esta página do VibeWave.'
    });
});

app.use('/usuario', usuario);
app.use('/admin', admin);

// Outros
const port = process.env.PORT || 8089;

app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);

    if (res.headersSent) {
        return next(err);
    }

    const status = err.status || err.statusCode || 500;

    if (req.accepts('html')) {
        return res.status(status).render('404/erro');
    }

    res.status(status).json({ error: isProducao ? 'Erro interno' : err.message });
});

/* Sobe o servidor apenas quando app.js é executado diretamente.
   Assim os testes podem require('./app') sem abrir a porta. */
function iniciar() {
    return sequelize.sync().then(() => {
        console.log('Banco de dados sincronizado!');
        return app.listen(port, () => {
            console.log(`Rodando na porta ${port}`);
        });
    });
}

if (require.main === module) {
    iniciar().catch((err) => {
        console.error('Erro ao sincronizar o banco de dados:', err);
        process.exit(1);
    });
}

module.exports = app;
module.exports.iniciar = iniciar;
module.exports.sequelize = sequelize;