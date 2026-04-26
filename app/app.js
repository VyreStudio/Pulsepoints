const canvas = document.getElementById('heart-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const controls = document.getElementById('controls');
const memoryPanel = document.getElementById('memory-panel');
const searchInput = document.getElementById('search-input');
const namesEl = document.getElementById('names');
const dateEl = document.getElementById('date');

const BASE_COLOR = 'rgba(201, 184, 168, 0.15)';
const DPR = window.devicePixelRatio || 1;

let dots = [];
let stars = [];
let zoomed = false;
let scale = 1;
let targetScale = 1;
let offsetX = 0;
let offsetY = 0;
let targetOffsetX = 0;
let targetOffsetY = 0;
let dragging = false;
let dragStart = { x: 0, y: 0 };
let dragOffset = { x: 0, y: 0 };
let searchTerm = '';
let time = 0;
let namesOpacity = 1;
let targetNamesOpacity = 1;
let heartCenterX = 0;
let heartCenterY = 0;

const MEMORY_TYPES = {
  text: { label: "Memory", icon: "💭" },
  image: { label: "Photo", icon: "📸" },
  song: { label: "Song", icon: "🎵" },
  voice: { label: "Voice", icon: "🎙️" },
  quote: { label: "Quote", icon: "✨" },
  link: { label: "Link", icon: "🔗" },
};

const sampleMemories = [];

function heartX(t) {
  return 16 * Math.pow(Math.sin(t), 3);
}

function heartY(t) {
  return -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
}

function generateStars() {
  stars = [];
  const w = canvas.width / DPR;
  const h = canvas.height / DPR;
  const count = 200;

  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      baseRadius: 0.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 1.2,
      maxAlpha: 0.5 + Math.random() * 0.5,
    });
  }
}

