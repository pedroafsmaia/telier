// worker.js — Cloudflare Worker v6
// Correções aplicadas:
//   C1 — SQL injection removido: GET /projetos usa binding parametrizado
//   C2 — Senhas com hash SHA-256 + salt aleatório (sha256v1); PBKDF2 e texto puro aceitos na verificação (legado)
//   C3 — CORS restrito ao domínio do Pages (configurar ALLOWED_ORIGIN nas env vars)
//   C4 — Email normalizado no setup (toLowerCase + trim)
//   C5 — Stack trace não exposto em produção
//   C6 — Token de sessão com 32 hex chars (128 bits) em vez de 16
//   C7 — Checagem explícita de env.DB para mensagem de erro clara quando binding não configurado
//   C8 — Migração automática de coluna senha_hash em bancos legados

// ── CORS DINÂMICO (C3) ──
// Configure a variável ALLOWED_ORIGIN nas env vars do Worker com o domínio do seu Cloudflare Pages
// Ex: https://telier.pages.dev
function getCors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://telier.pages.dev';
  // Permite localhost em desenvolvimento
  const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  const allowedOrigin = (origin === allowed || isLocalhost) ? origin : allowed;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };
}

function json(data, status = 200, cors = {}, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json', ...extraHeaders },
  });
}
function err(msg, status = 400, cors = {}, extraHeaders = {}) {
  return json({ error: msg }, status, cors, extraHeaders);
}

// ── SENHAS (SHA-256 + COMPAT PBKDF2/LEGADO) ──
// C2 — hashSenha usa SHA-256 com salt aleatório (sha256v1).
//       crypto.subtle.deriveBits (PBKDF2) não é suportado de forma confiável
//       em todos os planos do Cloudflare Workers; SHA-256 é sempre disponível.
//       Hashes PBKDF2 e senhas em texto puro são aceitos na verificação para
//       compatibilidade com contas existentes e migrados na próxima autenticação.
const PBKDF2_ITER = 10000; // mantido apenas para verificar hashes pbkdf2 legados
const PBKDF2_ALGO = 'SHA-256';
const LEGACY_PLAIN = 'legacy_plain';

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(str) {
  const bin = atob(str || '');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ^ b[i]);
  return diff === 0;
}

// Converte hex string → Uint8Array sem depender de TextEncoder para instanceof
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length >>> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// SHA-256 de um ArrayBuffer/Uint8Array, retorna hex string
async function sha256Hex(data) {
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2Hash(senha, saltBytes, iter = PBKDF2_ITER) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(String(senha || '')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: PBKDF2_ALGO, salt: saltBytes, iterations: iter }, key, 256);
  return new Uint8Array(bits);
}

// Gera hash sha256v1: salt aleatório (32 hex chars) + SHA-256(salt:senha)
async function hashSenha(senha) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const enc = new TextEncoder();
  const hash = await sha256Hex(enc.encode(salt + ':' + String(senha)));
  return `sha256v1$${salt}$${hash}`;
}

function parseHash(stored) {
  const s = String(stored || '');
  if (!s.startsWith('pbkdf2$')) return null;
  const parts = s.split('$');
  if (parts.length !== 4) return null;
  const iter = Number(parts[1]);
  if (!Number.isFinite(iter) || iter < 1) return null;
  try {
    return { iter, salt: fromBase64(parts[2]), hash: fromBase64(parts[3]) };
  } catch {
    return null;
  }
}

async function verificarSenha(senha, stored) {
  const s = String(stored || '');

  // sha256v1 — formato atual
  if (s.startsWith('sha256v1$')) {
    const parts = s.split('$');
    if (parts.length !== 3) return { ok: false, mode: 'sha256v1' };
    const [, salt, storedHash] = parts;
    const enc = new TextEncoder();
    const calc = await sha256Hex(enc.encode(salt + ':' + String(senha)));
    return { ok: timingSafeEqual(hexToBytes(calc), hexToBytes(storedHash)), mode: 'sha256v1' };
  }

  // pbkdf2 — compatibilidade com hashes criados entre c680bba e este commit
  const parsed = parseHash(s);
  if (parsed) {
    try {
      const calc = await pbkdf2Hash(senha, parsed.salt, parsed.iter);
      return { ok: timingSafeEqual(calc, parsed.hash), mode: 'pbkdf2' };
    } catch {
      return { ok: false, mode: 'pbkdf2' };
    }
  }

  // texto puro — legado (antes de c680bba); migrado para sha256v1 no próximo login
  return { ok: String(senha) === s, mode: LEGACY_PLAIN };
}

const RATE_WINDOW_MS = 60000;
const RATE_AUTH_LIMIT = 12;
const _rateBuckets = new Map();

function getClientIp(request) {
  return (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown').split(',')[0].trim();
}

function checkRateLimit(request, scope, limit = RATE_AUTH_LIMIT, windowMs = RATE_WINDOW_MS) {
  const ip = getClientIp(request);
  const now = Date.now();
  const key = `${scope}:${ip}`;
  let bucket = _rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    _rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function toInt(v, fallback = 1) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function getPagination(url, defaultSize = 100, maxSize = 500) {
  const page = toInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(toInt(url.searchParams.get('page_size'), defaultSize), maxSize);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

// Retorna datetime atual no formato SQLite ('YYYY-MM-DD HH:MM:SS')
function nowStr(d = new Date()) { return d.toISOString().slice(0, 19).replace('T', ' '); }

// ── TOKEN COM 128 BITS (C6) ──
function uid() { return crypto.randomUUID().replace(/-/g, ''); } // 32 hex chars = 128 bits

function sessaoUid() { return crypto.randomUUID().replace(/-/g, ''); } // token de sessão = 128 bits

async function getUsuario(request, env) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  return await env.DB.prepare(
    `SELECT s.id as sessao_id, u.id as uid, u.nome, u.login, u.papel, COALESCE(u.deve_trocar_senha, 0) as deve_trocar_senha
     FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id
     WHERE s.id = ? AND s.expira_em > datetime('now')`
  ).bind(token).first();
}

async function requireAuth(request, env) {
  const u = await getUsuario(request, env);
  if (!u) return [null, 401];
  return [u, null];
}

function isAdmin(u) { return u?.papel === 'admin'; }

const STATUS_PROJ_VALIDOS = ['A fazer', 'Em andamento', 'Em revisão', 'Pausado', 'Concluído', 'Arquivado'];
const STATUS_PROJ_VALIDOS_SET = new Set(STATUS_PROJ_VALIDOS);

function normalizarStatusProjeto(status) {
  if (!status) return status;
  const s = String(status).trim();
  if (s === 'Concluída') return 'Concluído';
  // Backward compat: old records stored before rename
  if (s === 'Aguardando aprovação') return 'Em revisão';
  return s;
}

async function podeEditarProjeto(env, projetoId, usuarioId, papel) {
  if (papel === 'admin') return true;

  const [proj, recusado, perm] = await env.DB.batch([
    env.DB.prepare('SELECT dono_id, grupo_id FROM projetos WHERE id = ?')
      .bind(projetoId),
    env.DB.prepare('SELECT 1 as ok FROM recusas_projeto WHERE projeto_id = ? AND usuario_id = ?')
      .bind(projetoId, usuarioId),
    env.DB.prepare('SELECT 1 as ok FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?')
      .bind(projetoId, usuarioId),
  ]);

  const projRow = proj.results[0];
  if (!projRow) return false;
  if (projRow.dono_id === usuarioId) return true;
  if (recusado.results[0]) return false;
  if (perm.results[0]) return true;

  if (projRow.grupo_id) {
    const gperm = await env.DB.prepare(
      'SELECT 1 FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?'
    ).bind(projRow.grupo_id, usuarioId).first();
    if (gperm) return true;
  }
  return false;
}

let _grupoSchemaReady = false;
async function ensureGrupoSchema(env) {
  if (_grupoSchemaReady) return;
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS permissoes_grupo (
      grupo_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (grupo_id, usuario_id),
      FOREIGN KEY (grupo_id) REFERENCES grupos_projetos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `).run();
  try { await env.DB.prepare('ALTER TABLE grupos_projetos ADD COLUMN descricao TEXT').run(); } catch {}
  try { await env.DB.prepare('ALTER TABLE grupos_projetos ADD COLUMN status TEXT DEFAULT "Ativo"').run(); } catch {}
  try { await env.DB.prepare('ALTER TABLE permissoes_projeto ADD COLUMN origem TEXT DEFAULT "manual"').run(); } catch {}
  try { await env.DB.prepare('UPDATE permissoes_projeto SET origem = "manual" WHERE origem IS NULL').run(); } catch {}
  _grupoSchemaReady = true;
}

let _shareSchemaReady = false;
async function ensureShareSchema(env) {
  if (_shareSchemaReady) return;
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS recusas_projeto (
      projeto_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      criado_em TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (projeto_id, usuario_id),
      FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      escopo TEXT NOT NULL,
      entidade_id TEXT,
      titulo TEXT NOT NULL,
      mensagem TEXT,
      ator_id TEXT,
      lida_em TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (ator_id) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `).run();
  try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_notif_usuario_data ON notificacoes(usuario_id, criado_em DESC)').run(); } catch {}
  try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_notif_usuario_lida ON notificacoes(usuario_id, lida_em)').run(); } catch {}
  _shareSchemaReady = true;
}

async function criarNotificacaoCompartilhamento(env, payload) {
  const {
    usuarioId,
    tipo,
    escopo,
    entidadeId,
    titulo,
    mensagem,
    atorId,
  } = payload || {};
  if (!usuarioId || !tipo || !escopo || !titulo) return;
  if (atorId && atorId === usuarioId) return;

  const dup = await env.DB.prepare(`
    SELECT id FROM notificacoes
    WHERE usuario_id = ? AND tipo = ? AND escopo = ?
      AND COALESCE(entidade_id, '') = COALESCE(?, '')
      AND COALESCE(ator_id, '') = COALESCE(?, '')
      AND lida_em IS NULL
      AND datetime(criado_em) >= datetime('now', '-10 minutes')
    LIMIT 1
  `).bind(usuarioId, tipo, escopo, entidadeId || null, atorId || null).first();
  if (dup) return;

  await env.DB.prepare(`
    INSERT INTO notificacoes (id, usuario_id, tipo, escopo, entidade_id, titulo, mensagem, ator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind('ntf_' + uid(), usuarioId, tipo, escopo, entidadeId || null, titulo, mensagem || null, atorId || null).run();
}

let _taskSchemaReady = false;
async function ensureTaskSchema(env) {
  if (_taskSchemaReady) return;
  try { await env.DB.prepare('ALTER TABLE tarefas ADD COLUMN descricao TEXT').run(); } catch {}

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS templates_tarefa (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'A fazer',
      prioridade TEXT NOT NULL DEFAULT 'Média',
      dificuldade TEXT NOT NULL DEFAULT 'Moderada',
      descricao TEXT,
      criado_por TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now')),
      atualizado_em TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (criado_por) REFERENCES usuarios(id)
    )
  `).run();
  _taskSchemaReady = true;
}

let _userSecuritySchemaReady = false;
async function ensureUserSecuritySchema(env) {
  if (_userSecuritySchemaReady) return;
  // Ensure core auth tables exist (in case schema.sql was not applied to D1)
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      login TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      deve_trocar_senha INTEGER NOT NULL DEFAULT 0,
      papel TEXT NOT NULL DEFAULT 'membro',
      criado_em TEXT DEFAULT (datetime('now'))
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS sessoes (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL,
      criado_em TEXT,
      expira_em TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `).run();
  try { await env.DB.prepare('ALTER TABLE usuarios ADD COLUMN deve_trocar_senha INTEGER NOT NULL DEFAULT 0').run(); } catch {}
  // D1/SQLite does not support DEFAULT (expression) in ALTER TABLE ADD COLUMN — only literal values.
  // Existing rows that predate the column receive NULL; new rows use the DEFAULT defined in CREATE TABLE above.
  try { await env.DB.prepare('ALTER TABLE sessoes ADD COLUMN criado_em TEXT DEFAULT NULL').run(); } catch {}
  try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em ON sessoes(expira_em)').run(); } catch {}
  try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id)').run(); } catch {}
  try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_permissoes_projeto_usuario ON permissoes_projeto(usuario_id)').run(); } catch {}
  // Ensure time-tracking tables exist; failures are acceptable if FK-referenced tables (tarefas) don't exist yet
  try { await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS sessoes_tempo (
      id TEXT PRIMARY KEY,
      tarefa_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `).run(); } catch {}
  try { await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS colaboradores_tarefa (
      tarefa_id TEXT NOT NULL,
      usuario_id TEXT NOT NULL,
      adicionado_em TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (tarefa_id, usuario_id),
      FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )
  `).run(); } catch {}
  try { await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS intervalos (
      id TEXT PRIMARY KEY,
      sessao_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT,
      criado_em TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sessao_id) REFERENCES sessoes_tempo(id) ON DELETE CASCADE
    )
  `).run(); } catch {}
  _userSecuritySchemaReady = true;
}

