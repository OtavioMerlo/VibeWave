const express = require('express');
const fs = require('fs');
const path = require('path');
const { fn, col } = require('sequelize');

const { eAdmin } = require('../helpers/eAdmin');
const { csrfVerify, verificarCsrfAposUpload } = require('../helpers/csrf');
const {
    paginaAtual,
    termoBusca,
    paginacao,
    validarId,
    filtroTexto,
    querystringPaginacao,
    validarCampos
} = require('../helpers/validacao');

const multerUpload = require('../config/multerconfig');
const opcoes = require('../config/opcoes');
const obterMetadados = require('../config/analiseaudio');

const Musica = require('../models/Musica');
const Artista = require('../models/Artista');
const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');

const router = express.Router();

const uploadArtista = multerUpload('./public/uploads/artistas/', 'imagem');
const uploadMusica = multerUpload('./public/uploads/musicas/', 'audio');
const uploadCapa = multerUpload('./public/uploads/capamusica/', 'imagem');

const DIR_UPLOADS = path.join(__dirname, '..', 'public', 'uploads');

/* Nomessent/defaults legados: nunca apagar esses arquivos do disco. */
const NOMES_PADRAO = new Set(['default.png', 'default.svg']);

const toPlain = (rows) => rows.map((row) => row.get({ plain: true }));

/* ---------- utilidades ---------- */

function dadosDoUsuario(req) {
    return req.user && req.user.get ? req.user.get({ plain: true }) : null;
}

function apagarArquivo(diretorio, arquivo) {
    if (!arquivo || NOMES_PADRAO.has(arquivo)) return;

    const caminho = path.join(DIR_UPLOADS, diretorio, path.basename(arquivo));

    fs.unlink(caminho, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error(`Erro ao remover ${caminho}:`, err.message);
        }
    });
}

function mensagemDeErroMulter(err) {
    if (!err || err.name !== 'MulterError') return null;

    if (err.code === 'LIMIT_FILE_SIZE') {
        return 'Arquivo muito grande. Verifique o tamanho máximo permitido.';
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
        return 'Arquivo não permitido ou em quantidade inesperada.';
    }

    return 'Falha no envio do arquivo.';
}

/* ---------- proteção ---------- */

router.use(eAdmin);
router.use(csrfVerify);

/* =========================================================
   DASHBOARD
   ========================================================= */

router.get('/', async (req, res) => {
    try {
        const [totalMusicas, totalArtistas, totalUsuarios, musicas, artistas] = await Promise.all([
            Musica.count(),
            Artista.count(),
            Usuario.count(),
            Musica.findAll({
                include: [{ model: Artista, as: 'artista' }],
                order: [['id', 'DESC']],
                limit: 5
            }),
            Artista.findAll({ order: [['id', 'DESC']], limit: 5 })
        ]);

        const musicasPendentes = await Musica.count({ where: { status: 'Pendente' } });
        const artistasInativos = await Artista.count({ where: { status: 'Inativo' } });

        res.render('admin/index', {
            layout: 'admin',
            active: 'dashboard',
            user: dadosDoUsuario(req),
            opcoes,
            totalMusicas,
            totalArtistas,
            totalUsuarios,
            musicasPendentes,
            artistasInativos,
            ultimasMusicas: toPlain(musicas),
            ultimosArtistas: toPlain(artistas)
        });
    } catch (err) {
        console.error('Erro na dashboard:', err);
        res.status(500).render('404/erro');
    }
});

/* =========================================================
   MÚSICAS
   ========================================================= */

