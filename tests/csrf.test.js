/* Harness para o CSRF: exercita helpers/csrf.js sem subir o Express.
 *
 * O caso que motivou estes testes: os formulários de artista e música são
 * multipart (têm upload). O `csrfVerify` roda como `router.use`, antes do
 * multer da rota, então `req.body` ainda está vazio e o campo `_csrf` não
 * existe — verificar o token ali reprovava todo upload legítimo com 403. */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { gerarToken, csrfVerify, verificarCsrfAposUpload } = require('../helpers/csrf');

let passou = 0;
function ok(nome) {
    passou++;
    console.log('  ok - ' + nome);
}

function getSimulado(headers) {
    const mapa = Object.assign({ host: 'localhost:8089' }, headers);
    return (nome) => mapa[String(nome).toLowerCase()];
}

function criarReq(extra) {
    return Object.assign({
        method: 'POST',
        body: {},
        query: {},
        headers: {},
        session: { csrfToken: gerarToken() },
        get: getSimulado()
    }, extra);
}

function criarRes() {
    const res = { locals: {}, statusCode: 200, render: null };
    res.status = (c) => { res.statusCode = c; return res; };
    res.render = (view, dados) => { res.render = { view, dados }; return res; };
    return res;
}

/* Roda um middleware e devolve como terminou. */
function rodar(middleware, req) {
    const res = criarRes();
    let advanced = false;
    middleware(req, res, () => { advanced = true; });
    return { advanced, res };
}

const MULTIPART = 'multipart/form-data; boundary=----x';
const URLENCODED = 'application/x-www-form-urlencoded';

/* descartarUpload() remove o arquivo de forma assíncrona. */
function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    console.log('csrf: metodos seguros nao sao bloqueados');
    ['GET', 'HEAD', 'OPTIONS'].forEach((metodo) => {
        const r = rodar(csrfVerify, criarReq({ method: metodo }));
        assert.ok(r.advanced, metodo + ' deveria seguir');
        ok(metodo + ' passa direto');
    });

    console.log('csrf: urlencoded valido');
    {
        const req = criarReq({ get: getSimulado({ 'content-type': URLENCODED }) });
        req.body._csrf = req.session.csrfToken;
        const r = rodar(csrfVerify, req);
        assert.ok(r.advanced);
        assert.strictEqual(r.res.statusCode, 200);
        ok('token confere e segue');
    }

    console.log('csrf: urlencoded invalido');
    {
        const req = criarReq({ get: getSimulado({ 'content-type': URLENCODED }) });
        req.body._csrf = 'token-errado';
        const r = rodar(csrfVerify, req);
        assert.ok(!r.advanced, 'nao deveria seguir');
        assert.strictEqual(r.res.statusCode, 403);
        ok('bloqueia com 403');
    }

    console.log('csrf: multipart adia a conferencia do token');
    {
        const req = criarReq({ get: getSimulado({ 'content-type': MULTIPART }) });
        /* req.body vazio: e exatamente o estado antes do multer rodar */
        const r = rodar(csrfVerify, req);
        assert.ok(r.advanced, 'csrfVerify deve liberar para o multer rodar');
        assert.strictEqual(r.res.statusCode, 200, 'nao pode responder 403 antes do upload');
        assert.strictEqual(req.csrfAdiado, true, 'precisa sinalizar o adiamento');
        ok('sinaliza req.csrfAdiado e nao bloqueia');
    }

    console.log('csrf: multipart de origem externa e barrado antes do upload');
    {
        const req = criarReq({
            get: getSimulado({ 'content-type': MULTIPART, origin: 'https://site-malicioso.example' })
        });
        const r = rodar(csrfVerify, req);
        assert.ok(!r.advanced, 'nao pode seguir para o multer');
        assert.strictEqual(r.res.statusCode, 403);
        assert.strictEqual(req.csrfAdiado, undefined, 'nem adia: ja foi bloqueado');
        ok('bloqueia na origem, nem chega a gravar arquivo');
    }

    console.log('csrf: apos o upload, token valido segue');
    {
        const req = criarReq({ get: getSimulado({ 'content-type': MULTIPART }) });
        rodar(csrfVerify, req);
        req.body._csrf = req.session.csrfToken;
        req.file = { path: '/tmp/inexistente.mp3' };
        const r = rodar(verificarCsrfAposUpload, req);
        assert.ok(r.advanced);
        assert.strictEqual(r.res.statusCode, 200);
        ok('upload valido passa');
    }

    console.log('csrf: apos o upload, token invalido bloqueia e apaga o arquivo');
    {
        const req = criarReq({ get: getSimulado({ 'content-type': MULTIPART }) });
        rodar(csrfVerify, req);

        const arquivo = path.join(os.tmpdir(), 'csrf-apagar-' + Date.now() + '.mp3');
        fs.writeFileSync(arquivo, 'conteudo');

        req.body._csrf = 'token-errado';
        req.file = { path: arquivo };

        const r = rodar(verificarCsrfAposUpload, req);
        assert.ok(!r.advanced, 'nao pode seguir para a regra de negocio');
        assert.strictEqual(r.res.statusCode, 403);
        ok('responde 403');

        await esperar(150);
        assert.ok(!fs.existsSync(arquivo), 'o arquivo rejeitado deve ser apagado');
        ok('arquivo orfao apagado do disco');
    }

    console.log('csrf: req.files tambem e limpo');
    {
        const req = criarReq({ get: getSimulado({ 'content-type': MULTIPART }) });
        rodar(csrfVerify, req);

        const marca = Date.now();
        const a = path.join(os.tmpdir(), 'csrf-a-' + marca + '.mp3');
        const b = path.join(os.tmpdir(), 'csrf-b-' + marca + '.mp3');
        fs.writeFileSync(a, 'a');
        fs.writeFileSync(b, 'b');

        req.body._csrf = 'token-errado';
        req.files = { capa: [{ path: a }], audio: [{ path: b }] };

        const r = rodar(verificarCsrfAposUpload, req);
        assert.strictEqual(r.res.statusCode, 403);

        await esperar(150);
        assert.ok(!fs.existsSync(a), 'capa deveria ter sido apagada');
        assert.ok(!fs.existsSync(b), 'audio deveria ter sido apagado');
        ok('todos os arquivos do req.files apagados');
    }

    console.log('csrf: header x-csrf-token tambem e aceito');
    {
        const req = criarReq({ get: getSimulado({ 'x-csrf-token': 'abc123' }) });
        req.session.csrfToken = 'abc123';
        const r = rodar(csrfVerify, req);
        assert.ok(r.advanced, 'deveria aceitar o token do header');
        ok('header aceito');
    }

    console.log('csrf: sessao sem token nao aprova nada');
    {
        const req = criarReq({});
        delete req.session.csrfToken;
        req.body._csrf = 'qualquer';
        const r = rodar(csrfVerify, req);
        assert.ok(!r.advanced);
        assert.strictEqual(r.res.statusCode, 403);
        ok('bloqueia quando a sessao perdeu o token');
    }

    console.log('\ncsrf: ' + passou + ' verificacoes passaram');
}

main().catch((err) => {
    console.error('\nFALHOU:', err.message);
    process.exit(1);
});