export const PBKDF2_ITER = 10000;
export const PBKDF2_ALGO = 'SHA-256';
export const LEGACY_PLAIN = 'legacy_plain';
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 256;

export function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function fromBase64(str) {
  const bin = atob(str || '');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ^ b[i]);
  return diff === 0;
}

export function hexToBytes(hex) {
  const out = new Uint8Array(hex.length >>> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function sha256Hex(data) {
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function pbkdf2Hash(senha, saltBytes, iter = PBKDF2_ITER) {
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

export function parseHash(stored) {
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