function generateDots() {
  dots = [];
  const totalDots = 300;
  const w = canvas.width / DPR;
  const h = canvas.height / DPR;
  const cx = w / 2;
  const cy = h / 2;
  heartCenterX = cx;
  heartCenterY = cy;
  const scaleH = Math.min(w, h) * 0.013;
  const minDist = scaleH * 1.1;

  let placed = 0;
  let attempts = 0;

  while (placed < totalDots && attempts < 50000) {
    const t = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random());
    const hx = heartX(t) * r;
    const hy = heartY(t) * r;
    const px = cx + hx * scaleH;
    const py = cy + hy * scaleH;

    let tooClose = false;
    for (let i = 0; i < dots.length; i++) {
      const dx = dots[i].baseX - px;
      const dy = dots[i].baseY - py;
      if (dx * dx + dy * dy < minDist * minDist) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      const memoryIndex = placed < sampleMemories.length ? placed : -1;
      const baseRadius = scaleH * 0.32 + Math.random() * scaleH * 0.12;
      dots.push({
        x: px,
        y: py,
        baseX: px,
        baseY: py,
        radius: baseRadius,
        baseRadius: baseRadius,
        filled: memoryIndex >= 0,
        memoryIndex: memoryIndex,
        color: memoryIndex >= 0 ? sampleMemories[memoryIndex].color : BASE_COLOR,
        highlight: false,
        phase: Math.random() * Math.PI * 2,
        driftPhaseX: Math.random() * Math.PI * 2,
        driftPhaseY: Math.random() * Math.PI * 2,
        pulseSpeed: 0.3 + Math.random() * 0.4,
        driftSpeed: 0.15 + Math.random() * 0.2,
        driftAmount: 0.8 + Math.random() * 1.2,
      });
      placed++;
    }
    attempts++;
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function draw() {
  time += 0.016;

  scale = lerp(scale, targetScale, 0.05);
  offsetX = lerp(offsetX, targetOffsetX, 0.05);
  offsetY = lerp(offsetY, targetOffsetY, 0.05);
  namesOpacity = lerp(namesOpacity, targetNamesOpacity, 0.06);

  namesEl.style.opacity = namesOpacity;
  dateEl.style.opacity = namesOpacity;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(DPR, DPR);

  // starfield background — fixed, doesn't move with zoom
  for (const star of stars) {
    const pulse = Math.sin(time * star.speed + star.phase);
    const alpha = star.maxAlpha * (0.1 + 0.9 * Math.max(0, pulse));
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201, 184, 168, ${alpha})`;
    ctx.fill();
  }

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (const dot of dots) {
    const pulse = Math.sin(time * dot.pulseSpeed + dot.phase);
    dot.radius = dot.baseRadius + pulse * (dot.filled ? 0.8 : 0.3);
    dot.x = dot.baseX + Math.sin(time * dot.driftSpeed + dot.driftPhaseX) * dot.driftAmount;
    dot.y = dot.baseY + Math.cos(time * dot.driftSpeed * 0.7 + dot.driftPhaseY) * dot.driftAmount;

    ctx.beginPath();
    ctx.arc(dot.x, dot.y, Math.max(0.5, dot.radius), 0, Math.PI * 2);

    if (searchTerm && dot.filled && dot.highlight) {
      ctx.fillStyle = dot.color;
      ctx.globalAlpha = 1;
      ctx.shadowColor = dot.color;
      ctx.shadowBlur = 14;
    } else if (searchTerm && !dot.highlight) {
      ctx.fillStyle = dot.filled ? dot.color : BASE_COLOR;
      ctx.globalAlpha = 0.12;
      ctx.shadowBlur = 0;
    } else if (dot.filled) {
      ctx.fillStyle = dot.color;
      ctx.globalAlpha = 0.7 + pulse * 0.15;
      ctx.shadowColor = dot.color;
      ctx.shadowBlur = zoomed ? 6 + pulse * 3 : 3;
    } else {
      ctx.fillStyle = BASE_COLOR;
      ctx.globalAlpha = zoomed ? 0.3 + pulse * 0.05 : 0.55 + pulse * 0.1;
      ctx.shadowBlur = 0;
    }

    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  ctx.restore();
  ctx.restore();
  requestAnimationFrame(draw);
}

function resize() {
  canvas.width = window.innerWidth * DPR;
  canvas.height = window.innerHeight * DPR;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}

function zoomIn() {
  zoomed = true;
  targetScale = 3.5;
  const w = window.innerWidth;
  const h = window.innerHeight;
  targetOffsetX = w / 2 - heartCenterX * targetScale;
  targetOffsetY = h / 2 - heartCenterY * targetScale;
  targetNamesOpacity = 0;
  controls.classList.remove('hidden');
  canvas.style.cursor = 'grab';
}

function zoomOut() {
  zoomed = false;
  targetScale = 1;
  targetOffsetX = 0;
  targetOffsetY = 0;
  targetNamesOpacity = 1;
  searchTerm = '';
  searchInput.value = '';
  controls.classList.add('hidden');
  document.getElementById('search-bar').classList.add('hidden');
  dots.forEach(d => d.highlight = false);
  canvas.style.cursor = 'pointer';
}

function getMousePos(e) {
  return {
    x: (e.clientX - offsetX) / scale,
    y: (e.clientY - offsetY) / scale
  };
}

function findDot(mx, my) {
  const hitRadius = 6 / scale;
  for (let i = dots.length - 1; i >= 0; i--) {
    const d = dots[i];
    const dx = d.x - mx;
    const dy = d.y - my;
    if (dx * dx + dy * dy < (d.radius + hitRadius) * (d.radius + hitRadius)) {
      return d;
    }
  }
  return null;
}

canvas.addEventListener('click', (e) => {
  if (dragMoved) return;

  if (!zoomed) {
    zoomIn();
    return;
  }

  const pos = getMousePos(e);
  const dot = findDot(pos.x, pos.y);
  if (!dot || !dot.filled) {
    zoomOut();
    return;
  }
  if (dot && dot.filled && dot.memoryIndex >= 0) {
    const mem = sampleMemories[dot.memoryIndex];
    const typeInfo = MEMORY_TYPES[mem.type] || MEMORY_TYPES.text;

    let contentHTML = '';
    contentHTML += `<div class="memory-date">${mem.date}</div>`;
    contentHTML += `<div class="memory-type-badge">${typeInfo.icon} ${typeInfo.label}</div>`;

    if (mem.type === 'image') {
      if (mem.imageUrl) contentHTML += `<img class="memory-image" src="${mem.imageUrl}" alt="memory">`;
      contentHTML += `<div class="memory-text">${mem.text}</div>`;
    } else if (mem.type === 'song') {
      contentHTML += `<div class="memory-song-info"><div class="memory-song-title">${mem.songTitle || ''}</div><div class="memory-song-artist">${mem.songArtist || ''}</div></div>`;
      contentHTML += `<div class="memory-text">${mem.text}</div>`;
      contentHTML += `<div class="memory-links">`;
      if (mem.spotifyUrl) contentHTML += `<a href="${mem.spotifyUrl}" target="_blank" class="memory-link spotify">&#9654; Spotify</a>`;
      if (mem.youtubeUrl) contentHTML += `<a href="${mem.youtubeUrl}" target="_blank" class="memory-link youtube">&#9654; YouTube</a>`;
      contentHTML += `</div>`;
    } else if (mem.type === 'quote') {
      contentHTML += `<div class="memory-text" style="font-style:italic; border-left: 2px solid rgba(201,184,168,0.3); padding-left: 16px;">${mem.text}</div>`;
      if (mem.attribution) contentHTML += `<div class="memory-caption">— ${mem.attribution}</div>`;
    } else if (mem.type === 'link') {
      contentHTML += `<div class="memory-text">${mem.text}</div>`;
      if (mem.url) contentHTML += `<div class="memory-links"><a href="${mem.url}" target="_blank" class="memory-link generic">Open Link</a></div>`;
    } else {
      contentHTML += `<div class="memory-text">${mem.text}</div>`;
    }

    contentHTML += `<div class="memory-created-by">Created by ${mem.who}</div>`;

    document.getElementById('memory-who').textContent = '';
    document.getElementById('memory-date').textContent = '';
    document.getElementById('memory-text').innerHTML = contentHTML;
    memoryPanel.classList.remove('hidden');
  }
});

