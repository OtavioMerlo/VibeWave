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

    /* ---------- Mini player global ---------- */
    const audio = document.getElementById('global-audio');
    const playBtn = document.getElementById('global-play');
    const footer = document.querySelector('.player-footer');

    if (audio && playBtn && footer) {
        const progress = footer.querySelector('.progress');
        const progressBar = footer.querySelector('.progress-bar');
        const currentLabel = footer.querySelector('.time-current');
        const totalLabel = footer.querySelector('.time-total');
        const volume = footer.querySelector('.volume-slider input');
        const volumeBtn = footer.querySelector('.volume-btn');

        const formatTime = (seconds) => {
            if (!seconds || isNaN(seconds)) return '0:00';
            const min = Math.floor(seconds / 60);
            const sec = Math.floor(seconds % 60);
            return `${min}:${sec.toString().padStart(2, '0')}`;
        };

        const setPlayIcon = (playing) => {
            playBtn.innerHTML = playing
                ? '<i class="fas fa-pause"></i>'
                : '<i class="fas fa-play"></i>';
        };

        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                setPlayIcon(true);
            } else {
                audio.pause();
                setPlayIcon(false);
            }
        });

        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100 || 0;
            if (progress) progress.style.width = `${percent}%`;
            if (currentLabel) currentLabel.textContent = formatTime(audio.currentTime);
        });

        audio.addEventListener('loadedmetadata', () => {
            if (totalLabel) totalLabel.textContent = formatTime(audio.duration);
        });

        audio.addEventListener('ended', () => {
            setPlayIcon(false);
            if (progress) progress.style.width = '0%';
            if (currentLabel) currentLabel.textContent = '0:00';
        });

        if (progressBar) {
            progressBar.addEventListener('click', (event) => {
                const width = progressBar.clientWidth;
                if (width && audio.duration) {
                    audio.currentTime = (event.offsetX / width) * audio.duration;
                }
            });
        }

        if (volume && audio) {
            audio.volume = volume.value / 100;
            volume.addEventListener('input', () => {
                audio.volume = volume.value / 100;
            });
        }

        if (volumeBtn && audio) {
            volumeBtn.addEventListener('click', () => {
                audio.muted = !audio.muted;
                volumeBtn.innerHTML = audio.muted
                    ? '<i class="fas fa-volume-mute"></i>'
                    : '<i class="fas fa-volume-up"></i>';
            });
        }
    }
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
