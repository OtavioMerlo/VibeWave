/* Testa a lógica de public/js/spa.js com o mínimo de DOM necessário.
 *
 * Não existe navegador nem jsdom no projeto, então aqui o DOM é simulado.
 * O que importa é a decisão de navegação: o que pode ser interceptado, o que
 * troca o conteúdo, o que atualiza o título/histórico e o que recarrega a
 * página — que é justamente o que quebraria a música se estivesse errado.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

let fail = 0;
const t = (nome, cond) => {
    console.log((cond ? '  PASS  ' : '  FAIL  ') + nome);
    if (!cond) fail++;
};

const SPA = fs.readFileSync(path.join(RAIZ, 'public/js/spa.js'), 'utf8');

function montarCenario({ htmlRetornado = '<main class="main-content"><p>novo</p></main>', titulo = 'Vibewave | Nova', status = 200 } = {}) {
    const area = {
        _html: '<p>antigo</p>',
        _attrs: {},
        innerHTML: '',
        querySelector(sel) { return sel === 'h1' ? null : null; },
        focus() {},
        setAttribute(k, v) { this._attrs[k] = v; }
    };
    /* innerHTML precisa refletir a troca, então usamos um setter. */
    Object.defineProperty(area, 'innerHTML', {
        get() { return this._html; },
        set(v) { this._html = v; trocasRealizadas++; }
    });

    let trocasRealizadas = 0;

    const itensMenu = ['home', 'search', 'library', 'perfil'].map((nav) => ({
        dataset: { nav },
        classList: { _set: new Set(), toggle(c, f) { f ? this._set.add(c) : this._set.delete(c); }, contains(c) { return this._set.has(c); } }
    }));

    const listeners = {};
    const doc = {
        title: 'Vibewave | Antigo',
        body: { classList: { _set: new Set(), toggle(c, f) { f ? this._set.add(c) : this._set.delete(c); }, contains(c) { return this._set.has(c); } } },
        addEventListener(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); }
    };

    const estado = {
        area, itensMenu, trocasRealizadas: () => trocasRealizadas,
        listeners, doc,
        history: { pushes: [], replaceState() {} },
        atribuicoes: [],
        scroll: [],
        respostas: []
    };

    const fetchCalls = [];

    const ctx = {
        console,
        document: doc,
        AbortController: function () { this.abort = () => { this.signal = { nome: 'AbortError' }; }; this.signal = {}; },
        URL,
        URLSearchParams,
        FormData: function (form) { this._d = form._dados || {}; },
        DOMParser: function () {
            this.parseFromString = () => ({
                title: titulo,
                querySelector(sel) {
                    if (sel !== 'main.main-content') return null;
                    /* simula a resposta real: se o html não tem a área, devolve null */
                    return htmlRetornado.includes('main class="main-content"')
                        ? { innerHTML: htmlRetornado.replace(/^.*?(<main class="main-content">)/s, '$1') }
                        : null;
                }
            });
        },
        fetch: (url, opts) => {
            fetchCalls.push({ url, opts });
            const r = { ok: status >= 200 && status < 300, status };
            r.text = () => Promise.resolve(htmlRetornado);
            return Promise.resolve(r);
        },
        location: {
            origin: 'http://localhost:8089',
            pathname: '/home',
            href: 'http://localhost:8089/home',
            assign(u) { estado.atribuicoes.push(u); },
            reload() { estado.atribuicoes.push('reload'); }
        },
        history: {
            pushState(e, t, url) { estado.history.pushes.push(url); }
        },
        window: null,
        VW_UI: { ligarConteudo() { estado.reiniciou = true; } },
        setTimeout, Promise, Error,
        addEventListener(ev, fn) { (windowListeners[ev] = windowListeners[ev] || []).push(fn); }
    };

    const windowListeners = {};

    ctx.window = ctx;
    ctx.globalThis = ctx;
    ctx.self = ctx;

    /* SPA referencia `window.scrollTo` e `window.innerWidth`. */
    ctx.scrollTo = (x, y) => estado.scroll.push([x, y]);
    ctx.innerWidth = 1400;

    vm.createContext(ctx);
    vm.runInContext(SPA, ctx, { filename: 'spa.js' });

    /* spa.js so registra os listeners no DOMContentLoaded, para ficar DEPOIS
       do player-core (que tambem registra no DOMContentLoaded e por isso roda
       primeiro). Se registrar no parse, ganharia a dispute do preventDefault. */
    estado.registrouNoParse = (listeners.click || []).length > 0;
    (listeners.DOMContentLoaded || []).forEach((f) => f());

    /* Elements usados no DOM simulado */
    ctx.document.querySelector = (sel) => {
        if (sel === 'main.main-content') return area;
        if (sel === '#sidebar [data-nav]') return itensMenu;
        return null;
    };
    ctx.document.querySelectorAll = (sel) => {
        if (sel === '#sidebar [data-nav]') return itensMenu;
        return [];
    };
    ctx.document.getElementById = () => null;

    /* Se true, qualquer ajuste visual após a troca estoura — usado para
       garantir que uma falha cosmética NÃO recarrega a página. */
    ctx.quebrarInterface = false;
    ctx.VW_UI.ligarConteudo = () => {
        if (ctx.quebrarInterface) throw new Error('falha cosmética');
        estado.reiniciou = true;
    };

    estado.contexto = ctx;
    estado.fetchCalls = fetchCalls;
    estado.area = area;
    estado.registrouNoParse = false;

    return estado;
}

