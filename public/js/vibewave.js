/* Interface do shell: tema, menu mobile e abas.
 *
 * O player (áudio, barra de progresso, volume e fila) é controlado por
 * public/js/player-core.js. Não duplicar essa lógica aqui.
 *
 * `VW_UI.ligarConteudo()` é chamado por public/js/spa.js depois de cada troca
 * de conteúdo, porque o tema e as abas vivem dentro de <main> e são
 * descartados junto com a página antiga.
 */
(function () {
    'use strict';

    function syncThemeIcon(themeToggle) {
        if (!themeToggle) return;

        const icon = themeToggle.querySelector('i');
        if (!icon) return;

        const light = document.body.classList.contains('light-mode');
        icon.classList.toggle('fa-moon', !light);
        icon.classList.toggle('fa-sun', light);
    }

    /* Elementos que existem dentro de <main> e precisam ser religados a cada
       troca de conteudo. */
    function ligarConteudo() {
        const themeToggle = document.querySelector('.theme-toggle');

        if (themeToggle && !themeToggle.dataset.ligado) {
            themeToggle.dataset.ligado = '1';

            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('light-mode');
                localStorage.setItem(
                    'vw-theme',
                    document.body.classList.contains('light-mode') ? 'light' : 'dark'
                );
                syncThemeIcon(themeToggle);
            });

            themeToggle.addEventListener('keydown', (evento) => {
                if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault();
                    themeToggle.click();
                }
            });
        }

        syncThemeIcon(themeToggle);

        const abas = document.querySelectorAll('.tab[data-tab]');

        abas.forEach((aba) => {
            if (aba.dataset.ligado) return;
            aba.dataset.ligado = '1';

            aba.addEventListener('click', () => {
                const alvo = aba.getAttribute('data-tab');
                const conteudos = document.querySelectorAll('.tab-content');

                abas.forEach((outra) => outra.classList.remove('active'));
                aba.classList.add('active');

                conteudos.forEach((conteudo) => {
                    conteudo.classList.toggle('active', conteudo.id === alvo);
                });
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (localStorage.getItem('vw-theme') === 'light') {
            document.body.classList.add('light-mode');
        }

        ligarConteudo();

        /* O menu mobile fica fora de <main>, então liga uma unica vez. */
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('sidebar');

        if (hamburger && sidebar && !hamburger.dataset.ligado) {
            hamburger.dataset.ligado = '1';

            hamburger.addEventListener('click', () => sidebar.classList.toggle('active'));

            document.addEventListener('click', (evento) => {
                if (
                    window.innerWidth <= 860 &&
                    sidebar.classList.contains('active') &&
                    !sidebar.contains(evento.target) &&
                    !hamburger.contains(evento.target)
                ) {
                    sidebar.classList.remove('active');
                }
            });
        }
    });

    window.VW_UI = { ligarConteudo, syncThemeIcon };
})();

/* ---------- Utilitários de modal ---------- */
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
}

function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

function carregarImagem(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('fotoPreview');
        if (preview) preview.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

window.addEventListener('click', (event) => {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.classList.remove('open');
    }
});