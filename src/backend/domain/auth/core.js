import { clampStr } from '../../utils/request.js';

const PBKDF2_ITER = 10000;
const PBKDF2_ALGO = 'SHA-256';
const LEGACY_PLAIN = 'legacy_plain';
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 256;

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

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length >>> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

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

export async function hashSenha(senha) {
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

export async function verificarSenha(senha, stored) {
  const s = String(stored || '');
  if (s.startsWith('sha256v1$')) {
    const parts = s.split('$');
    if (parts.length !== 3) return { ok: false, mode: 'sha256v1' };
    const [, salt, storedHash] = parts;
    const enc = new TextEncoder();
    const calc = await sha256Hex(enc.encode(salt + ':' + String(senha)));
    return { ok: timingSafeEqual(hexToBytes(calc), hexToBytes(storedHash)), mode: 'sha256v1' };
  }

  const parsed = parseHash(s);
  if (parsed) {
    try {
      const calc = await pbkdf2Hash(senha, parsed.salt, parsed.iter);
      return { ok: timingSafeEqual(calc, parsed.hash), mode: 'pbkdf2' };
    } catch {
      return { ok: false, mode: 'pbkdf2' };
    }
  }

  return { ok: String(senha) === s, mode: LEGACY_PLAIN };
}

const RATE_WINDOW_MS = 60000;
const RATE_AUTH_LIMIT = 12;
const _rateBuckets = new Map();

export function getClientIp(request) {
  return (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown').split(',')[0].trim();
}

export function checkRateLimit(request, scope, limit = RATE_AUTH_LIMIT, windowMs = RATE_WINDOW_MS) {
  const ip = getClientIp(request);
  const now = Date.now();
  const key = `${scope}:${ip}`;

  if (_rateBuckets.size > 2000) {
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

export function getRateLimitRetryAfter(request, scope) {
  const key = `${scope}:${getClientIp(request)}`;
  const bucket = _rateBuckets.get(key);
  if (!bucket) return 60;
  return Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
}

export async function getUsuario(request, env) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  return await env.DB.prepare(
    `SELECT s.id as sessao_id, u.id as uid, u.nome, u.login, u.papel, COALESCE(u.deve_trocar_senha, 0) as deve_trocar_senha
     FROM sessoes s JOIN usuarios u ON s.usuario_id = u.id
     WHERE s.id = ? AND s.expira_em > datetime('now')`
  ).bind(token).first();
}

export async function requireAuth(request, env) {
  const u = await getUsuario(request, env);
  if (!u) return [null, 401];
  return [u, null];
}

export function isAdmin(u) {
  return u?.papel === 'admin';
}

export function getUsuarioLoginInput(body, max = 60) {
  const raw = body?.usuario_login ?? body?.login;
  const usuarioLogin = clampStr(raw, max, 'usuario_login');
  if (!usuarioLogin) return usuarioLogin;
  return String(usuarioLogin).toLowerCase().trim().replace(/\s+/g, '_');
}

export function normalizeUsuarioPayload(row) {
  if (!row || typeof row !== 'object') return row;
  const usuario_login = row.usuario_login ?? row.login ?? null;
  return { ...row, usuario_login, login: usuario_login };
}

export function normalizeTarefaPayload(row) {
  if (!row || typeof row !== 'object') return row;
  const complexidade = row.complexidade ?? row.dificuldade ?? null;
  return { ...row, complexidade, dificuldade: complexidade };
}
