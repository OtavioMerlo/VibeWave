// carregando modulos
const express = require('express');
const handlebars = require('handlebars');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const {eLogado} = require('./helpers/eLogado');
const app = express();
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const usuario = require('./routes/login');
const admin = require('./routes/admin');
const passport = require('passport');
const mongoose = require('mongoose');
require('./config/auth')(passport);
require('./models/Musica')
const MusicasSchema = mongoose.model('musicas');


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
    res.locals.user = req.user || null;
    next();
});




// body-parser
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


// Handlebars
app.engine('handlebars', exphbs.engine({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

handlebars.registerHelper('eq', function(a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this);
});


// Public
app.use(express.static(__dirname + '/public'));

// MongoDB
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/vibewave").then(() =>{
  console.log("MongoDb Conectado!!")
}).catch((err) => {
  console.log("Houve um erro ao se conectar ao mongoDB "+err)
})


// mysql

const conection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'otaviomerlo123@',
    database: 'vibewave'
});
conection.connect((err) => {
    if(err){
        console.log('Erro ao conectar no banco de dados: ' + err);
    }else{
        console.log('Conectado ao banco de dados SQL!');
    }
});



// Rotas

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/home', eLogado, (req, res) => {
    const userData = req.user.get({ plain: true });
    MusicasSchema.find().lean().populate('artista').then((musicas)=>{
        res.render('homes/home', { user: userData, musicas:musicas });
    }).catch((err)=>{
        res.redirect('/404')
    })
    
});


app.get('/api/player/:id', (req, res) => {
    MusicasSchema.findOne({_id:req.params.id}).lean().then((musica)=>{
        res.json(musica)
    }).catch((err)=>{
        res.redirect('/404', {err:err})
    })
});

app.get('/teste', (req, res)=>{
    res.render('tests/teste')
})

app.get('/lybrary', (req, res) => {
    res.render('homes/lybrary');
});

app.get('/perfil', eLogado, (req, res) => {
    const userData = req.user.get({ plain: true });
    res.render('homes/perfil', {user: userData });
});

app.get('/player', (req, res) => {
    res.render('homes/player');
});

app.get('/playlist', (req, res) => {
    res.render('homes/playlist');
});

app.get('/recentemente', (req, res) => {
    res.render('homes/recentemente');
});

app.get('/search', (req, res) => {
    res.render('homes/search');
});

app.get('/treino', (req, res) => {
    res.render('homes/treino');
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
app.listen(port, () =>{
    console.log(`Rondando na porta ${port}`);
});