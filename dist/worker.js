var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/backend/http/responses.js
function getCors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "https://telier.pages.dev";
  const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  const allowedOrigin = origin === allowed || isLocalhost ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Vary": "Origin"
  };
}
__name(getCors, "getCors");
function json(data, status = 200, cors = {}, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extraHeaders }
  });
}
__name(json, "json");
function err(msg, status = 400, cors = {}, extraHeaders = {}) {
  return json({ error: msg }, status, cors, extraHeaders);
}
__name(err, "err");
var GLOBAL_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};
function ok(data, status = 200, extraHeaders = {}) {
  return json(data, status, GLOBAL_CORS, extraHeaders);
}
__name(ok, "ok");
function fail(msg, status = 400, extraHeaders = {}) {
  return err(msg, status, GLOBAL_CORS, extraHeaders);
}
__name(fail, "fail");

// src/backend/schema/migrations.js
async function ensureAllSchemas(env) {
  if (env._schemaChecked) return;
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
  const getVersion = /* @__PURE__ */ __name(async () => {
    try {
      const row = await env.DB.prepare("SELECT MAX(version) as v FROM schema_migrations").first();
      return row?.v || 0;
    } catch {
      return 0;
    }
  }, "getVersion");
  const v = await getVersion();
  let currentStep = v;
  const runMigration = /* @__PURE__ */ __name(async (version, sqlArray) => {
    if (currentStep >= version) return;
    console.log(`[schema] rodando migra\xE7\xE3o v${version}...`);
    try {
      for (const sql of sqlArray) {
        await env.DB.prepare(sql).run();
      }
      await env.DB.prepare("INSERT INTO schema_migrations (version) VALUES (?)").bind(version).run();
      currentStep = version;
    } catch (e) {
      console.error(`[schema] Falha na migra\xE7\xE3o v${version}:`, e.message);
    }
  }, "runMigration");
  await runMigration(1, [
    `CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, nome TEXT NOT NULL, login TEXT UNIQUE NOT NULL, senha_hash TEXT NOT NULL, deve_trocar_senha INTEGER NOT NULL DEFAULT 0, papel TEXT NOT NULL DEFAULT 'membro', criado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS sessoes (id TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT, expira_em TEXT NOT NULL)`
  ]);
  await runMigration(2, [
    `CREATE TABLE IF NOT EXISTS grupos_projetos (id TEXT PRIMARY KEY, nome TEXT NOT NULL, descricao TEXT, status TEXT NOT NULL DEFAULT 'Ativo', dono_id TEXT NOT NULL REFERENCES usuarios(id), ordem INTEGER DEFAULT 0, criado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS permissoes_grupo (grupo_id TEXT NOT NULL REFERENCES grupos_projetos(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em TEXT DEFAULT (datetime('now')), PRIMARY KEY (grupo_id, usuario_id))`,
    `CREATE TABLE IF NOT EXISTS projetos (id TEXT PRIMARY KEY, nome TEXT NOT NULL, fase TEXT NOT NULL DEFAULT 'Estudo preliminar', status TEXT NOT NULL DEFAULT 'Em andamento', prioridade TEXT NOT NULL DEFAULT 'M\xE9dia', prazo TEXT, area_m2 REAL, grupo_id TEXT REFERENCES grupos_projetos(id) ON DELETE SET NULL, dono_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now')))`
  ]);
  await runMigration(3, [
    `CREATE TABLE IF NOT EXISTS permissoes_projeto (projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, nivel TEXT NOT NULL DEFAULT 'editor', origem TEXT NOT NULL DEFAULT 'manual', criado_em TEXT DEFAULT (datetime('now')), PRIMARY KEY (projeto_id, usuario_id))`,
    `CREATE TABLE IF NOT EXISTS recusas_projeto (projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em TEXT DEFAULT (datetime('now')), PRIMARY KEY (projeto_id, usuario_id))`,
    `CREATE TABLE IF NOT EXISTS notificacoes (id TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, tipo TEXT NOT NULL, escopo TEXT NOT NULL, entidade_id TEXT, titulo TEXT NOT NULL, mensagem TEXT, ator_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL, lida_em TEXT, criado_em TEXT DEFAULT (datetime('now')))`
  ]);
  await runMigration(4, [
    `CREATE TABLE IF NOT EXISTS tarefas (id TEXT PRIMARY KEY, projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, nome TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'A fazer', prioridade TEXT NOT NULL DEFAULT 'M\xE9dia', dificuldade TEXT NOT NULL DEFAULT 'Moderada', descricao TEXT, data TEXT, foco INTEGER NOT NULL DEFAULT 0, dono_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS templates_tarefa (id TEXT PRIMARY KEY, nome TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'A fazer', prioridade TEXT NOT NULL DEFAULT 'M\xE9dia', dificuldade TEXT NOT NULL DEFAULT 'Moderada', descricao TEXT, criado_por TEXT NOT NULL REFERENCES usuarios(id), ativo INTEGER NOT NULL DEFAULT 1, criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS colaboradores_tarefa (tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, adicionado_em TEXT DEFAULT (datetime('now')), PRIMARY KEY (tarefa_id, usuario_id))`,
    `CREATE TABLE IF NOT EXISTS sessoes_tempo (id TEXT PRIMARY KEY, tarefa_id TEXT NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE, usuario_id TEXT NOT NULL REFERENCES usuarios(id), inicio TEXT NOT NULL, fim TEXT, criado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS intervalos (id TEXT PRIMARY KEY, sessao_id TEXT NOT NULL REFERENCES sessoes_tempo(id) ON DELETE CASCADE, tipo TEXT NOT NULL, inicio TEXT NOT NULL, fim TEXT, criado_em TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS decisoes (id TEXT PRIMARY KEY, projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE, descricao TEXT NOT NULL, data TEXT DEFAULT (date('now')), dono_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT DEFAULT (datetime('now')))`
  ]);
  await runMigration(5, [
    `CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em ON sessoes(expira_em)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_permissoes_projeto_usuario ON permissoes_projeto(usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_permissoes_grupo_usuario ON permissoes_grupo(usuario_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_usuario_data ON notificacoes(usuario_id, criado_em DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_notif_usuario_lida ON notificacoes(usuario_id, lida_em)`,
    `CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_tarefa ON sessoes_tempo(tarefa_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_fim ON sessoes_tempo(fim)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_sessoes_tempo_usuario_ativa ON sessoes_tempo(usuario_id) WHERE fim IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_intervalos_sessao ON intervalos(sessao_id)`,
    `CREATE INDEX IF NOT EXISTS idx_colab_tarefa ON colaboradores_tarefa(tarefa_id)`
  ]);
  const runSoftAlters = /* @__PURE__ */ __name(async () => {
    const alters = [
      "ALTER TABLE projetos ADD COLUMN grupo_id TEXT REFERENCES grupos_projetos(id) ON DELETE SET NULL",
      "ALTER TABLE grupos_projetos ADD COLUMN descricao TEXT",
      'ALTER TABLE grupos_projetos ADD COLUMN status TEXT DEFAULT "Ativo"',
      'ALTER TABLE permissoes_projeto ADD COLUMN origem TEXT DEFAULT "manual"',
      "ALTER TABLE tarefas ADD COLUMN descricao TEXT",
      "ALTER TABLE usuarios ADD COLUMN deve_trocar_senha INTEGER NOT NULL DEFAULT 0",
      "ALTER TABLE sessoes ADD COLUMN criado_em TEXT DEFAULT NULL"
    ];
    for (const alt of alters) {
      try {
        await env.DB.prepare(alt).run();
      } catch {
      }
    }
  }, "runSoftAlters");
  if (currentStep < 6) {
    console.log(`[schema] rodando migra\xE7\xE3o soft alters v6...`);
    await runSoftAlters();
    try {
      await env.DB.prepare('UPDATE permissoes_projeto SET origem = "manual" WHERE origem IS NULL').run();
    } catch {
    }
    await env.DB.prepare("INSERT INTO schema_migrations (version) VALUES (6)").run();
    currentStep = 6;
  }
  await runMigration(7, [
    `CREATE INDEX IF NOT EXISTS idx_projetos_grupo_status ON projetos(grupo_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_tarefas_projeto_dono ON tarefas(projeto_id, dono_id)`,
    `CREATE INDEX IF NOT EXISTS idx_projetos_dono ON projetos(dono_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_tempo_usuario_tarefa ON sessoes_tempo(usuario_id, tarefa_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessoes_tempo_inicio_fim ON sessoes_tempo(inicio, fim)`
  ]);
  env.DB.prepare("DELETE FROM sessoes WHERE expira_em < datetime('now', '-1 day')").run().catch(() => {
  });
  env._schemaChecked = true;
}
__name(ensureAllSchemas, "ensureAllSchemas");

// src/backend/http/request.js
var MAX_BODY_BYTES = 64 * 1024;
async function readJsonBody(request) {
  const ct = (request.headers.get("Content-Type") || "").split(";")[0].trim();
  if (ct && ct !== "application/json") {
    throw Object.assign(new Error("Content-Type deve ser application/json"), { status: 415 });
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Payload too large"), { status: 413 });
  }
  const arrayBuf = await request.arrayBuffer();
  if (arrayBuf.byteLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Payload too large"), { status: 413 });
  }
  try {
    return JSON.parse(new TextDecoder().decode(arrayBuf));
  } catch {
    throw Object.assign(new Error("JSON inv\xE1lido"), { status: 400 });
  }
}
__name(readJsonBody, "readJsonBody");
function getClientIp(request) {
  return (request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown").split(",")[0].trim();
}
__name(getClientIp, "getClientIp");
function toInt(v, fallback = 1) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
__name(toInt, "toInt");
function getPagination(url, defaultSize = 100, maxSize = 500) {
  const page = toInt(url.searchParams.get("page"), 1);
  const pageSize = Math.min(toInt(url.searchParams.get("page_size"), defaultSize), maxSize);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}
__name(getPagination, "getPagination");

// src/backend/utils/format.js
function uid() {
  return crypto.randomUUID().replace(/-/g, "");
}
__name(uid, "uid");
function sessaoUid() {
  return crypto.randomUUID().replace(/-/g, "");
}
__name(sessaoUid, "sessaoUid");
function nowStr(d = /* @__PURE__ */ new Date()) {
  return d.toISOString().slice(0, 19).replace("T", " ");
}
__name(nowStr, "nowStr");

// src/backend/utils/validation.js
function clampStr(value, max, fieldName) {
  if (value === void 0 || value === null) return value;
  const s = String(value);
  if (s.length > max) throw Object.assign(
    new Error(`Campo "${fieldName}" excede o limite de ${max} caracteres`),
    { status: 400 }
  );
  return s;
}
__name(clampStr, "clampStr");
function validateDate(value, fieldName) {
  if (value === void 0 || value === null || value === "") return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw Object.assign(new Error(`Campo "${fieldName}" deve ser uma data v\xE1lida (YYYY-MM-DD)`), { status: 400 });
  }
  return s;
}
__name(validateDate, "validateDate");
function validatePositiveNumber(value, fieldName) {
  if (value === void 0 || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`Campo "${fieldName}" deve ser um n\xFAmero positivo`), { status: 400 });
  }
  return n;
}
__name(validatePositiveNumber, "validatePositiveNumber");
function parseDatetimeStr(str, fieldName, obrigatorio = false) {
  if (!str && obrigatorio) throw Object.assign(new Error(`Campo "${fieldName}" \xE9 obrigat\xF3rio`), { status: 400 });
  if (!str) return null;
  let s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s.replace(" ", "T") + "Z";
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    throw Object.assign(new Error(`Campo "${fieldName}" n\xE3o \xE9 uma data/hora v\xE1lida`), { status: 400 });
  }
  return d.toISOString().slice(0, 19).replace("T", " ");
}
__name(parseDatetimeStr, "parseDatetimeStr");
function validarJanela(inicioStr, fimStr, contexto) {
  if (!inicioStr || !fimStr) return;
  if (fimStr < inicioStr) {
    throw Object.assign(new Error(`Data de fim n\xE3o pode ser anterior ao in\xEDcio (${contexto})`), { status: 400 });
  }
}
__name(validarJanela, "validarJanela");
function validarContencao(inicioStr, fimStr, paiInicioStr, paiFimStr) {
  if (inicioStr < paiInicioStr) {
    throw Object.assign(new Error(`In\xEDcio n\xE3o pode ser anterior ao in\xEDcio da sess\xE3o pai`), { status: 400 });
  }
  if (paiFimStr) {
    if (!fimStr) {
      throw Object.assign(new Error(`N\xE3o \xE9 poss\xEDvel conter evento em aberto em uma sess\xE3o j\xE1 encerrada`), { status: 400 });
    }
    if (fimStr > paiFimStr) {
      throw Object.assign(new Error(`Fim n\xE3o pode ultrapassar o encerramento da sess\xE3o pai`), { status: 400 });
    }
  }
}
__name(validarContencao, "validarContencao");

// src/backend/domain/auth/crypto.js
var PBKDF2_ITER = 1e4;
var PBKDF2_ALGO = "SHA-256";
var LEGACY_PLAIN = "legacy_plain";
var MIN_PASSWORD = 8;
var MAX_PASSWORD = 256;
function fromBase64(str) {
  const bin = atob(str || "");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(fromBase64, "fromBase64");
function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length >>> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
__name(hexToBytes, "hexToBytes");
async function sha256Hex(data) {
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
async function pbkdf2Hash(senha, saltBytes, iter = PBKDF2_ITER) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(String(senha || "")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: PBKDF2_ALGO, salt: saltBytes, iterations: iter }, key, 256);
  return new Uint8Array(bits);
}
__name(pbkdf2Hash, "pbkdf2Hash");
async function hashSenha(senha) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const enc = new TextEncoder();
  const hash = await sha256Hex(enc.encode(salt + ":" + String(senha)));
  return `sha256v1$${salt}$${hash}`;
}
__name(hashSenha, "hashSenha");
function parseHash(stored) {
  const s = String(stored || "");
  if (!s.startsWith("pbkdf2$")) return null;
  const parts = s.split("$");
  if (parts.length !== 4) return null;
  const iter = Number(parts[1]);
  if (!Number.isFinite(iter) || iter < 1) return null;
  try {
    return { iter, salt: fromBase64(parts[2]), hash: fromBase64(parts[3]) };
  } catch {
    return null;
  }
}
__name(parseHash, "parseHash");
async function verificarSenha(senha, stored) {
  const s = String(stored || "");
  if (s.startsWith("sha256v1$")) {
    const parts = s.split("$");
    if (parts.length !== 3) return { ok: false, mode: "sha256v1" };
    const [, salt, storedHash] = parts;
    const enc = new TextEncoder();
    const calc = await sha256Hex(enc.encode(salt + ":" + String(senha)));
    return { ok: timingSafeEqual(hexToBytes(calc), hexToBytes(storedHash)), mode: "sha256v1" };
  }
  const parsed = parseHash(s);
  if (parsed) {
    try {
      const calc = await pbkdf2Hash(senha, parsed.salt, parsed.iter);
      return { ok: timingSafeEqual(calc, parsed.hash), mode: "pbkdf2" };
    } catch {
      return { ok: false, mode: "pbkdf2" };
    }
  }
  return { ok: String(senha) === s, mode: LEGACY_PLAIN };
}
__name(verificarSenha, "verificarSenha");

