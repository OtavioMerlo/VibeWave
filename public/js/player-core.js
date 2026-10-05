/* ============================================================
   VibeWave - Núcleo do player
   Um único elemento <audio> por página. O estado é salvo em
   localStorage, então a música não para ao trocar de página,
   recarregar com F5 ou usar voltar/avançar do navegador.
   ============================================================ */

(function () {
    'use strict';

    const CHAVE = 'vw-player';
    const CHAVE_VOLUME = 'vw-volume';
    const CHAVE_MUDO = 'vw-muted';

    const estado = {
        id: null,
        src: null,
        capa: null,
        titulo: '',
        artista: '',
        duracao: 0,
        currentTime: 0,
        playing: false,
        fila: [],
        indice: -1,
        shuffle: false,
        repeat: false
    };

    let audio = null;
    let volume = 0.8;
    let pronto = false;
    let ultimoSalvamento = 0;

    /* ---------- persistência ---------- */

    function salvar(agora = false) {
        if (!pronto) return;

        const agoraMs = Date.now();
        if (!agora && agoraMs - ultimoSalvamento < 1000) return;

        ultimoSalvamento = agoraMs;

        estado.currentTime = audio ? audio.currentTime : estado.currentTime;

        try {
            localStorage.setItem(CHAVE, JSON.stringify({
                id: estado.id,
                src: estado.src,
                capa: estado.capa,
                titulo: estado.titulo,
                artista: estado.artista,
                duracao: estado.duracao,
                currentTime: estado.currentTime,
                playing: estado.playing,
                fila: estado.fila,
                indice: estado.indice,
                shuffle: estado.shuffle,
                repeat: estado.repeat
            }));
        } catch (err) {
            /* modo privado ou cota cheia: segue sem persistir */
        }
    }

    function carregar() {
        try {
            const bruto = localStorage.getItem(CHAVE);
            return bruto ? JSON.parse(bruto) : null;
        } catch (err) {
            return null;
        }
    }

    function limpar() {
        try {
            localStorage.removeItem(CHAVE);
        } catch (err) {
            /* ignore */
        }
    }

    function carregarVolume() {
        try {
            const bruto = localStorage.getItem(CHAVE_VOLUME);
            if (bruto !== null) {
                const valor = Number(bruto);
                if (!Number.isNaN(valor)) return Math.min(1, Math.max(0, valor));
            }
        } catch (err) {
            /* ignore */
        }
        return 0.8;
    }

    /* O mudo é guardado em chave própria: assim o volume continua intacto
       quando a pessoa tira o mudo de novo em outra página. */
    function carregarMudo() {
        try {
            return localStorage.getItem(CHAVE_MUDO) === '1';
        } catch (err) {
            /* ignore */
        }
        return false;
    }

    function salvarMudo() {
        try {
            localStorage.setItem(CHAVE_MUDO, audio && audio.muted ? '1' : '0');
        } catch (err) {
            /* ignore */
        }
    }

    /* ---------- fila ---------- */

    function montarFilaDoDom(elemento) {
        /* Aceita um elemento do DOM ou um objeto de faixa (API VW.play). */
        if (!elemento || typeof elemento.closest !== 'function') return [];

        const trilha = elemento.closest('[data-fila]') || document;

        return Array.from(trilha.querySelectorAll('[data-track-src]')).map((el) => ({
            id: el.dataset.trackId,
            src: el.dataset.trackSrc,
            capa: el.dataset.trackCapa,
            titulo: el.dataset.trackTitulo,
            artista: el.dataset.trackArtista,
            duracao: Number(el.dataset.trackDuracao) || 0
        }));
    }

    function indiceDaTrilha(trilha) {
        if (!trilha || !estado.fila.length) return -1;

        const i = estado.fila.findIndex((t) => t.id === trilha.id);
        return i === -1 ? estado.indice : i;
    }

    /* ---------- renderização da interface ---------- */

    function formatar(segundos) {
        if (!segundos || isNaN(segundos)) return '0:00';
        const min = Math.floor(segundos / 60);
        const seg = Math.floor(segundos % 60);
        return `${min}:${seg.toString().padStart(2, '0')}`;
    }

    function el(seletor, raiz = document) {
        return raiz.querySelector(seletor);
    }

    /* Retorna todos os elementos com o atributo, para que o player da
página e o footer compartilhem o mesmo estado. */
    function todos(seletor, raiz = document) {
        return Array.from(raiz.querySelectorAll(seletor));
    }

    function definirTexto(seletor, valor) {
        todos(seletor).forEach((elemento) => {
            elemento.textContent = valor;
        });
    }

    function atualizarInterface() {
        const footer = el('.player-footer');
        if (!footer) return;

        const capa = el('[data-p-cover]');
        if (capa) {
            if (estado.capa) {
                capa.innerHTML = '';
                const img = document.createElement('img');
                img.src = estado.capa;
                img.alt = estado.titulo || 'Capa';
                img.onerror = function () {
                    this.onerror = null;
                    this.src = '/img/default.svg';
                };
                capa.appendChild(img);
                capa.classList.remove('is-vazio');
            } else {
                capa.innerHTML = '<div class="cover-placeholder"><i class="fas fa-music"></i></div>';
            }
        }

        definirTexto('[data-p-titulo]', estado.titulo || 'Nada tocando');
        definirTexto('[data-p-artista]', estado.artista || 'Escolha uma música para ouvir');
        definirTexto('[data-p-total]', formatar(estado.duracao));
        definirTexto('[data-p-atual]', audio ? formatar(audio.currentTime) : '0:00');

        const percent = audio && audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        todos('[data-p-progresso]').forEach((barra) => {
            barra.style.width = `${percent}%`;
        });

        todos('[data-p-play]').forEach((botao) => {
            botao.innerHTML = estado.playing
                ? '<i class="fas fa-pause"></i>'
                : '<i class="fas fa-play"></i>';
            botao.setAttribute('aria-label', estado.playing ? 'Pausar' : 'Reproduzir');
        });

        todos('[data-p-mute]').forEach((botao) => {
            const mudo = audio && (audio.muted || audio.volume === 0);
            botao.innerHTML = mudo
                ? '<i class="fas fa-volume-mute"></i>'
                : '<i class="fas fa-volume-up"></i>';
        });

        document.body.classList.toggle('is-playing', estado.playing && !!estado.src);

        atualizarMediaSession();
        marcarTrilhaAtiva();
    }

    function marcarTrilhaAtiva() {
        document.querySelectorAll('[data-track-id]').forEach((el) => {
            const ativo = estado.src && el.dataset.trackSrc === estado.src && estado.playing;
            el.classList.toggle('is-playing', !!ativo);

            const botao = el.querySelector('[data-track-play]');
            if (botao) {
                botao.innerHTML = ativo
                    ? '<i class="fas fa-pause"></i>'
                    : '<i class="fas fa-play"></i>';
            }
        });
    }

    /* ---------- ações ---------- */

    function tocar(trilha, opcoes) {
        if (!trilha || !trilha.src) return;

        const opcoesReais = opcoes || {};

        const mudou = estado.src !== trilha.src;

        estado.id = trilha.id;
        estado.src = trilha.src;
        estado.capa = trilha.capa;
        estado.titulo = trilha.titulo;
        estado.artista = trilha.artista;
        estado.duracao = Number(trilha.duracao) || 0;

        if (!estado.fila.length) {
            estado.fila = montarFilaDoDom(trilha);
        }

        const idx = indiceDaTrilha(trilha);
        if (idx !== -1) estado.indice = idx;

        if (!audio) criarAudio();

        if (mudou) {
            audio.src = trilha.src;
            audio.currentTime = 0;
        } else if (opcoesReais.tempo !== undefined) {
            audio.currentTime = opcoesReais.tempo;
        }

        estado.playing = true;
        atualizarInterface();
        salvar(true);

        audio.play().catch(() => {
            /* navegador bloqueou autoplay: fica pausado no ponto */
            estado.playing = false;
            atualizarInterface();
            salvar(true);
        });
    }

    function alternar() {
        if (!estado.src) {
            if (estado.fila.length) tocar(estado.fila[Math.max(0, estado.indice)]);
            return;
        }

        if (!audio) return;

        if (audio.paused) {
            estado.playing = true;
            audio.play().catch(() => {});
        } else {
            estado.playing = false;
            audio.pause();
        }

        atualizarInterface();
        salvar(true);
    }

    function proximo(automatico) {
        if (!estado.fila.length) return;

        let proximoIndice;

        if (automatico && estado.repeat) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            return;
        }

        if (estado.shuffle) {
            proximoIndice = Math.floor(Math.random() * estado.fila.length);
        } else {
            proximoIndice = estado.indice + 1;
        }

        if (proximoIndice >= estado.fila.length) {
            if (automatico && !estado.repeat) {
                estado.playing = false;
                atualizarInterface();
                salvar(true);
                return;
            }
            proximoIndice = 0;
        }

        estado.indice = proximoIndice;
        tocar(estado.fila[proximoIndice]);
    }

    function anterior() {
        if (!estado.fila.length) return;

        if (audio && audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        let indice = estado.indice - 1;
        if (indice < 0) indice = estado.fila.length - 1;

        estado.indice = indice;
        tocar(estado.fila[indice]);
    }

    function buscar(segundos) {
        if (!audio || !audio.duration) return;
        audio.currentTime = Math.min(Math.max(0, segundos), audio.duration);
        atualizarInterface();
        salvar(true);
    }

    function definirVolume(valor) {
        volume = Math.min(1, Math.max(0, valor));

        if (audio) audio.volume = volume;

        try {
            localStorage.setItem(CHAVE_VOLUME, String(volume));
        } catch (err) {
            /* ignore */
        }

        todos('[data-p-volume]').forEach((slider) => {
            slider.value = Math.round(volume * 100);
        });

        atualizarInterface();
        salvar();
    }

    function alternarMudo() {
        if (!audio) return;
        audio.muted = !audio.muted;
        salvarMudo();
        atualizarInterface();
    }

    function restaurar() {
        const bruto = carregar();
        if (!bruto || !bruto.src) {
            atualizarInterface();
            return;
        }

        estado.id = bruto.id;
        estado.src = bruto.src;
        estado.capa = bruto.capa;
        estado.titulo = bruto.titulo || '';
        estado.artista = bruto.artista || '';
        estado.duracao = Number(bruto.duracao) || 0;
        estado.fila = Array.isArray(bruto.fila) ? bruto.fila : [];
        estado.indice = Number.isInteger(bruto.indice) ? bruto.indice : -1;
        estado.shuffle = !!bruto.shuffle;
        estado.repeat = !!bruto.repeat;

        volume = carregarVolume();
        criarAudio();

        audio.volume = volume;
        audio.muted = carregarMudo();
        audio.src = estado.src;
        audio.preload = 'metadata';

        const slider = todos('[data-p-volume]');
        slider.forEach((elemento) => {
            elemento.value = Math.round(volume * 100);
        });

        const marca = (bruto.currentTime || 0) + 0.15;
        const seeking = () => {
            try {
                audio.currentTime = Math.max(0, marca);
            } catch (err) {
                /* ignora */
            }

            if (bruto.playing) {
                estado.playing = true;
                audio.play().catch(() => {
                    estado.playing = false;
                    atualizarInterface();
                });
            }

            atualizarInterface();
        };

        if (audio.readyState >= 1) {
            seeking();
        } else {
            audio.addEventListener('loadedmetadata', seeking, { once: true });
        }

        atualizarInterface();
    }

    function criarAudio() {
        if (audio) return;

        audio = new Audio();
        audio.preload = 'metadata';
        audio.volume = volume;
        audio.id = 'global-audio';

        audio.addEventListener('timeupdate', () => {
            const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;

            todos('[data-p-progresso]').forEach((barra) => {
                barra.style.width = `${percent}%`;
            });

            definirTexto('[data-p-atual]', formatar(audio.currentTime));

            salvar();
        });

        audio.addEventListener('loadedmetadata', () => {
            if (audio.duration && isFinite(audio.duration)) {
                estado.duracao = Math.round(audio.duration);
                definirTexto('[data-p-total]', formatar(estado.duracao));
            }
            atualizarInterface();
        });

        audio.addEventListener('play', () => {
            estado.playing = true;
            atualizarInterface();
            salvar(true);
        });

        audio.addEventListener('pause', () => {
            estado.playing = false;
            atualizarInterface();
            salvar(true);
        });

        audio.addEventListener('ended', () => proximo(true));

        audio.addEventListener('volumechange', () => {
            const mudo = audio.muted || audio.volume === 0;

            todos('[data-p-mute]').forEach((botao) => {
                botao.innerHTML = mudo
                    ? '<i class="fas fa-volume-mute"></i>'
                    : '<i class="fas fa-volume-up"></i>';
            });

            definirTexto('[data-p-volume-valor]', `${Math.round(audio.volume * 100)}%`);
        });

        audio.addEventListener('error', () => {
            estado.playing = false;
            atualizarInterface();
        });

        document.body.appendChild(audio);
    }

    /* ---------- eventos da interface ---------- */

    function ligarInterface() {
        document.addEventListener('click', (event) => {
            const alvo = event.target;

            const botaoTrilha = alvo.closest('[data-track-play]');
            if (botaoTrilha) {
                event.preventDefault();
                event.stopPropagation();

                const item = botaoTrilha.closest('[data-track-id]');
                if (!item) return;

                const trilha = montarFilaDoDom(item).find(
                    (t) => t.id === item.dataset.trackId
                );

                if (!trilha) return;

                if (estado.src === trilha.src && audio && !audio.paused) {
                    audio.pause();
                } else {
                    estado.fila = montarFilaDoDom(item);
                    tocar(trilha);
                }
                return;
            }

            const itemClicavel = alvo.closest('[data-track-id]');
            if (itemClicavel && !alvo.closest('a[href]')) {
                event.preventDefault();

                const trilha = montarFilaDoDom(itemClicavel).find(
                    (t) => t.id === itemClicavel.dataset.trackId
                );

                if (trilha) {
                    estado.fila = montarFilaDoDom(itemClicavel);
                    tocar(trilha);
                }
                return;
            }

            const play = alvo.closest('[data-p-play]');
            if (play) {
                event.preventDefault();
                alternar();
                return;
            }

            const prev = alvo.closest('[data-p-prev]');
            if (prev) {
                event.preventDefault();
                anterior();
                return;
            }

            const next = alvo.closest('[data-p-next]');
            if (next) {
                event.preventDefault();
                proximo(false);
                return;
            }

            const shuffle = alvo.closest('[data-p-shuffle]');
            if (shuffle) {
                event.preventDefault();
                estado.shuffle = !estado.shuffle;
                atualizarInterface();
                salvar(true);
                return;
            }

            const repeat = alvo.closest('[data-p-repeat]');
            if (repeat) {
                event.preventDefault();
                estado.repeat = !estado.repeat;
                atualizarInterface();
                salvar(true);
                return;
            }

            const mute = alvo.closest('[data-p-mute]');
            if (mute) {
                event.preventDefault();
                alternarMudo();
                return;
            }
        });

        document.addEventListener('input', (event) => {
            const slider = event.target.closest('[data-p-volume]');
            if (slider) definirVolume(slider.value / 100);
        });

        document.addEventListener('click', (event) => {
            const barra = event.target.closest('[data-p-progresso]');
            if (!barra) return;

            const trilho = barra.parentElement;
            if (!trilho) return;

            const rect = trilho.getBoundingClientRect();
            if (!rect.width) return;

            buscar(((event.clientX - rect.left) / rect.width) * (audio ? audio.duration : 0));
        });

        /* Media Session: controles do sistema operacional */
        if ('mediaSession' in navigator && navigator.mediaSession.setActionHandler) {
            try {
                navigator.mediaSession.setActionHandler('play', () => alternar());
                navigator.mediaSession.setActionHandler('pause', () => alternar());
                navigator.mediaSession.setActionHandler('previoustrack', () => anterior());
                navigator.mediaSession.setActionHandler('nexttrack', () => proximo(false));
            } catch (err) {
                /* navegador sem suporte a alguma ação */
            }
        }
    }

    function atualizarMediaSession() {
        if (!('mediaSession' in navigator)) return;

        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: estado.titulo,
                artist: estado.artista,
                artwork: estado.capa ? [{ src: estado.capa, sizes: '640x640' }] : []
            });
            navigator.mediaSession.playbackState = estado.playing ? 'playing' : 'paused';
        } catch (err) {
            /* ignore */
        }
    }

    /* ---------- API pública ---------- */

    const VW = {
        play: (elementoOuDados) => {
            /* Aceita um elemento com data-track-*, um id, ou um objeto de faixa. */
            if (!elementoOuDados) return;

            if (typeof elementoOuDados === 'number' || typeof elementoOuDados === 'string') {
                const alvo = estado.fila.find((t) => String(t.id) === String(elementoOuDados));
                if (alvo) tocar(alvo);
                return;
            }

            if (elementoOuDados.dataset) {
                const trilha = montarFilaDoDom(elementoOuDados).find(
                    (t) => t.id === elementoOuDados.dataset.trackId
                );
                if (trilha) tocar(trilha);
                return;
            }

            if (elementoOuDados.src) tocar(elementoOuDados);
        },
        pause: () => {
            if (audio) audio.pause();
        },
        toggle: alternar,
        next: () => proximo(false),
        previous: anterior,
        seek: buscar,
        volume: definirVolume,
        state: () => ({
            id: estado.id,
            titulo: estado.titulo,
            artista: estado.artista,
            capa: estado.capa,
            tocando: estado.playing,
            tempo: audio ? audio.currentTime : 0,
            duracao: estado.duracao
        }),
        clear: () => {
            /* `pronto = false` impede que o evento 'pause' re-grave o estado. */
            pronto = false;

            limpar();

            if (audio) {
                audio.pause();
                audio.removeAttribute('src');
                audio.currentTime = 0;
            }

            estado.id = null;
            estado.src = null;
            estado.capa = null;
            estado.titulo = '';
            estado.artista = '';
            estado.duracao = 0;
            estado.currentTime = 0;
            estado.fila = [];
            estado.indice = -1;
            estado.playing = false;

            pronto = true;
            atualizarInterface();
        }
    };

    window.VW = VW;

    document.addEventListener('DOMContentLoaded', () => {
        if (!el('.player-footer')) return;

        criarAudio();
        ligarInterface();
        restaurar();
        pronto = true;
        atualizarInterface();
        atualizarMediaSession();
    });

    /* Mantém a aba anterior consistente quando o usuário navega. */
    window.addEventListener('pagehide', () => salvar(true));
    window.addEventListener('beforeunload', () => salvar(true));

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (audio) atualizarInterface();
        } else {
            salvar(true);
        }
    });
})();