router.get('/musicas', async (req, res) => {
    try {
        const pagina = paginaAtual(req);
        const termo = termoBusca(req);
        const status = req.query.status && opcoes.STATUS_MUSICA.includes(req.query.status) ? req.query.status : '';
        const genero = req.query.genero && opcoes.GENEROS.includes(req.query.genero) ? req.query.genero : '';

        const where = {
            ...filtroTexto(termo, ['titulo', 'genero', 'status']),
            ...(status ? { status } : {}),
            ...(genero ? { genero } : {})
        };

        const { rows, count } = await Musica.findAndCountAll({
            where,
            include: [{ model: Artista, as: 'artista' }],
            order: [['id', 'DESC']],
            limit: paginacao().limite,
            offset: (pagina - 1) * paginacao().limite
        });

        const paginaInfo = paginacao(count, pagina);

        res.render('admin/musicas', {
            layout: 'admin',
            active: 'musicas',
            user: dadosDoUsuario(req),
            opcoes,
            musicas: toPlain(rows),
            filtros: { q: termo, status, genero },
            paginacao: paginaInfo,
            queryProxima: querystringPaginacao(req, paginaInfo.pagina + 1),
            queryAnterior: querystringPaginacao(req, paginaInfo.pagina - 1)
        });
    } catch (err) {
        console.error('Erro ao listar músicas:', err);
        res.status(500).render('404/erro');
    }
});

/* Formulário de criação */
router.get('/musicas/nova', async (req, res) => {
    try {
        const artistas = await Artista.findAll({ order: [['nome', 'ASC']] });

        res.render('admin/musica-form', {
            layout: 'admin',
            active: 'musicas',
            user: dadosDoUsuario(req),
            opcoes,
            artistas: toPlain(artistas),
            musica: null,
            erro: null
        });
    } catch (err) {
        console.error('Erro no formulário de música:', err);
        res.status(500).render('404/erro');
    }
});

/* Formulário de edição */
router.get('/musicas/:id/editar', validarId, async (req, res) => {
    try {
        const musica = await Musica.findByPk(req.params.id);
        if (!musica) return res.status(404).render('404/erro');

        const artistas = await Artista.findAll({ order: [['nome', 'ASC']] });

        res.render('admin/musica-form', {
            layout: 'admin',
            active: 'musicas',
            user: dadosDoUsuario(req),
            opcoes,
            artistas: toPlain(artistas),
            musica: musica.get({ plain: true }),
            erro: null
        });
    } catch (err) {
        console.error('Erro no formulário de edição:', err);
        res.status(500).render('404/erro');
    }
});

router.post('/musicas', uploadMusica.single('audio'), verificarCsrfAposUpload, async (req, res) => {
    let enviado = null;

    try {
        enviado = req.file;
        const erros = validarCampos({
            titulo: { valor: req.body.titulo, obrigatorio: true, max: 180 },
            artistId: { valor: req.body.artistId, obrigatorio: true },
            genero: { valor: req.body.genero, obrigatorio: true },
            lancamento: { valor: req.body.lancamento, data: true }
        });

        if (!enviado) {
            erros.audio = 'Envie o arquivo de áudio da música.';
        }

        if (!opcoes.GENEROS.includes(req.body.genero)) {
            erros.genero = 'Gênero inválido.';
        }

        const status = opcoes.STATUS_MUSICA.includes(req.body.status) ? req.body.status : 'Ativa';

        let duracao = 0;
        if (enviado) {
            const caminho = path.join(DIR_UPLOADS, 'musicas', enviado.filename);
            const meta = await obterMetadados(caminho);
            duracao = Math.round(Number(meta.duration)) || 0;
        }

        const artista = await Artista.findByPk(req.body.artistId);
        if (!artista) {
            erros.artistId = 'Artista não encontrado.';
        }

        if (Object.keys(erros).length > 0) {
            if (enviado) apagarArquivo('musicas', enviado.filename);
            const artistas = await Artista.findAll({ order: [['nome', 'ASC']] });
            return res.status(422).render('admin/musica-form', {
                layout: 'admin',
                active: 'musicas',
                user: dadosDoUsuario(req),
                opcoes,
                artistas: toPlain(artistas),
                musica: null,
                erro: erros
            });
        }

        await Musica.create({
            titulo: req.body.titulo.trim(),
            artistId: Number(req.body.artistId),
            genero: req.body.genero,
            duracao,
            audio: enviado.filename,
            letra: (req.body.letra || '').trim() || null,
            lancamento: req.body.lancamento || new Date(),
            status
        });

        req.flash('success_msg', `Música "${req.body.titulo.trim()}" cadastrada com sucesso!`);
        return res.redirect('/admin/musicas');
    } catch (err) {
        if (enviado) apagarArquivo('musicas', enviado.filename);

        const mensagem = mensagemDeErroMulter(err) || 'Erro ao cadastrar a música.';
        console.error('Erro ao criar música:', err);
        req.flash('error_msg', mensagem);
        return res.redirect('/admin/musicas/nova');
    }
});

