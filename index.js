const express = require('express');
const YTDlpWrap = require('yt-dlp-wrap').default;
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

const ytDlpPath = '/usr/bin/yt-dlp';
const cookiesPath = path.join(__dirname, 'cookies.txt');

const ytDlpWrap = new YTDlpWrap({ ytDlpPath });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

// Helper: Get video info using --dump-json
const getVideoInfo = async (url) => {
  const args = [url, ...getCommonArgs(), '--dump-json'];
  const output = await ytDlpWrap.execPromise(args);
  return JSON.parse(output);
};

// /api/info
app.get('/api/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const info = await getVideoInfo(url);
    res.json({
      title: info.title || 'Unknown',
      author: info.uploader || info.channel || 'Unknown',
      lengthSeconds: parseInt(info.duration) || 0,
      viewCount: parseInt(info.view_count || 0),
      thumbnail: info.thumbnail || '',
      description: (info.description || '').slice(0, 500)
    });
  } catch (error) {
    console.error('Info error:', error.message);
    res.status(500).json({ error: 'Failed to fetch info' });
  }
});

// /api/download/audio
app.get('/api/download/audio', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const info = await getVideoInfo(url);
    const title = (info.title || 'audio').replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    const args = [
      url,
      ...getCommonArgs(),
      '-f', 'bestaudio/best',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', '-'
    ];

    const stream = ytDlpWrap.execStream(args);
    stream.pipe(res);
    stream.on('error', () => { if (!res.headersSent) res.status(500).json({ error: 'Stream failed' }); });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  }
});

// /api/download/video
app.get('/api/download/video', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const info = await getVideoInfo(url);
    const title = (info.title || 'video').replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    const args = [
      url,
      ...getCommonArgs(),
      '-f', 'bestvideo[height<=480]+bestaudio/best[height<=480]',
      '--merge-output-format', 'mp4',
      '-o', '-'
    ];

    const stream = ytDlpWrap.execStream(args);
    stream.pipe(res);
    stream.on('error', () => { if (!res.headersSent) res.status(500).json({ error: 'Stream failed' }); });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  }
});

// /api/get
app.get('/api/get', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const info = await getVideoInfo(url);
    const base = `${req.protocol}://${req.get('host')}`;

    res.json({
      title: info.title || 'Unknown',
      thumbnail: info.thumbnail || '',
      author: info.uploader || info.channel || 'Unknown',
      duration: parseInt(info.duration) || 0,
      views: parseInt(info.view_count || 0),
      audioUrl: `${base}/api/download/audio?url=${encodeURIComponent(url)}`,
      videoUrl: `${base}/api/download/video?url=${encodeURIComponent(url)}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on http://0.0.0.0:${PORT}`);
  console.log(`cookies.txt path: ${cookiesPath}`);
});
