const P = {
  star:'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  folder:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  out:'<path d="M15 4h5v5M20 4l-9 9M18 14v5H5V6h5"/>', logout:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon:'<path d="M20 14A8 8 0 1110 4a7 7 0 0010 10z"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>', check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', sort:'<path d="M8 4v16M8 4L5 7M8 4l3 3M16 20V4M16 20l-3-3M16 20l3-3"/>', reset:'<path d="M4 12a8 8 0 108-8H7M7 4L4.5 6.5 7 9"/>'
};
export const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}
export function initTheme(btn) {
  const set = t => {
    document.documentElement.dataset.theme = t; try { localStorage.setItem('sh-theme', t); } catch {}
    if (btn) { btn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); btn.setAttribute('aria-label', t === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'); }
    document.dispatchEvent(new Event('themechange'));
  };
  set(document.documentElement.dataset.theme || 'light');
  btn?.addEventListener('click', () => set(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
}
// Estrelas: um canvas com altura 2x, desenhado só ao carregar, ao mudar a largura ou o tema.
// A mesma posição das estrelas se repete na 2ª metade, então a deriva em CSS (translateY -50%) fecha sem emenda.
export function stars() {
  const c = document.getElementById('space'); if (!c) return;
  const ctx = c.getContext('2d'); let W = 0, pts = [];
  const seed = () => { const n = Math.min(260, Math.round(innerWidth * innerHeight / 9000) + 40);
    pts = Array.from({length: n}, () => ({x: Math.random(), y: Math.random(), r: Math.random() < .85 ? .6 : Math.random() < .8 ? 1 : 1.4, a: .3 + Math.random() * .7})); };
  const draw = () => {
    const d = Math.min(devicePixelRatio || 1, 1.5), w = innerWidth, h = Math.max(innerHeight, screen.height || 0);
    c.width = w * d; c.height = h * 2 * d; c.style.height = h * 2 + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0);
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--star').trim().split(/\s+/).join(',');
    for (const p of pts) { ctx.fillStyle = `rgba(${rgb},${p.a})`; for (const o of [0, h]) { ctx.beginPath(); ctx.arc(p.x * w, p.y * h + o, p.r, 0, 6.2832); ctx.fill(); } }
  };
  seed(); W = innerWidth; draw();
  document.addEventListener('themechange', draw);
  let t; addEventListener('resize', () => { if (innerWidth === W) return; clearTimeout(t); t = setTimeout(() => { W = innerWidth; draw(); }, 200); }); // ignora a barra do navegador no celular
}

export async function api(path, opts = {}) {
  const r = await fetch('/api' + path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json' }, body: opts.body && JSON.stringify(opts.body) });
  if (r.status === 401 && path !== '/login') location.href = '/login';
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Algo deu errado.');
  return d;
}

// Cores de destaque (valores ficam só no CSS, em [data-accent=...])
export const ACCENTS = [['blue','Azul'],['red','Vermelho'],['green','Verde'],['purple','Roxo'],['orange','Laranja'],['pink','Rosa'],['graphite','Grafite']];
export const getAccent = () => document.documentElement.dataset.accent || 'blue';
export function setAccent(n) {
  document.documentElement.dataset.accent = n; try { localStorage.setItem('sh-accent', n); } catch {}
  document.dispatchEvent(new Event('accentchange'));
}
