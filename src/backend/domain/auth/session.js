import { getClientIp } from '../../http/request.js';

export const RATE_WINDOW_MS = 60000;
export const RATE_AUTH_LIMIT = 12;
export const _rateBuckets = new Map();

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

export function isAdmin(u) { return u?.papel === 'admin'; }