// src/backend/domain/auth/session.js
var RATE_WINDOW_MS = 6e4;
var RATE_AUTH_LIMIT = 12;
var _rateBuckets = /* @__PURE__ */ new Map();
function checkRateLimit(request, scope, limit = RATE_AUTH_LIMIT, windowMs = RATE_WINDOW_MS) {
  const ip = getClientIp(request);
  const now = Date.now();
  const key = `${scope}:${ip}`;
  if (_rateBuckets.size > 2e3) {
    for (const [k, b] of _rateBuckets) {
      if (now > b.resetAt) _rateBuckets.delete(k);
    }
  }
  let bucket = _rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    _rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
__name(checkRateLimit, "checkRateLimit");
async function getUsuario(request, env) {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  return await env.DB.prepare(
    `SELECT s.id as sessao_id, u.id as uid, u.nome, u.login, u.papel, COALESCE(u.deve_trocar_senha, 0) as deve_trocar_senha
     FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id
     WHERE s.id = ? AND s.expira_em > datetime('now')`
  ).bind(token).first();
}
__name(getUsuario, "getUsuario");
async function requireAuth(request, env) {
  const u = await getUsuario(request, env);
  if (!u) return [null, 401];
  return [u, null];
}
__name(requireAuth, "requireAuth");
function isAdmin(u) {
  return u?.papel === "admin";
}
__name(isAdmin, "isAdmin");

// src/backend/domain/auth/controllers.js
async function handleAuthRegister(request, env, cors, responseHeaders) {
  if (!checkRateLimit(request, "register", 3, 36e5)) {
    return fail("Muitas tentativas de registro. Tente novamente mais tarde.", 429);
  }
  const existUser = await env.DB.prepare("SELECT 1 FROM usuarios LIMIT 1").first();
  if (existUser) {
    return fail("O registro est\xE1 fechado. Pe\xE7a ao administrador para criar sua conta.", 403);
  }
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const login = clampStr(_body.login, 100, "login")?.toLowerCase().trim().replace(/\s+/g, "_");
  const senhaStr = clampStr(_body.senha, MAX_PASSWORD, "senha");
  if (!nome?.trim() || !login || !senhaStr) return fail("Nome, login e senha obrigat\xF3rios", 400);
  if (senhaStr.length < MIN_PASSWORD) {
    return fail(`A senha deve ter no m\xEDnimo ${MIN_PASSWORD} caracteres`, 400);
  }
  const senhaSalva = await hashSenha(senhaStr);
  const id = "usr_" + uid();
  await env.DB.prepare(
    'INSERT INTO usuarios (id, nome, login, senha_hash, papel, deve_trocar_senha) VALUES (?, ?, ?, ?, "admin", 0)'
  ).bind(id, nome.trim(), login, senhaSalva).run();
  const sessaoId = sessaoUid();
  const expira = nowStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3));
  await env.DB.prepare(
    "INSERT INTO sessoes (id, usuario_id, criado_em, expira_em) VALUES (?, ?, ?, ?)"
  ).bind(sessaoId, id, nowStr(), expira).run();
  return ok({
    token: sessaoId,
    usuario: { id, nome: nome.trim(), usuario_login: login, papel: "admin" }
  });
}
__name(handleAuthRegister, "handleAuthRegister");
async function handleAuthLogin(request, env, cors, responseHeaders) {
  const ip = getClientIp(request);
  const key = `auth_login:${ip}`;
  if (!checkRateLimit(request, "auth_login", 10)) {
    const bucket = _rateBuckets.get(key);
    const retryAfter = bucket ? Math.ceil((bucket.resetAt - Date.now()) / 1e3) : 60;
    return err("Muitas tentativas de login. Aguarde um minuto.", 429, cors, { ...responseHeaders, "Retry-After": String(retryAfter) });
  }
  const _body = await readJsonBody(request);
  const usuario_login = clampStr(_body.usuario_login, 60, "usuario_login");
  const senha = clampStr(_body.senha, MAX_PASSWORD, "senha");
  if (!usuario_login || !senha) return fail("Usu\xE1rio e senha obrigat\xF3rios");
  const login = usuario_login.toLowerCase().trim().replace(/\s+/g, "_");
  const usuario = await env.DB.prepare("SELECT * FROM usuarios WHERE login = ?").bind(login).first();
  if (!usuario) return fail("Credenciais inv\xE1lidas", 401);
  const senhaValida = await verificarSenha(senha, usuario.senha_hash);
  if (!senhaValida.ok) return fail("Credenciais inv\xE1lidas", 401);
  const needsRehash = !String(usuario.senha_hash || "").startsWith("sha256v1$");
  if (needsRehash) {
    try {
      const hashNovo = await hashSenha(senha);
      await env.DB.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").bind(hashNovo, usuario.id).run();
    } catch (e) {
      console.error("[auth] password rehash failed", e?.message);
    }
  }
  const sessaoId = sessaoUid();
  const expira = nowStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3));
  await env.DB.prepare(
    "INSERT INTO sessoes (id, usuario_id, criado_em, expira_em) VALUES (?, ?, ?, ?)"
  ).bind(sessaoId, usuario.id, nowStr(), expira).run();
  return ok({
    token: sessaoId,
    must_change_password: Number(usuario.deve_trocar_senha || 0) === 1,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      usuario_login: usuario.login,
      papel: usuario.papel,
      deve_trocar_senha: Number(usuario.deve_trocar_senha || 0)
    }
  });
}
__name(handleAuthLogin, "handleAuthLogin");
async function handleAuthLogout(request, env, cors) {
  const [u] = await requireAuth(request, env);
  if (u) await env.DB.prepare("DELETE FROM sessoes WHERE id = ?").bind(u.sessao_id).run();
  return ok({ ok: true });
}
__name(handleAuthLogout, "handleAuthLogout");
async function handleAuthMe(request, env, cors) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  return ok({
    id: u.uid,
    nome: u.nome,
    usuario_login: u.login,
    papel: u.papel,
    deve_trocar_senha: Number(u.deve_trocar_senha || 0)
  });
}
__name(handleAuthMe, "handleAuthMe");
async function handleAuthTrocarSenha(request, env, cors) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const _body = await readJsonBody(request);
  const senha_atual = clampStr(_body.senha_atual, MAX_PASSWORD, "senha_atual");
  const nova_senha = clampStr(_body.nova_senha, MAX_PASSWORD, "nova_senha");
  if (!senha_atual || !nova_senha) return fail("Informe senha atual e nova senha", 400);
  if (nova_senha.length < MIN_PASSWORD) return fail(`A senha deve ter no m\xEDnimo ${MIN_PASSWORD} caracteres`, 400);
  const row = await env.DB.prepare("SELECT senha_hash FROM usuarios WHERE id = ?").bind(u.uid).first();
  if (!row) return fail("Usu\xE1rio n\xE3o encontrado", 404);
  const senhaValida = await verificarSenha(senha_atual, row.senha_hash);
  if (!senhaValida.ok) return fail("Senha atual inv\xE1lida", 401);
  const novaHash = await hashSenha(nova_senha);
  await env.DB.batch([
    env.DB.prepare("UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = 0 WHERE id = ?").bind(novaHash, u.uid),
    env.DB.prepare("DELETE FROM sessoes WHERE usuario_id = ? AND id <> ?").bind(u.uid, u.sessao_id)
  ]);
  return ok({ ok: true });
}
__name(handleAuthTrocarSenha, "handleAuthTrocarSenha");

// src/backend/domain/users/controllers.js
async function handleGetUsuarios(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const { pageSize, offset } = getPagination(url, 200, 1e3);
  const totalQ = await env.DB.prepare("SELECT COUNT(*) as total FROM usuarios").first();
  const totalRows = totalQ?.total || 0;
  const lista = await env.DB.prepare("SELECT id, nome, login as usuario_login, papel FROM usuarios ORDER BY nome LIMIT ? OFFSET ?").bind(pageSize, offset).all();
  return ok(lista.results, 200, { "Cache-Control": "private, max-age=30", "X-Total-Count": String(totalRows) });
}
__name(handleGetUsuarios, "handleGetUsuarios");
async function handlePostUsuarios(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const usuario_login = clampStr(_body.usuario_login, 60, "usuario_login");
  const senha = clampStr(_body.senha, MAX_PASSWORD, "senha");
  const papel = clampStr(_body.papel ?? "membro", 80, "papel");
  if (!nome || !usuario_login || !senha) return fail("Campos obrigat\xF3rios");
  if (senha.length < MIN_PASSWORD) return fail(`A senha deve ter no m\xEDnimo ${MIN_PASSWORD} caracteres`, 400);
  const login = usuario_login.toLowerCase().trim().replace(/\s+/g, "_");
  const existing = await env.DB.prepare("SELECT id FROM usuarios WHERE login = ?").bind(login).first();
  if (existing) return fail("Nome de usu\xE1rio j\xE1 existe");
  const hash = await hashSenha(senha);
  const id = "usr_" + uid();
  await env.DB.prepare(
    "INSERT INTO usuarios (id, nome, login, senha_hash, papel, deve_trocar_senha) VALUES (?, ?, ?, ?, ?, 1)"
  ).bind(id, nome.trim(), login, hash, papel).run();
  return ok({ id, nome, usuario_login: login, papel });
}
__name(handlePostUsuarios, "handlePostUsuarios");
async function handlePutUsuarioPapel(request, env, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const papel = clampStr(_body.papel, 80, "papel");
  if (!["admin", "membro"].includes(papel)) return fail("Papel inv\xE1lido");
  const alvo = await env.DB.prepare("SELECT id, papel FROM usuarios WHERE id = ?").bind(usuarioId).first();
  if (!alvo) return fail("Usu\xE1rio n\xE3o encontrado", 404);
  if (alvo.id === u.uid && papel !== "admin") return fail("Voc\xEA n\xE3o pode remover seu pr\xF3prio papel admin");
  await env.DB.prepare("UPDATE usuarios SET papel = ? WHERE id = ?").bind(papel, usuarioId).run();
  await env.DB.prepare("DELETE FROM sessoes WHERE usuario_id = ?").bind(usuarioId).run();
  return ok({ ok: true, id: usuarioId, papel });
}
__name(handlePutUsuarioPapel, "handlePutUsuarioPapel");
async function handlePutUsuarioSenha(request, env, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const nova_senha = clampStr(_body.nova_senha, MAX_PASSWORD, "nova_senha");
  const exigir_troca = _body.exigir_troca === void 0 ? true : !!_body.exigir_troca;
  if (!nova_senha) return fail("Nova senha \xE9 obrigat\xF3ria", 400);
  if (nova_senha.length < MIN_PASSWORD) return fail(`A senha deve ter no m\xEDnimo ${MIN_PASSWORD} caracteres`, 400);
  const alvo = await env.DB.prepare("SELECT id FROM usuarios WHERE id = ?").bind(usuarioId).first();
  if (!alvo) return fail("Usu\xE1rio n\xE3o encontrado", 404);
  const hash = await hashSenha(nova_senha);
  await env.DB.batch([
    env.DB.prepare("UPDATE usuarios SET senha_hash = ?, deve_trocar_senha = ? WHERE id = ?").bind(hash, exigir_troca ? 1 : 0, usuarioId),
    env.DB.prepare("DELETE FROM sessoes WHERE usuario_id = ?").bind(usuarioId)
  ]);
  return ok({ ok: true });
}
__name(handlePutUsuarioSenha, "handlePutUsuarioSenha");

// src/backend/domain/projects/permissions.js
var STATUS_PROJ_VALIDOS = ["A fazer", "Em andamento", "Em revis\xE3o", "Pausado", "Conclu\xEDdo", "Arquivado"];
var STATUS_PROJ_VALIDOS_SET = new Set(STATUS_PROJ_VALIDOS);
function normalizarStatusProjeto(status) {
  if (!status) return status;
  const s = String(status).trim();
  if (s === "Conclu\xEDda") return "Conclu\xEDdo";
  if (s === "Aguardando aprova\xE7\xE3o") return "Em revis\xE3o";
  return s;
}
__name(normalizarStatusProjeto, "normalizarStatusProjeto");
async function podeEditarProjeto(env, projetoId, usuarioId, papel) {
  if (papel === "admin") return true;
  const [proj, recusado, perm] = await env.DB.batch([
    env.DB.prepare("SELECT dono_id, grupo_id FROM projetos WHERE id = ?").bind(projetoId),
    env.DB.prepare("SELECT 1 as ok FROM recusas_projeto WHERE projeto_id = ? AND usuario_id = ?").bind(projetoId, usuarioId),
    env.DB.prepare("SELECT 1 as ok FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?").bind(projetoId, usuarioId)
  ]);
  const projRow = proj.results[0];
  if (!projRow) return false;
  if (projRow.dono_id === usuarioId) return true;
  if (recusado.results[0]) return false;
  if (perm.results[0]) return true;
  if (projRow.grupo_id) {
    const gperm = await env.DB.prepare("SELECT 1 FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?").bind(projRow.grupo_id, usuarioId).first();
    if (gperm) return true;
  }
  return false;
}
__name(podeEditarProjeto, "podeEditarProjeto");
async function validarVinculoGrupo(env, grupoId, usuarioId, papel) {
  if (!grupoId) return { ok: true };
  const grp = await env.DB.prepare("SELECT dono_id FROM grupos_projetos WHERE id = ?").bind(grupoId).first();
  if (!grp) return { ok: false, status: 404, erro: "Grupo n\xE3o encontrado" };
  if (papel === "admin" || grp.dono_id === usuarioId) return { ok: true };
  const p = await env.DB.prepare("SELECT 1 FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?").bind(grupoId, usuarioId).first();
  if (!p) return { ok: false, status: 403, erro: "Sem permiss\xE3o para vincular projeto a este grupo" };
  return { ok: true };
}
__name(validarVinculoGrupo, "validarVinculoGrupo");
async function syncProjetoPermissoesGrupo(env, projetoId, grupoId, donoId = null) {
  if (!projetoId) return;
  let ownerId = donoId;
  if (!ownerId) {
    const projeto = await env.DB.prepare("SELECT dono_id FROM projetos WHERE id = ?").bind(projetoId).first();
    ownerId = projeto?.dono_id || null;
  }
  if (!grupoId) {
    await env.DB.prepare('DELETE FROM permissoes_projeto WHERE projeto_id = ? AND origem = "grupo"').bind(projetoId).run();
    return;
  }
  await env.DB.prepare(`
    INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, nivel, origem)
    SELECT ?, pg.usuario_id, 'editor', 'grupo'
    FROM permissoes_grupo pg
    WHERE pg.grupo_id = ? AND (? IS NULL OR pg.usuario_id <> ?)
      AND NOT EXISTS (
        SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = ? AND rp.usuario_id = pg.usuario_id
      )
  `).bind(projetoId, grupoId, ownerId, ownerId, projetoId).run();
  await env.DB.prepare(`
    DELETE FROM permissoes_projeto WHERE projeto_id = ? AND origem = 'grupo'
      AND usuario_id NOT IN (SELECT pg.usuario_id FROM permissoes_grupo pg WHERE pg.grupo_id = ?)
  `).bind(projetoId, grupoId).run();
}
__name(syncProjetoPermissoesGrupo, "syncProjetoPermissoesGrupo");

