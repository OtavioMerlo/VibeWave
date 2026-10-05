const fs = require('fs');
const path = require('path');
const Module = require('module');
const hbs = require('handlebars');

const RAIZ = path.resolve(__dirname, '..');

/* Carrega os helpers REAIS de app.js sem subir o servidor:
   extrai apenas o bloco registerHelper via vm num contexto falso. */
function carregarHelpersReais() {
    const src = fs.readFileSync(path.join(RAIZ, 'app.js'), 'utf8');
    const inicio = src.indexOf('handlebars.registerHelper');
    const fim = src.indexOf('// Public');
    const bloco = src.slice(inicio, fim);

    const fake = { handlebars: hbs };
    const vm = require('vm');
    vm.createContext(fake);
    vm.runInContext(bloco, fake);

    return Object.keys(hbs.helpers).filter((k) => !['blockHelperMissing', 'each', 'if', 'unless', 'log', 'lookup', 'with'].includes(k));
}

const registrados = carregarHelpersReais();
console.log('helpers reais de app.js:', registrados.join(', '));

const dir = path.join(RAIZ, 'views/partials');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.handlebars'))) {
    hbs.registerPartial(f.replace('.handlebars', ''), fs.readFileSync(path.join(dir, f), 'utf8'));
}

const musicas = [
    { id: 1, titulo: 'Noite "Neon"', audio: 'a.mp3', capa: 'c1.jpg', duracao: 214, genero: 'Sertanejo', status: 'Ativa', musicasTotal: 3, artista: { id: 7, nome: 'Ana & Cia', genero_musical: 'MPB', foto: null, status: 'Ativo', plataforma: 'YouTube', pais: 'Brasil' } },
    { id: 2, titulo: 'Sem Capa', audio: 'b.mp3', capa: null, duracao: 0, genero: 'Rock', status: 'Pendente', musicasTotal: 0, artista: { id: 8, nome: 'Banda X', genero_musical: 'Rock', foto: 'x.png', status: 'Inativo', plataforma: 'Spotify', pais: 'Brasil' } }
];

const base = {
    user: { id: 1, name: 'Admin', email: 'a@b.c', foto: 'default.png' },
    csrfToken: 'TOKEN123',
    musicas,
    artistas: [{ id: 7, nome: 'Ana & Cia', musicasTotal: 3, status: 'Ativo' }],
    usuarios: [
        { id: 1, name: 'Admin', email: 'a@b.c', isAdmin: true },
        { id: 2, name: 'Outro', email: 'c@d', isAdmin: false }
    ],
    musica: musicas[0],
    artista: musicas[0].artista,
    redirect: '/home',
    termo: 'neon',
    paginacao: { temMaisPaginas: true, temAnterior: true, temProxima: true, pagina: 2, paginas: 5, total: 200, offset: 50, limite: 50 },
    opcoes: { generos: ['MPB', 'Rock'], status: ['Ativo', 'Pendente'], plataformas: ['YouTube'], paises: ['Brasil'] },
    contagens: { musicas: 40, artistas: 7, usuarios: 12, musicasPendentes: 3, musicasAtivas: 37, artistasInativos: 1 },
    musicasRecentes: musicas,
    artistasRecentes: [musicas[0].artista],
    titulo: 'Favoritas',
    descricao: 'desc',
    tempo: '3:34'
};

const alvos = [
    'views/admin/index.handlebars',
    'views/admin/musicas.handlebars',
    'views/admin/musica-form.handlebars',
    'views/admin/artistas.handlebars',
    'views/admin/artista-form.handlebars',
    'views/admin/usuarios.handlebars',
    'views/admin/perfil.handlebars',
    'views/homes/home.handlebars',
    'views/homes/lybrary.handlebars',
    'views/homes/perfil.handlebars',
    'views/homes/player.handlebars',
    'views/homes/playlist.handlebars',
    'views/homes/search.handlebars',
    'views/usuarios/login.handlebars'
];

let fail = 0;
const problemas = [];

for (const alvo of alvos) {
    try {
        const out = hbs.compile(fs.readFileSync(path.join(RAIZ, alvo), 'utf8'))(base);
        const achados = [];
        if (out.includes('[object Object]')) achados.push('[object Object] no output');
        if (/\{\{/.test(out)) achados.push('handlebars nao processado');
        if (/>\s*undefined\s*</.test(out)) achados.push('undefined em tag');
        if (/value=""/.test(out) && alvo.includes('csrf')) achados.push('token csrf vazio');
        if (/\/undefined|\bundefined\//.test(out)) achados.push('rota com undefined');
        if (/\/admin\/[a-z]+\/[0-9]+\/excluir\?/.test(out)) achados.push('ok');
        if (achados.length) {
            problemas.push(alvo + ' -> ' + achados.join(', '));
            console.log('PROBLEMA ' + alvo + ' -> ' + achados.join(', '));
            fail++;
        } else {
            console.log('OK       ' + alvo);
        }
    } catch (err) {
        fail++;
        problemas.push(alvo + ' -> ' + err.message.split('\n')[0]);
        console.log('EXCECAO  ' + alvo + ' -> ' + err.message.split('\n')[0]);
    }
}

/* Nenhuma tag _csrf pode renderizar vazia: isso quebra todo POST protegido. */
console.log('\nTokens CSRF preenchidos:');
for (const alvo of alvos.filter((a) => a.includes('_csrf') || a.includes('admin/') || a.includes('login'))) {
    const out = hbs.compile(fs.readFileSync(path.join(RAIZ, alvo), 'utf8'))(base);
    const tags = out.match(/name="_csrf" value="[^"]*"/g) || [];

    if (!tags.length) {
        console.log('  AVISO   ' + alvo + ' -> nenhuma tag _csrf');
        continue;
    }

    const vazias = tags.filter((t) => t.includes('value=""')).length;

    if (vazias) {
        fail++;
        console.log('  FALHA   ' + alvo + ' -> ' + vazias + ' token(s) vazio(s)');
    } else {
        console.log('  ok      ' + alvo + ' -> ' + tags.length + ' token(s)');
    }
}

console.log('\n' + (fail ? 'FALHAS: ' + fail : 'Todas as views renderizam limpas com os helpers reais de app.js'));
process.exit(fail ? 1 : 0);