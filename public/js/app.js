import {icon,esc,toast,initTheme,stars,api,ACCENTS,getAccent,setAccent} from './core.js';
const $ = id => document.getElementById(id);
let projects = [], openId = null, editing = null, organizing = false, press = null, drag = null, settling = false, lastDrag = 0;

$('out').innerHTML = icon('logout') + 'Sair';
$('add').innerHTML = icon('plus') + 'Novo projeto';
$('done').innerHTML = icon('check') + 'Concluído';
$('addrow').innerHTML = icon('plus') + 'Adicionar página';
$('menu').innerHTML = icon('menu'); $('close').innerHTML = icon('x');
$('reset').innerHTML = icon('reset') + 'Restaurar cor padrão';
$('org').innerHTML = icon('sort') + 'Reorganizar projetos';
initTheme($('theme')); stars();

/* ---------- Menu lateral + aparência ---------- */
const drawer = $('drawer'), scrim = $('scrim');
function menu(open) {
  drawer.classList.toggle('open', open); scrim.classList.toggle('open', open); $('menu').setAttribute('aria-expanded', open);
  (open ? $('close') : $('menu')).focus({preventScroll: true});
}
$('menu').onclick = () => menu(true); $('close').onclick = scrim.onclick = () => menu(false);
$('sw').innerHTML = ACCENTS.map(([k, n]) => `<button class="sw" data-c="${k}" aria-label="${n}" title="${n}">${icon('check')}</button>`).join('');
const markAccent = () => $('sw').querySelectorAll('.sw').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === getAccent()));
$('sw').onclick = e => { const b = e.target.closest('.sw'); if (b) setAccent(b.dataset.c); };
$('reset').onclick = () => { setAccent('blue'); toast('Cor padrão restaurada'); };
document.addEventListener('accentchange', markAccent); markAccent();
$('out').onclick = async () => { await api('/logout', {method:'POST'}); location.href = '/login'; };
$('org').onclick = () => { menu(false); setOrganize(true); };
$('done').onclick = () => setOrganize(false);
addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (drawer.classList.contains('open')) menu(false); else if (organizing && !drag) setOrganize(false); });

