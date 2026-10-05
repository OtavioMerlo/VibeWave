/* Navegação sem recarga dentro da área de conteúdo.
 *
 * O problema que resolve: cada página de views/homes/ é um documento HTML
 * completo. Navegar de /home para /search destruía o <audio> do rodapé, e o
 * autoplay da nova página era bloqueado pelo navegador — a música parava.
 *
 * Aqui só o conteúdo de <main class="main-content"> é trocado. O sidebar, o
 * menu mobile e o player-footer ficam intactos, então o elemento <audio>
 * continua vivo e a reprodução não é interrompida.
 *
 * É progressivo: os links continuam sendo <a href> de verdade, então sem
 * JavaScript (ou em qualquer erro) a navegação normal funciona.
 */
(function () {
    'use strict';

    const AREA = 'main.main-content';

    /* Só estas rotas trocam o conteúdo. /admin, /usuario e /logout ficam de
       fora de propósito: têm layout e scripts próprios, e mudam a sessão. */
    const ROTAS = /^\/(home|search|lybrary|perfil|playlist|recentemente|treino)(\/|$|\?)/;

    let requisicaoAtual = null;

    function ehInterceptavel(url) {
        return url.origin === window.location.origin
            && ROTAS.test(url.pathname)
            && !url.pathname.startsWith('/admin');
    }

    function mostrarProgresso(ativo) {
        document.body.classList.toggle('carregando-pagina', ativo);
    }

    function atualizarMenuAtivo(caminho) {
        const chave = {
            '/home': 'home',
            '/search': 'search',
            '/lybrary': 'library',
            '/perfil': 'perfil'
        }[caminho];

        document.querySelectorAll('#sidebar [data-nav]').forEach((item) => {
            item.classList.toggle('active', item.dataset.nav === chave);
        });
    }

    function fecharMenuMobile() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && window.innerWidth <= 860) sidebar.classList.remove('active');
    }

    function focarConteudo() {
        const area = document.querySelector(AREA);
        if (!area) return;

        area.setAttribute('tabindex', '-1');
        area.focus({ preventScroll: true });

        const titulo = area.querySelector('h1');
        if (titulo) {
            titulo.setAttribute('tabindex', '-1');
            titulo.focus({ preventScroll: true });
            titulo.removeAttribute('tabindex');
        }
    }

    /* Ajustes visuais depois que o conteúdo já foi trocado. Uma falha aqui
       NÃO pode recarregar a página: recarregar destrói o <audio> e é
       exatamente o problema que este arquivo existe para evitar. */
    function ajustarInterface(url, scroll) {
        try {
            atualizarMenuAtivo(url.pathname);
            fecharMenuMobile();

            if (window.VW_UI && typeof window.VW_UI.ligarConteudo === 'function') {
                window.VW_UI.ligarConteudo();
            }

            if (scroll) {
                window.scrollTo(0, scroll);
            } else {
                focarConteudo();
            }
        } catch (erro) {
            console.warn('Interface não atualizada após a navegação:', erro);
        }
    }

    async function trocarConteudo(url, { historico, scroll }) {
        if (requisicaoAtual) requisicaoAtual.abort();

        const controlador = new AbortController();
        requisicaoAtual = controlador;

        mostrarProgresso(true);
        window.scrollTo(0, 0);

        try {
            const resposta = await fetch(url.href, {
                headers: { 'X-Requested-With': 'spa' },
                credentials: 'same-origin',
                signal: controlador.signal
            });

            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

            const html = await resposta.text();
            const documento = new DOMParser().parseFromString(html, 'text/html');
            const novaArea = documento.querySelector(AREA);

            /* A resposta não é uma página da área de conteúdo (landing,
               login, 403...). Nesse caso deixamos o navegador recarregar. */
            if (!novaArea) {
                window.location.assign(url.href);
                return;
            }

            const areaAtual = document.querySelector(AREA);
            areaAtual.innerHTML = novaArea.innerHTML;

            document.title = documento.title;

            if (historico) {
                history.pushState({ scroll: scroll || 0 }, '', url.href);
            }

            ajustarInterface(url, scroll);
        } catch (erro) {
            if (erro.name === 'AbortError') return;

            /* Só falhas de rede/parsing caem na navegação normal. */
            console.warn('Falha na navegação sem recarga:', erro);
            window.location.assign(url.href);
            return;
        } finally {
            if (requisicaoAtual === controlador) {
                requisicaoAtual = null;
                mostrarProgresso(false);
            }
        }
    }

    /* Controles que o player-core trata e que NUNCA devem virar navegação. */
    const CONTROLES = [
        '[data-track-play]',
        '[data-p-play]',
        '[data-p-next]',
        '[data-p-previous]',
        '[data-p-mute]',
        '[data-p-shuffle]',
        '[data-p-repeat]',
        '[data-p-volume]',
        '[data-p-progresso]',
        '.tab',
        '.no-spa'
    ].join(', ');

    /* ---------- Cliques em links ---------- */
    function aoClicar(evento) {
        /* O player-core registra o listener antes e já chama preventDefault()
           nos controles de faixa e no player. Respeitar isso evita tocar a
           música E navegar ao mesmo tempo. */
        if (evento.defaultPrevented) return;
        if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

        const link = evento.target.closest('a[href]');
        if (!link) return;

        /* Botões de tocar ficam DENTRO do card, que é um <a>. Sem esta
           checagem, clicar no botão de tocar viraria navegação para a página
           da música em vez de tocar. */
        if (evento.target.closest(CONTROLES)) return;

        if (link.target && link.target !== '_self') return;
        if (link.hasAttribute('download') || link.dataset.spa === 'off') return;

        const url = new URL(link.href, window.location.href);

        if (url.hash && url.pathname === window.location.pathname) return;
        if (!ehInterceptavel(url)) return;

        evento.preventDefault();
        trocarConteudo(url, { historico: true });
    }

    /* ---------- Formulários GET (busca) ---------- */
    function aoEnviar(evento) {
        const form = evento.target;

        if (!form.matches('form[method="get" i]')) return;
        if (form.dataset.spa === 'off') return;

        const url = new URL(form.action, window.location.href);
        const dados = new URLSearchParams(new FormData(form));

        url.search = dados.toString();

        if (!ehInterceptavel(url)) return;

        evento.preventDefault();
        trocarConteudo(url, { historico: true });
    }

    /* ---------- Voltar / avançar ---------- */
    function aoVoltar(evento) {
        const url = new URL(window.location.href);

        if (!ehInterceptavel(url)) {
            window.location.reload();
            return;
        }

        trocarConteudo(url, { historico: false, scroll: (evento.state && evento.state.scroll) || 0 });
    }

    /* O player-core registra o listener de clique dentro de DOMContentLoaded.
       Se este script registrasse na hora do parse, ele ficaria PRIMEIRO na
       fila do document e a navegação aconteceria antes de o player chamar
       preventDefault() — o clique em "tocar" deixaria de tocar e passaria a
       só navegar. Por isso a ordem de registro importa. */
    function ligar() {
        if (ligado) return;
        ligado = true;

        document.addEventListener('click', aoClicar);
        document.addEventListener('submit', aoEnviar);
        window.addEventListener('popstate', aoVoltar);
    }

    let ligado = false;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ligar);
    } else {
        ligar();
    }
})();