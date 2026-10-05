const { Op } = require('sequelize');

const LIMITE_PAGINA = 50;

function paginaAtual(req) {
    const pagina = Number.parseInt(req.query.pagina, 10);
    return Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
}

function termoBusca(req) {
    return String(req.query.q || '').trim().slice(0, 80);
}

function paginacao(total, pagina, limite = LIMITE_PAGINA) {
    const totalNumerico = Number.isFinite(Number(total)) ? Number(total) : 0;
    const paginaNumerica = Number.isFinite(Number(pagina)) && Number(pagina) > 0 ? Number(pagina) : 1;
    const limiteNumerico = Number.isFinite(Number(limite)) && Number(limite) > 0 ? Number(limite) : LIMITE_PAGINA;

    const paginas = Math.max(1, Math.ceil(totalNumerico / limiteNumerico));
    const atual = Math.min(paginaNumerica, paginas);

    return {
        total: totalNumerico,
        pagina: atual,
        limite: limiteNumerico,
        paginas,
        offset: (atual - 1) * limiteNumerico,
        temAnterior: atual > 1,
        temProxima: atual < paginas,
        temMaisPaginas: paginas > 1
    };
}

/* Valida o parâmetro :id das rotas. */
function validarId(req, res, next) {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(404).render('404/erro');
    }

    req.params.id = id;
    next();
}

/* Monta um WHERE de busca livre sobre as colunas informadas. */
function filtroTexto(termo, colunas) {
    if (!termo) return {};

    return {
        [Op.or]: colunas.map((coluna) => ({ [coluna]: { [Op.like]: `%${termo}%` } }))
    };
}

function lista(valor) {
    if (!Array.isArray(valor)) {
        return String(valor || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return valor.map((item) => String(item).trim()).filter(Boolean);
}

/* Monta querystring preservando os filtros ao trocar de página. */
function querystringPaginacao(req, pagina) {
    const params = new URLSearchParams();

    if (req.query.q) params.set('q', req.query.q);
    if (req.query.status) params.set('status', req.query.status);
    if (req.query.genero) params.set('genero', req.query.genero);
    if (pagina > 1) params.set('pagina', String(pagina));

    const texto = params.toString();
    return texto ? `?${texto}` : '';
}

/* Coleta erros de validação de um conjunto de regras simples. */
function validarCampos(regras) {
    const erros = {};

    for (const [campo, regra] of Object.entries(regras)) {
        const valor = regra.valor;

        if (regra.obrigatorio) {
            const vazio =
                valor === undefined ||
                valor === null ||
                (typeof valor === 'string' && valor.trim() === '');

            if (vazio) {
                erros[campo] = regra.mensagem || `Informe ${campo}.`;
                continue;
            }
        }

        if (valor === undefined || valor === null || valor === '') continue;

        if (regra.max && String(valor).length > regra.max) {
            erros[campo] = regra.mensagem || `${campo} deve ter no máximo ${regra.max} caracteres.`;
            continue;
        }

        if (regra.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor))) {
            erros[campo] = 'E-mail inválido.';
            continue;
        }

        if (regra.data && Number.isNaN(Date.parse(valor))) {
            erros[campo] = 'Data inválida.';
        }
    }

    return erros;
}

module.exports = {
    LIMITE_PAGINA,
    paginaAtual,
    termoBusca,
    paginacao,
    validarId,
    filtroTexto,
    lista,
    querystringPaginacao,
    validarCampos
};