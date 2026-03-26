export const MAX_BODY_BYTES = 64 * 1024;

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

export function getClientIp(request) {
  return (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown').split(',')[0].trim();
}

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