router.post('/musicas/:id', validarId, uploadMusica.single('audio'), verificarCsrfAposUpload, async (req, res) => {
    let enviado = null;

    try {
        enviado = req.file;
        const musica = await Musica.findByPk(req.params.id);

        if (!musica) {
            if (enviado) apagarArquivo('musicas', enviado.filename);
            return res.status(404).render('404/erro');
        }

        const erros = validarCampos({
            titulo: { valor: req.body.titulo, obrigatorio: true, max: 180 },
            artistId: { valor: req.body.artistId, obrigatorio: true },
            genero: { valor: req.body.genero, obrigatorio: true },
            lancamento: { valor: req.body.lancamento, data: true }
        });

        if (!opcoes.GENEROS.includes(req.body.genero)) erros.genero = 'Gênero inválido.';

        const artista = await Artista.findByPk(req.body.artistId);
        if (!artista) erros.artistId = 'Artista não encontrado.';

        if (Object.keys(erros).length > 0) {
            if (enviado) apagarArquivo('musicas', enviado.filename);
            const artistas = await Artista.findAll({ order: [['nome', 'ASC']] });
            return res.status(422).render('admin/musica-form', {
                layout: 'admin',
                active: 'musicas',
                user: dadosDoUsuario(req),
                opcoes,
                artistas: toPlain(artistas),
                musica: musica.get({ plain: true }),
                erro: erros
            });
        }

        const audioAnterior = musica.audio;

        musica.titulo = req.body.titulo.trim();
        musica.artistId = Number(req.body.artistId);
        musica.genero = req.body.genero;
        musica.status = opcoes.STATUS_MUSICA.includes(req.body.status) ? req.body.status : musica.status;
        musica.letra = (req.body.letra || '').trim() || null;
        musica.lancamento = req.body.lancamento || musica.lancamento;

        if (enviado) {
            const caminho = path.join(DIR_UPLOADS, 'musicas', enviado.filename);
            const meta = await obterMetadados(caminho);

            musica.audio = enviado.filename;
            musica.duracao = Math.round(Number(meta.duration)) || 0;
        }

        await musica.save();

        if (enviado) apagarArquivo('musicas', audioAnterior);

        req.flash('success_msg', 'Música atualizada com sucesso!');
        return res.redirect('/admin/musicas');
    } catch (err) {
        if (enviado) apagarArquivo('musicas', enviado.filename);

        const mensagem = mensagemDeErroMulter(err) || 'Erro ao atualizar a música.';
        console.error('Erro ao editar música:', err);
        req.flash('error_msg', mensagem);
        return res.redirect(`/admin/musicas/${req.params.id}/editar`);
    }
});

router.post('/musicas/:id/capa', validarId, uploadCapa.single('capa'), verificarCsrfAposUpload, async (req, res) => {
    let enviado = null;

    try {
        enviado = req.file;
        const musica = await Musica.findByPk(req.params.id);

        if (!musica) {
            if (enviado) apagarArquivo('capamusica', enviado && enviado.filename);
            return res.status(404).render('404/erro');
        }

        if (!enviado) {
            req.flash('error_msg', 'Selecione uma imagem para a capa.');
            return res.redirect(`/admin/musicas/${musica.id}/editar`);
        }

        const capaAnterior = musica.capa;
        musica.capa = enviado.filename;
        await musica.save();

        apagarArquivo('capamusica', capaAnterior);

        req.flash('success_msg', 'Capa atualizada com sucesso!');
        return res.redirect(`/admin/musicas/${musica.id}/editar`);
    } catch (err) {
        if (enviado) apagarArquivo('capamusica', enviado.filename);

        const mensagem = mensagemDeErroMulter(err) || 'Erro ao atualizar a capa.';
        console.error('Erro ao atualizar capa:', err);
        req.flash('error_msg', mensagem);
        return res.redirect(`/admin/musicas/${req.params.id}/editar`);
    }
});

