import assert from 'node:assert/strict';
import { getCors, json, err, buildResponseHeaders } from '../src/backend/http/response.js';
import { readJsonBody } from '../src/backend/utils/request.js';
import {
  hashSenha,
  verificarSenha,
  requireAuth,
  isAdmin,
  checkRateLimit,
  getRateLimitRetryAfter,
  normalizeUsuarioPayload,
  normalizeTarefaPayload,
} from '../src/backend/domain/auth/core.js';

function req({ method = 'POST', origin = 'https://telier.pages.dev', contentType = 'application/json', body = '{}', auth = '' } = {}) {
  const headers = new Headers();
  if (origin !== null) headers.set('Origin', origin);
  if (contentType) headers.set('Content-Type', contentType);
  if (auth) headers.set('Authorization', auth);
  headers.set('Content-Length', String(new TextEncoder().encode(body).length));
  return {
    method,
    headers,
    async arrayBuffer() { return new TextEncoder().encode(body).buffer; },
  };
}

function b64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

async function pbkdf2LegacyString(password, iter = 10000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  const hash = new Uint8Array(bits);
  return `pbkdf2$${iter}$${b64(salt)}$${b64(hash)}`;
}

(async () => {
  const headers = buildResponseHeaders('req_abc');
  assert.equal(headers['X-Request-Id'], 'req_abc');
  assert.equal(headers['X-Frame-Options'], 'DENY');

  const cors = getCors(req({ method: 'OPTIONS' }), { ALLOWED_ORIGIN: 'https://telier.pages.dev' });
  assert.equal(cors['Access-Control-Allow-Methods'], 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  assert.equal(cors['Access-Control-Allow-Headers'], 'Content-Type,Authorization');

  const payload = { ok: true };
  const okRes = json(payload, 201, { A: 'a' }, { B: 'b' });
  assert.equal(okRes.status, 201);
  assert.equal(okRes.headers.get('A'), 'a');
  assert.equal(okRes.headers.get('B'), 'b');
  assert.deepEqual(await okRes.json(), payload);

  const errRes = err('falha', 418);
  assert.equal(errRes.status, 418);
  assert.deepEqual(await errRes.json(), { error: 'falha' });

  const parsed = await readJsonBody(req({ body: '{"a":1}' }));
  assert.deepEqual(parsed, { a: 1 });
  await assert.rejects(() => readJsonBody(req({ contentType: 'text/plain', body: 'x' })), (e) => e?.status === 415);
  await assert.rejects(() => readJsonBody(req({ body: '{bad' })), (e) => e?.status === 400);

  const hash = await hashSenha('senha-segura');
  const okHash = await verificarSenha('senha-segura', hash);
  assert.equal(okHash.ok, true);
  const badHash = await verificarSenha('outra', hash);
  assert.equal(badHash.ok, false);

  const pbkdf2 = await pbkdf2LegacyString('legado123');
  const okPbkdf2 = await verificarSenha('legado123', pbkdf2);
  assert.equal(okPbkdf2.ok, true);

  const okPlain = await verificarSenha('abc', 'abc');
  assert.equal(okPlain.ok, true);

  const fakeEnv = {
    DB: {
      prepare(sql) {
        return {
          bind(token) {
            return {
              async first() {
                if (sql.includes('FROM sessoes') && token === 'tok_ok') {
                  return { uid: 'usr_1', papel: 'admin', nome: 'Admin', login: 'admin', sessao_id: 'tok_ok' };
                }
                return null;
              },
            };
          },
        };
      },
    },
  };

  const [u1, e1] = await requireAuth(req({ auth: 'Bearer tok_ok' }), fakeEnv);
  assert.equal(e1, null);
  assert.equal(u1.uid, 'usr_1');
  const [u2, e2] = await requireAuth(req({ auth: 'Bearer tok_bad' }), fakeEnv);
  assert.equal(u2, null);
  assert.equal(e2, 401);
  assert.equal(isAdmin({ papel: 'admin' }), true);

  const limitedReq = req({ origin: null, contentType: null });
  assert.equal(checkRateLimit(limitedReq, 'test_scope', 2), true);
  assert.equal(checkRateLimit(limitedReq, 'test_scope', 2), true);
  assert.equal(checkRateLimit(limitedReq, 'test_scope', 2), false);
  assert.ok(getRateLimitRetryAfter(limitedReq, 'test_scope') >= 1);

  assert.deepEqual(normalizeUsuarioPayload({ usuario_login: 'u1' }), { usuario_login: 'u1', login: 'u1' });
  assert.deepEqual(normalizeUsuarioPayload({ login: 'u2' }), { login: 'u2', usuario_login: 'u2' });
  assert.deepEqual(normalizeTarefaPayload({ dificuldade: 'Moderada' }), { dificuldade: 'Moderada', complexidade: 'Moderada' });
  assert.deepEqual(normalizeTarefaPayload({ complexidade: 'Complexa' }), { complexidade: 'Complexa', dificuldade: 'Complexa' });

  console.log('OK: backend infra/auth compatibility checks passed');
})();
