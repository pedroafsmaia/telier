// ── NOTIFICATIONS MODULE ──
// Notifications, presence, and messaging

import { req } from './api.js';
import { NOTIFS } from './state.js';
import { toast } from './ui.js';
import { esc } from './utils.js';

let _pollNotifTimer = null;
let _pollStatusTimer = null;

export async function carregarNotificacoes(silencioso = true) {
  try {
    const notifs = await req('GET', '/notificacoes');
    // TODO: Update state
    return notifs;
  } catch (e) {
    if (!silencioso) toast(e.message, 'erro');
    return [];
  }
}

export function iniciarPollNotificacoes(intervalo = 10000) {
  _pollNotifTimer = setInterval(carregarNotificacoes, intervalo);
}

export function pararPollNotificacoes() {
  if (_pollNotifTimer) clearInterval(_pollNotifTimer);
}

export async function marcarNotifLida(id, abrirLink = null) {
  try {
    await req('PATCH', `/notificacoes/${id}`, { lida: true });
    if (abrirLink) window.location.href = abrirLink;
  } catch (e) {
    toast(e.message, 'erro');
  }
}

export async function marcarTodasNotifLidas() {
  try {
    await req('POST', '/notificacoes/marcar-todas-lidas', {});
    toast('Notificações marcadas como lidas', 'ok');
  } catch (e) {
    toast(e.message, 'erro');
  }
}

export function renderPainelNotificacoes() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.innerHTML = '<div style="padding: 16px; color: var(--text3); text-align: center;">Nenhuma notificação</div>';
}

export function abrirNotificacoes() {
  const panel = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (panel) panel.setAttribute('aria-hidden', 'false');
  if (overlay) overlay.classList.remove('hidden');
}

export function fecharPainelNotificacoes() {
  const panel = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (panel) panel.setAttribute('aria-hidden', 'true');
  if (overlay) overlay.classList.add('hidden');
}

export async function carregarStatus() {
  // Funcionalidade de presença em desenvolvimento
  return null;
}

export function iniciarStatusPoll() {
  // Polling de status em desenvolvimento
}

// Expose globally
if (typeof window !== 'undefined') {
  window.carregarNotificacoes = carregarNotificacoes;
  window.iniciarPollNotificacoes = iniciarPollNotificacoes;
  window.marcarNotifLida = marcarNotifLida;
  window.marcarTodasNotifLidas = marcarTodasNotifLidas;
  window.abrirNotificacoes = abrirNotificacoes;
  window.fecharPainelNotificacoes = fecharPainelNotificacoes;
  window.renderPainelNotificacoes = renderPainelNotificacoes;
}