router.post('/musicas/:id/excluir', validarId, async (req, res) => {
    try {
        const musica = await Musica.findByPk(req.params.id);

        if (!musica) {
            req.flash('error_msg', 'Música não encontrada.');
            return res.redirect('/admin/musicas');
        }

        const { audio, capa, titulo } = musica.get({ plain: true });

        await musica.destroy();

        apagarArquivo('musicas', audio);
        apagarArquivo('capamusica', capa);

        req.flash('success_msg', `Música "${titulo}" excluída.`);
        return res.redirect('/admin/musicas');
    } catch (err) {
        console.error('Erro ao excluir música:', err);
        req.flash('error_msg', 'Erro ao excluir a música.');
        return res.redirect('/admin/musicas');
    }
});

/* =========================================================
   ARTISTAS
   ========================================================= */

router.get('/artistas', async (req, res) => {
    try {
        const pagina = paginaAtual(req);
        const termo = termoBusca(req);
        const status = req.query.status && opcoes.STATUS_ARTISTA.includes(req.query.status) ? req.query.status : '';

        const where = {
            ...filtroTexto(termo, ['nome', 'genero_musical', 'pais', 'status']),
            ...(status ? { status } : {})
        };

        const { rows, count } = await Artista.findAndCountAll({
            where,
            order: [['nome', 'ASC']],
            limit: paginacao().limite,
            offset: (pagina - 1) * paginacao().limite
        });

        const contagens = await Musica.findAll({
            attributes: ['artistId', [fn('COUNT', col('id')), 'total']],
            group: ['artistId'],
            raw: true
        });

        const totalPorArtista = new Map(contagens.map((item) => [item.artistId, Number(item.total)]));

        const paginaInfo = paginacao(count, pagina);

        res.render('admin/artistas', {
            layout: 'admin',
            active: 'artistas',
            user: dadosDoUsuario(req),
            opcoes,
            artistas: toPlain(rows).map((artista) => ({
                ...artista,
                musicasTotal: totalPorArtista.get(artista.id) || 0
            })),
            filtros: { q: termo, status },
            paginacao: paginaInfo,
            queryProxima: querystringPaginacao(req, paginaInfo.pagina + 1),
            queryAnterior: querystringPaginacao(req, paginaInfo.pagina - 1)
        });
    } catch (err) {
        console.error('Erro ao listar artistas:', err);
        res.status(500).render('404/erro');
    }
});

router.get('/artistas/nova', (req, res) => {
    res.render('admin/artista-form', {
        layout: 'admin',
        active: 'artistas',
        user: dadosDoUsuario(req),
        opcoes,
        artista: null,
        erro: null
    });
});

router.get('/artistas/:id/editar', validarId, async (req, res) => {
    try {
        const artista = await Artista.findByPk(req.params.id);
        if (!artista) return res.status(404).render('404/erro');

        const dados = artista.get({ plain: true });
        if (dados.datanas) {
            dados.datanas = new Date(dados.datanas).toISOString().split('T')[0];
        }

        res.render('admin/artista-form', {
            layout: 'admin',
            active: 'artistas',
            user: dadosDoUsuario(req),
            opcoes,
            artista: dados,
            erro: null
        });
    } catch (err) {
        console.error('Erro no formulário de artista:', err);
        res.status(500).render('404/erro');
    }
});

