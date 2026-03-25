// ── API ──
import {
  API, TOKEN, PROJ_CACHE_KEY, PROJ_CACHE_TTL, REQ_TIMEOUT_MS,
} from './state.js';

export async function req(method, path, body) {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
  let r;
  try {
    r = await fetch(API + path, {
      method,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('Tempo limite atingido ao conectar ao servidor.');
    }
    throw new Error('Falha de conexão com o servidor.');
  } finally {
    clearTimeout(timeoutId);
  }

  let d = null;
  try { d = await r.json(); } catch { d = null; }
  if (!r.ok) throw new Error(d?.error || `Erro na requisição (${r.status})`);
  return d;
}

export async function fetchProjetos(params) {
  try {
    const raw = sessionStorage.getItem(PROJ_CACHE_KEY);
    if (raw) {
      const { ts, data, key } = JSON.parse(raw);
      if (key === params.toString() && Date.now() - ts < PROJ_CACHE_TTL) return data;
    }
  } catch {}
  const data = await req('GET', `/projetos?${params}`);
  try {
    sessionStorage.setItem(PROJ_CACHE_KEY, JSON.stringify({
      ts: Date.now(), data, key: params.toString(),
    }));
  } catch {}
  return data;
}

export function invalidarCacheProjetos() {
  sessionStorage.removeItem(PROJ_CACHE_KEY);
}
