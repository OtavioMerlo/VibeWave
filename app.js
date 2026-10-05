// carregando modulos
const express = require('express');
const handlebars = require('handlebars');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const {eLogado} = require('./helpers/eLogado');
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
// Session 
app.use(session({
    secret: '4!hrNR2QY0vC',
    resave: false,  // Alterado para false (melhor performance)
    saveUninitialized: false,  // Alterado para false (GDPR compliance)
    cookie: { secure: false }  // true se estiver usando HTTPS
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




// body-parser
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


// Handlebars
app.engine('handlebars', exphbs.engine({
    defaultLayout: 'main',
    partialsDir: __dirname + '/views/partials'
}));
app.set('view engine', 'handlebars');

handlebars.registerHelper('eq', function(a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper('formatDuracao', function(segundos) {
  if (segundos === null || segundos === undefined || isNaN(segundos)) return '0:00';
  const minutos = Math.floor(segundos / 60);
  const segs = Math.floor(segundos % 60);
  return `${minutos}:${segs.toString().padStart(2, '0')}`;
});

handlebars.registerHelper('inc', function(value) {
  return Number(value) + 1;
});


// Public
app.use(express.static(__dirname + '/public'));


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
            musicas: musicas.map(musica => musica.get({ plain: true }))
        });

    } catch (err) {

        console.error('Erro ao carregar home:', err);

        res.redirect('/404');
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
        res.status(500).json({ error: err.message });
    }
});

app.get('/teste', (req, res)=>{
    res.render('tests/teste')
})

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
            artistas: artistas.map(a => a.get({ plain: true })),
            musicas: musicas.map(m => m.get({ plain: true }))
        });
    } catch (err) {
        console.error('Erro ao carregar biblioteca:', err);
        res.redirect('/404');
    }
});

app.get('/perfil', eLogado, (req, res) => {
    const userData = req.user.get({ plain: true });
    res.render('homes/perfil', {user: userData });
});

app.get('/player/:id', async (req, res) => {
    try {
        const musica = await Musica.findByPk(req.params.id, {
            include: [{ model: Artista, as: 'artista' }]
        });

        if (!musica) {
            return res.redirect('/404');
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
        res.redirect('/404');
    }
});

async function buscarMusicas() {
    const musicas = await Musica.findAll({
        include: [{ model: Artista, as: 'artista' }],
        order: [['id', 'DESC']]
    });
    return musicas.map(m => m.get({ plain: true }));
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
        res.redirect('/404');
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
        res.redirect('/404');
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
        res.redirect('/404');
    }
});

app.get('/search', (req, res) => {
    res.render('homes/search');
});

app.get("/sucess", (req,res) => {
    res.render('sucess/sucess');
});

app.get("/404", (req,res) => {
    res.render('404/erro');
});

app.use('/usuario', usuario);
app.use('/admin', admin);

// Outros
const port = process.env.PORT || 8089;

sequelize.sync()
    .then(() => {
        console.log('Banco de dados sincronizado!');
        app.listen(port, () =>{
            console.log(`Rodando na porta ${port}`);
        });
    })
    .catch((err) => {
        console.error('Erro ao sincronizar o banco de dados:', err);
    });
