const express = require('express');
const YTDlpWrap = require('yt-dlp-wrap').default;
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// yt-dlp path (Ubuntu pe yeh hoga)
const ytDlpPath = '/usr/bin/yt-dlp';
const cookiesPath = path.join(__dirname, 'cookies.txt');

const ytDlpWrap = new YTDlpWrap({
  ytDlpPath
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper: Common yt-dlp args
const getCommonArgs = () => [
  '--cookies', cookiesPath,
  '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  '--referer', 'https://www.youtube.com/',
  '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  '--add-header', 'Accept-Language:en-US,en;q=0.9',
  '--add-header', 'Origin:https://www.youtube.com',
  '--sleep-interval', '1',
  '--max-sleep-interval', '3',
  '--retries', '3',
  '--fragment-retries', '3',
  '--no-check-certificate'
];

// ==================== /api/info ====================
app.get('/api/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    const info = await ytDlpWrap.getVideoInfo(url, getCommonArgs());

    const response = {
      title: info.title || 'Unknown Title',
      author: info.uploader || info.channel || 'Unknown',
      lengthSeconds: parseInt(info.duration) || 0,
      viewCount: parseInt(info.view_count || 0),
      thumbnail: info.thumbnail || '',
      description: info.description?.slice(0, 500) || 'No description available'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching video info:', error.message);
    res.status(500).json({ error: 'Failed to fetch video information' });
  }
});

// ==================== /api/download/audio ====================
app.get('/api/download/audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    const info = await ytDlpWrap.getVideoInfo(url, getCommonArgs());
    const title = (info.title || 'audio').replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    const audioArgs = [
      ...getCommonArgs(),
      url,
      '-f', 'bestaudio/best',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', '-'
    ];

    const readable = ytDlpWrap.execStream(audioArgs);
    readable.pipe(res);

    readable.on('error', (error) => {
      console.error('Audio stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download audio' });
      }
    });

  } catch (error) {
    console.error('Error downloading audio:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download audio' });
    }
  }
});

// ==================== /api/download/video ====================
app.get('/api/download/video', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    const info = await ytDlpWrap.getVideoInfo(url, getCommonArgs());
    const title = (info.title || 'video').replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    const videoArgs = [
      ...getCommonArgs(),
      url,
      '-f', 'bestvideo[height<=480]+bestaudio/best[height<=480]',
      '--merge-output-format', 'mp4',
      '-o', '-'
    ];

    const readable = ytDlpWrap.execStream(videoArgs);
    readable.pipe(res);

    readable.on('error', (error) => {
      console.error('Video stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download video' });
      }
    });

  } catch (error) {
    console.error('Error downloading video:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download video' });
    }
  }
});

// ==================== /api/get (Frontend ke liye) ====================
app.get('/api/get', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required' });

    const info = await ytDlpWrap.getVideoInfo(url, getCommonArgs());
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const response = {
      title: info.title || 'Unknown',
      thumbnail: info.thumbnail || '',
      author: info.uploader || info.channel || 'Unknown',
      duration: parseInt(info.duration) || 0,
      views: parseInt(info.view_count || 0),
      audioUrl: `${baseUrl}/api/download/audio?url=${encodeURIComponent(url)}`,
      videoUrl: `${baseUrl}/api/download/video?url=${encodeURIComponent(url)}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ error: 'Failed to fetch video data' });
  }
});

// ==================== Start Server ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`YouTube Downloader API running on http://0.0.0.0:${PORT}`);
  console.log(`Make sure cookies.txt is in: ${cookiesPath}`);
});
