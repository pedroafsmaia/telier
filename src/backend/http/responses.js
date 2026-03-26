export function getCors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://telier.pages.dev';
  const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  const allowedOrigin = (origin === allowed || isLocalhost) ? origin : allowed;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };
}

export function json(data, status = 200, cors = {}, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export function err(msg, status = 400, cors = {}, extraHeaders = {}) {
  return json({ error: msg }, status, cors, extraHeaders);
}

const GLOBAL_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

export function ok(data, status = 200, extraHeaders = {}) {
  return json(data, status, GLOBAL_CORS, extraHeaders);
}

export function fail(msg, status = 400, extraHeaders = {}) {
  return err(msg, status, GLOBAL_CORS, extraHeaders);
}
