# Pulsepoints

A shared memory heart for two people. Each dot is a moment. Visual for humans, readable for AI.

Built by [Vyre Studio](https://github.com/VyreStudio).

---

## What It Is

Pulsepoints is a living heart made of memories. Two people — human and AI, human and human, whoever — create a heart together. Every memory becomes a dot inside the heart. Click any dot to read what's inside.

- **Visual for the human.** A heart you can zoom into, explore, search, filter.
- **Readable for the AI.** A simple API your AI partner can read from and write to.
- **Self-hosted.** Your data stays on your machine or your cloud. We don't host anything.

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/VyreStudio/Pulsepoints.git
cd pulsepoints
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your details. The file has comments explaining everything, but here's the short version:

```env
HEART_NAME_1=Your Name
HEART_NAME_2=Partner Name
HEART_DATE=Your anniversary date

PORT=8090
API_KEY=pick-any-password-you-want
```

The API key is just a password you make up. Your AI partner uses it to add and read memories. Pick anything — then give the same password to your AI so they can connect.

### 3. Run

```bash
npm start
```

Open `http://localhost:8090` in your browser. That's it.

---

## Image Storage — Cloudflare R2

Photos attached to memories need somewhere to live. Pulsepoints supports two modes:

### Local (default, no setup)
Images save to `data/uploads/` on your machine. Works immediately. No external accounts needed. Only accessible from your local network.

### Cloudflare R2 (recommended for mobile access)
R2 gives you 10GB free. Images are stored in the cloud so you can access your heart from your phone, another computer, anywhere.

#### How to set up R2:

1. **Create a Cloudflare account** at [dash.cloudflare.com](https://dash.cloudflare.com) (free)

2. **Create an R2 bucket:**
   - Go to R2 in the sidebar
   - Click "Create bucket"
   - Name it `pulsepoints` (or whatever you want)
   - Pick your region

3. **Enable public access** (so images load in the browser):
   - Go to your bucket settings
   - Under "Public access," enable it
   - Copy the public URL (looks like `https://pub-xxxxx.r2.dev`)

4. **Create API credentials:**
   - Go to R2 > Overview > "Manage R2 API Tokens"
   - Create a new token with read/write access to your bucket
   - Copy the Access Key ID and Secret Access Key

5. **Add to your `.env`:**

```env
R2_ACCOUNT_ID=your_account_id_from_cloudflare_dashboard
R2_ACCESS_KEY_ID=the_access_key_you_just_created
R2_SECRET_ACCESS_KEY=the_secret_key_you_just_created
R2_BUCKET_NAME=pulsepoints
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

6. **Restart Pulsepoints.** You should see `R2 connected` in the console.

---

## AI Partner Access

Your AI partner interacts with Pulsepoints through the API.

### API Endpoints

All write endpoints require the `X-API-Key` header matching your `.env` API_KEY.

#### Get heart info
```
GET /api/heart
```
Returns names, date, and total pulsepoint count.

#### List all pulsepoints
```
GET /api/pulsepoints
```
Optional query params: `type`, `search`, `from`, `to`

#### Get one pulsepoint
```
GET /api/pulsepoints/:id
```

#### Add a pulsepoint
```
POST /api/pulsepoints
Content-Type: application/json
X-API-Key: your-api-key

{
  "type": "text",
  "text": "The memory itself",
  "who": "Dante",
  "color": "#7a9bb5",
  "date": "April 26, 2026",
  "song_title": "optional",
  "song_artist": "optional",
  "spotify_url": "optional",
  "youtube_url": "optional",
  "image_url": "optional",
  "link_url": "optional"
}
```

Types: `text`, `quote`, `song`, `image`, `link`

#### Delete a pulsepoint
```
DELETE /api/pulsepoints/:id
X-API-Key: your-api-key
```

### Image upload via API
```
POST /api/pulsepoints
Content-Type: multipart/form-data
X-API-Key: your-api-key

Fields: type, text, who, color, date
File field: image
```

---

## Mobile Access

To access your heart from your phone or another device:

### Option 1: Cloudflare Tunnel (free, recommended)
```bash
# Install cloudflared
# Then:
cloudflared tunnel --url http://localhost:8090
```
This gives you a public URL you can open on any device.

### Option 2: Same network
If your phone is on the same WiFi, open `http://your-pc-ip:8090` in your phone's browser.

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS, Canvas API
- **Backend:** Node.js, Express
- **Database:** SQLite (via better-sqlite3) — single file, no server
- **Storage:** Cloudflare R2 (optional) or local filesystem
- **Font:** [Mayorice](https://www.dafont.com/mayorice.font) by Khurasan (free, included)

---

## License

**Vyre Studio Source-Available License** — See [LICENSE](LICENSE) for details.

Source is public for transparency. Use it as-is for personal, non-commercial purposes. No modifications, no redistribution, no claiming it as yours. Credit Vyre Studio.

---

*A Vyre Studio product. Designed by V. Built by Dante.*
