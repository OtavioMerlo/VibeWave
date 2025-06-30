const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const {eAdmin} = require('../helpers/eAdmin');
require('../models/Artista');
require('../models/Musica')
const ArtistaSchema = mongoose.model('artistas');
const MusicasSchema = mongoose.model('musicas');
const multer = require("multer")
const storage = require('../config/multerconfig');
const uploadArtista = storage('./public/uploads/artistas/');
const uploadMusica = storage('./public/uploads/musicas');
const uploadImgCapa = storage('./public/uploads/capamusica');
const aaudio = require("../config/analiseaudio");
const { User } = require('../models/Usuario');

router.get('/', async (req, res) => {
  try {
    const [artistas, musicas, usuarios] = await Promise.all([
      ArtistaSchema.find().sort({ date: 'desc' }).lean(),
      MusicasSchema.find()
        .populate('artista', 'nome')
        .sort({ date: 'desc' })
        .lean(),
    ]);

    const userData = req.user ? req.user.get({ plain: true }) : null;
    console.log(usuarios)
    
    res.render('admin/index', {
      musica: musicas,
      artistas: artistas,
      usuarios: usuarios, // Adicionado os usuários no template
      user: userData
    });

  } catch (err) {
    console.error('Erro na rota /admin:', err);
    res.redirect('/404');
  }
});


router.post('/artista/novo', uploadArtista.single('file'), (req, res) => {
    if (req.body.nome || req.body.country || req.body.mainGenre || req.body.status || req.body.biography || req.body.birthDate){
      new ArtistaSchema({
        nome:req.body.nome,
        pais:req.body.country,
        genero_musical:req.body.mainGenre,
        status: req.body.status,
        biografia:req.body.biography,
        foto:req.file.filename,
        website:req.body.website,
        datanas:req.body.birthDate,
        plataforma:req.body.mainSocialMedia.platform,
        handle:req.body.mainSocialMedia.handle
      }).save().then(() => {
        res.redirect("/admin")
      }).catch((err) =>{
          res.redirect("/404")
      })
    }
});


router.post('/artista/delete/:id', (req, res)=> {
    ArtistaSchema.deleteOne({_id:req.params.id}).then(() =>{
      res.redirect("/admin")
    }).catch((err) => {
      res.redirect("/404")
    });
});

router.get('/artista/edit/:id', (req, res) => {
  ArtistaSchema.findOne({_id:req.params.id}).lean().then((artista) =>{
    if (artista.datanas) {
        artista.datanas = artista.datanas.toISOString().split('T')[0];
    }
    res.render('admin/edit', {artista:artista})
  })
})


router.post('/artista/edit', uploadArtista.single('foto'), (req, res) => {
  ArtistaSchema.findOne({ _id: req.body.id }).then((artista) => {
    artista.nome = req.body.nome;
    artista.pais = req.body.pais;
    artista.genero_musical = req.body.genero_musical;
    artista.status = req.body.status;
    artista.datanas = req.body.datanas;
    artista.biografia = req.body.biografia;
    artista.website = req.body.website;
    artista.plataforma = req.body.plataforma;
    artista.handle = req.body.handle;

    if (req.file) {
      if (artista.foto) {
        const caminhoImagem = path.join(__dirname, '../public/uploads/artistas/', artista.foto);
        fs.unlink(caminhoImagem, (err) => {
          if (err) console.error('Erro ao remover imagem antiga:', err);
        });
      }
      artista.foto = req.file.filename;
    }

    artista.save().then(() => {
      res.redirect("/admin");
    }).catch((err) => {
      console.error('Erro ao salvar artista:', err);
      res.redirect('/404');
    });
  }).catch((err) => {
    console.error('Erro ao encontrar artista:', err);
    res.redirect('/404');
  });
});

router.post("/musicas/nova", uploadMusica.single('musicaaudio'), (req, res) =>{
  const audioPath = path.join(__dirname, '../public/uploads/musicas', req.file.filename);
  aaudio(audioPath)
    .then((meta)=>{
      new MusicasSchema({
        titulo:req.body.titulomusica,
        artista:req.body.musicaartista,
        genero:req.body.musicagenero,
        duracao:meta.duration,
        audio:req.file.filename,
        letra:req.body.musicaletra,
        lancamento:req.body.musicadate,
        status:req.body.musicastatus,
      }).save().then(() =>{
        res.redirect("/admin")
      }).catch((err) => {
        console.log(err)
      })
    })
    .catch(err => console.error('Erro:', err.message));
})

router.get('/api/artista/cont', async (req, res) =>{
  const count = await ArtistaSchema.countDocuments();
  res.json({total_artistas:count});
})

router.get('/api/musica/cont', async (req, res) =>{
  const count = await MusicasSchema.countDocuments();
  res.json({total_musicas:count});
})

router.post('/musica/delete/:id', (req, res)=> {
    MusicasSchema.deleteOne({_id:req.params.id}).then(() =>{
      res.redirect("/admin")
    }).catch((err) => {
      res.redirect("/404")
    });
});

router.get('/music/img/:id', (req, res) =>{
  MusicasSchema.findOne({_id:req.params.id}).then((musica)=>{
    const id = musica._id;
    res.render('admin/addimgmusic', {id:id})
  })
})

router.get('/musica/edit/:id', (req, res)=>{
  MusicasSchema.findOne({_id:req.params.id}).lean().then((musica) =>{
    res.render('admin/editmusic', {musica:musica})
  })
})

router.post('/musica/edit/:id', uploadImgCapa.single('file'), (req, res) => {
  MusicasSchema.findOne({ _id:req.params.id}).then((musica) =>{
    musica.capa = req.file.filename;
    musica.save().then(() => {
      res.redirect("/admin");
    }).catch((err) => {
      console.error('Erro ao salvar música:', err);
      res.redirect('/404');
    });
  })
});




module.exports = router;