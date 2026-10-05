const crypto = require('crypto');

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

/* Bloqueia requisições cross-site em métodos de escrita. */
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
            return res.status(403).render('403/erro', {
                titulo: 'Origem não permitida',
                mensagem: 'A requisição foi bloqueada porque veio de um site diferente do VibeWave.',
                user: req.user && req.user.get ? req.user.get({ plain: true }) : (req.user || null)
            });
        }
    }

    const enviado = (req.body && req.body._csrf) || req.get('x-csrf-token');

    if (!enviado || !req.session.csrfToken || !comparar(enviado, req.session.csrfToken)) {
        return res.status(403).render('403/erro', {
            titulo: 'Token de segurança inválido',
            mensagem: 'A sessão expirou ou o formulário não é válido. Recarregue a página e tente novamente.',
            user: req.user && req.user.get ? req.user.get({ plain: true }) : (req.user || null)
        });
    }

    next();
}

module.exports = { gerarToken, csrfToken, csrfVerify };