// src/backend/domain/projects/controllers.js
function criarNotificacaoCompartilhamento(env, { usuarioId, tipo, escopo, entidadeId, titulo, mensagem, atorId }) {
  const nid = "ntf_" + uid();
  return env.DB.prepare(
    "INSERT INTO notificacoes (id, usuario_id, tipo, escopo, entidade_id, titulo, mensagem, ator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(nid, usuarioId, tipo, escopo, entidadeId || null, titulo, mensagem || null, atorId || null).run().catch(console.error);
}
__name(criarNotificacaoCompartilhamento, "criarNotificacaoCompartilhamento");
async function handleGetProjetos(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const statusFiltroRaw = url.searchParams.get("status") || null;
  const statusFiltro = statusFiltroRaw ? normalizarStatusProjeto(statusFiltroRaw) : null;
  if (statusFiltro && !STATUS_PROJ_VALIDOS_SET.has(statusFiltro)) return fail("Status de projeto inv\xE1lido", 400);
  const asMember = url.searchParams.get("as_member") === "1";
  const adminScope = isAdmin(u) && !asMember ? 1 : 0;
  const { pageSize, offset } = getPagination(url, 200, 500);
  const filterSql = `(? = 1 OR p.dono_id = ? OR (NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?) AND (EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)))) AND (? IS NULL OR p.status = ?)`;
  const binds = [adminScope, u.uid, u.uid, u.uid, u.uid, statusFiltro, statusFiltro];
  const totalQ = await env.DB.prepare(`SELECT COUNT(*) as total FROM projetos p WHERE ${filterSql}`).bind(...binds).first();
  const totalRows = totalQ?.total || 0;
  const baseProjetos = await env.DB.prepare(`
    SELECT p.*,
      pu.nome as dono_nome,
      p.grupo_id, g.nome as grupo_nome,
      CASE
        WHEN p.dono_id <> ?
          AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
          AND (EXISTS (SELECT 1 FROM permissoes_projeto pp0 WHERE pp0.projeto_id = p.id AND pp0.usuario_id = ?)
            OR EXISTS (SELECT 1 FROM permissoes_grupo pg0 WHERE pg0.grupo_id = p.grupo_id AND pg0.usuario_id = ?))
        THEN 1 ELSE 0
      END as compartilhado_comigo,
      CASE
        WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
          AND EXISTS (SELECT 1 FROM permissoes_grupo pg0 WHERE pg0.grupo_id = p.grupo_id AND pg0.usuario_id = ?)
        THEN 'grupo'
        WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
          AND EXISTS (SELECT 1 FROM permissoes_projeto pp0 WHERE pp0.projeto_id = p.id AND pp0.usuario_id = ?)
        THEN 'manual'
        ELSE NULL
      END as origem_compartilhamento
    FROM projetos p
    LEFT JOIN usuarios pu ON pu.id = p.dono_id
    LEFT JOIN grupos_projetos g ON g.id = p.grupo_id
    WHERE ${filterSql}
    ORDER BY CASE p.status WHEN 'A fazer' THEN 0 WHEN 'Em andamento' THEN 1 WHEN 'Em revis\xE3o' THEN 2 WHEN 'Pausado' THEN 3 WHEN 'Conclu\xEDdo' THEN 4 WHEN 'Conclu\xEDda' THEN 4 ELSE 5 END,
      CASE p.prioridade WHEN 'Alta' THEN 0 WHEN 'M\xE9dia' THEN 1 ELSE 2 END,
      p.prazo ASC NULLS LAST, p.atualizado_em DESC
    LIMIT ? OFFSET ?
  `).bind(u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, ...binds, pageSize, offset).all();
  const results = baseProjetos.results || [];
  if (results.length === 0) return ok([], 200, { "X-Total-Count": String(totalRows) });
  const pIds = results.map((p) => p.id);
  const ph = pIds.map(() => "?").join(",");
  const aggQ = await env.DB.prepare(`
    SELECT projeto_id,
      COUNT(id) as total_tarefas,
      SUM(CASE WHEN status = 'Conclu\xEDda' THEN 1 ELSE 0 END) as tarefas_concluidas
    FROM tarefas WHERE projeto_id IN (${ph}) GROUP BY projeto_id
  `).bind(...pIds).all();
  const hrsQ = await env.DB.prepare(`
    SELECT tt.projeto_id,
      ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) as total_horas
    FROM sessoes_tempo st JOIN tarefas tt ON tt.id = st.tarefa_id 
    WHERE tt.projeto_id IN (${ph}) GROUP BY tt.projeto_id
  `).bind(...pIds).all();
  const focoQ = await env.DB.prepare(`
    SELECT projeto_id, nome as minha_tarefa_foco 
    FROM tarefas WHERE projeto_id IN (${ph}) AND foco = 1 AND dono_id = ?
  `).bind(...pIds, u.uid).all();
  const metrics = {};
  for (const r of aggQ.results || []) metrics[r.projeto_id] = { ...r };
  for (const r of hrsQ.results || []) {
    metrics[r.projeto_id] = { ...metrics[r.projeto_id] || {}, total_horas: r.total_horas };
  }
  for (const r of focoQ.results || []) {
    metrics[r.projeto_id] = { ...metrics[r.projeto_id] || {}, minha_tarefa_foco: r.minha_tarefa_foco };
  }
  const finalRows = results.map((p) => ({
    ...p,
    total_tarefas: metrics[p.id]?.total_tarefas || 0,
    tarefas_concluidas: metrics[p.id]?.tarefas_concluidas || 0,
    total_horas: metrics[p.id]?.total_horas || 0,
    minha_tarefa_foco: metrics[p.id]?.minha_tarefa_foco || null
  }));
  return ok(finalRows, 200, { "X-Total-Count": String(totalRows) });
}
__name(handleGetProjetos, "handleGetProjetos");
async function handlePostProjetos(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const fase = clampStr(_body.fase, 80, "fase");
  const status = clampStr(_body.status, 80, "status");
  const prioridade = clampStr(_body.prioridade, 80, "prioridade");
  const prazo = validateDate(_body.prazo, "prazo");
  const area_m2 = validatePositiveNumber(_body.area_m2, "area_m2");
  const grupo_id = _body.grupo_id;
  if (grupo_id) {
    const val = await validarVinculoGrupo(env, grupo_id, u.uid, u.papel);
    if (!val.ok) return fail(val.erro, val.status);
  }
  if (!nome?.trim()) return fail("Nome obrigat\xF3rio");
  const statusProjeto = normalizarStatusProjeto(status || "A fazer");
  if (!STATUS_PROJ_VALIDOS_SET.has(statusProjeto)) return fail("Status de projeto inv\xE1lido", 400);
  const id = "prj_" + uid();
  await env.DB.prepare(
    "INSERT INTO projetos (id, nome, fase, status, prioridade, prazo, area_m2, dono_id, grupo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, nome.trim(), fase || "Estudo preliminar", statusProjeto, prioridade || "M\xE9dia", prazo || null, area_m2 || null, u.uid, grupo_id || null).run();
  if (grupo_id) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, origem) SELECT ?, pg.usuario_id, "grupo" FROM permissoes_grupo pg WHERE pg.grupo_id = ? AND pg.usuario_id <> ?'
    ).bind(id, grupo_id, u.uid).run();
  }
  return ok({ id });
}
__name(handlePostProjetos, "handlePostProjetos");
async function handleGetProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const [projetoRes, permsRes, horasRes] = await env.DB.batch([
    env.DB.prepare(
      `SELECT p.*, pu.nome as dono_nome,
        CASE WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
            AND (EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
              OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?))
          THEN 1 ELSE 0
        END as compartilhado_comigo,
        CASE WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
            AND EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)
          THEN 'grupo'
          WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
            AND EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
          THEN 'manual' ELSE NULL
        END as origem_compartilhamento
       FROM projetos p LEFT JOIN usuarios pu ON pu.id = p.dono_id WHERE p.id = ?`
    ).bind(u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, projetoId),
    env.DB.prepare("SELECT pp.usuario_id, pp.origem, u.nome, u.login as usuario_login FROM permissoes_projeto pp JOIN usuarios u ON u.id = pp.usuario_id WHERE pp.projeto_id = ? ORDER BY u.nome").bind(projetoId),
    env.DB.prepare(`SELECT ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) as total_horas FROM sessoes_tempo st INNER JOIN tarefas t ON t.id = st.tarefa_id WHERE t.projeto_id = ?`).bind(projetoId)
  ]);
  const projeto = projetoRes.results[0];
  if (!projeto) return fail("Projeto n\xE3o encontrado", 404);
  const podeEditar = await podeEditarProjeto(env, projetoId, u.uid, u.papel);
  return ok({ ...projeto, editores: permsRes.results, pode_editar: podeEditar, total_horas: horasRes.results[0]?.total_horas ?? 0 });
}
__name(handleGetProjeto, "handleGetProjeto");
async function handlePutProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const fase = clampStr(_body.fase, 80, "fase");
  const statusProjeto = normalizarStatusProjeto(clampStr(_body.status, 80, "status"));
  const prioridade = clampStr(_body.prioridade, 80, "prioridade");
  const prazo = validateDate(_body.prazo, "prazo");
  const area_m2 = validatePositiveNumber(_body.area_m2, "area_m2");
  const grupo_id = _body.grupo_id;
  if (grupo_id) {
    const val = await validarVinculoGrupo(env, grupo_id, u.uid, u.papel);
    if (!val.ok) return fail(val.erro, val.status);
  }
  if (!nome?.trim()) return fail("Nome obrigat\xF3rio");
  if (!STATUS_PROJ_VALIDOS_SET.has(statusProjeto)) return fail("Status de projeto inv\xE1lido", 400);
  const atual = await env.DB.prepare("SELECT dono_id, grupo_id FROM projetos WHERE id = ?").bind(projetoId).first();
  await env.DB.prepare(
    'UPDATE projetos SET nome=?, fase=?, status=?, prioridade=?, prazo=?, area_m2=?, grupo_id=?, atualizado_em=datetime("now") WHERE id=?'
  ).bind(nome.trim(), fase, statusProjeto, prioridade, prazo || null, area_m2 || null, grupo_id || null, projetoId).run();
  if (atual?.grupo_id !== (grupo_id || null)) {
    await syncProjetoPermissoesGrupo(env, projetoId, grupo_id || null, atual?.dono_id || null);
  }
  return ok({ ok: true });
}
__name(handlePutProjeto, "handlePutProjeto");
async function handlePatchProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const body = await readJsonBody(request);
  if ("grupo_id" in body) {
    if (body.grupo_id) {
      const val = await validarVinculoGrupo(env, body.grupo_id, u.uid, u.papel);
      if (!val.ok) return fail(val.erro, val.status);
    }
    const atual = await env.DB.prepare("SELECT grupo_id, dono_id FROM projetos WHERE id = ?").bind(projetoId).first();
    await env.DB.prepare("UPDATE projetos SET grupo_id = ? WHERE id = ?").bind(body.grupo_id || null, projetoId).run();
    await syncProjetoPermissoesGrupo(env, projetoId, body.grupo_id || null, atual?.dono_id || null);
  }
  return ok({ ok: true });
}
__name(handlePatchProjeto, "handlePatchProjeto");
async function handleDeleteProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const proj = await env.DB.prepare("SELECT dono_id, status FROM projetos WHERE id = ?").bind(projetoId).first();
  if (!proj) return fail("N\xE3o encontrado", 404);
  if (proj.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  if (proj.status !== "Arquivado" && !isAdmin(u)) {
    return fail("Projeto precisa estar arquivado antes de ser exclu\xEDdo", 400);
  }
  await env.DB.prepare("DELETE FROM projetos WHERE id = ?").bind(projetoId).run();
  return ok({ ok: true });
}
__name(handleDeleteProjeto, "handleDeleteProjeto");
async function handlePostPermissoesProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const proj = await env.DB.prepare("SELECT dono_id, nome FROM projetos WHERE id = ?").bind(projetoId).first();
  if (!proj) return fail("N\xE3o encontrado", 404);
  if (proj.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const usuario_id = _body.usuario_id;
  if (!usuario_id) return fail("Usu\xE1rio obrigat\xF3rio");
  if (usuario_id === proj.dono_id) return fail("Usu\xE1rio j\xE1 \xE9 dono do projeto");
  await env.DB.prepare("DELETE FROM recusas_projeto WHERE projeto_id = ? AND usuario_id = ?").bind(projetoId, usuario_id).run();
  await env.DB.prepare('INSERT OR REPLACE INTO permissoes_projeto (projeto_id, usuario_id, origem) VALUES (?, ?, "manual")').bind(projetoId, usuario_id).run();
  await criarNotificacaoCompartilhamento(env, {
    usuarioId: usuario_id,
    tipo: "compartilhamento_recebido",
    escopo: "projeto",
    entidadeId: projetoId,
    titulo: "Projeto compartilhado com voc\xEA",
    mensagem: `Voc\xEA recebeu acesso ao projeto "${proj.nome}".`,
    atorId: u.uid
  });
  return ok({ ok: true });
}
__name(handlePostPermissoesProjeto, "handlePostPermissoesProjeto");
async function handleDeleteSairProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const proj = await env.DB.prepare("SELECT dono_id FROM projetos WHERE id = ?").bind(projetoId).first();
  if (!proj) return fail("Projeto n\xE3o encontrado", 404);
  if (proj.dono_id === u.uid) return fail("O dono n\xE3o pode sair do pr\xF3prio projeto", 400);
  const tinhaManual = await env.DB.prepare("SELECT 1 FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?").bind(projetoId, u.uid).first();
  const tinhaGrupo = await env.DB.prepare("SELECT 1 FROM projetos p JOIN permissoes_grupo pg ON pg.grupo_id = p.grupo_id WHERE p.id = ? AND pg.usuario_id = ?").bind(projetoId, u.uid).first();
  if (!tinhaManual && !tinhaGrupo) return fail("Voc\xEA n\xE3o participa deste projeto", 400);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?").bind(projetoId, u.uid),
    env.DB.prepare("INSERT OR REPLACE INTO recusas_projeto (projeto_id, usuario_id) VALUES (?, ?)").bind(projetoId, u.uid),
    env.DB.prepare(`DELETE FROM colaboradores_tarefa WHERE usuario_id = ? AND tarefa_id IN (SELECT id FROM tarefas WHERE projeto_id = ?)`).bind(u.uid, projetoId)
  ]);
  return ok({ ok: true });
}
__name(handleDeleteSairProjeto, "handleDeleteSairProjeto");
async function handleDeletePermissaoProjetoUsuario(request, env, projetoId, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const proj = await env.DB.prepare("SELECT dono_id FROM projetos WHERE id = ?").bind(projetoId).first();
  if (!proj) return fail("N\xE3o encontrado", 404);
  if (proj.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  await env.DB.prepare('DELETE FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ? AND origem = "manual"').bind(projetoId, usuarioId).run();
  return ok({ ok: true });
}
__name(handleDeletePermissaoProjetoUsuario, "handleDeletePermissaoProjetoUsuario");

// src/backend/domain/projects/decisions.js
async function handleGetDecisoesProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const decisoes = await env.DB.prepare(
    "SELECT d.*, du.nome as dono_nome FROM decisoes d LEFT JOIN usuarios du ON du.id = d.dono_id WHERE d.projeto_id = ? ORDER BY d.data DESC, d.criado_em DESC"
  ).bind(projetoId).all();
  return ok(decisoes.results);
}
__name(handleGetDecisoesProjeto, "handleGetDecisoesProjeto");
async function handlePostDecisoesProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const descricao = clampStr(_body.descricao, 4e3, "descricao");
  const data = validateDate(_body.data, "prazo");
  if (!descricao?.trim()) return fail("Descri\xE7\xE3o obrigat\xF3ria");
  const id = "dec_" + uid();
  await env.DB.prepare(
    "INSERT INTO decisoes (id, projeto_id, descricao, data, dono_id) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, projetoId, descricao.trim(), data || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), u.uid).run();
  return ok({ id });
}
__name(handlePostDecisoesProjeto, "handlePostDecisoesProjeto");
async function handleDeleteDecisao(request, env, decisaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const d = await env.DB.prepare("SELECT dono_id, projeto_id FROM decisoes WHERE id = ?").bind(decisaoId).first();
  if (!d) return fail("N\xE3o encontrado", 404);
  if (d.dono_id !== u.uid && !await podeEditarProjeto(env, d.projeto_id, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  await env.DB.prepare("DELETE FROM decisoes WHERE id = ?").bind(decisaoId).run();
  return ok({ ok: true });
}
__name(handleDeleteDecisao, "handleDeleteDecisao");
async function handlePutDecisao(request, env, decisaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const d = await env.DB.prepare("SELECT dono_id, projeto_id FROM decisoes WHERE id = ?").bind(decisaoId).first();
  if (!d) return fail("N\xE3o encontrado", 404);
  if (d.dono_id !== u.uid && !await podeEditarProjeto(env, d.projeto_id, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const descricao = clampStr(_body.descricao, 4e3, "descricao");
  const data = validateDate(_body.data, "prazo");
  if (!descricao?.trim()) return fail("Descri\xE7\xE3o obrigat\xF3ria", 400);
  await env.DB.prepare("UPDATE decisoes SET descricao = ?, data = ? WHERE id = ?").bind(descricao.trim(), data || null, decisaoId).run();
  return ok({ ok: true });
}
__name(handlePutDecisao, "handlePutDecisao");

// src/backend/domain/projects/reports.js
async function handleGetProjetoRelatorio(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const proj = await env.DB.prepare("SELECT dono_id FROM projetos WHERE id = ?").bind(projetoId).first();
  if (!proj) return fail("N\xE3o encontrado", 404);
  if (!isAdmin(u) && !await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const rows = await env.DB.prepare(`
    SELECT st.tarefa_id, tu.nome as usuario_nome,
      ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim)  - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) as horas_liquidas
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE t.projeto_id = ? GROUP BY st.tarefa_id, st.usuario_id, tu.nome HAVING horas_liquidas > 0 ORDER BY st.tarefa_id, horas_liquidas DESC
  `).bind(projetoId).all();
  const byTarefa = {};
  for (const row of rows.results) {
    (byTarefa[row.tarefa_id] = byTarefa[row.tarefa_id] || []).push(row);
  }
  return ok(byTarefa);
}
__name(handleGetProjetoRelatorio, "handleGetProjetoRelatorio");
async function handleGetProjetoHorasPorUsuario(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const proj = await env.DB.prepare("SELECT id, dono_id FROM projetos WHERE id = ?").bind(projetoId).first();
  if (!proj) return fail("N\xE3o encontrado", 404);
  if (!isAdmin(u) && proj.dono_id !== u.uid) {
    const permissao = await env.DB.prepare("SELECT 1 as ok FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ? LIMIT 1").bind(projetoId, u.uid).first();
    if (!permissao) return fail("Sem permiss\xE3o", 403);
  }
  const resumo = await env.DB.prepare(`
    SELECT tu.nome as usuario_nome,
      ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) as horas
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE t.projeto_id = ? GROUP BY st.usuario_id, tu.nome HAVING horas > 0 ORDER BY horas DESC
  `).bind(projetoId).all();
  return ok(resumo.results);
}
__name(handleGetProjetoHorasPorUsuario, "handleGetProjetoHorasPorUsuario");

// src/backend/domain/groups/permissions.js
async function syncProjetosDoGrupo(env, grupoId, novoGrupoId = void 0) {
  const projetos = await env.DB.prepare("SELECT id, dono_id FROM projetos WHERE grupo_id = ?").bind(grupoId).all();
  for (const projeto of projetos.results) {
    await syncProjetoPermissoesGrupo(env, projeto.id, novoGrupoId, projeto.dono_id);
  }
}
__name(syncProjetosDoGrupo, "syncProjetosDoGrupo");

// src/backend/domain/groups/controllers.js
function criarNotificacaoCompartilhamento2(env, { usuarioId, tipo, escopo, entidadeId, titulo, mensagem, atorId }) {
  const nid = "ntf_" + uid();
  return env.DB.prepare(
    "INSERT INTO notificacoes (id, usuario_id, tipo, escopo, entidade_id, titulo, mensagem, ator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(nid, usuarioId, tipo, escopo, entidadeId || null, titulo, mensagem || null, atorId || null).run().catch(console.error);
}
__name(criarNotificacaoCompartilhamento2, "criarNotificacaoCompartilhamento");
async function handleGetGrupos(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const asMember = url.searchParams.get("as_member") === "1";
  const adminAll = isAdmin(u) && !asMember;
  const grupoFiltro = (url.searchParams.get("grupo_id") || "").trim();
  const { pageSize, offset } = getPagination(url, 200, 500);
  let baseGrupos;
  let totalRows = 0;
  const filterSql = adminAll ? `(? = '' OR g.id = ?)` : `(g.dono_id = ? OR EXISTS (SELECT 1 FROM projetos p WHERE p.grupo_id = g.id AND (p.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?))) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = g.id AND pg.usuario_id = ?)) AND (? = '' OR g.id = ?)`;
  const binds = adminAll ? [grupoFiltro, grupoFiltro] : [u.uid, u.uid, u.uid, u.uid, grupoFiltro, grupoFiltro];
  const totalQ = await env.DB.prepare(`SELECT COUNT(*) as total FROM grupos_projetos g WHERE ${filterSql}`).bind(...binds).first();
  totalRows = totalQ?.total || 0;
  baseGrupos = await env.DB.prepare(`
    SELECT g.*, pu.nome as dono_nome 
    FROM grupos_projetos g LEFT JOIN usuarios pu ON pu.id = g.dono_id 
    WHERE ${filterSql} ORDER BY g.ordem ASC, g.nome ASC LIMIT ? OFFSET ?
  `).bind(...binds, pageSize, offset).all();
  const results = baseGrupos.results || [];
  if (results.length === 0) return ok([], 200, { "X-Total-Count": "0" });
  const groupIds = results.map((g) => g.id);
  const placeHolders = groupIds.map(() => "?").join(",");
  const apFilter = adminAll ? "p.grupo_id IN (" + placeHolders + ")" : "p.grupo_id IN (" + placeHolders + ") AND (p.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?))";
  const apBinds = adminAll ? groupIds : [...groupIds, u.uid, u.uid, u.uid];
  const aggQ = await env.DB.prepare(`
    SELECT p.grupo_id, 
      COUNT(DISTINCT p.id) as total_projetos, 
      SUM(COALESCE(p.area_m2, 0)) as area_total_m2, 
      SUM(CASE WHEN p.status = 'Conclu\xEDdo' THEN 1 ELSE 0 END) as projetos_concluidos, 
      SUM(CASE WHEN p.prazo IS NOT NULL AND date(p.prazo) < date('now') AND p.status NOT IN ('Conclu\xEDdo','Arquivado') THEN 1 ELSE 0 END) as projetos_atrasados
    FROM projetos p WHERE ${apFilter} GROUP BY p.grupo_id
  `).bind(...apBinds).all();
  const hrsQ = await env.DB.prepare(`
    SELECT p.grupo_id,
      ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) as total_horas,
      COUNT(DISTINCT CASE WHEN st.fim IS NULL THEN p.id ELSE NULL END) as projetos_ativos
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id 
    WHERE ${apFilter} GROUP BY p.grupo_id
  `).bind(...apBinds).all();
  const metricsByGroup = {};
  for (const r of aggQ.results || []) metricsByGroup[r.grupo_id] = { ...r };
  for (const r of hrsQ.results || []) {
    metricsByGroup[r.grupo_id] = { ...metricsByGroup[r.grupo_id] || {}, total_horas: r.total_horas, projetos_ativos: r.projetos_ativos };
  }
  const finalRows = results.map((g) => ({
    ...g,
    total_projetos: metricsByGroup[g.id]?.total_projetos || 0,
    area_total_m2: ROUND(metricsByGroup[g.id]?.area_total_m2 || 0),
    projetos_concluidos: metricsByGroup[g.id]?.projetos_concluidos || 0,
    projetos_atrasados: metricsByGroup[g.id]?.projetos_atrasados || 0,
    total_horas: metricsByGroup[g.id]?.total_horas || 0,
    projetos_ativos: metricsByGroup[g.id]?.projetos_ativos || 0
  }));
  function ROUND(num) {
    return Math.round(num * 100) / 100;
  }
  __name(ROUND, "ROUND");
  return ok(finalRows, 200, { "Cache-Control": "private, max-age=30", "X-Total-Count": String(totalRows) });
}
__name(handleGetGrupos, "handleGetGrupos");
async function handlePostGrupos(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const status = clampStr(_body.status, 80, "status");
  const descricao = clampStr(_body.descricao, 4e3, "descricao");
  if (!nome?.trim()) return fail("Nome obrigat\xF3rio");
  const id = "grp_" + uid();
  const ordemRow = await env.DB.prepare("SELECT COALESCE(MAX(ordem), 0) as max_ordem FROM grupos_projetos").first();
  const ordem = (ordemRow?.max_ordem || 0) + 1;
  await env.DB.prepare("INSERT INTO grupos_projetos (id, nome, dono_id, ordem, status, descricao) VALUES (?, ?, ?, ?, ?, ?)").bind(id, nome.trim(), u.uid, ordem, status || "Ativo", descricao || null).run();
  return ok({ id, nome: nome.trim(), ordem, status: status || "Ativo", descricao: descricao || null });
}
__name(handlePostGrupos, "handlePostGrupos");
async function handleGetGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const grupo = await env.DB.prepare("SELECT * FROM grupos_projetos WHERE id = ?").bind(grupoId).first();
  if (!grupo) return fail("Grupo n\xE3o encontrado", 404);
  const podeGerenciar = grupo.dono_id === u.uid || isAdmin(u);
  const podeVer = isAdmin(u) || grupo.dono_id === u.uid || !!await env.DB.prepare(
    `SELECT 1 FROM projetos p WHERE p.grupo_id = ? AND (p.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)) LIMIT 1`
  ).bind(grupoId, u.uid, u.uid, u.uid).first();
  if (!podeVer) return fail("Sem permiss\xE3o", 403);
  const resumo = await env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM projetos p2 WHERE p2.grupo_id = ? AND (? = 1 OR p2.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp2 WHERE pp2.projeto_id = p2.id AND pp2.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg2 WHERE pg2.grupo_id = p2.grupo_id AND pg2.usuario_id = ?))) as total_projetos,
      (SELECT ROUND(COALESCE(SUM(COALESCE(p2.area_m2, 0)), 0), 2) FROM projetos p2 WHERE p2.grupo_id = ? AND (? = 1 OR p2.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp2 WHERE pp2.projeto_id = p2.id AND pp2.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg2 WHERE pg2.grupo_id = p2.grupo_id AND pg2.usuario_id = ?))) as area_total_m2,
      (SELECT ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p3 ON p3.id = t.projeto_id WHERE p3.grupo_id = ? AND (? = 1 OR p3.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp3 WHERE pp3.projeto_id = p3.id AND pp3.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg3 WHERE pg3.grupo_id = p3.grupo_id AND pg3.usuario_id = ?))) as total_horas,
      (SELECT COUNT(*) FROM projetos p4 WHERE p4.grupo_id = ? AND p4.status = 'Conclu\xEDdo' AND (? = 1 OR p4.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp4 WHERE pp4.projeto_id = p4.id AND pp4.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg4 WHERE pg4.grupo_id = p4.grupo_id AND pg4.usuario_id = ?))) as projetos_concluidos,
      (SELECT COUNT(*) FROM projetos p5 WHERE p5.grupo_id = ? AND p5.prazo IS NOT NULL AND date(p5.prazo) < date('now') AND p5.status NOT IN ('Conclu\xEDdo','Arquivado') AND (? = 1 OR p5.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp5 WHERE pp5.projeto_id = p5.id AND pp5.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg5 WHERE pg5.grupo_id = p5.grupo_id AND pg5.usuario_id = ?))) as projetos_atrasados,
      (SELECT COUNT(DISTINCT p6.id) FROM sessoes_tempo st6 JOIN tarefas t6 ON t6.id = st6.tarefa_id JOIN projetos p6 ON p6.id = t6.projeto_id WHERE p6.grupo_id = ? AND st6.fim IS NULL AND (? = 1 OR p6.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp6 WHERE pp6.projeto_id = p6.id AND pp6.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg6 WHERE pg6.grupo_id = p6.grupo_id AND pg6.usuario_id = ?))) as projetos_ativos`
  ).bind(
    grupoId,
    isAdmin(u) ? 1 : 0,
    u.uid,
    u.uid,
    u.uid,
    grupoId,
    isAdmin(u) ? 1 : 0,
    u.uid,
    u.uid,
    u.uid,
    grupoId,
    isAdmin(u) ? 1 : 0,
    u.uid,
    u.uid,
    u.uid,
    grupoId,
    isAdmin(u) ? 1 : 0,
    u.uid,
    u.uid,
    u.uid,
    grupoId,
    isAdmin(u) ? 1 : 0,
    u.uid,
    u.uid,
    u.uid,
    grupoId,
    isAdmin(u) ? 1 : 0,
    u.uid,
    u.uid,
    u.uid
  ).first();
  const permissoes = await env.DB.prepare("SELECT pg.usuario_id, u.nome, u.login as usuario_login FROM permissoes_grupo pg JOIN usuarios u ON u.id = pg.usuario_id WHERE pg.grupo_id = ? ORDER BY u.nome").bind(grupoId).all();
  return ok({ ...grupo, ...resumo, pode_gerenciar: podeGerenciar, colaboradores: permissoes.results });
}
__name(handleGetGrupo, "handleGetGrupo");
async function handlePutGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const grupo = await env.DB.prepare("SELECT dono_id FROM grupos_projetos WHERE id = ?").bind(grupoId).first();
  if (!grupo) return fail("Grupo n\xE3o encontrado", 404);
  const podeGerenciar = grupo.dono_id === u.uid || isAdmin(u);
  if (!podeGerenciar) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const status = clampStr(_body.status, 80, "status");
  const descricao = clampStr(_body.descricao, 4e3, "descricao");
  if (!nome?.trim()) return fail("Nome obrigat\xF3rio");
  await env.DB.prepare("UPDATE grupos_projetos SET nome = ?, status = ?, descricao = ? WHERE id = ?").bind(nome.trim(), status || "Ativo", descricao || null, grupoId).run();
  return ok({ ok: true });
}
__name(handlePutGrupo, "handlePutGrupo");
async function handlePatchGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const grupo = await env.DB.prepare("SELECT dono_id FROM grupos_projetos WHERE id = ?").bind(grupoId).first();
  if (!grupo) return fail("Grupo n\xE3o encontrado", 404);
  if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const body = await readJsonBody(request);
  if (typeof body.ordem === "number") {
    await env.DB.prepare("UPDATE grupos_projetos SET ordem = ? WHERE id = ?").bind(body.ordem, grupoId).run();
  }
  if (body.action === "ungroup_all") {
    await syncProjetosDoGrupo(env, grupoId, null);
    await env.DB.prepare("UPDATE projetos SET grupo_id = NULL WHERE grupo_id = ?").bind(grupoId).run();
  }
  if (body.action === "move_all_to") {
    const destino = body.destino_grupo_id || null;
    await syncProjetosDoGrupo(env, grupoId, destino);
    await env.DB.prepare("UPDATE projetos SET grupo_id = ? WHERE grupo_id = ?").bind(destino, grupoId).run();
  }
  return ok({ ok: true });
}
__name(handlePatchGrupo, "handlePatchGrupo");
async function handleDeleteGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const grupo = await env.DB.prepare("SELECT dono_id FROM grupos_projetos WHERE id = ?").bind(grupoId).first();
  if (!grupo) return fail("Grupo n\xE3o encontrado", 404);
  if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  await syncProjetosDoGrupo(env, grupoId, null);
  await env.DB.prepare("UPDATE projetos SET grupo_id = NULL WHERE grupo_id = ?").bind(grupoId).run();
  await env.DB.prepare("DELETE FROM grupos_projetos WHERE id = ?").bind(grupoId).run();
  return ok({ ok: true });
}
__name(handleDeleteGrupo, "handleDeleteGrupo");
async function handlePostPermissoesGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const grupo = await env.DB.prepare("SELECT dono_id, nome FROM grupos_projetos WHERE id = ?").bind(grupoId).first();
  if (!grupo) return fail("Grupo n\xE3o encontrado", 404);
  if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const usuario_id = _body.usuario_id;
  if (!usuario_id) return fail("Usu\xE1rio obrigat\xF3rio");
  await env.DB.prepare("INSERT OR REPLACE INTO permissoes_grupo (grupo_id, usuario_id) VALUES (?, ?)").bind(grupoId, usuario_id).run();
  await env.DB.prepare("DELETE FROM recusas_projeto WHERE usuario_id = ? AND projeto_id IN (SELECT id FROM projetos WHERE grupo_id = ?)").bind(usuario_id, grupoId).run();
  await env.DB.prepare(`INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, origem) SELECT p.id, ?, 'grupo' FROM projetos p WHERE p.grupo_id = ? AND p.dono_id <> ?`).bind(usuario_id, grupoId, grupo.dono_id).run();
  await criarNotificacaoCompartilhamento2(env, {
    usuarioId: usuario_id,
    tipo: "compartilhamento_recebido",
    escopo: "grupo",
    entidadeId: grupoId,
    titulo: "Grupo compartilhado com voc\xEA",
    mensagem: `Voc\xEA recebeu acesso ao grupo "${grupo.nome}".`,
    atorId: u.uid
  });
  return ok({ ok: true });
}
__name(handlePostPermissoesGrupo, "handlePostPermissoesGrupo");
async function handleDeleteSairGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const grupo = await env.DB.prepare("SELECT dono_id FROM grupos_projetos WHERE id = ?").bind(grupoId).first();
  if (!grupo) return fail("Grupo n\xE3o encontrado", 404);
  if (grupo.dono_id === u.uid) return fail("O dono n\xE3o pode sair do pr\xF3prio grupo", 400);
  const rm = await env.DB.prepare("DELETE FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?").bind(grupoId, u.uid).run();
  await env.DB.prepare(`DELETE FROM permissoes_projeto WHERE usuario_id = ? AND origem = 'grupo' AND projeto_id IN (SELECT id FROM projetos WHERE grupo_id = ?)`).bind(u.uid, grupoId).run();
  if (!(rm.meta?.changes > 0)) return fail("Voc\xEA n\xE3o participa deste grupo", 400);
  return ok({ ok: true });
}
__name(handleDeleteSairGrupo, "handleDeleteSairGrupo");
async function handleDeletePermissaoGrupoUsuario(request, env, grupoId, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const grupo = await env.DB.prepare("SELECT dono_id FROM grupos_projetos WHERE id = ?").bind(grupoId).first();
  if (!grupo) return fail("Grupo n\xE3o encontrado", 404);
  if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  await env.DB.prepare("DELETE FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?").bind(grupoId, usuarioId).run();
  await env.DB.prepare(`DELETE FROM permissoes_projeto WHERE usuario_id = ? AND projeto_id IN (SELECT p.id FROM projetos p WHERE p.grupo_id = ?) AND origem = 'grupo'`).bind(usuarioId, grupoId).run();
  return ok({ ok: true });
}
__name(handleDeletePermissaoGrupoUsuario, "handleDeletePermissaoGrupoUsuario");

// src/backend/domain/tasks/permissions.js
async function podeEditarTarefa(env, tarefaId, usuarioId, papel) {
  if (papel === "admin") return true;
  const t = await env.DB.prepare("SELECT dono_id, projeto_id FROM tarefas WHERE id = ?").bind(tarefaId).first();
  if (!t) return false;
  if (t.dono_id === usuarioId) return true;
  const colab = await env.DB.prepare("SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?").bind(tarefaId, usuarioId).first();
  if (colab) return true;
  return await podeEditarProjeto(env, t.projeto_id, usuarioId, papel);
}
__name(podeEditarTarefa, "podeEditarTarefa");
async function podeVerTarefa(env, tarefaId, usuarioId, papel) {
  return await podeEditarTarefa(env, tarefaId, usuarioId, papel);
}
__name(podeVerTarefa, "podeVerTarefa");
async function podeVerTempoTarefa(env, tarefaId, usuarioId, papel) {
  return await podeVerTarefa(env, tarefaId, usuarioId, papel);
}
__name(podeVerTempoTarefa, "podeVerTempoTarefa");
async function podeCronometrar(env, tarefaId, usuarioId, papel) {
  if (papel === "admin") return true;
  const t = await env.DB.prepare("SELECT dono_id FROM tarefas WHERE id = ?").bind(tarefaId).first();
  if (!t) return false;
  if (t.dono_id === usuarioId) return true;
  const colab = await env.DB.prepare("SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?").bind(tarefaId, usuarioId).first();
  return !!colab;
}
__name(podeCronometrar, "podeCronometrar");

// src/backend/domain/tasks/controllers.js
function criarNotificacaoCompartilhamento3(env, { usuarioId, tipo, escopo, entidadeId, titulo, mensagem, atorId }) {
  const nid = "ntf_" + uid();
  return env.DB.prepare(
    "INSERT INTO notificacoes (id, usuario_id, tipo, escopo, entidade_id, titulo, mensagem, ator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(nid, usuarioId, tipo, escopo, entidadeId || null, titulo, mensagem || null, atorId || null).run().catch(console.error);
}
__name(criarNotificacaoCompartilhamento3, "criarNotificacaoCompartilhamento");
async function handleGetTarefasProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const tarefas = await env.DB.prepare(`
    SELECT t.*, t.dificuldade AS complexidade, tu.nome as dono_nome, CASE WHEN t.dono_id = ? THEN 1 ELSE 0 END as minha_tarefa
    FROM tarefas t LEFT JOIN usuarios tu ON tu.id = t.dono_id
    WHERE t.projeto_id = ?
    ORDER BY t.foco DESC, CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END, t.criado_em ASC
  `).bind(u.uid, projetoId).all();
  return ok(tarefas.results);
}
__name(handleGetTarefasProjeto, "handleGetTarefasProjeto");
async function handlePostTarefasProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const status = clampStr(_body.status, 80, "status");
  const prioridade = clampStr(_body.prioridade, 80, "prioridade");
  const complexidade = clampStr(_body.complexidade, 80, "dificuldade");
  const dificuldade = clampStr(_body.dificuldade, 80, "dificuldade");
  const data = validateDate(_body.data, "prazo");
  const descricao = clampStr(_body.descricao, 4e3, "descricao");
  const template_id = _body.template_id;
  let template = null;
  if (template_id) {
    template = await env.DB.prepare("SELECT id, nome, status, prioridade, dificuldade, descricao FROM templates_tarefa WHERE id = ? AND ativo = 1").bind(template_id).first();
    if (!template) return fail("Template n\xE3o encontrado", 404);
  }
  const nomeFinal = (nome || template?.nome || "").trim();
  if (!nomeFinal) return fail("Nome obrigat\xF3rio");
  const complexidadeVal = complexidade || dificuldade || template?.dificuldade || "Moderada";
  const id = "tsk_" + uid();
  await env.DB.prepare(
    "INSERT INTO tarefas (id, projeto_id, nome, status, prioridade, dificuldade, data, dono_id, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id,
    projetoId,
    nomeFinal,
    status || template?.status || "A fazer",
    prioridade || template?.prioridade || "M\xE9dia",
    complexidadeVal,
    data || null,
    u.uid,
    descricao?.trim() || template?.descricao || null
  ).run();
  return ok({ id });
}
__name(handlePostTarefasProjeto, "handlePostTarefasProjeto");
async function handlePutTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const status = clampStr(_body.status, 80, "status");
  const prioridade = clampStr(_body.prioridade, 80, "prioridade");
  const complexidadeVal = clampStr(_body.complexidade || _body.dificuldade, 80, "dificuldade") || "Moderada";
  const data = validateDate(_body.data, "prazo");
  const descricao = clampStr(_body.descricao, 4e3, "descricao");
  if (!nome?.trim()) return fail("Nome obrigat\xF3rio");
  await env.DB.prepare(
    'UPDATE tarefas SET nome=?, status=?, prioridade=?, dificuldade=?, data=?, descricao=?, atualizado_em=datetime("now") WHERE id=?'
  ).bind(nome.trim(), status, prioridade, complexidadeVal, data || null, descricao?.trim() || null, tarefaId).run();
  return ok({ ok: true });
}
__name(handlePutTarefa, "handlePutTarefa");
async function handlePatchTarefaStatus(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeCronometrar(env, tarefaId, u.uid, u.papel)) return fail("Sem permiss\xE3o \u2014 s\xF3 o dono e colaboradores podem mudar o status", 403);
  const _body = await readJsonBody(request);
  const status = clampStr(_body.status, 80, "status");
  if (!status) return fail("Status obrigat\xF3rio");
  await env.DB.prepare('UPDATE tarefas SET status=?, atualizado_em=datetime("now") WHERE id=?').bind(status, tarefaId).run();
  return ok({ ok: true });
}
__name(handlePatchTarefaStatus, "handlePatchTarefaStatus");
async function handleDeleteTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  await env.DB.prepare("DELETE FROM tarefas WHERE id = ?").bind(tarefaId).run();
  return ok({ ok: true });
}
__name(handleDeleteTarefa, "handleDeleteTarefa");
async function handlePostDuplicarTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const original = await env.DB.prepare("SELECT projeto_id, nome, status, prioridade, dificuldade, data, descricao FROM tarefas WHERE id = ?").bind(tarefaId).first();
  if (!original) return fail("Tarefa n\xE3o encontrada", 404);
  const novoId = "tsk_" + uid();
  await env.DB.prepare(
    "INSERT INTO tarefas (id, projeto_id, nome, status, prioridade, dificuldade, data, dono_id, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    novoId,
    original.projeto_id,
    `${original.nome} (c\xF3pia)`,
    original.status,
    original.prioridade,
    original.dificuldade,
    original.data,
    u.uid,
    original.descricao
  ).run();
  return ok({ id: novoId });
}
__name(handlePostDuplicarTarefa, "handlePostDuplicarTarefa");
async function handlePutTarefaFoco(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const tarefa = await env.DB.prepare("SELECT projeto_id, dono_id FROM tarefas WHERE id = ?").bind(tarefaId).first();
  if (!tarefa) return fail("Tarefa n\xE3o encontrada", 404);
  if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail("S\xF3 pode marcar foco nas suas tarefas", 403);
  await env.DB.batch([
    env.DB.prepare("UPDATE tarefas SET foco = 0 WHERE projeto_id = ? AND dono_id = ?").bind(tarefa.projeto_id, u.uid),
    env.DB.prepare("UPDATE tarefas SET foco = 1 WHERE id = ?").bind(tarefaId)
  ]);
  return ok({ ok: true });
}
__name(handlePutTarefaFoco, "handlePutTarefaFoco");
async function handleDeleteTarefaFoco(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const tarefa = await env.DB.prepare("SELECT dono_id FROM tarefas WHERE id = ?").bind(tarefaId).first();
  if (!tarefa) return fail("Tarefa n\xE3o encontrada", 404);
  if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  await env.DB.prepare("UPDATE tarefas SET foco = 0 WHERE id = ?").bind(tarefaId).run();
  return ok({ ok: true });
}
__name(handleDeleteTarefaFoco, "handleDeleteTarefaFoco");
async function handleGetColaboradoresTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeVerTarefa(env, tarefaId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const tarefa = await env.DB.prepare("SELECT dono_id FROM tarefas WHERE id = ?").bind(tarefaId).first();
  if (!tarefa) return fail("Tarefa n\xE3o encontrada", 404);
  const colabs = await env.DB.prepare("SELECT u.id, u.nome, u.login as usuario_login FROM colaboradores_tarefa ct JOIN usuarios u ON u.id = ct.usuario_id WHERE ct.tarefa_id = ?").bind(tarefaId).all();
  return ok(colabs.results);
}
__name(handleGetColaboradoresTarefa, "handleGetColaboradoresTarefa");
async function handlePostColaboradoresTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const tarefa = await env.DB.prepare("SELECT t.dono_id, t.nome as tarefa_nome, p.nome as projeto_nome FROM tarefas t LEFT JOIN projetos p ON p.id = t.projeto_id WHERE t.id = ?").bind(tarefaId).first();
  if (!tarefa) return fail("Tarefa n\xE3o encontrada", 404);
  if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const usuario_id = _body.usuario_id;
  if (usuario_id === tarefa.dono_id) return fail("Usu\xE1rio j\xE1 \xE9 dono da tarefa");
  await env.DB.prepare("INSERT OR IGNORE INTO colaboradores_tarefa (tarefa_id, usuario_id) VALUES (?, ?)").bind(tarefaId, usuario_id).run();
  await criarNotificacaoCompartilhamento3(env, {
    usuarioId: usuario_id,
    tipo: "compartilhamento_recebido",
    escopo: "tarefa",
    entidadeId: tarefaId,
    titulo: "Tarefa compartilhada com voc\xEA",
    mensagem: `Voc\xEA foi adicionado \xE0 tarefa "${tarefa.tarefa_nome}"${tarefa.projeto_nome ? ` no projeto "${tarefa.projeto_nome}"` : ""}.`,
    atorId: u.uid
  });
  return ok({ ok: true });
}
__name(handlePostColaboradoresTarefa, "handlePostColaboradoresTarefa");
async function handleDeleteSairTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const tarefa = await env.DB.prepare("SELECT dono_id FROM tarefas WHERE id = ?").bind(tarefaId).first();
  if (!tarefa) return fail("Tarefa n\xE3o encontrada", 404);
  if (tarefa.dono_id === u.uid) return fail("O dono n\xE3o pode sair da pr\xF3pria tarefa", 400);
  const rm = await env.DB.prepare("DELETE FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?").bind(tarefaId, u.uid).run();
  if (!(rm.meta?.changes > 0)) return fail("Voc\xEA n\xE3o \xE9 colaborador desta tarefa", 400);
  return ok({ ok: true });
}
__name(handleDeleteSairTarefa, "handleDeleteSairTarefa");
async function handleDeleteColaboradorTarefa(request, env, tarefaId, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const tarefa = await env.DB.prepare("SELECT dono_id FROM tarefas WHERE id = ?").bind(tarefaId).first();
  if (!tarefa) return fail("Tarefa n\xE3o encontrada", 404);
  if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  await env.DB.prepare("DELETE FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?").bind(tarefaId, usuarioId).run();
  return ok({ ok: true });
}
__name(handleDeleteColaboradorTarefa, "handleDeleteColaboradorTarefa");
async function handleGetOperacaoHoje(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const rows = await env.DB.prepare(`
    SELECT t.id, t.nome, t.status, t.prioridade, t.dificuldade as complexidade, t.data, t.foco,
      p.id as projeto_id, p.nome as projeto_nome, p.status as projeto_status,
      pu.nome as dono_nome, st.id as sessao_ativa_id, st.inicio as sessao_ativa_inicio
    FROM tarefas t
    JOIN projetos p ON p.id = t.projeto_id
    LEFT JOIN usuarios pu ON pu.id = t.dono_id
    LEFT JOIN sessoes_tempo st ON st.tarefa_id = t.id AND st.usuario_id = ? AND st.fim IS NULL
    WHERE (t.dono_id = ? OR EXISTS (SELECT 1 FROM colaboradores_tarefa ct WHERE ct.tarefa_id = t.id AND ct.usuario_id = ?))
      AND t.status != 'Conclu\xEDda' AND COALESCE(p.status, '') != 'Arquivado'
    ORDER BY CASE WHEN st.id IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN t.foco = 1 THEN 0 ELSE 1 END,
      CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'Bloqueada' THEN 1 WHEN 'A fazer' THEN 2 ELSE 3 END,
      CASE WHEN t.data IS NULL THEN 3 WHEN DATE(t.data) < DATE('now') THEN 0 WHEN DATE(t.data) = DATE('now') THEN 1 ELSE 2 END,
      COALESCE(t.data, '9999-12-31') ASC, t.criado_em ASC
    LIMIT 12
  `).bind(u.uid, u.uid, u.uid).all();
  return ok(rows.results || []);
}
__name(handleGetOperacaoHoje, "handleGetOperacaoHoje");

// src/backend/domain/tasks/templates.js
async function handleGetTemplatesTarefa(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const templates = await env.DB.prepare(`
    SELECT tt.id, tt.nome, tt.status, tt.prioridade, tt.dificuldade, tt.descricao, tt.criado_por, tu.nome as criado_por_nome, tt.criado_em, tt.atualizado_em
    FROM templates_tarefa tt LEFT JOIN usuarios tu ON tu.id = tt.criado_por WHERE tt.ativo = 1 ORDER BY tt.nome ASC
  `).all();
  return ok(templates.results);
}
__name(handleGetTemplatesTarefa, "handleGetTemplatesTarefa");
async function handlePostTemplatesTarefa(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Somente admin pode criar templates", 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const status = clampStr(_body.status, 80, "status");
  const prioridade = clampStr(_body.prioridade, 80, "prioridade");
  const dificuldade = clampStr(_body.dificuldade, 80, "dificuldade");
  const descricao = clampStr(_body.descricao, 4e3, "descricao");
  if (!nome?.trim()) return fail("Nome obrigat\xF3rio");
  const id = "tpl_" + uid();
  await env.DB.prepare(
    "INSERT INTO templates_tarefa (id, nome, status, prioridade, dificuldade, descricao, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, nome.trim(), status || "A fazer", prioridade || "M\xE9dia", dificuldade || "Moderada", descricao?.trim() || null, u.uid).run();
  return ok({ id });
}
__name(handlePostTemplatesTarefa, "handlePostTemplatesTarefa");
async function handlePutTemplateTarefa(request, env, templateId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Somente admin pode editar templates", 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, "nome");
  const status = clampStr(_body.status, 80, "status");
  const prioridade = clampStr(_body.prioridade, 80, "prioridade");
  const dificuldade = clampStr(_body.dificuldade, 80, "dificuldade");
  const descricao = clampStr(_body.descricao, 4e3, "descricao");
  if (!nome?.trim()) return fail("Nome obrigat\xF3rio");
  const t = await env.DB.prepare("SELECT id FROM templates_tarefa WHERE id = ? AND ativo = 1").bind(templateId).first();
  if (!t) return fail("Template n\xE3o encontrado", 404);
  await env.DB.prepare(
    'UPDATE templates_tarefa SET nome=?, status=?, prioridade=?, dificuldade=?, descricao=?, atualizado_em=datetime("now") WHERE id=?'
  ).bind(nome.trim(), status || "A fazer", prioridade || "M\xE9dia", dificuldade || "Moderada", descricao?.trim() || null, templateId).run();
  return ok({ ok: true });
}
__name(handlePutTemplateTarefa, "handlePutTemplateTarefa");
async function handleDeleteTemplateTarefa(request, env, templateId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Somente admin pode remover templates", 403);
  await env.DB.prepare('UPDATE templates_tarefa SET ativo = 0, atualizado_em = datetime("now") WHERE id = ?').bind(templateId).run();
  return ok({ ok: true });
}
__name(handleDeleteTemplateTarefa, "handleDeleteTemplateTarefa");

// src/backend/domain/time/controllers.js
async function handleGetTempoTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeVerTempoTarefa(env, tarefaId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const filtroUsuario = isAdmin(u) ? null : u.uid;
  const sessoes = await env.DB.prepare(`
    SELECT st.*, tu.nome as usuario_nome,
      ROUND((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END -
        COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)
      ), 4) as horas_liquidas
    FROM sessoes_tempo st
    LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE st.tarefa_id = ? AND (? IS NULL OR st.usuario_id = ?)
    ORDER BY st.usuario_id, st.inicio DESC
  `).bind(tarefaId, filtroUsuario, filtroUsuario).all();
  if (!(sessoes.results || []).length) return ok([]);
  const intervalosQ = await env.DB.prepare(`
    SELECT i.* FROM intervalos i
    JOIN sessoes_tempo st ON st.id = i.sessao_id
    WHERE st.tarefa_id = ? AND (? IS NULL OR st.usuario_id = ?)
    ORDER BY i.sessao_id, i.inicio ASC
  `).bind(tarefaId, filtroUsuario, filtroUsuario).all();
  const intervalosPorSessao = /* @__PURE__ */ new Map();
  for (const it of intervalosQ.results || []) {
    if (!intervalosPorSessao.has(it.sessao_id)) intervalosPorSessao.set(it.sessao_id, []);
    intervalosPorSessao.get(it.sessao_id).push(it);
  }
  return ok(sessoes.results.map((s) => ({ ...s, intervalos: intervalosPorSessao.get(s.id) || [] })));
}
__name(handleGetTempoTarefa, "handleGetTempoTarefa");
async function handlePostTempoTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeCronometrar(env, tarefaId, u.uid, u.papel)) {
    return fail("Sem permiss\xE3o \u2014 voc\xEA precisa ser dono ou colaborador desta tarefa", 403);
  }
  const ativaExistente = await env.DB.prepare(`
    SELECT st.id, st.tarefa_id, t.nome as tarefa_nome FROM sessoes_tempo st
    JOIN tarefas t ON t.id = st.tarefa_id WHERE st.usuario_id = ? AND st.fim IS NULL LIMIT 1
  `).bind(u.uid).first();
  if (ativaExistente) return fail(`J\xE1 existe uma sess\xE3o ativa (${ativaExistente.tarefa_nome || "tarefa em andamento"}). Encerre a sess\xE3o atual para iniciar outra.`, 409);
  const _body = await readJsonBody(request);
  const id = "ste_" + uid();
  const inicioStr = parseDatetimeStr(_body.inicio, "inicio") || (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
  await env.DB.prepare("INSERT INTO sessoes_tempo (id, tarefa_id, usuario_id, inicio) VALUES (?, ?, ?, ?)").bind(id, tarefaId, u.uid, inicioStr).run();
  return ok({ id, inicio: inicioStr });
}
__name(handlePostTempoTarefa, "handlePostTempoTarefa");
async function handlePutTempo(request, env, sessaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const s = await env.DB.prepare("SELECT usuario_id FROM sessoes_tempo WHERE id = ?").bind(sessaoId).first();
  if (!s) return fail("Sess\xE3o n\xE3o encontrada", 404);
  if (s.usuario_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const inicio = parseDatetimeStr(_body.inicio, "inicio", true);
  const fim = parseDatetimeStr(_body.fim, "fim");
  validarJanela(inicio, fim, "sess\xE3o");
  if (!fim) {
    const ativaExistente = await env.DB.prepare("SELECT id FROM sessoes_tempo WHERE usuario_id = ? AND fim IS NULL AND id <> ?").bind(s.usuario_id, sessaoId).first();
    if (ativaExistente) return fail("J\xE1 existe outra sess\xE3o ativa para este usu\xE1rio", 409);
  }
  await env.DB.prepare("UPDATE sessoes_tempo SET inicio=?, fim=? WHERE id=?").bind(inicio, fim || null, sessaoId).run();
  return ok({ ok: true });
}
__name(handlePutTempo, "handlePutTempo");
async function handleDeleteTempo(request, env, sessaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const s = await env.DB.prepare("SELECT usuario_id FROM sessoes_tempo WHERE id = ?").bind(sessaoId).first();
  if (!s) return fail("Sess\xE3o n\xE3o encontrada", 404);
  if (s.usuario_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  await env.DB.prepare("DELETE FROM sessoes_tempo WHERE id = ?").bind(sessaoId).run();
  return ok({ ok: true });
}
__name(handleDeleteTempo, "handleDeleteTempo");
async function handlePutTempoParar(request, env, sessaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const s = await env.DB.prepare("SELECT usuario_id, inicio FROM sessoes_tempo WHERE id = ?").bind(sessaoId).first();
  if (!s) return fail("Sess\xE3o n\xE3o encontrada", 404);
  if (s.usuario_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const fimStr = parseDatetimeStr(_body.fim, "fim") || (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
  validarJanela(s.inicio, fimStr, "encerramento da sess\xE3o");
  await env.DB.prepare("UPDATE sessoes_tempo SET fim=? WHERE id=?").bind(fimStr, sessaoId).run();
  return ok({ ok: true, fim: fimStr });
}
__name(handlePutTempoParar, "handlePutTempoParar");
async function handleGetTempoResumoHoje(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const row = await env.DB.prepare(`
    SELECT COUNT(DISTINCT st.id) as sessoes, COUNT(DISTINCT st.tarefa_id) as tarefas,
      ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM((julianday(i.fim) - julianday(i.inicio)) * 24) FROM intervalos i WHERE i.sessao_id = st.id AND i.fim IS NOT NULL), 0)), 2) as horas_hoje,
      SUM(CASE WHEN st.fim IS NULL THEN 1 ELSE 0 END) as timers_ativos
    FROM sessoes_tempo st WHERE st.usuario_id = ? AND DATE(st.inicio) = DATE('now')
  `).bind(u.uid).first();
  return ok(row || { sessoes: 0, tarefas: 0, horas_hoje: 0, timers_ativos: 0 });
}
__name(handleGetTempoResumoHoje, "handleGetTempoResumoHoje");
async function handleGetTempoAtivas(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const asMember = url.searchParams.get("as_member") === "1";
  const adminScope = isAdmin(u) && !asMember ? 1 : 0;
  const ativas = await env.DB.prepare(`
    SELECT st.id, st.tarefa_id, st.inicio, t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id, tu.nome as usuario_nome, tu.login as usuario_login, st.usuario_id
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE (? = 1 OR st.usuario_id = ?) AND st.fim IS NULL ORDER BY st.inicio ASC
  `).bind(adminScope, u.uid).all();
  return ok(ativas.results);
}
__name(handleGetTempoAtivas, "handleGetTempoAtivas");

// src/backend/domain/time/reports.js
async function handleGetTempoResumo(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!await podeVerTempoTarefa(env, tarefaId, u.uid, u.papel)) return fail("Sem permiss\xE3o", 403);
  const resumo = await env.DB.prepare(`
    SELECT st.usuario_id, tu.nome as usuario_nome,
      ROUND(SUM(
        (CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END)
        - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)
      ), 2) as horas_liquidas
    FROM sessoes_tempo st LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE st.tarefa_id = ? GROUP BY st.usuario_id, tu.nome ORDER BY horas_liquidas DESC
  `).bind(tarefaId).all();
  return ok(resumo.results);
}
__name(handleGetTempoResumo, "handleGetTempoResumo");
async function handleGetTempoColegasAtivos(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const colegas = await env.DB.prepare(`
    SELECT st.id, st.inicio, st.usuario_id, tu.nome as usuario_nome, t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id
    FROM sessoes_tempo st JOIN usuarios tu ON tu.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
    WHERE st.fim IS NULL AND st.usuario_id != ? ORDER BY st.inicio ASC
  `).bind(u.uid).all();
  return ok(colegas.results);
}
__name(handleGetTempoColegasAtivos, "handleGetTempoColegasAtivos");
async function handleGetTempoUltimaSessao(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const row = await env.DB.prepare(`
    SELECT st.tarefa_id, t.nome as tarefa_nome, p.id as projeto_id, p.nome as projeto_nome, st.fim,
           ROUND((julianday(st.fim) - julianday(st.inicio)) * 24, 2) as horas
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
    WHERE st.usuario_id = ? AND st.fim IS NOT NULL ORDER BY st.fim DESC LIMIT 1
  `).bind(u.uid).first();
  return ok(row || null);
}
__name(handleGetTempoUltimaSessao, "handleGetTempoUltimaSessao");
async function handleGetTempoSessoesRecentes(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "6", 10) || 6, 1), 12);
  const rows = await env.DB.prepare(`
    SELECT st.id, st.tarefa_id, t.nome as tarefa_nome, p.id as projeto_id, p.nome as projeto_nome, st.inicio, st.fim,
           ROUND((julianday(st.fim) - julianday(st.inicio)) * 24 - COALESCE((SELECT SUM((julianday(i.fim) - julianday(i.inicio)) * 24) FROM intervalos i WHERE i.sessao_id = st.id AND i.fim IS NOT NULL), 0), 2) as horas_liquidas
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
    WHERE st.usuario_id = ? AND st.fim IS NOT NULL ORDER BY st.fim DESC LIMIT ?
  `).bind(u.uid, limit).all();
  return ok(rows.results || []);
}
__name(handleGetTempoSessoesRecentes, "handleGetTempoSessoesRecentes");

// src/backend/domain/time/intervals.js
async function handlePostIntervalos(request, env, sessaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const s = await env.DB.prepare("SELECT usuario_id, inicio, fim FROM sessoes_tempo WHERE id = ?").bind(sessaoId).first();
  if (!s) return fail("Sess\xE3o n\xE3o encontrada", 404);
  if (s.usuario_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const tipo = clampStr(_body.tipo, 100, "tipo");
  if (!tipo?.trim()) return fail("Tipo obrigat\xF3rio");
  const inicioStr = parseDatetimeStr(_body.inicio, "inicio") || (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ");
  const fimStr = parseDatetimeStr(_body.fim, "fim");
  validarJanela(inicioStr, fimStr, "intervalo");
  validarContencao(inicioStr, fimStr, s.inicio, s.fim);
  const id = "int_" + uid();
  await env.DB.prepare(
    "INSERT INTO intervalos (id, sessao_id, tipo, inicio, fim) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, sessaoId, tipo.trim(), inicioStr, fimStr || null).run();
  return ok({ id, tipo, inicio: inicioStr, fim: fimStr || null });
}
__name(handlePostIntervalos, "handlePostIntervalos");
async function handleGetIntervalos(request, env, intervaloId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const iv = await env.DB.prepare("SELECT i.*, st.usuario_id FROM intervalos i JOIN sessoes_tempo st ON st.id = i.sessao_id WHERE i.id = ?").bind(intervaloId).first();
  if (!iv) return fail("Intervalo n\xE3o encontrado", 404);
  if (iv.usuario_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  return ok(iv);
}
__name(handleGetIntervalos, "handleGetIntervalos");
async function handlePutIntervalos(request, env, intervaloId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const iv = await env.DB.prepare("SELECT i.*, st.usuario_id FROM intervalos i JOIN sessoes_tempo st ON st.id = i.sessao_id WHERE i.id = ?").bind(intervaloId).first();
  if (!iv) return fail("Intervalo n\xE3o encontrado", 404);
  if (iv.usuario_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const _body = await readJsonBody(request);
  const tipo = clampStr(_body.tipo, 100, "tipo");
  if (!tipo?.trim()) return fail("Tipo obrigat\xF3rio");
  const inicioStr = parseDatetimeStr(_body.inicio, "inicio", true);
  const fimStr = parseDatetimeStr(_body.fim, "fim");
  validarJanela(inicioStr, fimStr, "intervalo");
  const sess = await env.DB.prepare("SELECT inicio, fim FROM sessoes_tempo WHERE id = ?").bind(iv.sessao_id).first();
  validarContencao(inicioStr, fimStr, sess.inicio, sess.fim);
  await env.DB.prepare("UPDATE intervalos SET tipo=?, inicio=?, fim=? WHERE id=?").bind(tipo.trim(), inicioStr, fimStr || null, intervaloId).run();
  return ok({ ok: true });
}
__name(handlePutIntervalos, "handlePutIntervalos");
async function handleDeleteIntervalos(request, env, intervaloId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const iv = await env.DB.prepare("SELECT i.*, st.usuario_id FROM intervalos i JOIN sessoes_tempo st ON st.id = i.sessao_id WHERE i.id = ?").bind(intervaloId).first();
  if (!iv) return fail("Intervalo n\xE3o encontrado", 404);
  if (iv.usuario_id !== u.uid && !isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  await env.DB.prepare("DELETE FROM intervalos WHERE id = ?").bind(intervaloId).run();
  return ok({ ok: true });
}
__name(handleDeleteIntervalos, "handleDeleteIntervalos");

// src/backend/domain/admin/controllers.js
async function handleGetStatus(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  const [colegas, notifs] = await env.DB.batch([
    env.DB.prepare(`
      SELECT st.usuario_id, tu.nome as usuario_nome, t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id, st.inicio
      FROM sessoes_tempo st JOIN usuarios tu ON tu.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
      WHERE st.fim IS NULL AND st.usuario_id != ? ORDER BY st.inicio ASC
    `).bind(u.uid),
    env.DB.prepare("SELECT COUNT(*) as nao_lidas FROM notificacoes WHERE usuario_id = ? AND lida_em IS NULL").bind(u.uid)
  ]);
  return ok({ colegas_ativos: colegas.results, notifs_nao_lidas: notifs.results[0]?.nao_lidas || 0 }, 200, { "Cache-Control": "public, max-age=10" });
}
__name(handleGetStatus, "handleGetStatus");
async function handleGetAdminAgora(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const ativas = await env.DB.prepare(`
    SELECT st.id, st.inicio, st.usuario_id, tu.nome as usuario_nome, tu.login as usuario_login, t.id as tarefa_id, t.nome as tarefa_nome, t.status as tarefa_status, p.id as projeto_id, p.nome as projeto_nome
    FROM sessoes_tempo st JOIN usuarios tu ON tu.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
    WHERE st.fim IS NULL ORDER BY st.inicio ASC
  `).all();
  return ok(ativas.results);
}
__name(handleGetAdminAgora, "handleGetAdminAgora");
async function handleGetAdminTimelineHoje(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const rows = await env.DB.prepare(`
    SELECT st.usuario_id, u.nome as usuario_nome, st.inicio, st.fim, t.nome as tarefa_nome
    FROM sessoes_tempo st JOIN usuarios u ON u.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id
    WHERE DATE(st.inicio) = DATE('now') ORDER BY st.usuario_id, st.inicio
  `).all();
  return ok(rows.results);
}
__name(handleGetAdminTimelineHoje, "handleGetAdminTimelineHoje");
async function handleGetAdminUsuarios(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const { pageSize, offset } = getPagination(url, 120, 400);
  const usuarios = await env.DB.prepare(`
    SELECT u.id, u.nome, u.login as usuario_login, u.papel, COALESCE(u.deve_trocar_senha, 0) as deve_trocar_senha,
      (SELECT COUNT(*) FROM projetos p WHERE p.dono_id = u.id) as projetos_como_dono,
      (SELECT COUNT(*) FROM permissoes_projeto pp WHERE pp.usuario_id = u.id) as projetos_como_editor,
      (SELECT COUNT(*) FROM tarefas t WHERE t.dono_id = u.id) as tarefas_como_dono,
      (SELECT COUNT(*) FROM tarefas t WHERE t.dono_id = u.id AND t.status = 'Em andamento') as tarefas_em_andamento,
      COALESCE((SELECT ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) FROM sessoes_tempo st WHERE st.usuario_id = u.id), 0) as horas_totais
    FROM usuarios u ORDER BY u.nome LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all();
  return ok(usuarios.results);
}
__name(handleGetAdminUsuarios, "handleGetAdminUsuarios");
async function handleGetAdminUsuario(request, env, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const usuario = await env.DB.prepare("SELECT id, nome, login as usuario_login, papel, COALESCE(deve_trocar_senha, 0) as deve_trocar_senha FROM usuarios WHERE id = ?").bind(usuarioId).first();
  if (!usuario) return fail("Usu\xE1rio n\xE3o encontrado", 404);
  const projetosDashboard = await env.DB.prepare(`SELECT p.id, p.nome, p.status, p.prioridade, 'dono' as papel_no_projeto FROM projetos p WHERE p.dono_id = ? UNION ALL SELECT p.id, p.nome, p.status, p.prioridade, 'editor' as papel_no_projeto FROM projetos p JOIN permissoes_projeto pp ON pp.projeto_id = p.id WHERE pp.usuario_id = ? AND p.dono_id <> ? ORDER BY nome`).bind(usuarioId, usuarioId, usuarioId).all();
  const tarefas = await env.DB.prepare(`SELECT DISTINCT t.id, t.nome, t.status, t.prioridade, t.dificuldade, t.dificuldade AS complexidade, p.id as projeto_id, p.nome as projeto_nome, CASE WHEN t.dono_id = ? THEN 'dono' ELSE 'colaborador' END as papel_na_tarefa FROM tarefas t JOIN projetos p ON p.id = t.projeto_id LEFT JOIN colaboradores_tarefa ct ON ct.tarefa_id = t.id AND ct.usuario_id = ? WHERE t.dono_id = ? OR ct.usuario_id = ? ORDER BY CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END, t.atualizado_em DESC`).bind(usuarioId, usuarioId, usuarioId, usuarioId).all();
  const tempoPorTarefa = await env.DB.prepare(`SELECT t.id as tarefa_id, t.nome as tarefa_nome, p.id as projeto_id, p.nome as projeto_nome, ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) as horas_liquidas FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id WHERE st.usuario_id = ? GROUP BY t.id, t.nome, p.id, p.nome ORDER BY horas_liquidas DESC`).bind(usuarioId).all();
  const ativas = await env.DB.prepare(`SELECT st.id, st.inicio, t.id as tarefa_id, t.nome as tarefa_nome, p.id as projeto_id, p.nome as projeto_nome FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id WHERE st.usuario_id = ? AND st.fim IS NULL ORDER BY st.inicio ASC`).bind(usuarioId).all();
  return ok({ usuario, projetos_dashboard: projetosDashboard.results, tarefas: tarefas.results, tempo_por_tarefa: tempoPorTarefa.results, ativas: ativas.results });
}
__name(handleGetAdminUsuario, "handleGetAdminUsuario");
async function handleGetAdminProjetos(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const { pageSize, offset } = getPagination(url, 150, 500);
  const baseP = await env.DB.prepare(`
    SELECT p.id, p.nome, p.fase, p.status, p.prioridade, p.prazo, pu.nome as dono_nome
    FROM projetos p LEFT JOIN usuarios pu ON pu.id = p.dono_id 
    ORDER BY p.atualizado_em DESC LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all();
  const results = baseP.results || [];
  if (results.length === 0) return ok([]);
  const pIds = results.map((r) => r.id);
  const ph = pIds.map(() => "?").join(",");
  const [tQ, hQ] = await env.DB.batch([
    env.DB.prepare(`SELECT projeto_id, COUNT(DISTINCT id) as total_tarefas, SUM(CASE WHEN status = 'Conclu\xEDda' THEN 1 ELSE 0 END) as tarefas_concluidas FROM tarefas WHERE projeto_id IN (${ph}) GROUP BY projeto_id`).bind(...pIds),
    env.DB.prepare(`SELECT t.projeto_id, ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) as horas_totais FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id WHERE t.projeto_id IN (${ph}) GROUP BY t.projeto_id`).bind(...pIds)
  ]);
  const mapT = {};
  for (const r of tQ.results) mapT[r.projeto_id] = r;
  const mapH = {};
  for (const r of hQ.results) mapH[r.projeto_id] = r.horas_totais;
  const finalRows = results.map((p) => ({
    ...p,
    total_tarefas: mapT[p.id]?.total_tarefas || 0,
    tarefas_concluidas: mapT[p.id]?.tarefas_concluidas || 0,
    horas_totais: mapH[p.id] || 0
  }));
  return ok(finalRows);
}
__name(handleGetAdminProjetos, "handleGetAdminProjetos");
async function handleGetAdminTempo(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const { pageSize, offset } = getPagination(url, 250, 1e3);
  const de = url.searchParams.get("de") || null;
  const ate = url.searchParams.get("ate") || null;
  const usuarioId = url.searchParams.get("usuario_id") || null;
  const linhas = await env.DB.prepare(`SELECT tu.id as usuario_id, tu.nome as usuario_nome, p.id as projeto_id, p.nome as projeto_nome, t.id as tarefa_id, t.nome as tarefa_nome, ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) as horas_liquidas FROM sessoes_tempo st JOIN usuarios tu ON tu.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id WHERE (? IS NULL OR tu.id = ?) AND (? IS NULL OR date(st.inicio) >= date(?)) AND (? IS NULL OR date(st.inicio) <= date(?)) GROUP BY tu.id, tu.nome, p.id, p.nome, t.id, t.nome ORDER BY horas_liquidas DESC LIMIT ? OFFSET ?`).bind(usuarioId, usuarioId, de, de, ate, ate, pageSize, offset).all();
  return ok(linhas.results);
}
__name(handleGetAdminTempo, "handleGetAdminTempo");
async function handleGetAdminHorasPorGrupo(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail("N\xE3o autorizado", 401);
  if (!isAdmin(u)) return fail("Sem permiss\xE3o", 403);
  const de = url.searchParams.get("de") || null;
  const ate = url.searchParams.get("ate") || null;
  const rows = await env.DB.prepare(`SELECT COALESCE(g.nome, 'Sem grupo') as grupo_nome, COALESCE(g.id, 'sem_grupo') as grupo_id, ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM((julianday(i.fim) - julianday(i.inicio)) * 24) FROM intervalos i WHERE i.sessao_id = st.id AND i.fim IS NOT NULL), 0)), 2) as horas_liquidas FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id LEFT JOIN grupos_projetos g ON g.id = p.grupo_id WHERE (? IS NULL OR DATE(st.inicio) >= DATE(?)) AND (? IS NULL OR DATE(st.inicio) <= DATE(?)) GROUP BY COALESCE(g.id, 'sem_grupo'), COALESCE(g.nome, 'Sem grupo') ORDER BY horas_liquidas DESC`).bind(de, de, ate, ate).all();
  return ok(rows.results);
}
__name(handleGetAdminHorasPorGrupo, "handleGetAdminHorasPorGrupo");

// src/worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    if (!env.DB) {
      return new Response(JSON.stringify({ error: "Database binding (DB) is missing. Check wrangler.toml" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const cors = getCors(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const reqId = crypto.randomUUID();
    cors["X-Request-Id"] = reqId;
    ctx.waitUntil(ensureAllSchemas(env).catch((e) => console.error(`[schema] [${reqId}]`, e.message)));
    const t0 = performance.now();
    try {
      if (path === "/api/auth/register" && method === "POST") return await handleAuthRegister(request, env, cors);
      if (path === "/api/auth/login" && method === "POST") return await handleAuthLogin(request, env, cors);
      if (path === "/api/auth/logout" && method === "POST") return await handleAuthLogout(request, env, cors);
      if (path === "/api/auth/me" && method === "GET") return await handleAuthMe(request, env, cors);
      if (path === "/api/auth/trocar-senha" && method === "POST") return await handleAuthTrocarSenha(request, env, cors);
      if (path === "/api/usuarios" && method === "GET") return await handleGetUsuarios(request, env, cors);
      if (path === "/api/usuarios" && method === "POST") return await handlePostUsuarios(request, env, cors);
      const matchUsuarioPapel = path.match(/^\/api\/usuarios\/(usr_[a-zA-Z0-9]+)\/papel$/);
      if (matchUsuarioPapel && method === "PUT") return await handlePutUsuarioPapel(request, env, matchUsuarioPapel[1]);
      const matchUsuarioSenha = path.match(/^\/api\/usuarios\/(usr_[a-zA-Z0-9]+)\/senha$/);
      if (matchUsuarioSenha && method === "PUT") return await handlePutUsuarioSenha(request, env, matchUsuarioSenha[1]);
      if (path === "/api/status" && method === "GET") return await handleGetStatus(request, env, url);
      if (path === "/api/tarefas/operacao-hoje" && method === "GET") return await handleGetOperacaoHoje(request, env, url);
      if (path === "/api/tempo/ativas" && method === "GET") return await handleGetTempoAtivas(request, env, url);
      if (path === "/api/tempo/colegas-ativos" && method === "GET") return await handleGetTempoColegasAtivos(request, env, url);
      if (path === "/api/tempo/ultima-sessao" && method === "GET") return await handleGetTempoUltimaSessao(request, env, url);
      if (path === "/api/tempo/sessoes-recentes" && method === "GET") return await handleGetTempoSessoesRecentes(request, env, url);
      if (path === "/api/tempo/resumo-hoje" && method === "GET") return await handleGetTempoResumoHoje(request, env, url);
      if (path === "/api/templates-tarefa" && method === "GET") return await handleGetTemplatesTarefa(request, env, url);
      if (path === "/api/templates-tarefa" && method === "POST") return await handlePostTemplatesTarefa(request, env);
      if (path === "/api/grupos" && method === "GET") return await handleGetGrupos(request, env, url);
      if (path === "/api/grupos" && method === "POST") return await handlePostGrupos(request, env);
      const matchGrupo = path.match(/^\/api\/grupos\/(grp_[a-zA-Z0-9]+)$/);
      if (matchGrupo && method === "GET") return await handleGetGrupo(request, env, matchGrupo[1]);
      if (matchGrupo && method === "PUT") return await handlePutGrupo(request, env, matchGrupo[1]);
      if (matchGrupo && method === "PATCH") return await handlePatchGrupo(request, env, matchGrupo[1]);
      if (matchGrupo && method === "DELETE") return await handleDeleteGrupo(request, env, matchGrupo[1]);
      const matchGrupoPerm = path.match(/^\/api\/grupos\/(grp_[a-zA-Z0-9]+)\/permissoes$/);
      if (matchGrupoPerm && method === "POST") return await handlePostPermissoesGrupo(request, env, matchGrupoPerm[1]);
      const matchGrupoSair = path.match(/^\/api\/grupos\/(grp_[a-zA-Z0-9]+)\/sair$/);
      if (matchGrupoSair && method === "DELETE") return await handleDeleteSairGrupo(request, env, matchGrupoSair[1]);
      const matchGrupoPermUid = path.match(/^\/api\/grupos\/(grp_[a-zA-Z0-9]+)\/permissoes\/(usr_[a-zA-Z0-9]+)$/);
      if (matchGrupoPermUid && method === "DELETE") return await handleDeletePermissaoGrupoUsuario(request, env, matchGrupoPermUid[1], matchGrupoPermUid[2]);
      if (path === "/api/projetos" && method === "GET") return await handleGetProjetos(request, env, url);
      if (path === "/api/projetos" && method === "POST") return await handlePostProjetos(request, env);
      const matchProjeto = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)$/);
      if (matchProjeto && method === "GET") return await handleGetProjeto(request, env, matchProjeto[1]);
      if (matchProjeto && method === "PUT") return await handlePutProjeto(request, env, matchProjeto[1]);
      if (matchProjeto && method === "PATCH") return await handlePatchProjeto(request, env, matchProjeto[1]);
      if (matchProjeto && method === "DELETE") return await handleDeleteProjeto(request, env, matchProjeto[1]);
      const matchProjetoTarefas = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/tarefas$/);
      if (matchProjetoTarefas && method === "GET") return await handleGetTarefasProjeto(request, env, matchProjetoTarefas[1], url);
      if (matchProjetoTarefas && method === "POST") return await handlePostTarefasProjeto(request, env, matchProjetoTarefas[1]);
      const matchProjetoDecisoes = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/decisoes$/);
      if (matchProjetoDecisoes && method === "GET") return await handleGetDecisoesProjeto(request, env, matchProjetoDecisoes[1], url);
      if (matchProjetoDecisoes && method === "POST") return await handlePostDecisoesProjeto(request, env, matchProjetoDecisoes[1]);
      const matchProjetoPerm = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/permissoes$/);
      if (matchProjetoPerm && method === "POST") return await handlePostPermissoesProjeto(request, env, matchProjetoPerm[1]);
      const matchProjetoSair = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/sair$/);
      if (matchProjetoSair && method === "DELETE") return await handleDeleteSairProjeto(request, env, matchProjetoSair[1]);
      const matchProjetoPermUid = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/permissoes\/(usr_[a-zA-Z0-9]+)$/);
      if (matchProjetoPermUid && method === "DELETE") return await handleDeletePermissaoProjetoUsuario(request, env, matchProjetoPermUid[1], matchProjetoPermUid[2]);
      const matchProjetoRelatorio = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/relatorio$/);
      if (matchProjetoRelatorio && method === "GET") return await handleGetProjetoRelatorio(request, env, matchProjetoRelatorio[1]);
      const matchProjetoHorasUsuario = path.match(/^\/api\/projetos\/(prj_[a-zA-Z0-9]+)\/horas-por-usuario$/);
      if (matchProjetoHorasUsuario && method === "GET") return await handleGetProjetoHorasPorUsuario(request, env, matchProjetoHorasUsuario[1]);
      const matchTarefa = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)$/);
      if (matchTarefa && method === "PUT") return await handlePutTarefa(request, env, matchTarefa[1]);
      if (matchTarefa && method === "PATCH") return await handlePatchTarefaStatus(request, env, matchTarefa[1]);
      if (matchTarefa && method === "DELETE") return await handleDeleteTarefa(request, env, matchTarefa[1]);
      const matchTarefaDuplicar = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/duplicar$/);
      if (matchTarefaDuplicar && method === "POST") return await handlePostDuplicarTarefa(request, env, matchTarefaDuplicar[1]);
      const matchTarefaFoco = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/foco$/);
      if (matchTarefaFoco && method === "PUT") return await handlePutTarefaFoco(request, env, matchTarefaFoco[1]);
      if (matchTarefaFoco && method === "DELETE") return await handleDeleteTarefaFoco(request, env, matchTarefaFoco[1]);
      const matchTarefaColab = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/colaboradores$/);
      if (matchTarefaColab && method === "GET") return await handleGetColaboradoresTarefa(request, env, matchTarefaColab[1]);
      if (matchTarefaColab && method === "POST") return await handlePostColaboradoresTarefa(request, env, matchTarefaColab[1]);
      const matchTarefaSair = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/sair$/);
      if (matchTarefaSair && method === "DELETE") return await handleDeleteSairTarefa(request, env, matchTarefaSair[1]);
      const matchTarefaColabUid = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/colaboradores\/(usr_[a-zA-Z0-9]+)$/);
      if (matchTarefaColabUid && method === "DELETE") return await handleDeleteColaboradorTarefa(request, env, matchTarefaColabUid[1], matchTarefaColabUid[2]);
      const matchTarefaTempo = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/tempo$/);
      if (matchTarefaTempo && method === "GET") return await handleGetTempoTarefa(request, env, matchTarefaTempo[1]);
      if (matchTarefaTempo && method === "POST") return await handlePostTempoTarefa(request, env, matchTarefaTempo[1]);
      const matchTarefaTempoResumo = path.match(/^\/api\/tarefas\/(tsk_[a-zA-Z0-9]+)\/tempo\/resumo$/);
      if (matchTarefaTempoResumo && method === "GET") return await handleGetTempoResumo(request, env, matchTarefaTempoResumo[1]);
      const matchTemplate = path.match(/^\/api\/templates-tarefa\/(tpl_[a-zA-Z0-9]+)$/);
      if (matchTemplate && method === "PUT") return await handlePutTemplateTarefa(request, env, matchTemplate[1]);
      if (matchTemplate && method === "DELETE") return await handleDeleteTemplateTarefa(request, env, matchTemplate[1]);
      const matchDecisao = path.match(/^\/api\/decisoes\/(dec_[a-zA-Z0-9]+)$/);
      if (matchDecisao && method === "PUT") return await handlePutDecisao(request, env, matchDecisao[1]);
      if (matchDecisao && method === "DELETE") return await handleDeleteDecisao(request, env, matchDecisao[1]);
      const matchTempo = path.match(/^\/api\/tempo\/(ste_[a-zA-Z0-9]+)$/);
      if (matchTempo && method === "PUT") return await handlePutTempo(request, env, matchTempo[1]);
      if (matchTempo && method === "DELETE") return await handleDeleteTempo(request, env, matchTempo[1]);
      const matchTempoParar = path.match(/^\/api\/tempo\/(ste_[a-zA-Z0-9]+)\/parar$/);
      if (matchTempoParar && method === "PUT") return await handlePutTempoParar(request, env, matchTempoParar[1]);
      const matchTempoIntervalos = path.match(/^\/api\/tempo\/(ste_[a-zA-Z0-9]+)\/intervalos$/);
      if (matchTempoIntervalos && method === "POST") return await handlePostIntervalos(request, env, matchTempoIntervalos[1]);
      const matchIntervalos = path.match(/^\/api\/intervalos\/(int_[a-zA-Z0-9]+)$/);
      if (matchIntervalos && method === "GET") return await handleGetIntervalos(request, env, matchIntervalos[1]);
      if (matchIntervalos && method === "PUT") return await handlePutIntervalos(request, env, matchIntervalos[1]);
      if (matchIntervalos && method === "DELETE") return await handleDeleteIntervalos(request, env, matchIntervalos[1]);
      if (path === "/api/admin/agora" && method === "GET") return await handleGetAdminAgora(request, env, url);
      if (path === "/api/admin/timeline-hoje" && method === "GET") return await handleGetAdminTimelineHoje(request, env, url);
      if (path === "/api/admin/usuarios" && method === "GET") return await handleGetAdminUsuarios(request, env, url);
      const matchAdminUsuario = path.match(/^\/api\/admin\/usuarios\/(usr_[a-zA-Z0-9]+)$/);
      if (matchAdminUsuario && method === "GET") return await handleGetAdminUsuario(request, env, matchAdminUsuario[1]);
      if (path === "/api/admin/projetos" && method === "GET") return await handleGetAdminProjetos(request, env, url);
      if (path === "/api/admin/tempo" && method === "GET") return await handleGetAdminTempo(request, env, url);
      if (path === "/api/admin/horas-por-grupo" && method === "GET") return await handleGetAdminHorasPorGrupo(request, env, url);
      if (path.startsWith("/api/")) return err("Endpoint n\xE3o encontrado", 404, cors);
      return new Response("Telier API Edge (Modular)", { status: 200, headers: { ...cors, "Content-Type": "text/plain" } });
    } catch (e) {
      console.error(`[error] [${reqId}] ${path}:`, e.stack || e);
      return err("Erro interno no servidor. ID da requisi\xE7\xE3o: " + reqId, e.status || 500, cors);
    } finally {
      const t1 = performance.now();
      const duration = t1 - t0;
      if (duration > 100) {
        console.warn(`[perf] [${reqId}] ${method} ${path} levou ${Math.round(duration)}ms`);
      }
    }
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