async function syncProjetoPermissoesGrupo(env, projetoId, grupoId, donoId = null) {
  if (!projetoId) return;
  let ownerId = donoId;
  if (!ownerId) {
    const projeto = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
    ownerId = projeto?.dono_id || null;
  }

  if (!grupoId) {
    await env.DB.prepare(
      'DELETE FROM permissoes_projeto WHERE projeto_id = ? AND origem = "grupo"'
    ).bind(projetoId).run();
    return;
  }

  await env.DB.prepare(`
    INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, nivel, origem)
    SELECT ?, pg.usuario_id, 'editor', 'grupo'
    FROM permissoes_grupo pg
    WHERE pg.grupo_id = ?
      AND (? IS NULL OR pg.usuario_id <> ?)
      AND NOT EXISTS (
        SELECT 1 FROM recusas_projeto rp
        WHERE rp.projeto_id = ? AND rp.usuario_id = pg.usuario_id
      )
  `).bind(projetoId, grupoId, ownerId, ownerId, projetoId).run();

  await env.DB.prepare(`
    DELETE FROM permissoes_projeto
    WHERE projeto_id = ?
      AND origem = 'grupo'
      AND usuario_id NOT IN (
        SELECT pg.usuario_id
        FROM permissoes_grupo pg
        WHERE pg.grupo_id = ?
      )
  `).bind(projetoId, grupoId).run();
}

async function syncProjetosDoGrupo(env, grupoId, novoGrupoId = undefined) {
  const projetos = await env.DB.prepare(
    'SELECT id, dono_id FROM projetos WHERE grupo_id = ?'
  ).bind(grupoId).all();

  for (const projeto of projetos.results) {
    await syncProjetoPermissoesGrupo(env, projeto.id, novoGrupoId, projeto.dono_id);
  }
}

async function podeEditarTarefa(env, tarefaId, usuarioId, papel) {
  if (papel === 'admin') return true;
  const t = await env.DB.prepare('SELECT dono_id, projeto_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!t) return false;
  if (t.dono_id === usuarioId) return true;
  // Verificar colaboradores da tarefa
  const colab = await env.DB.prepare(
    'SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
  ).bind(tarefaId, usuarioId).first();
  if (colab) return true;
  return await podeEditarProjeto(env, t.projeto_id, usuarioId, papel);
}

// Verifica se usuário pode iniciar cronômetro numa tarefa
async function podeCronometrar(env, tarefaId, usuarioId, papel) {
  if (papel === 'admin') return true;
  const t = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!t) return false;
  if (t.dono_id === usuarioId) return true;
  const colab = await env.DB.prepare(
    'SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
  ).bind(tarefaId, usuarioId).first();
  return !!colab;
}

async function ensureIndexes(env) {
  if (env._idxReady) return;
  await env.DB.batch([
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_tarefas_projeto   ON tarefas(projeto_id)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessoes_tarefa    ON sessoes_tempo(tarefa_id)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessoes_fim       ON sessoes_tempo(fim)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_intervalos_sessao ON intervalos(sessao_id)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_colab_tarefa      ON colaboradores_tarefa(tarefa_id)'),
  ]);
  env._idxReady = true;
}

