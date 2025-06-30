const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const fs = require('fs');

// Configure os caminhos
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

async function getAudioMetadata(filePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error('Arquivo não encontrado'));
    }

    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio') || {};
      resolve({
        format: metadata.format?.format_name,
        duration: metadata.format?.duration,
        bitrate: metadata.format?.bit_rate,
        codec: audioStream.codec_name,
        sampleRate: audioStream.sample_rate,
        channels: audioStream.channels,
        // Metadados adicionais
        title: metadata.format?.tags?.title,
        artist: metadata.format?.tags?.artist
      });
    });
  });
}

module.exports = getAudioMetadata;