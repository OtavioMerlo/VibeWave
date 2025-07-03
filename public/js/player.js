const audio = document.getElementById('bgAudio');
const playButton = document.getElementById('play-btn');
const progressBar = document.getElementById('song-progress');
const currentTimeDisplay = document.getElementById('current-time');
const durationDisplay = document.getElementById('duration');
const progressContainer = document.getElementById('progress-container');

// Formatar tempo em minutos:segundos
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

// Atualizar barra de progresso e tempo
function updateProgress() {
    const { currentTime, duration } = audio;
    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    
    currentTimeDisplay.textContent = formatTime(currentTime);
    
    // Atualizar a duração total se ainda não estiver definida
    if (duration && !isNaN(duration)) {
        durationDisplay.textContent = formatTime(duration);
    }
}

// Definir a posição da música ao clicar na barra de progresso
function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    audio.currentTime = (clickX / width) * duration;
}

// Event listeners
playButton.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playButton.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        audio.pause();
        playButton.innerHTML = '<i class="fas fa-play"></i>';
    }
});

audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('ended', () => {
    playButton.innerHTML = '<i class="fas fa-play"></i>';
    progressBar.style.width = '0%';
    currentTimeDisplay.textContent = '0:00';
});

progressContainer.addEventListener('click', setProgress);

// Atualizar a duração quando os metadados da música forem carregados
audio.addEventListener('loadedmetadata', () => {
    durationDisplay.textContent = formatTime(audio.duration);
});