let dragMoved = false;
canvas.addEventListener('mousedown', (e) => {
  if (!zoomed) return;
  dragging = true;
  dragMoved = false;
  dragStart = { x: e.clientX, y: e.clientY };
  dragOffset = { x: targetOffsetX, y: targetOffsetY };
  canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
  if (!dragging) {
    if (zoomed) {
      const pos = getMousePos(e);
      const dot = findDot(pos.x, pos.y);
      canvas.style.cursor = (dot && dot.filled) ? 'pointer' : 'grab';
    }
    return;
  }
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
  targetOffsetX = dragOffset.x + dx;
  targetOffsetY = dragOffset.y + dy;
  offsetX = targetOffsetX;
  offsetY = targetOffsetY;
});

canvas.addEventListener('mouseup', () => {
  dragging = false;
  if (zoomed) canvas.style.cursor = 'grab';
  setTimeout(() => { dragMoved = false; }, 50);
});

canvas.addEventListener('click', (e) => {
  if (dragMoved) { e.stopImmediatePropagation(); }
}, true);

canvas.addEventListener('wheel', (e) => {
  if (!zoomed) return;
  e.preventDefault();
  const zoomSpeed = 0.001;
  const newScale = Math.max(1.5, Math.min(8, targetScale - e.deltaY * zoomSpeed * targetScale));

  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const worldX = (mouseX - targetOffsetX) / targetScale;
  const worldY = (mouseY - targetOffsetY) / targetScale;

  targetScale = newScale;
  targetOffsetX = mouseX - worldX * newScale;
  targetOffsetY = mouseY - worldY * newScale;
}, { passive: false });

const searchBar = document.getElementById('search-bar');
document.getElementById('search-toggle').addEventListener('click', () => {
  searchBar.classList.toggle('hidden');
  if (!searchBar.classList.contains('hidden')) searchInput.focus();
});
document.getElementById('search-close').addEventListener('click', () => {
  searchBar.classList.add('hidden');
  searchTerm = '';
  searchInput.value = '';
  typeFilter = 'all';
  typeFilterEl.value = 'all';
  dots.forEach(d => d.highlight = false);
});

document.getElementById('close-panel').addEventListener('click', () => {
  memoryPanel.classList.add('hidden');
});

