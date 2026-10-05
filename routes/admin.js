const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const {eAdmin} = require('../helpers/eAdmin');
const Musica = require('../models/Musica');
const Artista = require('../models/Artista');
const User = require('../models/Usuario');
const storage = require('../config/multerconfig');
const uploadArtista = storage('./public/uploads/artistas/');
const uploadMusica = storage('./public/uploads/musicas');
const uploadImgCapa = storage('./public/uploads/capamusica');
const aaudio = require("../config/analiseaudio");

const toPlain = (rows) => rows.map((row) => row.get({ plain: true }));

router.get('/', async (req, res) => {
  try {
    const [artistas, musicas, usuarios] = await Promise.all([
      Artista.findAll({ order: [['id', 'DESC']] }),
      Musica.findAll({
        include: [{ model: Artista, as: 'artista' }],
        order: [['id', 'DESC']]
      }),
      User.findAll({ order: [['id', 'DESC']] })
    ]);

    const artistasPlain = toPlain(artistas);
    const musicasPlain = toPlain(musicas);
    const usuariosPlain = toPlain(usuarios);

    const userData = req.user ? req.user.get({ plain: true }) : null;

    res.render('admin/index', {
      musicas: musicasPlain,
      artistas: artistasPlain,
      usuarios: usuariosPlain,
      totalMusicas: musicasPlain.length,
      totalArtistas: artistasPlain.length,
      totalUsuarios: usuariosPlain.length,
      user: userData
    });

  } catch (err) {
    console.error('Erro na rota /admin:', err);
    res.redirect('/404');
  }
});


router.post('/artista/novo', uploadArtista.single('file'), async (req, res) => {
  try {
    const social = req.body.mainSocialMedia || {};

    await Artista.create({
      nome: req.body.nome,
      pais: req.body.country,
      genero_musical: req.body.mainGenre,
      status: req.body.status,
      biografia: req.body.biography,
      foto: req.file ? req.file.filename : 'default.png',
      website: req.body.website,
      datanas: req.body.birthDate || null,
      plataforma: social.platform || null,
      handle: social.handle || null
    });

    res.redirect('/admin');
  } catch (err) {
    console.error('Erro ao criar artista:', err);
    res.redirect('/404');
  }
});


router.post('/artista/delete/:id', async (req, res) => {
  try {
    const artista = await Artista.findByPk(req.params.id);

    if (artista && artista.foto && artista.foto !== 'default.png') {
      const caminhoImagem = path.join(__dirname, '../public/uploads/artistas/', artista.foto);
      fs.unlink(caminhoImagem, (err) => {
        if (err) console.error('Erro ao remover imagem:', err);
      });
    }

    await Artista.destroy({ where: { id: req.params.id } });
    res.redirect('/admin');
  } catch (err) {
    console.error('Erro ao deletar artista:', err);
    res.redirect('/404');
  }
});

router.get('/artista/edit/:id', async (req, res) => {
  try {
    const artista = await Artista.findByPk(req.params.id);

    if (!artista) {
      return res.redirect('/admin');
    }

    const data = artista.get({ plain: true });

    if (data.datanas) {
      data.datanas = new Date(data.datanas).toISOString().split('T')[0];
    }

    res.render('admin/edit', { artista: data });
  } catch (err) {
    console.error('Erro ao buscar artista:', err);
    res.redirect('/404');
  }
});


router.post('/artista/edit', uploadArtista.single('foto'), async (req, res) => {
  try {
    const artista = await Artista.findByPk(req.body.id);

    if (!artista) {
      return res.redirect('/admin');
    }

    artista.nome = req.body.nome;
    artista.pais = req.body.pais;
    artista.genero_musical = req.body.genero_musical;
    artista.status = req.body.status;
    artista.datanas = req.body.datanas || null;
    artista.biografia = req.body.biografia;
    artista.website = req.body.website;
    artista.plataforma = req.body.plataforma;
    artista.handle = req.body.handle;

    if (req.file) {
      if (artista.foto && artista.foto !== 'default.png') {
        const caminhoImagem = path.join(__dirname, '../public/uploads/artistas/', artista.foto);
        fs.unlink(caminhoImagem, (err) => {
          if (err) console.error('Erro ao remover imagem antiga:', err);
        });
      }
      artista.foto = req.file.filename;
    }

    await artista.save();
    res.redirect('/admin');
  } catch (err) {
    console.error('Erro ao salvar artista:', err);
    res.redirect('/404');
  }
});

router.post("/musicas/nova", uploadMusica.single('musicaaudio'), async (req, res) => {
  try {
    const audioPath = path.join(__dirname, '../public/uploads/musicas', req.file.filename);
    const meta = await aaudio(audioPath);

    await Musica.create({
      titulo: req.body.titulomusica,
      artistId: req.body.musicaartista,
      genero: req.body.musicagenero,
      duracao: Math.round(meta.duration) || 0,
      audio: req.file.filename,
      letra: req.body.musicaletra,
      lancamento: req.body.musicadate || new Date(),
      status: req.body.musicastatus
    });

    res.redirect('/admin');
  } catch (err) {
    console.error('Erro ao criar música:', err);
    res.redirect('/404');
  }
});

router.get('/api/artista/cont', async (req, res) => {
  const count = await Artista.count();
  res.json({ total_artistas: count });
});

router.get('/api/musica/cont', async (req, res) => {
  const count = await Musica.count();
  res.json({ total_musicas: count });
});

router.post('/musica/delete/:id', async (req, res) => {
  try {
    await Musica.destroy({ where: { id: req.params.id } });
    res.redirect('/admin');
  } catch (err) {
    console.error('Erro ao deletar música:', err);
    res.redirect('/404');
  }
});

router.get('/music/img/:id', async (req, res) => {
  try {
    const musica = await Musica.findByPk(req.params.id);

    if (!musica) {
      return res.redirect('/admin');
    }

    res.render('admin/addimgmusic', { id: musica.id });
  } catch (err) {
    console.error('Erro ao buscar música:', err);
    res.redirect('/404');
  }
});

router.get('/musica/edit/:id', async (req, res) => {
  try {
    const musica = await Musica.findByPk(req.params.id);

    if (!musica) {
      return res.redirect('/admin');
    }

    res.render('admin/editmusic', { musica: musica.get({ plain: true }) });
  } catch (err) {
    console.error('Erro ao buscar música:', err);
    res.redirect('/404');
  }
});

router.post('/musica/edit/:id', uploadImgCapa.single('file'), async (req, res) => {
  try {
    const musica = await Musica.findByPk(req.params.id);

    if (!musica) {
      return res.redirect('/admin');
    }

    if (req.file) {
      musica.capa = req.file.filename;
    }

    await musica.save();
    res.redirect('/admin');
  } catch (err) {
    console.error('Erro ao salvar música:', err);
    res.redirect('/404');
  }
});


module.exports = router;
