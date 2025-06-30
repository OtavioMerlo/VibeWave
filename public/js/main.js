// DOM Elements
const sidebar = document.querySelector('.sidebar');
const hamburger = document.querySelector('.hamburger');
const themeToggle = document.querySelector('.theme-toggle');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');


// Mock Data
const songs = [  
    {  
        title: "Eu, Você o Mar e Ela",  
        artist: "Luan Santana",  
        cover: "assets/img/luan.jpg",
        audio: "assets/audio/midnight.mp3",  
        duration: "3:45"  
    },
    {  
        title: "Ocean Dreams",  
        artist: "Chill Beats",  
        cover: "assets/img/covers/playlist1.jpg",  
        audio: "assets/audio/ocean.mp3",  
        duration: "4:12"  
    },
    {  
        title: "Focus Flow",  
        artist: "Concentration Mix",  
        cover: "assets/img/covers/playlist2.jpg",  
        audio: "assets/audio/focus.mp3",  
        duration: "3:58"  
    }
];

// Mobile Navigation Toggle
if (hamburger) {
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Theme Toggle
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        
        // Change icon based on theme
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('light-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    });
}

// Tab Switching
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId) {
                content.classList.add('active');
            }
        });
    });
});

// Player Controls
const playButtons = document.querySelectorAll('.play, .control-btn.play');
const pauseButtons = document.querySelectorAll('.pause, .control-btn.pause');
const progressBars = document.querySelectorAll('.progress-bar');
const progressElements = document.querySelectorAll('.progress');
const currentTimeElements = document.querySelectorAll('.time-current');
const durationElements = document.querySelectorAll('.time-total');

let isPlaying = false;
let currentSongIndex = 0;
let audio = new Audio(songs[currentSongIndex].audio);

// Initialize player
function initPlayer() {
    // Set song info
    document.querySelectorAll('.now-playing-info h3').forEach(el => {
        el.textContent = songs[currentSongIndex].title;
    });
    document.querySelectorAll('.now-playing-info p').forEach(el => {
        el.textContent = songs[currentSongIndex].artist;
    });
    document.querySelectorAll('.now-playing-cover img').forEach(el => {
        el.src = songs[currentSongIndex].cover;
    });
    document.querySelectorAll('.time-total').forEach(el => {
        el.textContent = songs[currentSongIndex].duration;
    });
    
    // Set album art in player page
    const albumArt = document.getElementById('album-art');
    if (albumArt) {
        albumArt.src = songs[currentSongIndex].cover;
    }

    // Set song title in player page
    const songTitle = document.getElementById('song-title');
    if (songTitle) {
        songTitle.textContent = songs[currentSongIndex].title;
    }
    
    // Set artist in player page
    const songArtist = document.getElementById('song-artist');
    if (songArtist) {
        songArtist.textContent = songs[currentSongIndex].artist;
    }
    
    // Set duration in player page
    const duration = document.getElementById('duration');
    if (duration) {
        duration.textContent = songs[currentSongIndex].duration;
    }
}

// Play/Pause toggle
function togglePlayPause() {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    isPlaying = !isPlaying;
    
    // Update play/pause buttons
    playButtons.forEach(btn => {
        btn.style.display = isPlaying ? 'none' : 'flex';
    });
    pauseButtons.forEach(btn => {
        btn.style.display = isPlaying ? 'flex' : 'none';
    });
    
    // Add rotation to album art when playing
    const albumArt = document.querySelector('.album-art');
    if (albumArt) {
        if (isPlaying) {
            albumArt.style.animation = 'rotate 20s linear infinite';
        } else {
            albumArt.style.animation = 'none';
        }
    }
}

// Event listeners for play buttons
playButtons.forEach(btn => {
    btn.addEventListener('click', togglePlayPause);
});

// Event listeners for pause buttons
pauseButtons.forEach(btn => {
    btn.addEventListener('click', togglePlayPause);
});

// Next song
function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    audio.src = songs[currentSongIndex].audio;
    if (isPlaying) {
        audio.play();
    }
    initPlayer();
}

// Previous song
function prevSong() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    audio.src = songs[currentSongIndex].audio;
    if (isPlaying) {
        audio.play();
    }
    initPlayer();
}

// Event listeners for next/prev buttons
document.querySelectorAll('.next, .control-btn.next').forEach(btn => {
    btn.addEventListener('click', nextSong);
});

document.querySelectorAll('.prev, .control-btn.prev').forEach(btn => {
    btn.addEventListener('click', prevSong);
});

// Update progress bar
audio.addEventListener('timeupdate', () => {
    const currentTime = audio.currentTime;
    const duration = audio.duration;
    const progressPercent = (currentTime / duration) * 100;
    
    progressElements.forEach(el => {
        el.style.width = `${progressPercent}%`;
    });
    
    // Update current time display
    const currentMinutes = Math.floor(currentTime / 60);
    const currentSeconds = Math.floor(currentTime % 60).toString().padStart(2, '0');
    currentTimeElements.forEach(el => {
        el.textContent = `${currentMinutes}:${currentSeconds}`;
    });
    
    // Update player page current time
    const playerCurrentTime = document.getElementById('current-time');
    if (playerCurrentTime) {
        playerCurrentTime.textContent = `${currentMinutes}:${currentSeconds}`;
    }
    
    // Update player page progress bar
    const playerProgress = document.getElementById('song-progress');
    if (playerProgress) {
        playerProgress.style.width = `${progressPercent}%`;
    }
});

// Click on progress bar to seek
progressBars.forEach(bar => {
    bar.addEventListener('click', (e) => {
        const width = bar.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        
        audio.currentTime = (clickX / width) * duration;
    });
});

// Song ended
audio.addEventListener('ended', () => {
    nextSong();
});

// Initialize player on load
window.addEventListener('DOMContentLoaded', () => {
    initPlayer();
    
    // Initialize waveform if on player page
    if (document.getElementById('waveform')) {
        initWaveform();
    }
});

// Waveform visualization
function initWaveform() {
    const canvas = document.getElementById('waveform');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Audio context setup
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Draw waveform
    function draw() {
        requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, canvas.height / 2 - barHeight / 2, 0, canvas.height / 2 + barHeight / 2);
            gradient.addColorStop(0, 'rgba(186, 85, 211, 0.8)');
            gradient.addColorStop(1, 'rgba(138, 43, 226, 0.8)');
            
            ctx.fillStyle = gradient;
            
            ctx.fillRect(
                x,
                canvas.height / 2 - barHeight / 2,
                barWidth,
                barHeight
            );
            
            x += barWidth + 1;
        }
    }
    
    draw();
}

function moverConteudoMenuParaBaixo() {
    const sidebar = document.querySelector('.sidebar');

    if (!sidebar) return;

    if (window.innerWidth <= 780) {
        sidebar.style.marginTop = '50px';    
        sidebar.style.height = 'calc(100vh - 50px)'; 
        sidebar.style.overflowY = 'auto';      
    } else {
        sidebar.style.marginTop = '0';
        sidebar.style.height = 'auto';
        sidebar.style.overflowY = 'visible';
    }
}

window.addEventListener('DOMContentLoaded', moverConteudoMenuParaBaixo);
window.addEventListener('resize', moverConteudoMenuParaBaixo);


tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    tabContents.forEach(content => content.classList.remove('active'));

    const target = tab.getAttribute('data-tab');
    const targetContent = document.getElementById(target);
    if (targetContent) {
      targetContent.classList.add('active');
    }
  });
});