/* ---------- Lista ---------- */
function render() {
  $('count').textContent = projects.length ? `${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'}` : '';
  if (!projects.length) { $('grid').innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('star')}<h2>Nenhum projeto ainda</h2><p>Cadastre o primeiro para começar o catálogo.</p></div>`; return; }
  $('grid').innerHTML = projects.map(p => {
    const n = p.pages.length, o = p.id === openId;
    return `<article class="card ${o ? 'open' : ''}" data-id="${p.id}">
      <button class="card-head" aria-expanded="${o}"><span class="folder">${icon('folder')}</span>
        <span class="txt"><h3>${esc(p.name)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ''}</span>
        <span class="badge ${n ? '' : 'none'}">${n} ${n === 1 ? 'página' : 'páginas'}</span></button>
      <div class="panel"><div>
        <ul class="pages">${n ? p.pages.map(g => `<li><span class="t"><b>${esc(g.label)}</b><small>${esc(g.url)}</small></span>
          <a class="btn" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">${icon('out')}Abrir</a></li>`).join('') : '<li><small>Sem páginas vinculadas.</small></li>'}</ul>
        <div class="card-foot"><button class="btn" data-a="edit">${icon('edit')}Editar</button><button class="btn danger" data-a="del">${icon('trash')}Excluir</button></div>
      </div></div></article>`;
  }).join('');
}

$('grid').onclick = e => {
  if (organizing || Date.now() - lastDrag < 400) return;
  const card = e.target.closest('.card'); if (!card) return;
  const p = projects.find(x => x.id === card.dataset.id), a = e.target.closest('[data-a]')?.dataset.a;
  if (a === 'edit') return openForm(p);
  if (a === 'del') return confirmDelete(p);
  if (e.target.closest('.card-head')) {
    const was = card.classList.contains('open');
    document.querySelectorAll('.card.open').forEach(c => { c.classList.remove('open'); c.querySelector('.card-head').setAttribute('aria-expanded', 'false'); });
    if (!was) { card.classList.add('open'); card.querySelector('.card-head').setAttribute('aria-expanded', 'true'); }
    openId = was ? null : p.id;
  }
};
$('grid').addEventListener('contextmenu', e => e.preventDefault());

/* ---------- Reordenar: toque longo → modo organizar (wiggle) → arrastar ---------- */
function setOrganize(on) {
  organizing = on; openId = null; document.body.classList.toggle('organizing', on);
  $('add').hidden = on; $('done').hidden = !on; render();
}
const block = e => e.preventDefault(); // impede o scroll durante o arraste no toque

$('grid').addEventListener('pointerdown', e => {
  const card = e.target.closest('.card'); if (!card || settling || !e.target.closest('.card-head') || (e.pointerType === 'mouse' && e.button)) return;
  press = {card, x: e.clientX, y: e.clientY, id: e.pointerId};
  press.t = setTimeout(() => { navigator.vibrate?.(12); if (!organizing) setOrganize(true); startDrag(); }, organizing ? 130 : 420);
});
document.addEventListener('pointermove', e => {
  if (drag) { drag.px = e.clientX; drag.py = e.clientY; return; }
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) { clearTimeout(press.t); press = null; } // era um scroll
});
const release = () => { if (press) { clearTimeout(press.t); press = null; } if (drag) endDrag(); };
document.addEventListener('pointerup', release); document.addEventListener('pointercancel', release);

function startDrag() {
  if (!press) return;
  const cards = [...$('grid').children], card = cards.find(c => c.dataset.id === press.card.dataset.id); if (!card) return;
  const slots = cards.map(c => { const r = c.getBoundingClientRect(); return {l: r.left + scrollX, t: r.top + scrollY, w: r.width, h: r.height}; });
  const from = cards.indexOf(card);
  drag = {card, cards, slots, from, to: from, px: press.x, py: press.y, x0: press.x + scrollX, y0: press.y + scrollY};
  try { card.setPointerCapture(press.id); } catch {}
  press = null; card.classList.add('dragging'); addEventListener('touchmove', block, {passive: false}); tick();
}
function tick() {
  if (!drag) return;
  const d = drag, X = d.px + scrollX, Y = d.py + scrollY, dx = X - d.x0, dy = Y - d.y0;
  if (d.py < 70) scrollBy(0, -14); else if (d.py > innerHeight - 70) scrollBy(0, 14); // rolagem automática nas bordas
  d.card.style.transform = `translate(${dx}px,${dy}px) scale(1.03)`;
  const s0 = d.slots[d.from], cx = s0.l + s0.w / 2 + dx, cy = s0.t + s0.h / 2 + dy;
  let best = d.to, bd = Infinity;
  d.slots.forEach((s, i) => { const k = Math.hypot(s.l + s.w / 2 - cx, s.t + s.h / 2 - cy); if (k < bd) { bd = k; best = i; } });
  if (best !== d.to) {
    d.to = best; const order = d.cards.map((_, i) => i).filter(i => i !== d.from); order.splice(best, 0, d.from);
    order.forEach((idx, pos) => { if (idx === d.from) return; const a = d.slots[idx], b = d.slots[pos]; d.cards[idx].style.transform = `translate(${b.l - a.l}px,${b.t - a.t}px)`; });
  }
  d.raf = requestAnimationFrame(tick);
}
function endDrag() {
  const d = drag; drag = null; cancelAnimationFrame(d.raf); removeEventListener('touchmove', block);
  const a = d.slots[d.from], b = d.slots[d.to]; settling = true; lastDrag = Date.now();
  d.card.classList.remove('dragging'); d.card.style.transform = `translate(${b.l - a.l}px,${b.t - a.t}px)`; // assenta no lugar
  setTimeout(async () => {
    settling = false; lastDrag = Date.now();
    if (d.from === d.to) return render();
    const [m] = projects.splice(d.from, 1); projects.splice(d.to, 0, m); render();
    try { await api('/projects/order', {method: 'PUT', body: {ids: projects.map(p => p.id)}}); toast('Ordem salva'); }
    catch (x) { toast(x.message); projects = await api('/projects'); render(); }
  }, 260);
}

/* ---------- Formulário e exclusão ---------- */
const row = (g = {label:'', url:''}) => { const d = document.createElement('div'); d.className = 'row';
  d.innerHTML = `<input placeholder="Nome (ex.: Admin)" value="${esc(g.label)}" maxlength="80"><input type="url" inputmode="url" placeholder="https://…" value="${esc(g.url)}" required>
  <button type="button" class="btn icon-btn" aria-label="Remover página">${icon('x')}</button>`;
  d.querySelector('button').onclick = () => d.remove(); return d; };

function openForm(p = null) {
  editing = p; $('dt').textContent = p ? 'Editar projeto' : 'Novo projeto'; $('ferr').textContent = '';
  $('form').name.value = p?.name || ''; $('form').description.value = p?.description || '';
  $('rows').replaceChildren(...(p?.pages.length ? p.pages : [undefined]).map(g => row(g)));
  $('dlg').showModal();
}
$('add').onclick = () => openForm();
$('addrow').onclick = () => $('rows').append(row());
$('cancel').onclick = () => $('dlg').close();

$('form').onsubmit = async e => {
  e.preventDefault();
  const f = $('form'), pages = [...$('rows').children].map(r => { const [l, u] = r.querySelectorAll('input'); return {label: l.value, url: u.value}; }).filter(x => x.url.trim());
  try {
    const body = {name: f.name.value, description: f.description.value, pages};
    if (editing) { const u = await api('/projects/' + editing.id, {method:'PUT', body}); projects = projects.map(x => x.id === u.id ? u : x); toast('Projeto atualizado'); }
    else { const c = await api('/projects', {method:'POST', body}); projects.push(c); openId = c.id; toast('Projeto criado'); }
    $('dlg').close(); render();
  } catch (x) { $('ferr').textContent = x.message; }
};

function confirmDelete(p) {
  $('cm').textContent = `“${p.name}” e suas ${p.pages.length} páginas serão removidos do catálogo.`;
  $('conf').showModal();
  $('conf').onclose = async () => {
    if ($('conf').returnValue !== 'yes') return;
    try { await api('/projects/' + p.id, {method:'DELETE'}); projects = projects.filter(x => x.id !== p.id); render(); toast('Projeto excluído'); } catch (x) { toast(x.message); }
  };
}
api('/projects').then(l => { projects = l; render(); }).catch(x => toast(x.message));
