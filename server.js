require('dotenv').config();
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8090;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'app')));

// --- Database ---
const dbPath = path.join(__dirname, 'data', 'pulsepoints.db');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS pulsepoints (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'text',
    text TEXT NOT NULL,
    who TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#c94a4a',
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    song_title TEXT,
    song_artist TEXT,
    spotify_url TEXT,
    youtube_url TEXT,
    image_url TEXT,
    link_url TEXT,
    attribution TEXT
  );

  CREATE TABLE IF NOT EXISTS heart (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name1 TEXT NOT NULL,
    name2 TEXT NOT NULL,
    heart_date TEXT NOT NULL
  );
`);

const existingHeart = db.prepare('SELECT * FROM heart WHERE id = 1').get();
if (!existingHeart) {
  db.prepare('INSERT INTO heart (id, name1, name2, heart_date) VALUES (1, ?, ?, ?)').run(
    process.env.HEART_NAME_1 || 'Name 1',
    process.env.HEART_NAME_2 || 'Name 2',
    process.env.HEART_DATE || 'The beginning'
  );
}

// --- R2 Client ---
let s3 = null;
if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID) {
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  console.log('R2 connected');
} else {
  console.log('R2 not configured — images will be stored locally in data/uploads/');
  const uploadsDir = path.join(__dirname, 'data', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// --- Auth middleware for API (optional — skip if no key set) ---
function apiAuth(req, res, next) {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'pick-any-password-you-want') return next();
  const provided = req.headers['x-api-key'] || req.query.api_key;
  if (provided === apiKey) return next();
  res.status(401).json({ error: 'Invalid API key' });
}

// --- Routes ---

// Heart info
app.get('/api/heart', (req, res) => {
  const heart = db.prepare('SELECT * FROM heart WHERE id = 1').get();
  const count = db.prepare('SELECT COUNT(*) as count FROM pulsepoints').get();
  res.json({ ...heart, pulsepoint_count: count.count });
});

// List all pulsepoints
app.get('/api/pulsepoints', (req, res) => {
  let query = 'SELECT * FROM pulsepoints';
  const params = [];
  const conditions = [];

  if (req.query.type && req.query.type !== 'all') {
    conditions.push('type = ?');
    params.push(req.query.type);
  }
  if (req.query.search) {
    conditions.push('(text LIKE ? OR who LIKE ? OR song_title LIKE ? OR song_artist LIKE ?)');
    const term = `%${req.query.search}%`;
    params.push(term, term, term, term);
  }
  if (req.query.from) {
    conditions.push('created_at >= ?');
    params.push(req.query.from);
  }
  if (req.query.to) {
    conditions.push('created_at <= ?');
    params.push(req.query.to);
  }

  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at ASC';

  const rows = db.prepare(query).all(...params);
  res.json({ pulsepoints: rows, count: rows.length });
});

// Get one pulsepoint
app.get('/api/pulsepoints/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM pulsepoints WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// Add a pulsepoint (with optional image upload)
app.post('/api/pulsepoints', apiAuth, upload.single('image'), async (req, res) => {
  try {
    const id = uuidv4();
    const body = req.body;
    const type = body.type || 'text';
    const text = body.text;
    const who = body.who || 'Anonymous';
    const color = body.color || '#c94a4a';
    const date = body.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let imageUrl = body.image_url || null;

    // handle file upload
    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const key = `pulsepoints/${id}${ext}`;

      if (s3) {
        await s3.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }));
        imageUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
      } else {
        const localPath = path.join(__dirname, 'data', 'uploads', `${id}${ext}`);
        fs.writeFileSync(localPath, req.file.buffer);
        imageUrl = `/uploads/${id}${ext}`;
      }
    }

    db.prepare(`
      INSERT INTO pulsepoints (id, type, text, who, color, date, song_title, song_artist, spotify_url, youtube_url, image_url, link_url, attribution)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, type, text, who, color, date,
      body.song_title || null,
      body.song_artist || null,
      body.spotify_url || null,
      body.youtube_url || null,
      imageUrl,
      body.link_url || null,
      body.attribution || null
    );

    const row = db.prepare('SELECT * FROM pulsepoints WHERE id = ?').get(id);
    res.status(201).json(row);
  } catch (err) {
    console.error('Error adding pulsepoint:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a pulsepoint
app.delete('/api/pulsepoints/:id', apiAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM pulsepoints WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM pulsepoints WHERE id = ?').run(req.params.id);
  res.json({ deleted: true, id: req.params.id });
});

// Serve local uploads
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

app.listen(PORT, () => {
  console.log(`Pulsepoints running at http://localhost:${PORT}`);
});
