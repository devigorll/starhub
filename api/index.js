// StarHub — função serverless única (Vercel). Auth por cookie assinado; dados em JSON versionado no GitHub.
import crypto from 'node:crypto';

const { ADMIN_EMAIL, ADMIN_PASSWORD, SESSION_SECRET, GITHUB_TOKEN, GITHUB_REPO } = process.env;
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE = process.env.GITHUB_FILE || 'projects.json';
const WEEK = 60 * 60 * 24 * 7;

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const sign = v => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('hex');
const makeToken = () => { const exp = Date.now() + WEEK * 1000; return `${exp}.${sign(String(exp))}`; };
function authed(req) {
  const m = /(?:^|;\s*)sh=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  return !!sig && Number(exp) > Date.now() && same(sig, sign(exp));
}
const cookie = (v, age) => `sh=${v}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}; Secure`;
const json = (res, code, body, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(body)); };

const tries = new Map(); // limite por instância; suficiente para uso pessoal
function limited(ip) { const now = Date.now(), t = (tries.get(ip) || []).filter(x => now - x < 9e5); tries.set(ip, t); return t.length >= 8; }

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let d = ''; for await (const c of req) d += c; return JSON.parse(d || '{}');
}

// --- Armazenamento: arquivo JSON em um repositório GitHub (contents API) ---
const gh = (extra = '', opts = {}) => fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE}${extra}`, {
  ...opts, headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'starhub', ...opts.headers } });
async function load() {
  const r = await gh(`?ref=${BRANCH}`);
  if (r.status === 404) return { list: [], sha: undefined };
  if (!r.ok) throw new Error('Falha ao ler os dados no GitHub. Verifique GITHUB_TOKEN e GITHUB_REPO.');
  const d = await r.json();
  return { list: JSON.parse(Buffer.from(d.content, 'base64').toString('utf8') || '[]'), sha: d.sha };
}
async function save(list, sha, msg) {
  const r = await gh('', { method: 'PUT', body: JSON.stringify({ message: msg, branch: BRANCH, sha, content: Buffer.from(JSON.stringify(list, null, 2)).toString('base64') }) });
  if (r.status === 409 || r.status === 422) throw new Error('O catálogo mudou em outro dispositivo. Recarregue e tente de novo.');
  if (!r.ok) throw new Error('Falha ao salvar no GitHub. O token precisa de permissão de escrita em Contents.');
}

function clean(p) {
  const name = String(p.name || '').trim().slice(0, 80);
  if (!name) throw new Error('Informe o nome do projeto.');
  const pages = (Array.isArray(p.pages) ? p.pages : []).slice(0, 50).map(x => {
    const url = String(x.url || '').trim(); let u;
    try { u = new URL(url); } catch { throw new Error(`URL inválida: ${url}`); }
    if (!/^https?:$/.test(u.protocol)) throw new Error('Use apenas URLs http(s).');
    return { label: String(x.label || '').trim().slice(0, 80) || u.hostname, url: u.href };
  });
  return { name, description: String(p.description || '').trim().slice(0, 300), pages };
}

export default async function handler(req, res) {
  try {
    for (const k of ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'SESSION_SECRET', 'GITHUB_TOKEN', 'GITHUB_REPO']) if (!process.env[k]) return json(res, 500, { error: `Variável de ambiente ausente: ${k}` });
    const path = '/' + (new URL(req.url, 'http://x').searchParams.get('path') || '');
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'local';

    if (path === '/login' && req.method === 'POST') {
      if (limited(ip)) return json(res, 429, { error: 'Muitas tentativas. Aguarde alguns minutos.' });
      const b = await readBody(req);
      if (same(b.email || '', ADMIN_EMAIL) & same(b.password || '', ADMIN_PASSWORD)) return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(makeToken(), WEEK) });
      tries.get(ip).push(Date.now());
      return json(res, 401, { error: 'E-mail ou senha incorretos.' });
    }
    if (path === '/logout' && req.method === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
    if (!authed(req)) return json(res, 401, { error: 'Sessão expirada.' });
    if (path === '/me') return json(res, 200, { ok: true });

    if (path === '/projects/order' && req.method === 'PUT') {
      const ids = (await readBody(req)).ids; if (!Array.isArray(ids)) throw new Error('Ordem inválida.');
      const { list, sha: s0 } = await load(), rank = new Map(ids.map((x, i) => [x, i]));
      list.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9)); // estável: ids desconhecidos ficam no fim
      await save(list, s0, 'Reordenar projetos'); return json(res, 200, { ok: true });
    }
    const m = /^\/projects(?:\/([\w-]+))?$/.exec(path);
    if (!m) return json(res, 404, { error: 'Não encontrado.' });
    const id = m[1], { list, sha: fileSha } = await load();
    if (req.method === 'GET' && !id) return json(res, 200, list);
    if (req.method === 'POST' && !id) { const p = { id: crypto.randomUUID(), ...clean(await readBody(req)) }; list.push(p); await save(list, fileSha, `Criar projeto: ${p.name}`); return json(res, 201, p); }
    const i = list.findIndex(p => p.id === id);
    if (i < 0) return json(res, 404, { error: 'Projeto não encontrado.' });
    if (req.method === 'PUT') { list[i] = { id, ...clean(await readBody(req)) }; await save(list, fileSha, `Editar projeto: ${list[i].name}`); return json(res, 200, list[i]); }
    if (req.method === 'DELETE') { const [r] = list.splice(i, 1); await save(list, fileSha, `Excluir projeto: ${r.name}`); return json(res, 200, { ok: true }); }
    json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    json(res, 400, { error: e.message || 'Requisição inválida.' });
  }
}
