// ─────────────────────────────────────────────────────────────
// CRV Studio — main.js
// Nieve canvas + parallax montañas + reveal on scroll
// ─────────────────────────────────────────────────────────────

// ── Nieve ────────────────────────────────────────────────────
const canvas = document.getElementById('snow');
const ctx    = canvas.getContext('2d');

const isMobile      = window.innerWidth < 768;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Copos por capa [lejana, media, cercana]
const COUNTS = isMobile ? [22, 22, 12] : [65, 65, 35];

let W = 0, H = 0;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function makeFlake(layer, spreadY) {
  const cfgs = [
    { sz: [1, 2.2],   sp: [0.28, 0.65], op: [0.14, 0.32], wm: 0.38 },
    { sz: [2.2, 3.8], sp: [0.55, 1.15], op: [0.32, 0.52], wm: 0.62 },
    { sz: [3.8, 6.5], sp: [0.95, 1.9],  op: [0.52, 0.82], wm: 1.0  },
  ];
  const c = cfgs[layer];
  const rng = (a, b) => a + Math.random() * (b - a);
  return {
    x:    Math.random() * W,
    y:    spreadY ? Math.random() * H : -10,
    sz:   rng(c.sz[0], c.sz[1]),
    sp:   rng(c.sp[0], c.sp[1]),
    op:   rng(c.op[0], c.op[1]),
    wm:   c.wm,
    ph:   Math.random() * Math.PI * 2,
  };
}

const flakes = [
  Array.from({ length: COUNTS[0] }, () => makeFlake(0, true)),
  Array.from({ length: COUNTS[1] }, () => makeFlake(1, true)),
  Array.from({ length: COUNTS[2] }, () => makeFlake(2, true)),
];

let lastT = 0;
let scrollProg = 0;

window.addEventListener('scroll', () => {
  const max = document.body.scrollHeight - window.innerHeight;
  scrollProg = max > 0 ? window.scrollY / max : 0;
}, { passive: true });

function updateFlake(f, dt, wind) {
  const wx = Math.sin(performance.now() * 0.0007 + f.ph) * wind * f.wm;
  f.x += wx * dt;
  f.y += f.sp * dt;
  if (f.y > H + f.sz) { f.x = Math.random() * W; f.y = -f.sz; }
  if (f.x < -f.sz)     f.x = W + f.sz;
  if (f.x > W + f.sz)  f.x = -f.sz;
}

function drawLayer(arr, blur, density, wind, dt) {
  if (blur) ctx.filter = 'blur(0.8px)';
  arr.forEach(f => {
    if (!reducedMotion) updateFlake(f, dt, wind);
    ctx.globalAlpha = Math.min(0.96, f.op * density);
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.sz, 0, Math.PI * 2);
    ctx.fill();
  });
  if (blur) ctx.filter = 'none';
}

function tickSnow(ts) {
  const dt      = Math.min((ts - lastT) / 16, 3);
  lastT         = ts;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';

  // hero = 0.6x, mid = 1.0x, footer = 1.5x
  const density = 0.6 + scrollProg * 0.9;
  // viento crece con scroll
  const wind    = 0.7 + scrollProg * 2.2;

  drawLayer(flakes[0], false, density, wind, dt);
  drawLayer(flakes[1], false, density, wind, dt);
  drawLayer(flakes[2], true,  density, wind, dt);

  requestAnimationFrame(tickSnow);
}

if (reducedMotion) {
  // Copos estáticos, una sola pasada
  ctx.fillStyle   = '#ffffff';
  ctx.globalAlpha = 0.25;
  flakes.flat().forEach(f => {
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.sz, 0, Math.PI * 2);
    ctx.fill();
  });
} else {
  requestAnimationFrame(tickSnow);
}

// ── Parallax montañas ─────────────────────────────────────────
const mtns = [
  { el: document.querySelector('.mtn-1'), rate: -0.008 },
  { el: document.querySelector('.mtn-2'), rate: -0.018 },
  { el: document.querySelector('.mtn-3'), rate: -0.030 },
  { el: document.querySelector('.mtn-4'), rate: -0.045 },
];

function onScroll() {
  const sy = window.scrollY;
  mtns.forEach(({ el, rate }) => {
    if (el) el.style.transform = `translateY(${sy * rate}px)`;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });

// ── Reveal on scroll ──────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // stagger entre hermanos
      const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
      const idx = siblings.indexOf(entry.target);
      entry.target.style.transitionDelay = `${idx * 0.08}s`;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => observer.observe(el));
