
const express = require('express');
const ytdl = require('@distube/ytdl-core');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// Agent to avoid some YouTube blocks
const agent = ytdl.createAgent(require('fs').readFileSync(require('path').join(__dirname, 'node_modules', '@distube', 'ytdl-core', 'lib', 'info-extras.js')));

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

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube video URL' });
    }

    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    });
    const videoDetails = info.videoDetails;
    
    const response = {
      title: videoDetails.title,
      author: videoDetails.author.name,
      lengthSeconds: parseInt(videoDetails.lengthSeconds),
      viewCount: parseInt(videoDetails.viewCount),
      thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
      description: videoDetails.description || 'No description available'
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

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube video URL' });
    }

    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    });
    
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.header('Content-Type', 'audio/mpeg');

    const audioStream = ytdl(url, {
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    });

    audioStream.pipe(res);
    
    audioStream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download audio. YouTube may be blocking requests.' });
      }
    });

    res.on('close', () => {
      audioStream.destroy();
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
