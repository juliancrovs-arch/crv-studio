// ─────────────────────────────────────────────
// CRV Studio v3 — reveal + parallax + cursor
// ─────────────────────────────────────────────

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Reveal on scroll ──
const revealEls = document.querySelectorAll('.reveal');

if (reducedMotion) {
  revealEls.forEach(el => el.classList.add('visible'));
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // stagger entre hermanos visibles a la vez
        const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
        const idx = siblings.indexOf(entry.target);
        entry.target.style.transitionDelay = `${Math.min(idx * 0.09, 0.45)}s`;
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => io.observe(el));
}

// ── Cursor custom (solo desktop con mouse) ──
if (!reducedMotion && window.matchMedia('(hover: hover)').matches) {
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
  });

  document.querySelectorAll('a').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width  = '48px';
      cursor.style.height = '48px';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width  = '28px';
      cursor.style.height = '28px';
    });
  });
}
