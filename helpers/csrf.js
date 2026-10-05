const crypto = require('crypto');
const fs = require('fs');

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

function gerarToken() {
    return crypto.randomBytes(32).toString('hex');
}

function comparar(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));

    if (bufA.length !== bufB.length || bufA.length === 0) {
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

/* Headers de origem confiáveis para o request atual. */
function origensPermitidas(req) {
    const permitidas = [];

    const host = req.get('host');
    if (host) {
        permitidas.push(`http://${host}`);
        permitidas.push(`https://${host}`);
    }

    if (req.headers['x-forwarded-host']) {
        const forwarded = String(req.headers['x-forwarded-host']).split(',')[0].trim();
        const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
        permitidas.push(`${proto}://${forwarded}`);
    }

    return permitidas;
}

/* Disponibiliza o token para todos os templates. */
function csrfToken(req, res, next) {
    if (!req.session) {
        return next(new Error('Sessão indisponível para gerar token CSRF.'));
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken = gerarToken();
    }

    res.locals.csrfToken = req.session.csrfToken;
    next();
}

function ehMultipart(req) {
    return (req.get('content-type') || '').toLowerCase().startsWith('multipart/form-data');
}

function usuarioDaRequisicao(req) {
    return req.user && req.user.get ? req.user.get({ plain: true }) : (req.user || null);
}

/* Resposta de bloqueio. Não escreve nada no banco. */
function bloquearCsrf(res, req, titulo, mensagem) {
    return res.status(403).render('403/erro', {
        titulo,
        mensagem,
        user: usuarioDaRequisicao(req)
    });
}

function conferirToken(req) {
    const enviado = (req.body && req.body._csrf) || req.query._csrf || req.get('x-csrf-token');

    if (!enviado || !req.session.csrfToken || !comparar(enviado, req.session.csrfToken)) {
        return false;
    }

    return true;
}

/* Bloqueia requisições cross-site em métodos de escrita.
 *
 * Em formulários com upload o corpo ainda não foi lido quando este middleware
 * roda (o multer só é aplicado na rota, depois de `router.use`), então `req.body`
 * está vazio e o campo `_csrf` ainda não existe. Verificar o token aqui
 * reprovaria todo upload legítimo com 403.
 *
 * Nesses casos a conferência do token é adiada para
 * `verificarCsrfAposUpload`. A checagem de origem, que não depende do corpo,
 * continua sendo feita agora — é ela que barra um POST vindo de outro site
 * antes de qualquer arquivo ser gravado. */
function csrfVerify(req, res, next) {
    if (SAFE_METHODS.includes(req.method)) {
        return next();
    }

    const origem = req.get('origin') || req.get('referer');

    if (origem) {
        const permitidas = origensPermitidas(req);

        const confiavel = permitidas.some((permitida) => {
            try {
                return new URL(origem).origin === new URL(permitida).origin;
            } catch (err) {
                return false;
            }
        });

        if (!confiavel) {
            return bloquearCsrf(res, req,
                'Origem não permitida',
                'A requisição foi bloqueada porque veio de um site diferente do VibeWave.'
            );
        }
    }

    if (ehMultipart(req)) {
        req.csrfAdiado = true;
        return next();
    }

    if (!conferirToken(req)) {
        return bloquearCsrf(res, req,
            'Token de segurança inválido',
            'A sessão expirou ou o formulário não é válido. Recarregue a página e tente novamente.'
        );
    }

    next();
}

/* Apaga o que o multer gravou, para um upload rejeitado não deixar lixo. */
function descartarUpload(req) {
    const arquivos = [];

    if (req.file) arquivos.push(req.file);
    if (Array.isArray(req.files)) arquivos.push(...req.files);
    if (req.files && !Array.isArray(req.files)) {
        Object.keys(req.files).forEach((campo) => {
            arquivos.push(...[].concat(req.files[campo]));
        });
    }

    arquivos.forEach((arquivo) => {
        if (!arquivo || !arquivo.path) return;

        fs.promises.unlink(arquivo.path).catch(() => {
            console.warn('CSRF: não foi possível apagar', arquivo.path);
        });
    });
}

/* Use logo depois do multer nas rotas com upload. */
function verificarCsrfAposUpload(req, res, next) {
    if (!req.csrfAdiado || conferirToken(req)) {
        return next();
    }

    descartarUpload(req);

    return bloquearCsrf(res, req,
        'Token de segurança inválido',
        'A sessão expirou ou o formulário não é válido. Recarregue a página e tente novamente.'
    );
}

module.exports = { gerarToken, csrfToken, csrfVerify, verificarCsrfAposUpload };