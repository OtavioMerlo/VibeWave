/* Harness mínimo para exercitar a persistência do player-core.js
   sem navegador: simula document, localStorage, Audio e window. */
const fs = require('fs');
const vm = require('vm');

const path = require('path');
const RAIZ = path.resolve(__dirname, '..');

function criarEl(tag) {
    const el = {
        tagName: (tag || 'div').toUpperCase(),
        _attrs: {},
        style: {},
        dataset: {},
        children: [],
        innerHTML: '',
        textContent: '',
        className: '',
        classList: {
            _set: new Set(),
            add(c) { this._set.add(c); },
            remove(c) { this._set.delete(c); },
            toggle(c, f) { if (f === undefined) { this._set.has(c) ? this._set.delete(c) : this._set.add(c); } else if (f) { this._set.add(c); } else { this._set.delete(c); } },
            contains(c) { return this._set.has(c); }
        },
        setAttribute(k, v) { this._attrs[k] = v; },
        getAttribute(k) { return this._attrs[k]; },
        appendChild(c) { this.children.push(c); return c; },
        addEventListener(ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
        removeEventListener() {},
        closest() { return null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        play() { this.paused = false; this._emit('play'); return Promise.resolve(); },
        pause() { this.paused = true; this._emit('pause'); },
        _emit(ev) { (this._listeners[ev] || []).forEach((f) => f.call(this)); },
        _listeners: {},
        _sources: {}
    };
    return el;
}

const store = new Map();

const audio = {
    id: '', src: '', currentTime: 0, duration: 0, volume: 0.8, muted: false,
    paused: true, readyState: 4, preload: '', listeners: {},
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    removeAttribute() {},
    play() { this.paused = false; (this.listeners.play || []).forEach((f) => f()); return Promise.resolve(); },
    pause() { this.paused = true; (this.listeners.pause || []).forEach((f) => f()); }
};

const footer = criarEl('footer');
footer.className = 'player-footer';
footer.querySelectorAll = () => [];

const docListeners = {};

const document = {
    body: criarEl('body'),
    visibilityState: 'visible',
    querySelector(sel) {
        if (sel === '.player-footer') return footer;
        return null;
    },
    querySelectorAll() { return []; },
    createElement(tag) { return criarEl(tag); },
    addEventListener(ev, fn) { (docListeners[ev] = docListeners[ev] || []).push(fn); },
    removeEventListener() {}
};

const window = { addEventListener() {}, location: { href: 'http://localhost/home' } };

const ctx = {
    console, document, window, localStorage: {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k)
    },
    navigator: {},
    Audio: function () { return audio; },
    URL,
    setInterval() { return 0; },
    setTimeout,
    Math, JSON, Date, Number, Array, Object, String, Error, Promise, isNaN, isFinite, parseInt
};
ctx.globalThis = ctx;
ctx.self = ctx;
vm.createContext(ctx);

vm.runInContext(fs.readFileSync(RAIZ + '/public/js/player-core.js', 'utf8'), ctx, { filename: 'player-core.js' });

/* Simula uma navegacao real: o documento novo nao tem nenhum listener do
   player anterior e o <audio> antigo e destruido, entao zeramos os dois. */
function novaPagina() {
    Object.keys(docListeners).forEach((k) => delete docListeners[k]);
    audio.listeners = {};
    delete ctx.window.VW;
    vm.runInContext(fs.readFileSync(RAIZ + '/public/js/player-core.js', 'utf8'), ctx, { filename: 'player-core.js' });
    (docListeners.DOMContentLoaded || []).forEach((f) => f());
}

/* dispara DOMContentLoaded */
(docListeners.DOMContentLoaded || []).forEach((f) => f());

let fail = 0;
const t = (nome, cond) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + nome); if (!cond) fail++; };

console.log('1) Estado inicial (sem nada salvo)');
t('nada tocando', ctx.window.VW.state().titulo === '');
t('localStorage vazio', !store.has('vw-player'));

console.log('\n2) Tocar uma faixa persiste o estado');
ctx.window.VW.play({
    id: 5, src: '/uploads/musicas/a.mp3', capa: '/img/capa.jpg',
    titulo: 'Noite Neon', artista: 'Ana Costa', duracao: 214
});
t('localStorage gravou vw-player', store.has('vw-player'));
const salvo = JSON.parse(store.get('vw-player'));
t('titulo salvo', salvo.titulo === 'Noite Neon');
t('artista salvo', salvo.artista === 'Ana Costa');
t('src salvo', salvo.src === '/uploads/musicas/a.mp3');
t('playing salvo como true', salvo.playing === true);
t('audio.src aplicado', audio.src === '/uploads/musicas/a.mp3');

console.log('\n3) Estado restaurado em "nova pagina"');
/* zera o audio e recarrega o script, como se fosse outra navegacao */
audio.src = ""; audio.currentTime = 0; audio.paused = true;
novaPagina();
t('titulo restaurado', ctx.window.VW.state().titulo === 'Noite Neon');
t('artista restaurado', ctx.window.VW.state().artista === 'Ana Costa');
t('src restaurado no audio', audio.src === '/uploads/musicas/a.mp3');
t('posicao retomada', Math.abs(ctx.window.VW.state().tempo - salvo.currentTime) < 0.5);

console.log('\n4) Controles');
ctx.window.VW.toggle();
t('toggle pausa', audio.paused === true);
t('pause persistido', JSON.parse(store.get('vw-player')).playing === false);
ctx.window.VW.toggle();
t('toggle retoma', audio.paused === false);
ctx.window.VW.volume(0.25);
t('volume aplicado no audio', Math.abs(audio.volume - 0.25) < 0.001);
t('volume salvo em vw-volume', store.get('vw-volume') === '0.25');
audio.duration = 214; audio.addEventListener('loadedmetadata', () => {});
ctx.window.VW.seek(120);
t('seek aplicado', Math.abs(audio.currentTime - 120) < 0.001);
t('seek persistido', Math.abs(JSON.parse(store.get('vw-player')).currentTime - 120) < 1.5);

console.log('\n5) Mudo sobrevive a navegacao');
/* o mudo e acionado por clique delegado em [data-p-mute], entao disparamos
   o listener real de 'click' do document com um alvo que casa com o seletor */
const alvoMudo = { closest: (sel) => (sel === '[data-p-mute]' ? {} : null) };
(docListeners.click || []).forEach((f) => f({ target: alvoMudo, preventDefault() {}, stopPropagation() {} }));
t('mudo ativado no audio', audio.muted === true);
t('mudo salvo em vw-muted', store.get('vw-muted') === '1');
t('volume nao foi sobrescrito pelo mudo', store.get('vw-volume') === '0.25');

/* recarrega o script como se fosse outra navegacao: o mudo deve voltar ligado */
audio.muted = false;
novaPagina();
t('mudo restaurado na nova pagina', audio.muted === true);
t('volume restaurado junto', Math.abs(audio.volume - 0.25) < 0.001);

console.log('\n6) Limpar estado');
ctx.window.VW.clear();
t('localStorage limpo', !store.has('vw-player'));
t('estado zerado (titulo vazio, parado)', ctx.window.VW.state().titulo === '' && ctx.window.VW.state().tocando === false);

console.log('\n' + (fail ? 'FALHAS: ' + fail : 'player-core.js: persistencia validada'));
process.exit(fail ? 1 : 0);