router.post('/artistas', uploadArtista.single('foto'), verificarCsrfAposUpload, async (req, res) => {
    let enviado = null;

    try {
        enviado = req.file;

        const erros = validarCampos({
            nome: { valor: req.body.nome, obrigatorio: true, max: 120 },
            pais: { valor: req.body.pais, obrigatorio: true },
            genero_musical: { valor: req.body.genero_musical, obrigatorio: true },
            status: { valor: req.body.status, obrigatorio: true },
            datanas: { valor: req.body.datanas, data: true },
            website: { valor: req.body.website, max: 255 }
        });

        if (!opcoes.GENEROS.includes(req.body.genero_musical)) erros.genero_musical = 'Gênero inválido.';
        if (!opcoes.STATUS_ARTISTA.includes(req.body.status)) erros.status = 'Status inválido.';

        if (req.body.website && !/^https?:\/\//i.test(req.body.website)) {
            erros.website = 'O site deve começar com http:// ou https://.';
        }

        const reRender = (codigo) =>
            res.status(codigo).render('admin/artista-form', {
                layout: 'admin',
                active: 'artistas',
                user: dadosDoUsuario(req),
                opcoes,
                artista: null,
                erro: erros
            });

        if (Object.keys(erros).length > 0) {
            if (enviado) apagarArquivo('artistas', enviado.filename);
            return reRender(422);
        }

        await Artista.create({
            nome: req.body.nome.trim(),
            pais: req.body.pais,
            genero_musical: req.body.genero_musical,
            status: req.body.status,
            biografia: (req.body.biografia || '').trim() || null,
            foto: enviado ? enviado.filename : null,
            website: (req.body.website || '').trim() || null,
            datanas: req.body.datanas || null,
            plataforma: (req.body.plataforma || '').trim() || null,
            handle: (req.body.handle || '').trim() || null
        });

        req.flash('success_msg', `Artista "${req.body.nome.trim()}" cadastrado com sucesso!`);
        return res.redirect('/admin/artistas');
    } catch (err) {
        if (enviado) apagarArquivo('artistas', enviado.filename);

        const mensagem = mensagemDeErroMulter(err) || 'Erro ao cadastrar o artista.';
        console.error('Erro ao criar artista:', err);
        req.flash('error_msg', mensagem);
        return res.redirect('/admin/artistas/nova');
    }
});

router.post('/artistas/:id', validarId, uploadArtista.single('foto'), verificarCsrfAposUpload, async (req, res) => {
    let enviado = null;

    try {
        enviado = req.file;
        const artista = await Artista.findByPk(req.params.id);

        if (!artista) {
            if (enviado) apagarArquivo('artistas', enviado.filename);
            return res.status(404).render('404/erro');
        }

        const erros = validarCampos({
            nome: { valor: req.body.nome, obrigatorio: true, max: 120 },
            pais: { valor: req.body.pais, obrigatorio: true },
            genero_musical: { valor: req.body.genero_musical, obrigatorio: true },
            status: { valor: req.body.status, obrigatorio: true },
            datanas: { valor: req.body.datanas, data: true },
            website: { valor: req.body.website, max: 255 }
        });

        if (!opcoes.GENEROS.includes(req.body.genero_musical)) erros.genero_musical = 'Gênero inválido.';
        if (!opcoes.STATUS_ARTISTA.includes(req.body.status)) erros.status = 'Status inválido.';

        if (req.body.website && !/^https?:\/\//i.test(req.body.website)) {
            erros.website = 'O site deve começar com http:// ou https://.';
        }

        if (Object.keys(erros).length > 0) {
            if (enviado) apagarArquivo('artistas', enviado.filename);
            return res.status(422).render('admin/artista-form', {
                layout: 'admin',
                active: 'artistas',
                user: dadosDoUsuario(req),
                opcoes,
                artista: artista.get({ plain: true }),
                erro: erros
            });
        }

        const fotoAnterior = artista.foto;

        artista.nome = req.body.nome.trim();
        artista.pais = req.body.pais;
        artista.genero_musical = req.body.genero_musical;
        artista.status = req.body.status;
        artista.biografia = (req.body.biografia || '').trim() || null;
        artista.website = (req.body.website || '').trim() || null;
        artista.datanas = req.body.datanas || null;
        artista.plataforma = (req.body.plataforma || '').trim() || null;
        artista.handle = (req.body.handle || '').trim() || null;

        if (enviado) {
            artista.foto = enviado.filename;
        }

        await artista.save();

        if (enviado) apagarArquivo('artistas', fotoAnterior);

        req.flash('success_msg', 'Artista atualizado com sucesso!');
        return res.redirect('/admin/artistas');
    } catch (err) {
        if (enviado) apagarArquivo('artistas', enviado.filename);

        const mensagem = mensagemDeErroMulter(err) || 'Erro ao atualizar o artista.';
        console.error('Erro ao editar artista:', err);
        req.flash('error_msg', mensagem);
        return res.redirect(`/admin/artistas/${req.params.id}/editar`);
    }
});

