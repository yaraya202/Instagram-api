const express = require('express');
const play = require('play-dl');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

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

    const validateResult = play.yt_validate(url);
    if (validateResult !== 'video') {
      return res.status(400).json({ error: 'Invalid YouTube video URL' });
    }

    const info = await play.video_info(url);
    const video = info.video_details;
    
    const videoDetails = {
      title: video.title,
      author: video.channel.name,
      lengthSeconds: video.durationInSec,
      viewCount: video.views,
      thumbnail: video.thumbnails[0].url,
      description: video.description || 'No description available'
    };

    res.json(videoDetails);
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

    const validateResult = play.yt_validate(url);
    if (validateResult !== 'video') {
      return res.status(400).json({ error: 'Invalid YouTube video URL' });
    }

    const info = await play.video_info(url);
    const video = info.video_details;
    const title = video.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    const stream = await play.stream(url, {
      quality: 2
    });

    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    stream.stream.pipe(res);
    
    stream.stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download audio' });
      }
    });

    res.on('close', () => {
      stream.stream.destroy();
    });

  } catch (error) {
    console.error('Error downloading audio:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download audio' });
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`YouTube Audio Downloader API running on http://0.0.0.0:${PORT}`);
});