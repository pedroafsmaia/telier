// ── API CLIENT ──
// All HTTP requests go through this module
// Handles auth tokens, timeouts, error handling

import { API, TOKEN, REQ_TIMEOUT_MS, PROJ_CACHE_KEY, PROJ_CACHE_TTL } from './state.js';

export async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (TOKEN) opts.headers.Authorization = `Bearer ${TOKEN}`;
  if (body) opts.body = JSON.stringify(body);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQ_TIMEOUT_MS);

  try {
    const res = await fetch(API + path, { ...opts, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const erro = await res.text();
      throw new Error(erro || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (erro) {
    clearTimeout(timeoutId);
    throw erro;
  }
}

export async function fetchProjetos(params) {
  // Check cache first
  try {
    const raw = sessionStorage.getItem(PROJ_CACHE_KEY);
    if (raw) {
      const { ts, data, key } = JSON.parse(raw);
      if (key === params.toString() && Date.now() - ts < PROJ_CACHE_TTL) {
        return data;
      }
    }
  } catch {}

  // Fetch fresh data
  const data = await req('GET', `/projetos?${params}`);

  // Cache it
  try {
    sessionStorage.setItem(PROJ_CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      key: params.toString(),
      data
    }));
  } catch {}

  return data;
}

export function invalidarCacheProjetos() {
  try {
    sessionStorage.removeItem(PROJ_CACHE_KEY);
  } catch {}
}

// Common endpoints
export const endpoints = {
  // Auth
  login: (usuario, senha) => req('POST', '/auth/login', { usuario_login: usuario, senha }),
  logout: () => req('POST', '/auth/logout'),
  register: (nome, email, senha) => req('POST', '/auth/register', { nome, email, senha }),
  setup: (nome, senha) => req('POST', '/auth/setup', { nome, senha }),
  me: () => req('GET', '/auth/me'),
  needsSetup: () => req('GET', '/auth/needs-setup'),

  // Projects
  getProjects: (params = '') => fetchProjetos(params),
  getProject: (id) => req('GET', `/projetos/${id}`),
  createProject: (data) => req('POST', '/projetos', data),
  updateProject: (id, data) => req('PUT', `/projetos/${id}`, data),
  deleteProject: (id) => req('DELETE', `/projetos/${id}`),

  // Tasks
  createTask: (projetoId, data) => req('POST', `/projetos/${projetoId}/tarefas`, data),
  getTasks: (projetoId) => req('GET', `/projetos/${projetoId}/tarefas`),
  updateTask: (id, data) => req('PUT', `/tarefas/${id}`, data),
  patchTask: (id, data) => req('PATCH', `/tarefas/${id}`, data),
  deleteTask: (id) => req('DELETE', `/tarefas/${id}`),
  setTaskFocus: (id) => req('PUT', `/tarefas/${id}/foco`),
  clearTaskFocus: (id) => req('DELETE', `/tarefas/${id}/foco`),

  // Timer/Sessões
  getTaskSessions: (tarefaId) => req('GET', `/tarefas/${tarefaId}/tempo`),
  startTimer: (tarefaId, data) => req('POST', `/tarefas/${tarefaId}/tempo`, data),
  stopTimer: (sessaoId, data) => req('PUT', `/tempo/${sessaoId}/parar`, data),
  getActiveSessions: () => req('GET', '/tempo/ativas'),
  getLastSession: () => req('GET', '/tempo/ultima-sessao'),
  getDayResum: () => req('GET', '/tempo/resumo-hoje'),

  // Groups
  getGroups: () => req('GET', '/grupos'),
  createGroup: (data) => req('POST', '/grupos', data),
  updateGroup: (id, data) => req('PUT', `/grupos/${id}`, data),
  deleteGroup: (id) => req('DELETE', `/grupos/${id}`),

  // Notifications
  getNotifications: () => req('GET', '/notificacoes'),
  markNotifAsRead: (id) => req('PUT', `/notificacoes/${id}/lida`),

  // Admin
  getUsers: () => req('GET', '/usuarios'),
  createUser: (data) => req('POST', '/usuarios', data),
  updateUser: (id, data) => req('PUT', `/usuarios/${id}`, data),
  resetUserPassword: (id, novaSenha) => req('PUT', `/usuarios/${id}/senha`, { nova_senha: novaSenha }),
};