router.post('/artistas/:id/excluir', validarId, async (req, res) => {
    try {
        const artista = await Artista.findByPk(req.params.id);

        if (!artista) {
            req.flash('error_msg', 'Artista não encontrado.');
            return res.redirect('/admin/artistas');
        }

        const totalMusicas = await Musica.count({ where: { artistId: req.params.id } });

        if (totalMusicas > 0 && req.body.forcar !== 'sim') {
            req.flash(
                'error_msg',
                `${artista.nome} possui ${totalMusicas} música(s) vinculada(s). Reenvie com "Excluir junto com as músicas" para confirmar.`
            );
            return res.redirect('/admin/artistas');
        }

        if (totalMusicas > 0) {
            const musicas = await Musica.findAll({ where: { artistId: req.params.id } });

            for (const musica of musicas) {
                const { audio, capa } = musica.get({ plain: true });
                await musica.destroy();
                apagarArquivo('musicas', audio);
                apagarArquivo('capamusica', capa);
            }
        }

        const { foto, nome } = artista.get({ plain: true });

        await artista.destroy();
        apagarArquivo('artistas', foto);

        req.flash('success_msg', `Artista "${nome}" excluído.`);
        return res.redirect('/admin/artistas');
    } catch (err) {
        console.error('Erro ao excluir artista:', err);
        req.flash('error_msg', 'Erro ao excluir o artista.');
        return res.redirect('/admin/artistas');
    }
});

/* =========================================================
   USUÁRIOS
   ========================================================= */

router.get('/usuarios', async (req, res) => {
    try {
        const pagina = paginaAtual(req);
        const termo = termoBusca(req);

        const where = filtroTexto(termo, ['name', 'email']);

        const { rows, count } = await Usuario.findAndCountAll({
            where,
            attributes: { exclude: ['password'] },
            order: [['id', 'ASC']],
            limit: paginacao().limite,
            offset: (pagina - 1) * paginacao().limite
        });

        const paginaInfo = paginacao(count, pagina);

        res.render('admin/usuarios', {
            layout: 'admin',
            active: 'usuarios',
            user: dadosDoUsuario(req),
            usuarios: toPlain(rows),
            filtros: { q: termo },
            paginacao: paginaInfo,
            queryProxima: querystringPaginacao(req, paginaInfo.pagina + 1),
            queryAnterior: querystringPaginacao(req, paginaInfo.pagina - 1)
        });
    } catch (err) {
        console.error('Erro ao listar usuários:', err);
        res.status(500).render('404/erro');
    }
});

router.post('/usuarios/:id/admin', validarId, async (req, res) => {
    try {
        const alvo = await Usuario.findByPk(req.params.id);

        if (!alvo) {
            req.flash('error_msg', 'Usuário não encontrado.');
            return res.redirect('/admin/usuarios');
        }

        if (alvo.id === req.user.id) {
            req.flash('error_msg', 'Você não pode alterar o seu próprio nível de acesso.');
            return res.redirect('/admin/usuarios');
        }

        const promover = req.body.acao === 'promover';
        alvo.isAdmin = promover;
        await alvo.save();

        req.flash(
            'success_msg',
            promover ? `${alvo.name} agora é administrador.` : `O acesso de administrador de ${alvo.name} foi removido.`
        );

        return res.redirect('/admin/usuarios');
    } catch (err) {
        console.error('Erro ao alterar perfil do usuário:', err);
        req.flash('error_msg', 'Erro ao alterar o nível de acesso.');
        return res.redirect('/admin/usuarios');
    }
});