memoryPanel.addEventListener('click', (e) => {
  if (e.target === memoryPanel) memoryPanel.classList.add('hidden');
});

// --- Add Memory Panel ---
const addPanel = document.getElementById('add-panel');
const addType = document.getElementById('add-type');
let selectedColor = '#c94a4a';

document.getElementById('add-btn').addEventListener('click', () => {
  addPanel.classList.remove('hidden');
});

document.getElementById('close-add').addEventListener('click', () => {
  addPanel.classList.add('hidden');
});


addType.addEventListener('change', () => {
  document.getElementById('song-fields').style.display = 'none';
  document.getElementById('image-fields').style.display = 'none';
  document.getElementById('link-fields').style.display = 'none';
  if (addType.value === 'song') document.getElementById('song-fields').style.display = 'block';
  if (addType.value === 'image') document.getElementById('image-fields').style.display = 'block';
  if (addType.value === 'link') document.getElementById('link-fields').style.display = 'block';
});

document.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    swatch.classList.add('selected');
    selectedColor = swatch.dataset.color;
  });
});

document.getElementById('add-custom-color').addEventListener('input', (e) => {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  selectedColor = e.target.value;
});

document.getElementById('add-submit').addEventListener('click', () => {
  const type = addType.value;
  const who = document.getElementById('add-who').value || 'Anonymous';
  const text = document.getElementById('add-text').value;
  if (!text.trim()) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const newMemory = { type, text, who, date: dateStr, color: selectedColor };

  if (type === 'song') {
    newMemory.songTitle = document.getElementById('add-song-title').value;
    newMemory.songArtist = document.getElementById('add-song-artist').value;
    newMemory.spotifyUrl = document.getElementById('add-spotify').value;
    newMemory.youtubeUrl = document.getElementById('add-youtube').value;
  } else if (type === 'image') {
    newMemory.imageUrl = document.getElementById('add-image-url').value;
  } else if (type === 'link') {
    newMemory.url = document.getElementById('add-link-url').value;
  }

  sampleMemories.push(newMemory);
  const emptyDot = dots.find(d => !d.filled);
  if (emptyDot) {
    emptyDot.filled = true;
    emptyDot.memoryIndex = sampleMemories.length - 1;
    emptyDot.color = selectedColor;
  }

  addPanel.classList.add('hidden');
  document.getElementById('add-text').value = '';
  document.getElementById('add-who').value = '';
  document.getElementById('add-song-title').value = '';
  document.getElementById('add-song-artist').value = '';
  document.getElementById('add-spotify').value = '';
  document.getElementById('add-youtube').value = '';
  document.getElementById('add-image-url').value = '';
  document.getElementById('add-link-url').value = '';
});

let typeFilter = 'all';

const typeFilterEl = document.getElementById('type-filter');
typeFilterEl.addEventListener('change', () => {
  typeFilter = typeFilterEl.value;
  applyFilters();
});

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value.toLowerCase();
  applyFilters();
});

function applyFilters() {
  dots.forEach(d => {
    if (!d.filled || d.memoryIndex < 0) {
      d.highlight = false;
      return;
    }
    const mem = sampleMemories[d.memoryIndex];
    let matchesType = typeFilter === 'all' || mem.type === typeFilter;
    let matchesSearch = !searchTerm ||
      mem.text.toLowerCase().includes(searchTerm) ||
      mem.who.toLowerCase().includes(searchTerm) ||
      mem.date.toLowerCase().includes(searchTerm) ||
      (mem.songTitle && mem.songTitle.toLowerCase().includes(searchTerm)) ||
      (mem.songArtist && mem.songArtist.toLowerCase().includes(searchTerm));
    d.highlight = matchesType && matchesSearch;
  });
  // activate search-style rendering when any filter is on
  if (typeFilter !== 'all') searchTerm = searchTerm || ' ';
}

window.addEventListener('resize', () => {
  resize();
  generateStars();
  generateDots();
  if (!zoomed) {
    targetOffsetX = 0;
    targetOffsetY = 0;
    offsetX = 0;
    offsetY = 0;
  }
});

resize();
generateStars();
generateDots();
draw();
