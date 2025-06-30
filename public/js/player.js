// Player-specific JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the player with the first song
    const audio = new Audio();
    let currentSongIndex = 0;
    let isPlaying = false;
    
    // Player elements
    const playBtn = document.getElementById('play-btn');
    const progressBar = document.getElementById('song-progress');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const songTitleEl = document.getElementById('song-title');
    const songArtistEl = document.getElementById('song-artist');
    const albumArtEl = document.getElementById('album-art');
    
    // Mock songs data
    const songs = [
        {
            title: "Eu, Você, o Mar e Ela",
            artist: "Luan Santana",
            cover: "assets/img/luan.jpg",
            audio: "assets/audio/midnight.mp3",
            duration: "3:47"
        },
        {
            title: "A Internet é Toxica",
            artist: "Luan Santana",
            cover: "assets/img/internet.jpg",
            audio: "assets/audio/midnight.mp3",
            duration: "3:57"
        },
        {
            title: "Meteoro",
            artist: "Chill Beats",
            cover: "assets/img/luan.jpg",
            audio: "assets/audio/ocean.mp3",
            duration: "4:12"
        },
        {
            title: "Focus Flow",
            artist: "Concentration Mix",
            cover: "assets/img/luan.jpg",
            audio: "assets/audio/focus.mp3",
            duration: "3:58"
        }
    ];
    
    // Load song
    function loadSong(song) {
        songTitleEl.textContent = song.title;
        songArtistEl.textContent = song.artist;
        albumArtEl.src = song.cover;
        audio.src = song.audio;
        durationEl.textContent = song.duration;
    }
    
    // Play song
    function playSong() {
        isPlaying = true;
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        audio.play();
        
        // Add rotation to album art
        document.querySelector('.album-art').style.animation = 'rotate 20s linear infinite';
    }
    
    // Pause song
    function pauseSong() {
        isPlaying = false;
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        audio.pause();
        
        // Stop rotation of album art
        document.querySelector('.album-art').style.animation = 'none';
    }
    
    // Next song
    function nextSong() {
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        loadSong(songs[currentSongIndex]);
        if (isPlaying) {
            playSong();
        }
    }
    
    // Previous song
    function prevSong() {
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(songs[currentSongIndex]);
        if (isPlaying) {
            playSong();
        }
    }
    
    // Update progress bar
    function updateProgress(e) {
        const { duration, currentTime } = e.srcElement;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        
        // Calculate display for current time
        const currentMinutes = Math.floor(currentTime / 60);
        let currentSeconds = Math.floor(currentTime % 60);
        if (currentSeconds < 10) {
            currentSeconds = `0${currentSeconds}`;
        }
        currentTimeEl.textContent = `${currentMinutes}:${currentSeconds}`;
    }
    
    // Set progress bar
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        audio.currentTime = (clickX / width) * duration;
    }
    
    // Event listeners
    playBtn.addEventListener('click', () => {
        isPlaying ? pauseSong() : playSong();
    });
    
    // Next/prev buttons
    document.querySelector('.next').addEventListener('click', nextSong);
    document.querySelector('.prev').addEventListener('click', prevSong);
    
    // Progress bar
    audio.addEventListener('timeupdate', updateProgress);
    document.querySelector('.progress-container').addEventListener('click', setProgress);
    
    // Song ends
    audio.addEventListener('ended', nextSong);
    
    // Initialize
    loadSong(songs[currentSongIndex]);
    
    // Initialize waveform
    initWaveform();
    
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
    
    // Resize waveform on window resize
    window.addEventListener('resize', () => {
        const canvas = document.getElementById('waveform');
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
    });
});