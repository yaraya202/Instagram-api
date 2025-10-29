const express = require('express');
const YTDlpWrap = require('yt-dlp-wrap').default;
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;
const ytDlpWrap = new YTDlpWrap();

// User agent to avoid bot detection
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Residential Proxies from webshare.io
const PROXY_LIST = [
  '142.111.48.253:7030',
  '31.59.20.176:6754',
  '23.95.150.145:6114',
  '198.23.239.134:6540',
  '45.38.107.97:6014',
  '107.172.163.27:6543',
  '64.137.96.74:6641',
  '216.10.27.159:6837',
  '142.111.67.146:5011',
  '142.147.128.93:6593'
];

const PROXY_USERNAME = 'aoznshmz';
const PROXY_PASSWORD = 'sxr1dgoxmzkj';

// Proxy rotation: randomly select a proxy for each request
let currentProxyIndex = 0;

function getRandomProxy() {
  const proxy = PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
  return `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${proxy}`;
}

function getRoundRobinProxy() {
  const proxy = PROXY_LIST[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % PROXY_LIST.length;
  return `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${proxy}`;
}

// Function to get common options with proxy rotation
function getCommonOptions() {
  const proxyUrl = getRoundRobinProxy(); // Using round-robin rotation
  
  return [
    '--cookies', path.join(__dirname, 'cookies.txt'),
    '--user-agent', USER_AGENT,
    '--referer', 'https://www.youtube.com/',
    '--no-check-certificates',
    '--proxy', proxyUrl,
    '--socket-timeout', '30',
    '--retries', '10',
    '--fragment-retries', '10'
  ];
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/info', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const info = await ytDlpWrap.getVideoInfo([url, ...getCommonOptions()]);

    const response = {
      title: info.title,
      author: info.uploader || info.channel,
      lengthSeconds: parseInt(info.duration),
      viewCount: parseInt(info.view_count || 0),
      thumbnail: info.thumbnail,
      description: info.description || 'No description available'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({ error: 'Failed to fetch video information' });
  }
});

app.get('/api/download/audio', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const info = await ytDlpWrap.getVideoInfo([url, ...getCommonOptions()]);
    const title = info.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    const readable = ytDlpWrap.execStream([
      url,
      ...getCommonOptions(),
      '-f', 'bestaudio/best',
      '-x',
      '--audio-format', 'mp3',
      '-o', '-'
    ]);

    readable.pipe(res);

    readable.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download audio' });
      }
    });

  } catch (error) {
    console.error('Error downloading audio:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download audio' });
    }
  }
});

app.get('/api/download/video', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const info = await ytDlpWrap.getVideoInfo([url, ...getCommonOptions()]);
    const title = info.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    const readable = ytDlpWrap.execStream([
      url,
      ...getCommonOptions(),
      '-f', 'bestvideo[height<=360]+bestaudio/best[height<=360]/best',
      '--merge-output-format', 'mp4',
      '-o', '-'
    ]);

    readable.pipe(res);

    readable.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download video' });
      }
    });

  } catch (error) {
    console.error('Error downloading video:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download video' });
    }
  }
});

app.get('/api/get', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const info = await ytDlpWrap.getVideoInfo([url, ...getCommonOptions()]);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const response = {
      title: info.title,
      thumbnail: info.thumbnail,
      author: info.uploader || info.channel,
      duration: parseInt(info.duration),
      views: parseInt(info.view_count || 0),
      audioUrl: `${baseUrl}/api/download/audio?url=${encodeURIComponent(url)}`,
      videoUrl: `${baseUrl}/api/download/video?url=${encodeURIComponent(url)}`
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch video data' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YouTube Audio Downloader API running on http://0.0.0.0:${PORT}`);
});
