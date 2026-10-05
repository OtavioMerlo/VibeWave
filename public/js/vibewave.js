document.addEventListener('DOMContentLoaded', () => {
    /* ---------- Tema claro/escuro ---------- */
    const themeToggle = document.querySelector('.theme-toggle');
    const savedTheme = localStorage.getItem('vw-theme');

    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }

    const syncThemeIcon = () => {
        if (!themeToggle) return;
        const icon = themeToggle.querySelector('i');
        if (!icon) return;
        const light = document.body.classList.contains('light-mode');
        icon.classList.toggle('fa-moon', !light);
        icon.classList.toggle('fa-sun', light);
    };

    syncThemeIcon();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            localStorage.setItem(
                'vw-theme',
                document.body.classList.contains('light-mode') ? 'light' : 'dark'
            );
            syncThemeIcon();
        });
    }

    /* ---------- Menu mobile ---------- */
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => sidebar.classList.toggle('active'));

        document.addEventListener('click', (event) => {
            if (
                window.innerWidth <= 860 &&
                sidebar.classList.contains('active') &&
                !sidebar.contains(event.target) &&
                !hamburger.contains(event.target)
            ) {
                sidebar.classList.remove('active');
            }
        });
    }

    /* ---------- Abas ---------- */
    const tabs = document.querySelectorAll('.tab[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');

            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach((content) => {
                content.classList.toggle('active', content.id === target);
            });
        });
    });

    /* O player (áudio, barra de progresso, volume e fila) é controlado
       por public/js/player-core.js. Não duplicar essa lógica aqui. */
});

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
