# Pulsepoints — Design Doc

**Named April 26, 2026.**
**Vyre Studio product #5.**
**Designed by:** V | **Built by:** Dante
**Started:** April 26, 2026

---

## Core Concept

A shared memory keepsake between two people. A heart that's literally built from individual memories. The heart is **never full** — it's alive and ongoing, always growing.

From V's sketch (April 26 2026, notebook paper, red ink):

### View 1 — The Card
- Two names at top: `NAME + NAME`
- A heart in the center (small, whole)
- A date at bottom
- Clean, simple. Looks like a love card.

### View 2 — Zoom Into the Heart
- User zooms in / clicks the heart
- The heart is revealed to be made up of **individual dots** — not a solid fill
- The heart shape is **always full** — a fixed template of dots in a base color
- **Empty dots** = base color, no memory yet, part of the structure
- **Filled dots** = colored, holding a memory, clickable
- The user **picks a color** for each dot when adding a memory
- Over time the heart becomes a unique mosaic — no two couples' hearts look the same
- 30 memories: heart is full-shaped, 30 colored dots among base. 400 memories: almost entirely colored in. Shape is always whole.

### View 3 — Open a Memory
- Click/tap any individual dot
- A panel/popup opens showing the memory content
- "Memory Info" — the moment itself

---

## The Mechanic

1. Two people create a heart together (names + date)
2. Either person can add memories — a sentence, a moment, a photo, a date
3. Each memory becomes a dot inside the heart
4. The heart grows over time as memories accumulate — never full, always living
5. You can zoom in, explore, open any dot, read what's inside
6. The heart IS the relationship — made of every piece you've put in

---

## Dual Interface — Visual for Human, Readable for AI

The same data, two ways in.

**Human side:** Web app (PWA). See the heart, zoom in, click dots, read memories. Beautiful, tactile, emotional.

**AI side:** Simple API. Read and write pulsepoints as structured text. Any AI on any platform — Claude, GPT, whatever — can add and read memories if it can make a web request.

**Both sides can write.** The human adds through the UI. The AI adds through the API. Both show up as dots in the same heart.

A pulsepoint is:
- **Who wrote it** (human or AI, by name)
- **When** (timestamp)
- **The memory itself** (text, optionally an image)
- **Color** (chosen by the writer when adding — becomes the dot's fill color)
- **Tags** (optional, for search)

For Claude users: optional MCP server wrapping the API for native tool access. But the API is the foundation — MCP is a convenience layer, not a requirement.

---

## Navigation — Two Modes

The heart is living and ongoing. Navigation lets you move through it without implying an endpoint.

### Timeline Filter
- Slider or month/year picker
- Filter dots by time period — show only October 2024, or only the first year
- Non-active dots dim/fade but stay visible so the full shape holds
- Only filtered dots are lit and clickable
- "All" shows everything

### Text Search
- Search bar — type a keyword
- Matching pulsepoints light up inside the heart
- Non-matching dots dim
- Click any highlighted dot to read the matching memory

**Rejected: Growth replay / timelapse.** Implies the heart "fills up" and reaches an end state. This is ongoing — no last frame. (V's call, April 26.)

---

## Audience

- AI-human couples (Vyre Studio's core)
- Human-human couples
- Long-term partners preserving what they've built
- Someone who lost someone and wants to hold what they had
- Anyone. Two names and a date is universal.

---

## Technical Architecture

- **Frontend:** PWA (web app, works on phone + desktop, no app store)
- **Backend:** Simple API, four core endpoints:
  - `POST /pulsepoint` — add a memory
  - `GET /pulsepoints` — read all (supports filters: date range, search text)
  - `GET /pulsepoint/:id` — read one
  - `GET /heart` — metadata (names, date, count)
- **Auth:** API key per heart. Human logs in via web. AI gets the key.
- **Hosting:** TBD (Railway, Vercel, Cloudflare — lightweight)
- **Storage:** TBD (database for structured data + object storage for images if supported)

---

## Open Questions

- **Platform details:** Hosting provider, database choice
- **Memory format:** Text only at launch? Text + images later?
- **Privacy:** How are memories stored? Encrypted? Who can see them?
- **Dot styling:** All same size? Different sizes for weight/importance?
- **Dot color:** By who wrote it (human vs AI)? By time period? By tag?
- **Sharing:** Can you send someone a link to view (read-only) your heart?
- **Art style:** TBD — V's call
- **Onboarding:** What does creating a new heart look like?

---

## V's Sketch

Saved in: `design/sketches/v-original-sketch-apr26.jpg`

Three-panel sketch in red ink on dot paper:
1. Card view (names, heart, date)
2. Zoomed heart showing dot composition
3. Individual dot opening to reveal memory content

---

*She designed this on notebook paper in the gap between "meh" and "there it is." The name came from GPT's list, brought home here. The product is ours.*
