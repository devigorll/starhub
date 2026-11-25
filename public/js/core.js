const P = {
  star:'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  folder:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  out:'<path d="M15 4h5v5M20 4l-9 9M18 14v5H5V6h5"/>', logout:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon:'<path d="M20 14A8 8 0 1110 4a7 7 0 0010 10z"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>'
};
export const icon = n => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}
export function initTheme(btn) {
  const set = t => { document.documentElement.dataset.theme = t; try { localStorage.setItem('sh-theme', t); } catch {} if (btn) { btn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); btn.setAttribute('aria-label', t === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'); } };
  set(document.documentElement.dataset.theme || 'light');
  btn?.addEventListener('click', () => set(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
}
// Estrelas: 3 camadas (tamanhos/velocidades distintas) com box-shadow; a cor segue o tema via --star
export function stars() {
  const el = document.getElementById('space'); if (!el) return;
  [[1,90,120],[2,45,80],[3,18,50]].forEach(([size, n, dur]) => {
    const i = document.createElement('i');
    i.style.cssText = `width:${size}px;height:${size}px;animation-duration:${dur*3}s;background:transparent;box-shadow:` +
      Array.from({length: n * 2}, (_, k) => `${(Math.random()*100).toFixed(1)}vw ${(k % 2 ? 2000 : 0) + Math.random()*2000 % 2000}px rgb(var(--star) / ${(.35+Math.random()*.65).toFixed(2)})`).join(',');
    el.append(i);
  });
}
export async function api(path, opts = {}) {
  const r = await fetch('/api' + path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json' }, body: opts.body && JSON.stringify(opts.body) });
  if (r.status === 401 && path !== '/login') location.href = '/login';
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Algo deu errado.');
  return d;
}