/* Dispara um clique cujo alvo esta dentro de um seletor (ex: botao de tocar) */
function clicarDentro(c, { href, dentro, defaultPrevented = false }) {
    const link = { href, target: null, dataset: {}, hasAttribute: () => false, getAttribute: () => null };

    const evento = {
        target: {
            closest: (sel) => {
                if (sel === 'a[href]') return link;
                /* simula: o botao esta dentro do card (que e o <a>) */
                if (sel.includes(dentro)) return { dataset: {} };
                return null;
            }
        },
        button: 0, defaultPrevented,
        metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() {}
    };

    (c.listeners.click || []).forEach((f) => f(evento));
    return evento;
}

/* Dispara um clique simulado */
function clicar(c, { href, defaultPrevented = false, botao = 0, modificadores = {}, target = null, data = {} }) {
    const link = {
        href,
        target,
        dataset: data,
        /* só é verdade quando o caso realmente exercita o atributo download */
        hasAttribute: (a) => a === 'download' && data.download === true,
        getAttribute: () => null
    };

    const evento = {
        target: { closest: (sel) => (sel === 'a[href]' ? link : null) },
        button: botao,
        defaultPrevented,
        metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
        ...modificadores,
        preventDefault() { this.defaultPrevented = true; },
        stopPropagation() {}
    };

    (c.listeners.click || []).forEach((f) => f(evento));
    return evento;
}

function aguardar() {
    return new Promise((r) => setTimeout(r, 20));
}