router.post('/usuarios/:id/senha', validarId, async (req, res) => {
    try {
        const alvo = await Usuario.findByPk(req.params.id);

        if (!alvo) {
            req.flash('error_msg', 'Usuário não encontrado.');
            return res.redirect('/admin/usuarios');
        }

        const senha = String(req.body.senha || '');

        if (senha.length < 8) {
            req.flash('error_msg', 'A nova senha precisa de pelo menos 8 caracteres.');
            return res.redirect('/admin/usuarios');
        }

        if (senha !== String(req.body.senha2 || '')) {
            req.flash('error_msg', 'As senhas informadas não conferem.');
            return res.redirect('/admin/usuarios');
        }

        alvo.password = await bcrypt.hash(senha, 10);
        await alvo.save();

        req.flash('success_msg', `Senha de ${alvo.name} redefinida.`);
        return res.redirect('/admin/usuarios');
    } catch (err) {
        console.error('Erro ao redefinir senha:', err);
        req.flash('error_msg', 'Erro ao redefinir a senha.');
        return res.redirect('/admin/usuarios');
    }
});

router.post('/usuarios/:id/excluir', validarId, async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            req.flash('error_msg', 'Você não pode excluir a própria conta.');
            return res.redirect('/admin/usuarios');
        }

        const alvo = await Usuario.findByPk(req.params.id);
        if (!alvo) {
            req.flash('error_msg', 'Usuário não encontrado.');
            return res.redirect('/admin/usuarios');
        }

        const { foto, name } = alvo.get({ plain: true });

        await alvo.destroy();
        apagarArquivo('FotoUser', foto);

        req.flash('success_msg', `Usuário "${name}" excluído.`);
        return res.redirect('/admin/usuarios');
    } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        req.flash('error_msg', 'Erro ao excluir o usuário.');
        return res.redirect('/admin/usuarios');
    }
});

/* =========================================================
   PERFIL DO ADMIN
   ========================================================= */

router.get('/perfil', (req, res) => {
    res.render('admin/perfil', {
        layout: 'admin',
        active: 'perfil',
        user: dadosDoUsuario(req),
        erro: null
    });
});

router.post('/perfil/senha', async (req, res) => {
    try {
        const atual = String(req.body.senhaAtual || '');
        const nova = String(req.body.senhaNova || '');

        const erros = {};

        if (nova.length < 8) erros.senhaNova = 'A nova senha precisa de pelo menos 8 caracteres.';
        if (nova !== String(req.body.senhaNova2 || '')) erros.senhaNova2 = 'As senhas não conferem.';
        if (nova === atual) erros.senhaNova = 'A nova senha deve ser diferente da atual.';

        const bate = await bcrypt.compare(atual, req.user.password);
        if (!bate) erros.senhaAtual = 'Senha atual incorreta.';

        if (Object.keys(erros).length > 0) {
            return res.status(422).render('admin/perfil', {
                layout: 'admin',
                active: 'perfil',
                user: dadosDoUsuario(req),
                erro: erros
            });
        }

        req.user.password = await bcrypt.hash(nova, 10);
        await req.user.save();

        req.flash('success_msg', 'Sua senha foi atualizada com sucesso!');
        return res.redirect('/admin/perfil');
    } catch (err) {
        console.error('Erro ao trocar senha do admin:', err);
        req.flash('error_msg', 'Erro ao trocar a senha.');
        return res.redirect('/admin/perfil');
    }
});

/* =========================================================
   REDIRECIONAMENTOS DAS URLs ANTIGAS
   ========================================================= */

router.get('/artista/edit/:id', validarId, (req, res) => res.redirect(`/admin/artistas/${req.params.id}/editar`));
router.post('/artista/edit', (req, res) => res.redirect('/admin/artistas'));
router.post('/artista/novo', (req, res) => res.redirect('/admin/artistas/nova'));
router.post('/artista/delete/:id', validarId, (req, res) => res.redirect(`/admin/artistas/${req.params.id}/excluir`));
router.get('/musica/edit/:id', validarId, (req, res) => res.redirect(`/admin/musicas/${req.params.id}/editar`));
router.get('/music/img/:id', validarId, (req, res) => res.redirect(`/admin/musicas/${req.params.id}/editar`));
router.post('/musica/edit/:id', validarId, (req, res) => res.redirect(`/admin/musicas/${req.params.id}`));
router.post('/musicas/nova', (req, res) => res.redirect('/admin/musicas'));
router.post('/musica/delete/:id', validarId, (req, res) => res.redirect(`/admin/musicas/${req.params.id}/excluir`));

module.exports = router;