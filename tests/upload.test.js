/* Harness para o tratamento de erro de upload.
 *
 * O problema: o `fileFilter` do multer recusa o arquivo ANTES do handler da
 * rota rodar, então o `catch` de dentro do handler nunca era alcançado. A
 * mensagem amigável virava código morto e o usuário recebia um 500 com a
 * página de "Não encontrado" — sem nenhuma explicação do que houve. */
const assert = require('assert');
const multer = require('multer');

const router = require('../routes/admin');
const { mensagemDeErroMulter, paginaDeErroDeUpload } = router;
const multerConfig = require('../config/multerconfig');

let passou = 0;
function ok(nome) {
    passou++;
    console.log('  ok - ' + nome);
}

console.log('upload: extensao e normalizada');
{
    const { extensao } = multerConfig;
    assert.strictEqual(extensao({ originalname: 'CAPA.JPG' }), '.jpg');
    assert.strictEqual(extensao({ originalname: 'capa.JPEG' }), '.jpeg');
    assert.strictEqual(extensao({ originalname: 'foto.PNG' }), '.png');
    assert.strictEqual(extensao({ originalname: 'sem-extensao' }), '');
    assert.strictEqual(extensao({}), '');
    ok('maiusculas e arquivo sem extensao');
}

console.log('upload: a mensagem diz o que enviar');
{
    const e = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'capa');
    e.categoria = 'imagem';
    e.extensoesAceitas = ['.jpg', '.jpeg', '.png', '.webp'];

    const msg = mensagemDeErroMulter(e);
    assert.ok(msg.includes('jpg') && msg.includes('webp'), 'faltam os formatos: ' + msg);
    assert.ok(msg.includes('5 MB'), 'falta o limite: ' + msg);
    /* a lista deve vir sem o ponto da extensao: "jpg", nao ".jpg" */
    ['.jpg', '.jpeg', '.png', '.webp'].forEach((ext) => {
        assert.ok(!msg.includes(ext), 'extensao com ponto na mensagem: ' + msg);
    });
    ok('imagem -> ' + msg);
}

console.log('upload: limite por categoria');
{
    const e = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'audio');
    e.categoria = 'audio';
    e.extensoesAceitas = ['.mp3', '.wav'];
    const msg = mensagemDeErroMulter(e);
    assert.ok(msg.includes('50 MB'), 'audio deve citar 50 MB: ' + msg);
    ok('audio -> ' + msg);
}

console.log('upload: erros que nao dependem de extensao');
{
    assert.ok(mensagemDeErroMulter(new multer.MulterError('LIMIT_FILE_SIZE')).includes('muito grande'));
    ok('LIMIT_FILE_SIZE');
    assert.strictEqual(mensagemDeErroMulter(new Error('outro')), null, 'erro comum nao vira mensagem de upload');
    ok('erro nao-multer devolve null');
    assert.ok(mensagemDeErroMulter(new multer.MulterError('LIMIT_FILE_COUNT')).includes('quantidade'));
    ok('LIMIT_FILE_COUNT');
}

console.log('upload: erro recusado volta para o formulario certo');
{
    assert.strictEqual(paginaDeErroDeUpload('/admin/musicas/3/capa'), '/admin/musicas/3/editar');
    assert.strictEqual(paginaDeErroDeUpload('/admin/musicas/42'), '/admin/musicas/42/editar');
    assert.strictEqual(paginaDeErroDeUpload('/admin/musicas'), '/admin/musicas/nova');
    assert.strictEqual(paginaDeErroDeUpload('/admin/artistas/7'), '/admin/artistas/7/editar');
    assert.strictEqual(paginaDeErroDeUpload('/admin/artistas'), '/admin/artistas/nova');
    ok('musicas e artistas');

    /* Query e barra final nao podem quebrar o casamento. */
    assert.strictEqual(paginaDeErroDeUpload('/admin/musicas/3/capa?x=1'), '/admin/musicas/3/editar');
    assert.strictEqual(paginaDeErroDeUpload('/admin/artistas/9/'), '/admin/artistas/9/editar');
    ok('query e barra final ignoradas');
}

console.log('upload: rota desconhecida cai no painel');
{
    assert.strictEqual(paginaDeErroDeUpload('/admin/usuarios/2/admin'), '/admin');
    assert.strictEqual(paginaDeErroDeUpload('/admin/perfil/senha'), '/admin');
    assert.strictEqual(paginaDeErroDeUpload('/qualquer/coisa'), '/admin');
    ok('sem destino especifico vai para /admin');
}

console.log('upload: id invalido nao vira undefined na url');
{
    const saidas = ['/admin/musicas/a/capa', '/admin/musicas//capa', '/admin/artistas/xyz']
        .map((u) => paginaDeErroDeUpload(u));

    saidas.forEach((saida) => {
        assert.ok(!saida.includes('undefined'), 'url com undefined: ' + saida);
    });
    ok('nenhum "undefined" nas tres entradas');
}

console.log('\nupload: ' + passou + ' verificacoes passaram');