(async function () {
    console.log('1) Rotas que podem ser interceptadas');
    {
        const c = montarCenario();
        const e = clicar(c, { href: 'http://localhost:8089/search?q=teste' });
        t('link de /search e interceptado', e.defaultPrevented === true);

        await aguardar();
        t('conteudo foi trocado', /novo/.test(c.area.innerHTML));
        t('historico recebeu pushState', c.history.pushes[0] === 'http://localhost:8089/search?q=teste');
        t('titulo foi atualizado', c.doc.title === 'Vibewave | Nova');
        t('VW_UI.ligarConteudo foi chamado', c.reiniciou === true);
        t('nao houve recarregamento total', c.atribuicoes.length === 0);
    }

    console.log('\n2) Rotas que NAO podem ser interceptadas');
    {
        const casos = [
            ['/admin', 'painel admin'],
            ['/usuario/login', 'login'],
            ['/usuario/logout', 'logout'],
            ['https://google.com', 'site externo'],
            ['http://outra.local:8089/home', 'outra origem']
        ];

        for (const [href, nome] of casos) {
            const c = montarCenario();
            const e = clicar(c, { href });
            t(`${nome} nao e interceptado`, e.defaultPrevented === false);
        }
    }

    console.log('\n3) Cliques que devem passar direto');
    {
        let c = montarCenario();
        t('player ja preventDefault (controle de faixa)',
            clicar(c, { href: 'http://localhost:8089/player/1', defaultPrevented: true }).defaultPrevented === true);

        c = montarCenario();
        t('ctrl+click (abrir em nova aba)',
            clicar(c, { href: 'http://localhost:8089/search', modificadores: { ctrlKey: true } }).defaultPrevented === false);

        c = montarCenario();
        t('botao do meio',
            clicar(c, { href: 'http://localhost:8089/search', botao: 1 }).defaultPrevented === false);

        c = montarCenario();
        t('target=_blank',
            clicar(c, { href: 'http://localhost:8089/search', target: '_blank' }).defaultPrevented === false);
    }

    console.log('\n4) Fallback quando a resposta nao tem a area de conteudo');
    {
        const c = montarCenario({ htmlRetornado: '<html><body>login</body></html>' });
        clicar(c, { href: 'http://localhost:8089/search' });

        await aguardar();
        t('cai em location.assign (sessao expirada, por exemplo)',
            c.atribuicoes[0] === 'http://localhost:8089/search');
        t('conteudo atual nao foi destruido', c.area.innerHTML === '<p>antigo</p>');
    }

    console.log('\n5) Resposta com erro HTTP');
    {
        const c = montarCenario({ status: 500 });
        clicar(c, { href: 'http://localhost:8089/search' });

        await aguardar();
        t('cai em location.assign em erro 500',
            c.atribuicoes[0] === 'http://localhost:8089/search');
    }

    console.log('\n6) Menu lateral reflete a rota atual');
    {
        const c = montarCenario();
        clicar(c, { href: 'http://localhost:8089/search' });

        await aguardar();
        t('item "search" ficou ativo', c.itensMenu[1].classList.contains('active') === true);
        t('item "home" perdeu o destaque', c.itensMenu[0].classList.contains('active') === false);
    }

    console.log('\n7) Falha COSMETICA nao pode recarregar a pagina');
    {
        const c = montarCenario();
        c.contexto.quebrarInterface = true;

        clicar(c, { href: 'http://localhost:8089/search' });

        await aguardar();
        t('conteudo foi trocado mesmo assim', /novo/.test(c.area.innerHTML));
        t('NÃO caiu em location.assign (o audio sobrevive)',
            c.atribuicoes.length === 0);
        t('titulo ainda foi atualizado', c.doc.title === 'Vibewave | Nova');
    }

    console.log('\n8) Ordem de registro e botoes de tocar');
    {
        const c = montarCenario();
        t('nao registra listener no parse (so no DOMContentLoaded)',
            c.registrouNoParse === false);
        t('registrou apos o DOMContentLoaded', (c.listeners.click || []).length === 1);
    }

    {
        const c = montarCenario();
        const e = clicarDentro(c, { href: 'http://localhost:8089/player/7', dentro: 'data-track-play' });
        t('clique no botao de tocar NAO vira navegacao', e.defaultPrevented === false);

        await aguardar();
        t('nenhum fetch foi feito (a musica toca normalmente)', c.fetchCalls.length === 0);
    }

    {
        const c = montarCenario();
        const e = clicarDentro(c, { href: 'http://localhost:8089/player/7', dentro: 'data-p-play' });
        t('clique em botao do player NAO vira navegacao', e.defaultPrevented === false);
        t('nenhum fetch para botao do player', c.fetchCalls.length === 0);
    }

    console.log('\n' + (fail ? `FALHAS: ${fail}` : 'spa.js: decisao de navegacao validada'));
    process.exit(fail ? 1 : 0);
})();