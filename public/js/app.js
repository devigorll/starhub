import {icon,esc,toast,initTheme,stars,api} from './core.js';
const $ = id => document.getElementById(id);
let projects = [], openId = null, editing = null;
$('brand').innerHTML = icon('star') + 'StarHub';
$('out').innerHTML = icon('logout') + 'Sair';
$('add').innerHTML = icon('plus') + 'Novo projeto';
$('addrow').innerHTML = icon('plus') + 'Adicionar página';
initTheme($('theme')); stars();
$('out').onclick = async () => { await api('/logout', {method:'POST'}); location.href = '/login'; };

function render() {
  $('count').textContent = projects.length ? `${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'} no catálogo` : '';
  if (!projects.length) { $('grid').innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('star')}<h2>Nenhum projeto ainda</h2><p>Cadastre o primeiro para começar o catálogo.</p></div>`; return; }
  $('grid').innerHTML = projects.map(p => {
    const n = p.pages.length, o = p.id === openId;
    return `<article class="card ${o ? 'open' : ''}" data-id="${p.id}">
      <button class="card-head" aria-expanded="${o}">
        <span class="folder">${icon('folder')}</span>
        <span><h3>${esc(p.name)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ''}</span>
        <span class="badge ${n ? '' : 'none'}">${n} ${n === 1 ? 'página' : 'páginas'}</span></button>
      <div class="panel"><div>
        <ul class="pages">${n ? p.pages.map(g => `<li><span class="t"><b>${esc(g.label)}</b><small>${esc(g.url)}</small></span>
          <a class="btn" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">${icon('out')}Abrir</a></li>`).join('') : '<li><small>Sem páginas vinculadas.</small></li>'}</ul>
        <div class="card-foot"><button class="btn" data-a="edit">${icon('edit')}Editar</button><button class="btn danger" data-a="del">${icon('trash')}Excluir</button></div>
      </div></div></article>`;
  }).join('');
}

$('grid').onclick = e => {
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

const row = (g = {label:'', url:''}) => { const d = document.createElement('div'); d.className = 'row';
  d.innerHTML = `<input placeholder="Nome (ex.: Admin)" value="${esc(g.label)}" maxlength="80"><input type="url" placeholder="https://…" value="${esc(g.url)}" required>
  <button type="button" class="btn" aria-label="Remover página">${icon('x')}</button>`;
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