export default {
  async fetch(request, env) {
    const startedAt = Date.now();
    const reqId = 'req_' + uid().slice(0, 12);
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const cors = getCors(request, env);
    const responseHeaders = { 'X-Request-Id': reqId };

    if (method === 'OPTIONS') return new Response(null, { headers: cors });

    // Helper local para respostas com cors correto
    const ok = (data, status = 200) => json(data, status, cors, responseHeaders);
    const fail = (msg, status = 400) => err(msg, status, cors, responseHeaders);

    try {
    await ensureUserSecuritySchema(env);
    await ensureIndexes(env);
    if (env.AUTO_SCHEMA_SYNC === '1') {
      await ensureGrupoSchema(env);
      await ensureTaskSchema(env);
      await ensureShareSchema(env);
    }

    // ── NOTIFICAÇÕES ──
    if (path === '/notificacoes' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const apenasNaoLidas = url.searchParams.get('apenas_nao_lidas') === '1';
      const limit = Math.min(toInt(url.searchParams.get('limit'), 80), 200);
      const notifs = await env.DB.prepare(`
        SELECT n.*, au.nome as ator_nome
        FROM notificacoes n
        LEFT JOIN usuarios au ON au.id = n.ator_id
        WHERE n.usuario_id = ?
          AND (? = 0 OR n.lida_em IS NULL)
        ORDER BY n.criado_em DESC
        LIMIT ?
      `).bind(u.uid, apenasNaoLidas ? 1 : 0, limit).all();
      const naoLidasRow = await env.DB.prepare(
        'SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = ? AND lida_em IS NULL'
      ).bind(u.uid).first();
      return ok({
        itens: notifs.results,
        nao_lidas: Number(naoLidasRow?.total || 0),
      });
    }

    if (path === '/notificacoes/lidas' && method === 'PUT') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      await env.DB.prepare(
        'UPDATE notificacoes SET lida_em = datetime("now") WHERE usuario_id = ? AND lida_em IS NULL'
      ).bind(u.uid).run();
      return ok({ ok: true });
    }

    const matchNotifLida = path.match(/^\/notificacoes\/(ntf_\w+)\/lida$/);
    if (matchNotifLida && method === 'PUT') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const notifId = matchNotifLida[1];
      await env.DB.prepare(
        'UPDATE notificacoes SET lida_em = datetime("now") WHERE id = ? AND usuario_id = ?'
      ).bind(notifId, u.uid).run();
      return ok({ ok: true });
    }

    // ── SETUP ──
    if (path === '/auth/setup' && method === 'POST') {
      if (!checkRateLimit(request, 'auth_setup', 6)) return fail('Muitas tentativas. Aguarde um minuto.', 429);
      const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE papel = "admin"').first();
      if (existing) return fail('Admin já existe', 400);
      const { nome, usuario_login, senha } = await request.json();
      if (!nome || !usuario_login || !senha) return fail('Preencha todos os campos');
      const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
      const loginExiste = await env.DB.prepare('SELECT id FROM usuarios WHERE login = ?').bind(login).first();
      if (loginExiste) return fail('Nome de usuário já existe');
      const hash = await hashSenha(senha);
      await env.DB.prepare(
        'INSERT INTO usuarios (id, nome, login, senha_hash, papel, deve_trocar_senha) VALUES (?, ?, ?, ?, "admin", 0)'
      ).bind('usr_' + uid(), nome.trim(), login, hash).run();
      return ok({ ok: true });
    }

    if (path === '/auth/needs-setup' && method === 'GET') {
      const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE papel = "admin"').first();
      return ok({ needs_setup: !existing });
    }

    // ── AUTO CADASTRO (USUÁRIO COMUM) ──
    if (path === '/auth/register' && method === 'POST') {
      if (!checkRateLimit(request, 'auth_register', 8)) return fail('Muitas tentativas. Aguarde um minuto.', 429);
      const { nome, usuario_login, senha } = await request.json();
      if (!nome || !usuario_login || !senha) return fail('Preencha todos os campos');
      const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
      const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE login = ?').bind(login).first();
      if (existing) return fail('Nome de usuário já existe');
      const senhaSalva = await hashSenha(senha);
      const id = 'usr_' + uid();
      await env.DB.prepare(
        'INSERT INTO usuarios (id, nome, login, senha_hash, papel, deve_trocar_senha) VALUES (?, ?, ?, ?, "membro", 0)'
      ).bind(id, nome.trim(), login, senhaSalva).run();
      return ok({ ok: true, id, usuario_login: login, papel: 'membro' });
    }

    // ── LOGIN por usuario_login ──
    if (path === '/auth/login' && method === 'POST') {
      if (!checkRateLimit(request, 'auth_login', 10)) return fail('Muitas tentativas de login. Aguarde um minuto.', 429);
      const { usuario_login, senha } = await request.json();
      if (!usuario_login || !senha) return fail('Usuário e senha obrigatórios');
      const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
      const usuario = await env.DB.prepare(
        'SELECT * FROM usuarios WHERE login = ?'
      ).bind(login).first();
      if (!usuario) return fail('Credenciais inválidas', 401);
      const senhaValida = await verificarSenha(senha, usuario.senha_hash);
      if (!senhaValida.ok) return fail('Credenciais inválidas', 401);
      // Migra senha em texto puro ou hash pbkdf2 para sha256v1 no próximo login
      const needsRehash = !String(usuario.senha_hash || '').startsWith('sha256v1$');
      if (needsRehash) {
        try {
          const hashNovo = await hashSenha(senha);
          await env.DB.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').bind(hashNovo, usuario.id).run();
        } catch (e) {
          console.error('[auth] password rehash failed', e?.message);
        }
      }
      const sessaoId = sessaoUid();
      const expira = nowStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      await env.DB.prepare(
        'INSERT INTO sessoes (id, usuario_id, criado_em, expira_em) VALUES (?, ?, ?, ?)'
      ).bind(sessaoId, usuario.id, nowStr(), expira).run();
      return ok({
        token: sessaoId,
        must_change_password: Number(usuario.deve_trocar_senha || 0) === 1,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          usuario_login: usuario.login,
          papel: usuario.papel,
          deve_trocar_senha: Number(usuario.deve_trocar_senha || 0),
        },
      });
    }

    if (path === '/auth/logout' && method === 'POST') {
      const [u] = await requireAuth(request, env);
      if (u) await env.DB.prepare('DELETE FROM sessoes WHERE id = ?').bind(u.sessao_id).run();
      return ok({ ok: true });
    }

    if (path === '/auth/me' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      return ok({
        id: u.uid,
        nome: u.nome,
        usuario_login: u.login,
        papel: u.papel,
        deve_trocar_senha: Number(u.deve_trocar_senha || 0),
      });
    }

    if (path === '/auth/trocar-senha' && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const { senha_atual, nova_senha } = await request.json();
      if (!senha_atual || !nova_senha || String(nova_senha).length < 8) {
        return fail('Informe senha atual e nova senha com no mínimo 8 caracteres', 400);
      }
      const row = await env.DB.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').bind(u.uid).first();
      if (!row) return fail('Usuário não encontrado', 404);
      const senhaValida = await verificarSenha(senha_atual, row.senha_hash);
      if (!senhaValida.ok) return fail('Senha atual inválida', 401);
      const novaHash = await hashSenha(nova_senha);
      await env.DB.batch([
        env.DB.prepare('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0 WHERE id = ?').bind(novaHash, u.uid),
        env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ? AND id <> ?').bind(u.uid, u.sessao_id),
      ]);
      return ok({ ok: true });
    }

    // ── USUÁRIOS ──
    if (path === '/usuarios' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const lista = await env.DB.prepare('SELECT id, nome, login as usuario_login, papel FROM usuarios ORDER BY nome').all();
      return ok(lista.results);
    }

    if (path === '/usuarios' && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const { nome, usuario_login, senha, papel = 'membro' } = await request.json();
      if (!nome || !usuario_login || !senha) return fail('Campos obrigatórios');
      const login = usuario_login.toLowerCase().trim().replace(/\s+/g, '_');
      const existing = await env.DB.prepare('SELECT id FROM usuarios WHERE login = ?').bind(login).first();
      if (existing) return fail('Nome de usuário já existe');
      const hash = await hashSenha(senha);
      const id = 'usr_' + uid();
      await env.DB.prepare(
        'INSERT INTO usuarios (id, nome, login, senha_hash, papel, deve_trocar_senha) VALUES (?, ?, ?, ?, ?, 1)'
      ).bind(id, nome.trim(), login, hash, papel).run();
      return ok({ id, nome, usuario_login: login, papel });
    }

    const matchUsuarioSenha = path.match(/^\/usuarios\/(usr_\w+)\/senha$/);
    if (matchUsuarioSenha && method === 'PUT') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const usuarioId = matchUsuarioSenha[1];
      const { nova_senha, exigir_troca = true } = await request.json();
      if (!nova_senha || String(nova_senha).length < 8) return fail('Nova senha deve ter no mínimo 8 caracteres', 400);
      const alvo = await env.DB.prepare('SELECT id FROM usuarios WHERE id = ?').bind(usuarioId).first();
      if (!alvo) return fail('Usuário não encontrado', 404);
      const hash = await hashSenha(nova_senha);
      await env.DB.batch([
        env.DB.prepare('UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = ? WHERE id = ?').bind(hash, exigir_troca ? 1 : 0, usuarioId),
        env.DB.prepare('DELETE FROM sessoes WHERE usuario_id = ?').bind(usuarioId),
      ]);
      return ok({ ok: true });
    }

    // GET /status — polling unificado (colegas ativos + notificações não lidas)
    if (path === '/status' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      const [colegas, notifs] = await env.DB.batch([
        env.DB.prepare(`
          SELECT st.usuario_id, tu.nome as usuario_nome,
                 t.nome as tarefa_nome, p.nome as projeto_nome,
                 p.id as projeto_id, st.inicio
          FROM sessoes_tempo st
          JOIN usuarios tu ON tu.id = st.usuario_id
          JOIN tarefas t ON t.id = st.tarefa_id
          JOIN projetos p ON p.id = t.projeto_id
          WHERE st.fim IS NULL AND st.usuario_id != ?
          ORDER BY st.inicio ASC
        `).bind(u.uid),
        env.DB.prepare(
          'SELECT COUNT(*) as nao_lidas FROM notificacoes WHERE usuario_id = ? AND lida_em IS NULL'
        ).bind(u.uid),
      ]);

      return ok({
        colegas_ativos: colegas.results,
        notifs_nao_lidas: notifs.results[0]?.nao_lidas || 0,
      });
    }

    // ── CENTRAL ADMIN ──
    if (path === '/admin/agora' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const ativas = await env.DB.prepare(`
        SELECT st.id, st.inicio, st.usuario_id,
          tu.nome as usuario_nome, tu.login as usuario_login,
          t.id as tarefa_id, t.nome as tarefa_nome, t.status as tarefa_status,
          p.id as projeto_id, p.nome as projeto_nome
        FROM sessoes_tempo st
        JOIN usuarios tu ON tu.id = st.usuario_id
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE st.fim IS NULL
        ORDER BY st.inicio ASC
      `).all();
      return ok(ativas.results);
    }

    if (path === '/admin/timeline-hoje' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const rows = await env.DB.prepare(`
        SELECT st.usuario_id, u.nome as usuario_nome,
               st.inicio, st.fim, t.nome as tarefa_nome
        FROM sessoes_tempo st
        JOIN usuarios u ON u.id = st.usuario_id
        JOIN tarefas t ON t.id = st.tarefa_id
        WHERE DATE(st.inicio) = DATE('now')
        ORDER BY st.usuario_id, st.inicio
      `).all();
      return ok(rows.results);
    }

    if (path === '/admin/usuarios' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const { pageSize, offset } = getPagination(url, 120, 400);

      const usuarios = await env.DB.prepare(`
        SELECT u.id, u.nome, u.login as usuario_login, u.papel, COALESCE(u.deve_trocar_senha, 0) as deve_trocar_senha,
          (
            SELECT COUNT(*) FROM projetos p WHERE p.dono_id = u.id
          ) as projetos_como_dono,
          (
            SELECT COUNT(*) FROM permissoes_projeto pp WHERE pp.usuario_id = u.id
          ) as projetos_como_editor,
          (
            SELECT COUNT(*) FROM tarefas t WHERE t.dono_id = u.id
          ) as tarefas_como_dono,
          (
            SELECT COUNT(*) FROM tarefas t WHERE t.dono_id = u.id AND t.status = 'Em andamento'
          ) as tarefas_em_andamento,
          COALESCE((
            SELECT ROUND(SUM(
              (CASE WHEN st.fim IS NULL
                THEN (julianday('now') - julianday(st.inicio)) * 24
                ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
              END)
              -
              COALESCE((
                SELECT SUM(
                  CASE WHEN i.fim IS NULL THEN 0
                  ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                  END
                ) FROM intervalos i WHERE i.sessao_id = st.id
              ), 0)
            ), 2)
            FROM sessoes_tempo st
            WHERE st.usuario_id = u.id
          ), 0) as horas_totais
        FROM usuarios u
        ORDER BY u.nome
        LIMIT ? OFFSET ?
      `).bind(pageSize, offset).all();

      return ok(usuarios.results);
    }

    const matchAdminUsuario = path.match(/^\/admin\/usuarios\/(usr_\w+)$/);
    if (matchAdminUsuario && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const usuarioId = matchAdminUsuario[1];

      const usuario = await env.DB.prepare(
        'SELECT id, nome, login as usuario_login, papel, COALESCE(deve_trocar_senha, 0) as deve_trocar_senha FROM usuarios WHERE id = ?'
      ).bind(usuarioId).first();
      if (!usuario) return fail('Usuário não encontrado', 404);

      const projetosDashboard = await env.DB.prepare(`
        SELECT p.id, p.nome, p.status, p.prioridade, 'dono' as papel_no_projeto
        FROM projetos p
        WHERE p.dono_id = ?
        UNION ALL
        SELECT p.id, p.nome, p.status, p.prioridade, 'editor' as papel_no_projeto
        FROM projetos p
        JOIN permissoes_projeto pp ON pp.projeto_id = p.id
        WHERE pp.usuario_id = ? AND p.dono_id <> ?
        ORDER BY nome
      `).bind(usuarioId, usuarioId, usuarioId).all();

      const tarefas = await env.DB.prepare(`
        SELECT DISTINCT t.id, t.nome, t.status, t.prioridade, t.dificuldade, t.dificuldade AS complexidade,
          p.id as projeto_id, p.nome as projeto_nome,
          CASE WHEN t.dono_id = ? THEN 'dono' ELSE 'colaborador' END as papel_na_tarefa
        FROM tarefas t
        JOIN projetos p ON p.id = t.projeto_id
        LEFT JOIN colaboradores_tarefa ct ON ct.tarefa_id = t.id AND ct.usuario_id = ?
        WHERE t.dono_id = ? OR ct.usuario_id = ?
        ORDER BY
          CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END,
          t.atualizado_em DESC
      `).bind(usuarioId, usuarioId, usuarioId, usuarioId).all();

      const tempoPorTarefa = await env.DB.prepare(`
        SELECT t.id as tarefa_id, t.nome as tarefa_nome,
          p.id as projeto_id, p.nome as projeto_nome,
          ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            -
            COALESCE((
              SELECT SUM(
                CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END
              ) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2) as horas_liquidas
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE st.usuario_id = ?
        GROUP BY t.id, t.nome, p.id, p.nome
        ORDER BY horas_liquidas DESC
      `).bind(usuarioId).all();

      const ativas = await env.DB.prepare(`
        SELECT st.id, st.inicio, t.id as tarefa_id, t.nome as tarefa_nome,
          p.id as projeto_id, p.nome as projeto_nome
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE st.usuario_id = ? AND st.fim IS NULL
        ORDER BY st.inicio ASC
      `).bind(usuarioId).all();

      return ok({
        usuario,
        projetos_dashboard: projetosDashboard.results,
        tarefas: tarefas.results,
        tempo_por_tarefa: tempoPorTarefa.results,
        ativas: ativas.results,
      });
    }

    if (path === '/admin/projetos' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const { pageSize, offset } = getPagination(url, 150, 500);

      const projetos = await env.DB.prepare(`
        SELECT p.id, p.nome, p.fase, p.status, p.prioridade, p.prazo,
          pu.nome as dono_nome,
          COUNT(DISTINCT t.id) as total_tarefas,
          SUM(CASE WHEN t.status = 'Concluída' THEN 1 ELSE 0 END) as tarefas_concluidas,
          COALESCE(ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            -
            COALESCE((
              SELECT SUM(
                CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END
              ) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2), 0) as horas_totais
        FROM projetos p
        LEFT JOIN usuarios pu ON pu.id = p.dono_id
        LEFT JOIN tarefas t ON t.projeto_id = p.id
        LEFT JOIN sessoes_tempo st ON st.tarefa_id = t.id
        GROUP BY p.id, p.nome, p.fase, p.status, p.prioridade, p.prazo, pu.nome
        ORDER BY p.atualizado_em DESC
        LIMIT ? OFFSET ?
      `).bind(pageSize, offset).all();

      return ok(projetos.results);
    }

    if (path === '/admin/tempo' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const { pageSize, offset } = getPagination(url, 250, 1000);
      const de = url.searchParams.get('de') || null;
      const ate = url.searchParams.get('ate') || null;
      const usuarioId = url.searchParams.get('usuario_id') || null;

      const linhas = await env.DB.prepare(`
        SELECT
          tu.id as usuario_id, tu.nome as usuario_nome,
          p.id as projeto_id, p.nome as projeto_nome,
          t.id as tarefa_id, t.nome as tarefa_nome,
          ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            -
            COALESCE((
              SELECT SUM(
                CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END
              ) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2) as horas_liquidas
        FROM sessoes_tempo st
        JOIN usuarios tu ON tu.id = st.usuario_id
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE
          (? IS NULL OR tu.id = ?)
          AND
          (? IS NULL OR date(st.inicio) >= date(?))
          AND (? IS NULL OR date(st.inicio) <= date(?))
        GROUP BY tu.id, tu.nome, p.id, p.nome, t.id, t.nome
        ORDER BY horas_liquidas DESC
        LIMIT ? OFFSET ?
      `).bind(usuarioId, usuarioId, de, de, ate, ate, pageSize, offset).all();

      return ok(linhas.results);
    }

    const matchUsuarioPapel = path.match(/^\/usuarios\/(usr_\w+)\/papel$/);
    if (matchUsuarioPapel && method === 'PUT') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Sem permissão', 403);
      const usuarioId = matchUsuarioPapel[1];
      const { papel } = await request.json();
      if (!['admin', 'membro'].includes(papel)) return fail('Papel inválido');
      const alvo = await env.DB.prepare('SELECT id, papel FROM usuarios WHERE id = ?').bind(usuarioId).first();
      if (!alvo) return fail('Usuário não encontrado', 404);
      if (alvo.id === u.uid && papel !== 'admin') return fail('Você não pode remover seu próprio papel admin');
      await env.DB.prepare('UPDATE usuarios SET papel = ? WHERE id = ?').bind(papel, usuarioId).run();
      return ok({ ok: true, id: usuarioId, papel });
    }

    // ── PROJETOS ──
    if (path === '/projetos' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      // C1: filtro de status via binding parametrizado — sem interpolação de string
      const statusFiltroRaw = url.searchParams.get('status') || null;
      const statusFiltro = statusFiltroRaw ? normalizarStatusProjeto(statusFiltroRaw) : null;
      if (statusFiltro && !STATUS_PROJ_VALIDOS_SET.has(statusFiltro)) return fail('Status de projeto inválido', 400);
      const asMember = url.searchParams.get('as_member') === '1';
      const adminScope = (isAdmin(u) && !asMember) ? 1 : 0;
      // Filtra: projetos do usuário (dono) OU compartilhados com ele (permissoes_projeto)
      // Admin vê todos
      const projetos = await env.DB.prepare(`
        SELECT p.*,
          pu.nome as dono_nome,
          p.grupo_id, g.nome as grupo_nome,
          CASE
            WHEN p.dono_id <> ?
              AND NOT EXISTS (
                SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?
              )
              AND (
                EXISTS (SELECT 1 FROM permissoes_projeto pp0 WHERE pp0.projeto_id = p.id AND pp0.usuario_id = ?)
                OR EXISTS (SELECT 1 FROM permissoes_grupo pg0 WHERE pg0.grupo_id = p.grupo_id AND pg0.usuario_id = ?)
              )
            THEN 1 ELSE 0
          END as compartilhado_comigo,
          CASE
            WHEN p.dono_id <> ?
              AND NOT EXISTS (
                SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?
              )
              AND EXISTS (SELECT 1 FROM permissoes_grupo pg0 WHERE pg0.grupo_id = p.grupo_id AND pg0.usuario_id = ?)
            THEN 'grupo'
            WHEN p.dono_id <> ?
              AND NOT EXISTS (
                SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?
              )
              AND EXISTS (SELECT 1 FROM permissoes_projeto pp0 WHERE pp0.projeto_id = p.id AND pp0.usuario_id = ?)
            THEN 'manual'
            ELSE NULL
          END as origem_compartilhamento,
          COUNT(DISTINCT t.id) as total_tarefas,
          SUM(CASE WHEN t.status = 'Concluída' THEN 1 ELSE 0 END) as tarefas_concluidas,
          (
            SELECT ROUND(COALESCE(SUM(
              (CASE WHEN st.fim IS NULL
                THEN (julianday('now') - julianday(st.inicio)) * 24
                ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
              END)
              - COALESCE((
                SELECT SUM(CASE WHEN i.fim IS NULL THEN 0
                  ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END)
                FROM intervalos i
                WHERE i.sessao_id = st.id
              ), 0)
            ), 0), 2)
            FROM sessoes_tempo st
            JOIN tarefas tt ON tt.id = st.tarefa_id
            WHERE tt.projeto_id = p.id
          ) as total_horas,
          (
            SELECT t2.nome FROM tarefas t2
            WHERE t2.projeto_id = p.id AND t2.foco = 1 AND t2.dono_id = ?
            LIMIT 1
          ) as minha_tarefa_foco
        FROM projetos p
        LEFT JOIN usuarios pu ON pu.id = p.dono_id
        LEFT JOIN grupos_projetos g ON g.id = p.grupo_id
        LEFT JOIN tarefas t ON t.projeto_id = p.id
        WHERE
          (? = 1 OR p.dono_id = ? OR (
            NOT EXISTS (
              SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?
            )
            AND (
              EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
              OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)
            )
          ))
          AND (? IS NULL OR p.status = ?)
        GROUP BY p.id
        ORDER BY
          CASE p.status WHEN 'A fazer' THEN 0 WHEN 'Em andamento' THEN 1 WHEN 'Em revisão' THEN 2 WHEN 'Pausado' THEN 3 WHEN 'Concluído' THEN 4 WHEN 'Concluída' THEN 4 ELSE 5 END,
          CASE p.prioridade WHEN 'Alta' THEN 0 WHEN 'Média' THEN 1 ELSE 2 END,
          p.prazo ASC NULLS LAST,
          p.atualizado_em DESC
      `).bind(
        u.uid, u.uid, u.uid, u.uid,
        u.uid, u.uid, u.uid,
        u.uid, u.uid, u.uid,
        u.uid,
        adminScope, u.uid, u.uid, u.uid, u.uid,
        statusFiltro, statusFiltro,
      ).all();
      return ok(projetos.results);
    }

    if (path === '/projetos' && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const { nome, fase, status, prioridade, prazo, area_m2, grupo_id } = await request.json();
      if (!nome?.trim()) return fail('Nome obrigatório');
      const statusProjeto = normalizarStatusProjeto(status || 'A fazer');
      if (!STATUS_PROJ_VALIDOS_SET.has(statusProjeto)) return fail('Status de projeto inválido', 400);
      const id = 'prj_' + uid();
      await env.DB.prepare(
        'INSERT INTO projetos (id, nome, fase, status, prioridade, prazo, area_m2, dono_id, grupo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, nome.trim(), fase || 'Estudo preliminar', statusProjeto, prioridade || 'Média', prazo || null, area_m2 || null, u.uid, grupo_id || null).run();
      if (grupo_id) {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, origem)
          SELECT ?, pg.usuario_id, 'grupo'
          FROM permissoes_grupo pg
          WHERE pg.grupo_id = ? AND pg.usuario_id <> ?
        `).bind(id, grupo_id, u.uid).run();
      }
      return ok({ id });
    }

    // ── GRUPOS DE PROJETOS ──
    if (path === '/grupos' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const asMember = url.searchParams.get('as_member') === '1';
      const adminAll = isAdmin(u) && !asMember;
      const grupoFiltro = (url.searchParams.get('grupo_id') || '').trim();
      let grupos;
      if (adminAll) {
        grupos = await env.DB.prepare(
          `WITH proj AS (
             SELECT p.grupo_id,
               COUNT(*) as total_projetos,
               SUM(COALESCE(p.area_m2, 0)) as area_total_m2,
               SUM(CASE WHEN p.status = 'Concluído' THEN 1 ELSE 0 END) as projetos_concluidos,
               SUM(CASE WHEN p.prazo IS NOT NULL AND date(p.prazo) < date('now') AND p.status NOT IN ('Concluído','Arquivado') THEN 1 ELSE 0 END) as projetos_atrasados
             FROM projetos p
             GROUP BY p.grupo_id
           ),
           hrs AS (
             SELECT p.grupo_id,
               ROUND(COALESCE(SUM(
                 (CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24
                  ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END)
                 - COALESCE((
                   SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END)
                   FROM intervalos i WHERE i.sessao_id = st.id
                 ), 0)
               ), 0), 2) as total_horas
             FROM sessoes_tempo st
             JOIN tarefas t ON t.id = st.tarefa_id
             JOIN projetos p ON p.id = t.projeto_id
             GROUP BY p.grupo_id
           ),
           ativos AS (
             SELECT p.grupo_id, COUNT(DISTINCT p.id) as projetos_ativos
             FROM sessoes_tempo st
             JOIN tarefas t ON t.id = st.tarefa_id
             JOIN projetos p ON p.id = t.projeto_id
             WHERE st.fim IS NULL
             GROUP BY p.grupo_id
           )
           SELECT g.*, pu.nome as dono_nome,
             COALESCE(proj.total_projetos, 0) as total_projetos,
             ROUND(COALESCE(proj.area_total_m2, 0), 2) as area_total_m2,
             COALESCE(hrs.total_horas, 0) as total_horas,
             COALESCE(proj.projetos_concluidos, 0) as projetos_concluidos,
             COALESCE(proj.projetos_atrasados, 0) as projetos_atrasados,
             COALESCE(ativos.projetos_ativos, 0) as projetos_ativos
           FROM grupos_projetos g
           LEFT JOIN usuarios pu ON pu.id = g.dono_id
           LEFT JOIN proj ON proj.grupo_id = g.id
           LEFT JOIN hrs ON hrs.grupo_id = g.id
           LEFT JOIN ativos ON ativos.grupo_id = g.id
           WHERE (? = '' OR g.id = ?)
           ORDER BY g.ordem ASC, g.nome ASC`
        ).bind(grupoFiltro, grupoFiltro).all();
      } else {
        grupos = await env.DB.prepare(
          `WITH ap AS (
             SELECT p.*
             FROM projetos p
             WHERE p.dono_id = ?
               OR EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
               OR (p.grupo_id IS NOT NULL AND EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?))
           ),
           proj AS (
             SELECT grupo_id,
               COUNT(*) as total_projetos,
               SUM(COALESCE(area_m2, 0)) as area_total_m2,
               SUM(CASE WHEN status = 'Concluído' THEN 1 ELSE 0 END) as projetos_concluidos,
               SUM(CASE WHEN prazo IS NOT NULL AND date(prazo) < date('now') AND status NOT IN ('Concluído','Arquivado') THEN 1 ELSE 0 END) as projetos_atrasados
             FROM ap
             GROUP BY grupo_id
           ),
           hrs AS (
             SELECT ap.grupo_id,
               ROUND(COALESCE(SUM(
                 (CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24
                  ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END)
                 - COALESCE((
                   SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END)
                   FROM intervalos i WHERE i.sessao_id = st.id
                 ), 0)
               ), 0), 2) as total_horas
             FROM sessoes_tempo st
             JOIN tarefas t ON t.id = st.tarefa_id
             JOIN ap ON ap.id = t.projeto_id
             GROUP BY ap.grupo_id
           ),
           ativos AS (
             SELECT ap.grupo_id, COUNT(DISTINCT ap.id) as projetos_ativos
             FROM sessoes_tempo st
             JOIN tarefas t ON t.id = st.tarefa_id
             JOIN ap ON ap.id = t.projeto_id
             WHERE st.fim IS NULL
             GROUP BY ap.grupo_id
           )
           SELECT g.*, pu.nome as dono_nome,
             COALESCE(proj.total_projetos, 0) as total_projetos,
             ROUND(COALESCE(proj.area_total_m2, 0), 2) as area_total_m2,
             COALESCE(hrs.total_horas, 0) as total_horas,
             COALESCE(proj.projetos_concluidos, 0) as projetos_concluidos,
             COALESCE(proj.projetos_atrasados, 0) as projetos_atrasados,
             COALESCE(ativos.projetos_ativos, 0) as projetos_ativos
           FROM grupos_projetos g
           LEFT JOIN usuarios pu ON pu.id = g.dono_id
           LEFT JOIN proj ON proj.grupo_id = g.id
           LEFT JOIN hrs ON hrs.grupo_id = g.id
           LEFT JOIN ativos ON ativos.grupo_id = g.id
           WHERE (g.dono_id = ? OR EXISTS (SELECT 1 FROM ap WHERE ap.grupo_id = g.id) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = g.id AND pg.usuario_id = ?))
             AND (? = '' OR g.id = ?)
           ORDER BY g.ordem ASC, g.nome ASC`
        ).bind(u.uid, u.uid, u.uid, u.uid, u.uid, grupoFiltro, grupoFiltro).all();
      }
      return ok(grupos.results);
    }

    if (path === '/grupos' && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const { nome, status, descricao } = await request.json();
      if (!nome?.trim()) return fail('Nome obrigatório');
      const id = 'grp_' + uid();
      const ordemRow = await env.DB.prepare('SELECT COALESCE(MAX(ordem), 0) as max_ordem FROM grupos_projetos').first();
      const ordem = (ordemRow?.max_ordem || 0) + 1;
      await env.DB.prepare(
        'INSERT INTO grupos_projetos (id, nome, dono_id, ordem, status, descricao) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, nome.trim(), u.uid, ordem, status || 'Ativo', descricao || null).run();
      return ok({ id, nome: nome.trim(), ordem, status: status || 'Ativo', descricao: descricao || null });
    }

    const matchGrupo = path.match(/^\/grupos\/(grp_\w+)$/);
    if (matchGrupo) {
      const grupoId = matchGrupo[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const grupo = await env.DB.prepare('SELECT * FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
      if (!grupo) return fail('Grupo não encontrado', 404);
      const podeGerenciar = grupo.dono_id === u.uid || isAdmin(u);

      if (method === 'GET') {
        const podeVer = isAdmin(u) || grupo.dono_id === u.uid || !!(await env.DB.prepare(
          `SELECT 1
           FROM projetos p
           WHERE p.grupo_id = ? AND (
             p.dono_id = ? OR EXISTS (
               SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?
             )
            OR EXISTS (
              SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?
            )
           )
           LIMIT 1`
        ).bind(grupoId, u.uid, u.uid, u.uid).first());
        if (!podeVer) return fail('Sem permissão', 403);

        const resumo = await env.DB.prepare(
          `SELECT
            (
              SELECT COUNT(*)
              FROM projetos p2
              WHERE p2.grupo_id = ? AND (
                ? = 1 OR p2.dono_id = ? OR EXISTS (
                  SELECT 1 FROM permissoes_projeto pp2 WHERE pp2.projeto_id = p2.id AND pp2.usuario_id = ?
                )
                OR EXISTS (
                  SELECT 1 FROM permissoes_grupo pg2 WHERE pg2.grupo_id = p2.grupo_id AND pg2.usuario_id = ?
                )
              )
            ) as total_projetos,
            (
              SELECT ROUND(COALESCE(SUM(COALESCE(p2.area_m2, 0)), 0), 2)
              FROM projetos p2
              WHERE p2.grupo_id = ? AND (
                ? = 1 OR p2.dono_id = ? OR EXISTS (
                  SELECT 1 FROM permissoes_projeto pp2 WHERE pp2.projeto_id = p2.id AND pp2.usuario_id = ?
                )
                OR EXISTS (
                  SELECT 1 FROM permissoes_grupo pg2 WHERE pg2.grupo_id = p2.grupo_id AND pg2.usuario_id = ?
                )
              )
            ) as area_total_m2,
            (
              SELECT ROUND(COALESCE(SUM(
                (CASE WHEN st.fim IS NULL
                  THEN (julianday('now') - julianday(st.inicio)) * 24
                  ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
                END)
                - COALESCE((
                  SELECT SUM(CASE WHEN i.fim IS NULL THEN 0
                    ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                  END)
                  FROM intervalos i
                  WHERE i.sessao_id = st.id
                ), 0)
              ), 0), 2)
              FROM sessoes_tempo st
              JOIN tarefas t ON t.id = st.tarefa_id
              JOIN projetos p3 ON p3.id = t.projeto_id
              WHERE p3.grupo_id = ? AND (
                ? = 1 OR p3.dono_id = ? OR EXISTS (
                  SELECT 1 FROM permissoes_projeto pp3 WHERE pp3.projeto_id = p3.id AND pp3.usuario_id = ?
                )
                OR EXISTS (
                  SELECT 1 FROM permissoes_grupo pg3 WHERE pg3.grupo_id = p3.grupo_id AND pg3.usuario_id = ?
                )
              )
            ) as total_horas,
            (
              SELECT COUNT(*)
              FROM projetos p4
              WHERE p4.grupo_id = ? AND p4.status = 'Concluído' AND (
                ? = 1 OR p4.dono_id = ? OR EXISTS (
                  SELECT 1 FROM permissoes_projeto pp4 WHERE pp4.projeto_id = p4.id AND pp4.usuario_id = ?
                )
                OR EXISTS (
                  SELECT 1 FROM permissoes_grupo pg4 WHERE pg4.grupo_id = p4.grupo_id AND pg4.usuario_id = ?
                )
              )
            ) as projetos_concluidos,
            (
              SELECT COUNT(*)
              FROM projetos p5
              WHERE p5.grupo_id = ?
                AND p5.prazo IS NOT NULL
                AND date(p5.prazo) < date('now')
                AND p5.status NOT IN ('Concluído','Arquivado')
                AND (
                  ? = 1 OR p5.dono_id = ? OR EXISTS (
                    SELECT 1 FROM permissoes_projeto pp5 WHERE pp5.projeto_id = p5.id AND pp5.usuario_id = ?
                  )
                  OR EXISTS (
                    SELECT 1 FROM permissoes_grupo pg5 WHERE pg5.grupo_id = p5.grupo_id AND pg5.usuario_id = ?
                  )
                )
            ) as projetos_atrasados,
            (
              SELECT COUNT(DISTINCT p6.id)
              FROM sessoes_tempo st6
              JOIN tarefas t6 ON t6.id = st6.tarefa_id
              JOIN projetos p6 ON p6.id = t6.projeto_id
              WHERE p6.grupo_id = ?
                AND st6.fim IS NULL
                AND (
                  ? = 1 OR p6.dono_id = ? OR EXISTS (
                    SELECT 1 FROM permissoes_projeto pp6 WHERE pp6.projeto_id = p6.id AND pp6.usuario_id = ?
                  )
                  OR EXISTS (
                    SELECT 1 FROM permissoes_grupo pg6 WHERE pg6.grupo_id = p6.grupo_id AND pg6.usuario_id = ?
                  )
                )
            ) as projetos_ativos`
        ).bind(
          grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
          grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
          grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
          grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
          grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
          grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
        ).first();

        const permissoes = await env.DB.prepare(
          'SELECT pg.usuario_id, u.nome, u.login as usuario_login FROM permissoes_grupo pg JOIN usuarios u ON u.id = pg.usuario_id WHERE pg.grupo_id = ? ORDER BY u.nome'
        ).bind(grupoId).all();

        return ok({ ...grupo, ...resumo, pode_gerenciar: podeGerenciar, colaboradores: permissoes.results });
      }

      if (method === 'PUT') {
        if (!podeGerenciar) return fail('Sem permissão', 403);
        const { nome, status, descricao } = await request.json();
        if (!nome?.trim()) return fail('Nome obrigatório');
        await env.DB.prepare('UPDATE grupos_projetos SET nome = ?, status = ?, descricao = ? WHERE id = ?').bind(nome.trim(), status || 'Ativo', descricao || null, grupoId).run();
        return ok({ ok: true });
      }

      if (method === 'PATCH') {
        if (!podeGerenciar) return fail('Sem permissão', 403);
        const body = await request.json();
        if (typeof body.ordem === 'number') {
          await env.DB.prepare('UPDATE grupos_projetos SET ordem = ? WHERE id = ?').bind(body.ordem, grupoId).run();
        }
        if (body.action === 'ungroup_all') {
          await syncProjetosDoGrupo(env, grupoId, null);
          await env.DB.prepare('UPDATE projetos SET grupo_id = NULL WHERE grupo_id = ?').bind(grupoId).run();
        }
        if (body.action === 'move_all_to') {
          const destino = body.destino_grupo_id || null;
          await syncProjetosDoGrupo(env, grupoId, destino);
          await env.DB.prepare('UPDATE projetos SET grupo_id = ? WHERE grupo_id = ?').bind(destino, grupoId).run();
        }
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        if (!podeGerenciar) return fail('Sem permissão', 403);
        // Ungroup all projects in this group
        await syncProjetosDoGrupo(env, grupoId, null);
        await env.DB.prepare('UPDATE projetos SET grupo_id = NULL WHERE grupo_id = ?').bind(grupoId).run();
        await env.DB.prepare('DELETE FROM grupos_projetos WHERE id = ?').bind(grupoId).run();
        return ok({ ok: true });
      }
    }

    const matchGrupoPerms = path.match(/^\/grupos\/(grp_\w+)\/permissoes$/);
    if (matchGrupoPerms && method === 'POST') {
      const grupoId = matchGrupoPerms[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const grupo = await env.DB.prepare('SELECT dono_id, nome FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
      if (!grupo) return fail('Grupo não encontrado', 404);
      if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      const { usuario_id } = await request.json();
      if (!usuario_id) return fail('Usuário obrigatório');
      await env.DB.prepare('INSERT OR REPLACE INTO permissoes_grupo (grupo_id, usuario_id) VALUES (?, ?)').bind(grupoId, usuario_id).run();
      await env.DB.prepare(
        'DELETE FROM recusas_projeto WHERE usuario_id = ? AND projeto_id IN (SELECT id FROM projetos WHERE grupo_id = ?)'
      ).bind(usuario_id, grupoId).run();
      await env.DB.prepare(`
        INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, origem)
        SELECT p.id, ?, 'grupo' FROM projetos p WHERE p.grupo_id = ? AND p.dono_id <> ?
      `).bind(usuario_id, grupoId, grupo.dono_id).run();
      await criarNotificacaoCompartilhamento(env, {
        usuarioId: usuario_id,
        tipo: 'compartilhamento_recebido',
        escopo: 'grupo',
        entidadeId: grupoId,
        titulo: 'Grupo compartilhado com você',
        mensagem: `Você recebeu acesso ao grupo "${grupo.nome}".`,
        atorId: u.uid,
      });
      return ok({ ok: true });
    }

    const matchGrupoSair = path.match(/^\/grupos\/(grp_\w+)\/sair$/);
    if (matchGrupoSair && method === 'DELETE') {
      const grupoId = matchGrupoSair[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const grupo = await env.DB.prepare('SELECT dono_id FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
      if (!grupo) return fail('Grupo não encontrado', 404);
      if (grupo.dono_id === u.uid) return fail('O dono não pode sair do próprio grupo', 400);
      const rm = await env.DB.prepare(
        'DELETE FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?'
      ).bind(grupoId, u.uid).run();
      await env.DB.prepare(`
        DELETE FROM permissoes_projeto
        WHERE usuario_id = ?
          AND origem = 'grupo'
          AND projeto_id IN (SELECT id FROM projetos WHERE grupo_id = ?)
      `).bind(u.uid, grupoId).run();
      if (!(rm.meta?.changes > 0)) return fail('Você não participa deste grupo', 400);
      return ok({ ok: true });
    }

    const matchGrupoPerm = path.match(/^\/grupos\/(grp_\w+)\/permissoes\/(usr_\w+)$/);
    if (matchGrupoPerm && method === 'DELETE') {
      const [, grupoId, usuarioId] = matchGrupoPerm;
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const grupo = await env.DB.prepare('SELECT dono_id FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
      if (!grupo) return fail('Grupo não encontrado', 404);
      if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      await env.DB.prepare('DELETE FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?').bind(grupoId, usuarioId).run();
      await env.DB.prepare(`
        DELETE FROM permissoes_projeto
        WHERE usuario_id = ? AND projeto_id IN (
          SELECT p.id FROM projetos p WHERE p.grupo_id = ?
        ) AND origem = 'grupo'
      `).bind(usuarioId, grupoId).run();
      return ok({ ok: true });
    }

    const matchProjeto = path.match(/^\/projetos\/(prj_\w+)$/);

    if (matchProjeto) {
      const projetoId = matchProjeto[1];

      if (method === 'PATCH') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const body = await request.json();
        if ('grupo_id' in body) {
          const atual = await env.DB.prepare('SELECT grupo_id, dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
          await env.DB.prepare('UPDATE projetos SET grupo_id = ? WHERE id = ?')
            .bind(body.grupo_id || null, projetoId).run();
          await syncProjetoPermissoesGrupo(env, projetoId, body.grupo_id || null, atual?.dono_id || null);
        }
        return ok({ ok: true });
      }

      if (method === 'GET') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const projeto = await env.DB.prepare(
          `SELECT p.*, pu.nome as dono_nome,
            CASE
              WHEN p.dono_id <> ?
                AND NOT EXISTS (
                  SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?
                )
                AND (
                  EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
                  OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)
                )
              THEN 1 ELSE 0
            END as compartilhado_comigo,
            CASE
              WHEN p.dono_id <> ?
                AND NOT EXISTS (
                  SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?
                )
                AND EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)
              THEN 'grupo'
              WHEN p.dono_id <> ?
                AND NOT EXISTS (
                  SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?
                )
                AND EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
              THEN 'manual'
              ELSE NULL
            END as origem_compartilhamento
           FROM projetos p
           LEFT JOIN usuarios pu ON pu.id = p.dono_id
           WHERE p.id = ?`
        ).bind(
          u.uid, u.uid, u.uid, u.uid,
          u.uid, u.uid, u.uid,
          u.uid, u.uid, u.uid,
          projetoId,
        ).first();
        if (!projeto) return fail('Projeto não encontrado', 404);
        const [perms, horasRow] = await Promise.all([
          env.DB.prepare(
            'SELECT pp.usuario_id, pp.origem, u.nome, u.login as usuario_login FROM permissoes_projeto pp JOIN usuarios u ON u.id = pp.usuario_id WHERE pp.projeto_id = ? ORDER BY u.nome'
          ).bind(projetoId).all(),
          env.DB.prepare(`
            SELECT ROUND(COALESCE(SUM(
              (CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24
               ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END)
              - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END)
                          FROM intervalos i WHERE i.sessao_id = st.id), 0)
            ), 0), 2) as total_horas
            FROM sessoes_tempo st
            INNER JOIN tarefas t ON t.id = st.tarefa_id
            WHERE t.projeto_id = ?
          `).bind(projetoId).first(),
        ]);
        const podeEditar = await podeEditarProjeto(env, projetoId, u.uid, u.papel);
        return ok({ ...projeto, editores: perms.results, pode_editar: podeEditar, total_horas: horasRow?.total_horas ?? 0 });
      }

      if (method === 'PUT') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const { nome, fase, status, prioridade, prazo, area_m2, grupo_id } = await request.json();
        if (!nome?.trim()) return fail('Nome obrigatório');
        const statusProjeto = normalizarStatusProjeto(status);
        if (!STATUS_PROJ_VALIDOS_SET.has(statusProjeto)) return fail('Status de projeto inválido', 400);
        const atual = await env.DB.prepare('SELECT dono_id, grupo_id FROM projetos WHERE id = ?').bind(projetoId).first();
        await env.DB.prepare(
          'UPDATE projetos SET nome=?, fase=?, status=?, prioridade=?, prazo=?, area_m2=?, grupo_id=?, atualizado_em=datetime("now") WHERE id=?'
        ).bind(nome.trim(), fase, statusProjeto, prioridade, prazo || null, area_m2 || null, grupo_id || null, projetoId).run();
        if (atual?.grupo_id !== (grupo_id || null)) {
          await syncProjetoPermissoesGrupo(env, projetoId, grupo_id || null, atual?.dono_id || null);
        }
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        const proj = await env.DB.prepare('SELECT dono_id, status FROM projetos WHERE id = ?').bind(projetoId).first();
        if (!proj) return fail('Não encontrado', 404);
        if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
        // Só pode excluir projeto arquivado
        if (proj.status !== 'Arquivado' && !isAdmin(u)) {
          return fail('Projeto precisa estar arquivado antes de ser excluído', 400);
        }
        await env.DB.prepare('DELETE FROM projetos WHERE id = ?').bind(projetoId).run();
        return ok({ ok: true });
      }
    }

    // ── PERMISSÕES ──
    const matchPerms = path.match(/^\/projetos\/(prj_\w+)\/permissoes$/);
    if (matchPerms && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const projetoId = matchPerms[1];
      const proj = await env.DB.prepare('SELECT dono_id, nome FROM projetos WHERE id = ?').bind(projetoId).first();
      if (!proj) return fail('Não encontrado', 404);
      if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      const { usuario_id } = await request.json();
      if (usuario_id === proj.dono_id) return fail('Usuário já é dono do projeto');
      await env.DB.prepare('DELETE FROM recusas_projeto WHERE projeto_id = ? AND usuario_id = ?').bind(projetoId, usuario_id).run();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO permissoes_projeto (projeto_id, usuario_id, origem) VALUES (?, ?, "manual")'
      ).bind(projetoId, usuario_id).run();
      await criarNotificacaoCompartilhamento(env, {
        usuarioId: usuario_id,
        tipo: 'compartilhamento_recebido',
        escopo: 'projeto',
        entidadeId: projetoId,
        titulo: 'Projeto compartilhado com você',
        mensagem: `Você recebeu acesso ao projeto "${proj.nome}".`,
        atorId: u.uid,
      });
      return ok({ ok: true });
    }

    const matchProjetoSair = path.match(/^\/projetos\/(prj_\w+)\/sair$/);
    if (matchProjetoSair && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const projetoId = matchProjetoSair[1];
      const proj = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
      if (!proj) return fail('Projeto não encontrado', 404);
      if (proj.dono_id === u.uid) return fail('O dono não pode sair do próprio projeto', 400);

      const tinhaManual = await env.DB.prepare(
        'SELECT 1 FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?'
      ).bind(projetoId, u.uid).first();
      const tinhaGrupo = await env.DB.prepare(
        'SELECT 1 FROM projetos p JOIN permissoes_grupo pg ON pg.grupo_id = p.grupo_id WHERE p.id = ? AND pg.usuario_id = ?'
      ).bind(projetoId, u.uid).first();
      if (!tinhaManual && !tinhaGrupo) return fail('Você não participa deste projeto', 400);

      await env.DB.batch([
        env.DB.prepare('DELETE FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?').bind(projetoId, u.uid),
        env.DB.prepare('INSERT OR REPLACE INTO recusas_projeto (projeto_id, usuario_id) VALUES (?, ?)').bind(projetoId, u.uid),
        env.DB.prepare(`
          DELETE FROM colaboradores_tarefa
          WHERE usuario_id = ?
            AND tarefa_id IN (SELECT id FROM tarefas WHERE projeto_id = ?)
        `).bind(u.uid, projetoId),
      ]);
      return ok({ ok: true });
    }

    const matchPerm = path.match(/^\/projetos\/(prj_\w+)\/permissoes\/(usr_\w+)$/);
    if (matchPerm && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const [, projetoId, usuarioId] = matchPerm;
      const proj = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
      if (!proj) return fail('Não encontrado', 404);
      if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      await env.DB.prepare(
        'DELETE FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ? AND origem = "manual"'
      ).bind(projetoId, usuarioId).run();
      return ok({ ok: true });
    }

    // ── TEMPLATES DE TAREFA ──
    if (path === '/templates-tarefa' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const templates = await env.DB.prepare(`
        SELECT tt.id, tt.nome, tt.status, tt.prioridade, tt.dificuldade,
          tt.descricao,
          tt.criado_por, tu.nome as criado_por_nome,
          tt.criado_em, tt.atualizado_em
        FROM templates_tarefa tt
        LEFT JOIN usuarios tu ON tu.id = tt.criado_por
        WHERE tt.ativo = 1
        ORDER BY tt.nome ASC
      `).all();
      return ok(templates.results);
    }

    if (path === '/templates-tarefa' && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Somente admin pode criar templates', 403);
      const {
        nome,
        status,
        prioridade,
        dificuldade,
        descricao,
      } = await request.json();
      if (!nome?.trim()) return fail('Nome obrigatório');
      const id = 'tpl_' + uid();
      await env.DB.prepare(`
        INSERT INTO templates_tarefa (
          id, nome, status, prioridade, dificuldade,
          descricao, criado_por
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        nome.trim(),
        status || 'A fazer',
        prioridade || 'Média',
        dificuldade || 'Moderada',
        descricao?.trim() || null,
        u.uid
      ).run();
      return ok({ id });
    }

    const matchTemplate = path.match(/^\/templates-tarefa\/(tpl_\w+)$/);
    if (matchTemplate && method === 'PUT') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Somente admin pode editar templates', 403);
      const templateId = matchTemplate[1];
      const {
        nome,
        status,
        prioridade,
        dificuldade,
        descricao,
      } = await request.json();
      if (!nome?.trim()) return fail('Nome obrigatório');
      const t = await env.DB.prepare('SELECT id FROM templates_tarefa WHERE id = ? AND ativo = 1').bind(templateId).first();
      if (!t) return fail('Template não encontrado', 404);
      await env.DB.prepare(`
        UPDATE templates_tarefa
        SET nome=?, status=?, prioridade=?, dificuldade=?,
            descricao=?,
            atualizado_em=datetime('now')
        WHERE id=?
      `).bind(
        nome.trim(),
        status || 'A fazer',
        prioridade || 'Média',
        dificuldade || 'Moderada',
        descricao?.trim() || null,
        templateId
      ).run();
      return ok({ ok: true });
    }

    if (matchTemplate && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      if (!isAdmin(u)) return fail('Somente admin pode remover templates', 403);
      const templateId = matchTemplate[1];
      await env.DB.prepare(
        'UPDATE templates_tarefa SET ativo = 0, atualizado_em = datetime(\'now\') WHERE id = ?'
      ).bind(templateId).run();
      return ok({ ok: true });
    }

    // ── TAREFAS ──
    const matchTarefasProj = path.match(/^\/projetos\/(prj_\w+)\/tarefas$/);

    if (matchTarefasProj) {
      const projetoId = matchTarefasProj[1];

      if (method === 'GET') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const tarefas = await env.DB.prepare(
          `SELECT t.*, t.dificuldade AS complexidade, tu.nome as dono_nome,
           CASE WHEN t.dono_id = ? THEN 1 ELSE 0 END as minha_tarefa
           FROM tarefas t LEFT JOIN usuarios tu ON tu.id = t.dono_id
           WHERE t.projeto_id = ?
           ORDER BY t.foco DESC,
             CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END,
             t.criado_em ASC`
        ).bind(u.uid, projetoId).all();
        return ok(tarefas.results);
      }

      if (method === 'POST') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const {
          nome,
          status,
          prioridade,
          complexidade,
          dificuldade,
          data,
          descricao,
          template_id,
        } = await request.json();
        let template = null;
        if (template_id) {
          template = await env.DB.prepare(
            `SELECT id, nome, status, prioridade, dificuldade, descricao
             FROM templates_tarefa
             WHERE id = ? AND ativo = 1`
          ).bind(template_id).first();
          if (!template) return fail('Template não encontrado', 404);
        }
        const nomeFinal = (nome || template?.nome || '').trim();
        if (!nomeFinal) return fail('Nome obrigatório');
        const complexidadeVal = complexidade || dificuldade || template?.dificuldade || 'Moderada'; // accept both for compat
        const id = 'tsk_' + uid();
        await env.DB.prepare(
          `INSERT INTO tarefas (
            id, projeto_id, nome, status, prioridade, dificuldade, data, dono_id,
            descricao
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          projetoId,
          nomeFinal,
          status || template?.status || 'A fazer',
          prioridade || template?.prioridade || 'Média',
          complexidadeVal,
          data || null,
          u.uid,
          descricao?.trim() || template?.descricao || null
        ).run();
        return ok({ id });
      }
    }

    const matchTarefa = path.match(/^\/tarefas\/(tsk_\w+)$/);

    if (matchTarefa) {
      const tarefaId = matchTarefa[1];

      if (method === 'PUT') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const {
          nome,
          status,
          prioridade,
          complexidade,
          dificuldade,
          data,
          descricao,
        } = await request.json();
        const complexidadeVal = complexidade || dificuldade || 'Moderada';
        if (!nome?.trim()) return fail('Nome obrigatório');
        await env.DB.prepare(
          `UPDATE tarefas
           SET nome=?, status=?, prioridade=?, dificuldade=?, data=?,
               descricao=?,
               atualizado_em=datetime('now')
           WHERE id=?`
        ).bind(
          nome.trim(),
          status,
          prioridade,
          complexidadeVal,
          data || null,
          descricao?.trim() || null,
          tarefaId
        ).run();
        return ok({ ok: true });
      }


      // PUT /tarefas/:id/status — muda só o status, restrito a dono e colaboradores
      if (method === 'PATCH') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeCronometrar(env, tarefaId, u.uid, u.papel)) {
          return fail('Sem permissão — só o dono e colaboradores podem mudar o status', 403);
        }
        const { status } = await request.json();
        if (!status) return fail('Status obrigatório');
        await env.DB.prepare(
          'UPDATE tarefas SET status=?, atualizado_em=datetime("now") WHERE id=?'
        ).bind(status, tarefaId).run();
        return ok({ ok: true });
      }
      if (method === 'DELETE') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
        await env.DB.prepare('DELETE FROM tarefas WHERE id = ?').bind(tarefaId).run();
        return ok({ ok: true });
      }
    }

    const matchDuplicarTarefa = path.match(/^\/tarefas\/(tsk_\w+)\/duplicar$/);
    if (matchDuplicarTarefa && method === 'POST') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const tarefaId = matchDuplicarTarefa[1];
      if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
      const original = await env.DB.prepare(`
        SELECT projeto_id, nome, status, prioridade, dificuldade, data,
          descricao
        FROM tarefas
        WHERE id = ?
      `).bind(tarefaId).first();
      if (!original) return fail('Tarefa não encontrada', 404);
      const novoId = 'tsk_' + uid();
      await env.DB.prepare(`
        INSERT INTO tarefas (
          id, projeto_id, nome, status, prioridade, dificuldade, data, dono_id,
          descricao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        novoId,
        original.projeto_id,
        `${original.nome} (cópia)`,
        original.status,
        original.prioridade,
        original.dificuldade,
        original.data,
        u.uid,
        original.descricao
      ).run();
      return ok({ id: novoId });
    }

    // ── FOCO (C — batch para atomicidade) ──
    const matchFoco = path.match(/^\/tarefas\/(tsk_\w+)\/foco$/);

    if (matchFoco) {
      const tarefaId = matchFoco[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      if (method === 'PUT') {
        const tarefa = await env.DB.prepare('SELECT projeto_id, dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
        if (!tarefa) return fail('Tarefa não encontrada', 404);
        if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Só pode marcar foco nas suas tarefas', 403);
        // Usar batch para atomicidade: remove foco anterior e define novo numa operação
        await env.DB.batch([
          env.DB.prepare('UPDATE tarefas SET foco = 0 WHERE projeto_id = ? AND dono_id = ?').bind(tarefa.projeto_id, u.uid),
          env.DB.prepare('UPDATE tarefas SET foco = 1 WHERE id = ?').bind(tarefaId),
        ]);
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
        if (!tarefa) return fail('Tarefa não encontrada', 404);
        if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
        await env.DB.prepare('UPDATE tarefas SET foco = 0 WHERE id = ?').bind(tarefaId).run();
        return ok({ ok: true });
      }
    }

    // ── DECISÕES ──
    const matchDecisoesProj = path.match(/^\/projetos\/(prj_\w+)\/decisoes$/);

    if (matchDecisoesProj) {
      const projetoId = matchDecisoesProj[1];

      if (method === 'GET') {
        const [, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        const decisoes = await env.DB.prepare(
          `SELECT d.*, du.nome as dono_nome FROM decisoes d
           LEFT JOIN usuarios du ON du.id = d.dono_id
           WHERE d.projeto_id = ? ORDER BY d.data DESC, d.criado_em DESC`
        ).bind(projetoId).all();
        return ok(decisoes.results);
      }

      if (method === 'POST') {
        const [u, e] = await requireAuth(request, env);
        if (e) return fail('Não autorizado', 401);
        if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
        const { descricao, data } = await request.json();
        if (!descricao?.trim()) return fail('Descrição obrigatória');
        const id = 'dec_' + uid();
        await env.DB.prepare(
          'INSERT INTO decisoes (id, projeto_id, descricao, data, dono_id) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, projetoId, descricao.trim(), data || new Date().toISOString().slice(0, 10), u.uid).run();
        return ok({ id });
      }
    }

    const matchDecisao = path.match(/^\/decisoes\/(dec_\w+)$/);
    if (matchDecisao && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const d = await env.DB.prepare('SELECT dono_id, projeto_id FROM decisoes WHERE id = ?').bind(matchDecisao[1]).first();
      if (!d) return fail('Não encontrado', 404);
      if (d.dono_id !== u.uid && !await podeEditarProjeto(env, d.projeto_id, u.uid, u.papel)) return fail('Sem permissão', 403);
      await env.DB.prepare('DELETE FROM decisoes WHERE id = ?').bind(matchDecisao[1]).run();
      return ok({ ok: true });
    }

    if (matchDecisao && method === 'PUT') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const d = await env.DB.prepare('SELECT dono_id, projeto_id FROM decisoes WHERE id = ?').bind(matchDecisao[1]).first();
      if (!d) return fail('Não encontrado', 404);
      if (d.dono_id !== u.uid && !await podeEditarProjeto(env, d.projeto_id, u.uid, u.papel)) return fail('Sem permissão', 403);
      const { descricao, data } = await request.json();
      if (!descricao?.trim()) return fail('Descrição obrigatória', 400);
      await env.DB.prepare('UPDATE decisoes SET descricao = ?, data = ? WHERE id = ?')
        .bind(descricao.trim(), data || null, matchDecisao[1]).run();
      return ok({ ok: true });
    }



    // ── COLABORADORES DE TAREFA ──

    // GET /tarefas/:id/colaboradores
    const matchColabs = path.match(/^\/tarefas\/(tsk_\w+)\/colaboradores$/);
    if (matchColabs) {
      const tarefaId = matchColabs[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      if (method === 'GET') {
        const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
        if (!tarefa) return fail('Tarefa não encontrada', 404);
        const colabs = await env.DB.prepare(
          'SELECT u.id, u.nome, u.login as usuario_login FROM colaboradores_tarefa ct JOIN usuarios u ON u.id = ct.usuario_id WHERE ct.tarefa_id = ?'
        ).bind(tarefaId).all();
        return ok(colabs.results);
      }

      if (method === 'POST') {
        // Só o dono da tarefa ou admin pode adicionar colaboradores
        const tarefa = await env.DB.prepare(
          `SELECT t.dono_id, t.nome as tarefa_nome, p.nome as projeto_nome
           FROM tarefas t
           LEFT JOIN projetos p ON p.id = t.projeto_id
           WHERE t.id = ?`
        ).bind(tarefaId).first();
        if (!tarefa) return fail('Tarefa não encontrada', 404);
        if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
        const { usuario_id } = await request.json();
        if (usuario_id === tarefa.dono_id) return fail('Usuário já é dono da tarefa');
        await env.DB.prepare(
          'INSERT OR IGNORE INTO colaboradores_tarefa (tarefa_id, usuario_id) VALUES (?, ?)'
        ).bind(tarefaId, usuario_id).run();
        await criarNotificacaoCompartilhamento(env, {
          usuarioId: usuario_id,
          tipo: 'compartilhamento_recebido',
          escopo: 'tarefa',
          entidadeId: tarefaId,
          titulo: 'Tarefa compartilhada com você',
          mensagem: `Você foi adicionado à tarefa "${tarefa.tarefa_nome}"${tarefa.projeto_nome ? ` no projeto "${tarefa.projeto_nome}"` : ''}.`,
          atorId: u.uid,
        });
        return ok({ ok: true });
      }
    }

    const matchTarefaSair = path.match(/^\/tarefas\/(tsk_\w+)\/sair$/);
    if (matchTarefaSair && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const tarefaId = matchTarefaSair[1];
      const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
      if (!tarefa) return fail('Tarefa não encontrada', 404);
      if (tarefa.dono_id === u.uid) return fail('O dono não pode sair da própria tarefa', 400);
      const rm = await env.DB.prepare(
        'DELETE FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
      ).bind(tarefaId, u.uid).run();
      if (!(rm.meta?.changes > 0)) return fail('Você não é colaborador desta tarefa', 400);
      return ok({ ok: true });
    }

    // DELETE /tarefas/:id/colaboradores/:uid
    const matchColabDel = path.match(/^\/tarefas\/(tsk_\w+)\/colaboradores\/(usr_\w+)$/);
    if (matchColabDel && method === 'DELETE') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const [, tarefaId, usuarioId] = matchColabDel;
      const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
      if (!tarefa) return fail('Tarefa não encontrada', 404);
      if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      await env.DB.prepare(
        'DELETE FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
      ).bind(tarefaId, usuarioId).run();
      return ok({ ok: true });
    }

    // ── CRONÔMETRO ──

    // GET /tarefas/:id/tempo — listar sessões de cronômetro de uma tarefa
    const matchTempo = path.match(/^\/tarefas\/(tsk_\w+)\/tempo$/);
    if (matchTempo) {
      const tarefaId = matchTempo[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);

      if (method === 'GET') {
        // Admin vê sessões de todos; outros veem só as suas
        const filtroUsuario = isAdmin(u) ? null : u.uid;
        const sessoes = await env.DB.prepare(`
          SELECT st.*, tu.nome as usuario_nome,
            ROUND((
              CASE WHEN st.fim IS NULL
                THEN (julianday('now') - julianday(st.inicio)) * 24
                ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
              END
              -
              COALESCE((
                SELECT SUM(
                  CASE WHEN i.fim IS NULL THEN 0
                  ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                  END
                ) FROM intervalos i WHERE i.sessao_id = st.id
              ), 0)
            ), 4) as horas_liquidas
          FROM sessoes_tempo st
          LEFT JOIN usuarios tu ON tu.id = st.usuario_id
          WHERE st.tarefa_id = ? AND (? IS NULL OR st.usuario_id = ?)
          ORDER BY st.usuario_id, st.inicio DESC
        `).bind(tarefaId, filtroUsuario, filtroUsuario).all();

        const ids = (sessoes.results || []).map(s => s.id);
        if (!ids.length) return ok([]);
        const placeholders = ids.map(() => '?').join(',');
        const intervalosQ = await env.DB.prepare(
          `SELECT * FROM intervalos WHERE sessao_id IN (${placeholders}) ORDER BY sessao_id, inicio ASC`
        ).bind(...ids).all();
        const intervalosPorSessao = new Map();
        for (const it of (intervalosQ.results || [])) {
          if (!intervalosPorSessao.has(it.sessao_id)) intervalosPorSessao.set(it.sessao_id, []);
          intervalosPorSessao.get(it.sessao_id).push(it);
        }
        return ok(sessoes.results.map(s => ({ ...s, intervalos: intervalosPorSessao.get(s.id) || [] })));
      }

      if (method === 'POST') {
        // Verificar se usuário tem permissão para cronometrar esta tarefa
        if (!await podeCronometrar(env, tarefaId, u.uid, u.papel)) {
          return fail('Sem permissão — você precisa ser dono ou colaborador desta tarefa', 403);
        }
        const { inicio } = await request.json();
        const id = 'ste_' + uid();
        const inicioStr = inicio || new Date().toISOString().slice(0, 19).replace('T', ' ');
        await env.DB.prepare(
          'INSERT INTO sessoes_tempo (id, tarefa_id, usuario_id, inicio) VALUES (?, ?, ?, ?)'
        ).bind(id, tarefaId, u.uid, inicioStr).run();
        return ok({ id, inicio: inicioStr });
      }
    }

    // PUT /tempo/:id — atualizar sessão (editar início/fim)
    const matchTempoId = path.match(/^\/tempo\/(ste_\w+)$/);
    if (matchTempoId) {
      const sessaoId = matchTempoId[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const s = await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
      if (!s) return fail('Sessão não encontrada', 404);
      if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);

      if (method === 'PUT') {
        const { inicio, fim } = await request.json();
        await env.DB.prepare('UPDATE sessoes_tempo SET inicio=?, fim=? WHERE id=?')
          .bind(inicio, fim || null, sessaoId).run();
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM sessoes_tempo WHERE id = ?').bind(sessaoId).run();
        return ok({ ok: true });
      }
    }

    // PUT /tempo/:id/parar — parar cronômetro (define fim = agora)
    const matchTempoParar = path.match(/^\/tempo\/(ste_\w+)\/parar$/);
    if (matchTempoParar && method === 'PUT') {
      const sessaoId = matchTempoParar[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const s = await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
      if (!s) return fail('Sessão não encontrada', 404);
      if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      const { fim } = await request.json();
      const fimStr = fim || new Date().toISOString().slice(0, 19).replace('T', ' ');
      await env.DB.prepare('UPDATE sessoes_tempo SET fim=? WHERE id=?').bind(fimStr, sessaoId).run();
      return ok({ ok: true, fim: fimStr });
    }


    // GET /tarefas/:id/tempo/resumo — total de horas por usuário (para relatório)
    const matchTempoResumo = path.match(/^\/tarefas\/(tsk_\w+)\/tempo\/resumo$/);
    if (matchTempoResumo && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const tarefaId = matchTempoResumo[1];
      const resumo = await env.DB.prepare(`
        SELECT st.usuario_id, tu.nome as usuario_nome,
          ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            -
            COALESCE((
              SELECT SUM(
                CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
                END
              ) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2) as horas_liquidas
        FROM sessoes_tempo st
        LEFT JOIN usuarios tu ON tu.id = st.usuario_id
        WHERE st.tarefa_id = ?
        GROUP BY st.usuario_id, tu.nome
        ORDER BY horas_liquidas DESC
      `).bind(tarefaId).all();
      return ok(resumo.results);
    }

    // GET /tempo/ativas — sessões ativas do usuário (sem fim)
    if (path === '/tempo/ativas' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const asMember = url.searchParams.get('as_member') === '1';
      const adminScope = (isAdmin(u) && !asMember) ? 1 : 0;
      const ativas = await env.DB.prepare(`
        SELECT st.id, st.tarefa_id, st.inicio,
          t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id,
          tu.nome as usuario_nome, tu.login as usuario_login, st.usuario_id
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        JOIN usuarios tu ON tu.id = st.usuario_id
        WHERE (? = 1 OR st.usuario_id = ?) AND st.fim IS NULL
        ORDER BY st.inicio ASC
      `).bind(adminScope, u.uid).all();
      return ok(ativas.results);
    }

    // GET /tempo/colegas-ativos — colaboradores com cronômetro ativo (exceto o próprio)
    if (path === '/tempo/colegas-ativos' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const colegas = await env.DB.prepare(`
        SELECT st.id, st.inicio, st.usuario_id,
          tu.nome as usuario_nome,
          t.nome as tarefa_nome,
          p.nome as projeto_nome,
          p.id as projeto_id
        FROM sessoes_tempo st
        JOIN usuarios tu ON tu.id = st.usuario_id
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE st.fim IS NULL AND st.usuario_id != ?
        ORDER BY st.inicio ASC
      `).bind(u.uid).all();
      return ok(colegas.results);
    }

    // GET /tempo/ultima-sessao — última sessão concluída do usuário
    if (path === '/tempo/ultima-sessao' && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const row = await env.DB.prepare(`
        SELECT st.tarefa_id, t.nome as tarefa_nome,
               p.id as projeto_id, p.nome as projeto_nome,
               st.fim,
               ROUND((julianday(st.fim) - julianday(st.inicio)) * 24, 2) as horas
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN projetos p ON p.id = t.projeto_id
        WHERE st.usuario_id = ? AND st.fim IS NOT NULL
        ORDER BY st.fim DESC LIMIT 1
      `).bind(u.uid).first();
      return ok(row || null);
    }

    // ── PROJETO: HORAS POR USUÁRIO ──

    // GET /projetos/:id/relatorio — relatório agregado de horas por tarefa e usuário
    const matchRelatorio = path.match(/^\/projetos\/(prj_\w+)\/relatorio$/);
    if (matchRelatorio && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const projetoId = matchRelatorio[1];
      const proj = await env.DB.prepare(
        'SELECT dono_id FROM projetos WHERE id = ?'
      ).bind(projetoId).first();
      if (!proj) return fail('Não encontrado', 404);
      if (!isAdmin(u) && !(await podeEditarProjeto(env, projetoId, u.uid, u.papel)))
        return fail('Sem permissão', 403);

      const rows = await env.DB.prepare(`
        SELECT st.tarefa_id, tu.nome as usuario_nome,
          ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim)  - julianday(st.inicio)) * 24 END)
            - COALESCE((
                SELECT SUM(CASE WHEN i.fim IS NULL THEN 0
                  ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END)
                FROM intervalos i WHERE i.sessao_id = st.id
              ), 0)
          ), 2) as horas_liquidas
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        JOIN usuarios tu ON tu.id = st.usuario_id
        WHERE t.projeto_id = ?
        GROUP BY st.tarefa_id, st.usuario_id, tu.nome
        HAVING horas_liquidas > 0
        ORDER BY st.tarefa_id, horas_liquidas DESC
      `).bind(projetoId).all();

      const byTarefa = {};
      for (const row of rows.results) {
        (byTarefa[row.tarefa_id] = byTarefa[row.tarefa_id] || []).push(row);
      }
      return ok(byTarefa);
    }

    // GET /projetos/:id/horas-por-usuario — distribuição de horas por pessoa no projeto
    const matchHorasProjeto = path.match(/^\/projetos\/(prj_\w+)\/horas-por-usuario$/);
    if (matchHorasProjeto && method === 'GET') {
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const projetoId = matchHorasProjeto[1];

      const proj = await env.DB.prepare('SELECT id, dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
      if (!proj) return fail('Não encontrado', 404);

      if (!isAdmin(u) && proj.dono_id !== u.uid) {
        const permissao = await env.DB.prepare(
          'SELECT 1 as ok FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ? LIMIT 1'
        ).bind(projetoId, u.uid).first();
        if (!permissao) return fail('Sem permissão', 403);
      }

      const resumo = await env.DB.prepare(`
        SELECT tu.nome as usuario_nome,
          ROUND(SUM(
            (CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END)
            - COALESCE((
              SELECT SUM(CASE WHEN i.fim IS NULL THEN 0
                ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
              END) FROM intervalos i WHERE i.sessao_id = st.id
            ), 0)
          ), 2) as horas
        FROM sessoes_tempo st
        JOIN tarefas t ON t.id = st.tarefa_id
        LEFT JOIN usuarios tu ON tu.id = st.usuario_id
        WHERE t.projeto_id = ?
        GROUP BY st.usuario_id, tu.nome
        HAVING horas > 0
        ORDER BY horas DESC
      `).bind(projetoId).all();
      return ok(resumo.results);
    }

    // ── INTERVALOS ──

    // POST /tempo/:id/intervalos — adicionar intervalo a uma sessão
    const matchIntervalos = path.match(/^\/tempo\/(ste_\w+)\/intervalos$/);
    if (matchIntervalos && method === 'POST') {
      const sessaoId = matchIntervalos[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const s = await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
      if (!s) return fail('Sessão não encontrada', 404);
      if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
      const { tipo, inicio, fim } = await request.json();
      if (!tipo?.trim()) return fail('Tipo obrigatório');
      const id = 'int_' + uid();
      const inicioStr = inicio || new Date().toISOString().slice(0, 19).replace('T', ' ');
      await env.DB.prepare(
        'INSERT INTO intervalos (id, sessao_id, tipo, inicio, fim) VALUES (?, ?, ?, ?, ?)'
      ).bind(id, sessaoId, tipo.trim(), inicioStr, fim || null).run();
      return ok({ id, tipo, inicio: inicioStr, fim: fim || null });
    }

    // PUT /intervalos/:id — editar intervalo
    const matchIntervalo = path.match(/^\/intervalos\/(int_\w+)$/);
    if (matchIntervalo) {
      const intervaloId = matchIntervalo[1];
      const [u, e] = await requireAuth(request, env);
      if (e) return fail('Não autorizado', 401);
      const iv = await env.DB.prepare(
        'SELECT i.*, st.usuario_id FROM intervalos i JOIN sessoes_tempo st ON st.id = i.sessao_id WHERE i.id = ?'
      ).bind(intervaloId).first();
      if (!iv) return fail('Intervalo não encontrado', 404);
      if (iv.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);

      if (method === 'PUT') {
        const { tipo, inicio, fim } = await request.json();
        await env.DB.prepare('UPDATE intervalos SET tipo=?, inicio=?, fim=? WHERE id=?')
          .bind(tipo, inicio, fim || null, intervaloId).run();
        return ok({ ok: true });
      }

      if (method === 'DELETE') {
        await env.DB.prepare('DELETE FROM intervalos WHERE id = ?').bind(intervaloId).run();
        return ok({ ok: true });
      }
    }

    return fail('Rota não encontrada', 404);

    } catch (ex) {
      const duration = Date.now() - startedAt;
      console.error('[Worker Error]', { reqId, method, path, duration_ms: duration, message: ex?.message, stack: ex?.stack });
      return err('Erro interno do servidor', 500, getCors(request, env), responseHeaders);
    }
  },
};
