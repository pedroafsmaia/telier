export const MAX_BODY_BYTES = 64 * 1024; // 64 KB

export function toInt(v, fallback = 1) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getPagination(url, defaultSize = 100, maxSize = 500) {
  const page = toInt(url.searchParams.get('page'), 1);
  const pageSize = Math.min(toInt(url.searchParams.get('page_size'), defaultSize), maxSize);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function nowStr(d = new Date()) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export async function readJsonBody(request) {
  const ct = (request.headers.get('Content-Type') || '').split(';')[0].trim();
  if (ct && ct !== 'application/json') {
    throw Object.assign(new Error('Content-Type deve ser application/json'), { status: 415 });
  }
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Payload too large'), { status: 413 });
  }
  const arrayBuf = await request.arrayBuffer();
  if (arrayBuf.byteLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Payload too large'), { status: 413 });
  }
  try {
    return JSON.parse(new TextDecoder().decode(arrayBuf));
  } catch {
    throw Object.assign(new Error('JSON inválido'), { status: 400 });
  }
}

export function clampStr(value, max, fieldName) {
  if (value === undefined || value === null) return value;
  const s = String(value);
  if (s.length > max) throw Object.assign(
    new Error(`Campo "${fieldName}" excede o limite de ${max} caracteres`),
    { status: 400 },
  );
  return s;
}

export function validateDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw Object.assign(new Error(`Campo "${fieldName}" deve ser uma data válida (YYYY-MM-DD)`), { status: 400 });
  }
  return s;
}

export function validatePositiveNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`Campo "${fieldName}" deve ser um número positivo`), { status: 400 });
  }
  return n;
}
