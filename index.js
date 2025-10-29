const express = require('express');
const YTDlpWrap = require('yt-dlp-wrap').default;
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;
const ytDlpWrap = new YTDlpWrap();

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

    const info = await ytDlpWrap.getVideoInfo(url);

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

    const info = await ytDlpWrap.getVideoInfo(url);
    const title = info.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    const readable = ytDlpWrap.execStream([
      url,
      '-f', 'bestaudio',
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

    const info = await ytDlpWrap.getVideoInfo(url);
    const title = info.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.header('Content-Type', 'video/mp4');

    const readable = ytDlpWrap.execStream([
      url,
      '-f', 'bestvideo[height<=360]+bestaudio/best[height<=360]',
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

    const info = await ytDlpWrap.getVideoInfo(url);
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