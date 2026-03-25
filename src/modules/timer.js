// ── TIMER MODULE ──
// Timer, stopwatch, and session management

import { req } from './api.js';
import { toast } from './ui.js';
import { esc, fmtDuracao } from './utils.js';

// Load active timers
export async function carregarTimersAtivos() {
  try {
    return await req('GET', '/tempo/ativas');
  } catch {
    return [];
  }
}

// Start a timer for a task
export async function iniciarCronometro(tarefaId, tarefaNome) {
  try {
    const sessao = await req('POST', '/tempo/iniciar', { tarefa_id: tarefaId });
    toast(`Cronômetro iniciado: ${tarefaNome}`, 'ok');
    renderTimerDock();
    return sessao;
  } catch (e) {
    toast(e.message, 'erro');
  }
}

// Stop a timer session
export async function pararCronometro(sessaoId) {
  try {
    await req('POST', `/tempo/parar/${sessaoId}`, {});
    toast('Sessão finalizada', 'ok');
    renderTimerDock();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

// Render timer dock (floating timer display)
export function renderTimerDock() {
  const dock = document.getElementById('timer-dock');
  if (!dock) return;
  // TODO: Fetch active timers and render
  dock.innerHTML = '';
}

// Modal to add interval to session
export async function modalAdicionarIntervalo(sessaoId) {
  // TODO: Implement interval addition modal
}

export async function criarIntervalo(sessaoId) {
  // TODO: Implement interval creation
}

// Session editing functions
export async function editarSessao(sessaoId, inicio, fim) {
  // TODO: Implement session editing
}

export async function salvarSessao(sessaoId) {
  // TODO: Save session changes
}

export async function deletarSessao(sessaoId, tarefaId) {
  // TODO: Delete a session
}

// Interval editing
export async function editarIntervalo(intervaloId) {
  // TODO: Edit interval
}

export async function salvarIntervalo(id) {
  // TODO: Save interval
}

export async function deletarIntervalo(id, tarefaId) {
  // TODO: Delete interval
}

// Render sessions for a task
export async function renderSessoesTarefa(tarefaId, containerEl) {
  if (!containerEl) return;
  try {
    const sessoes = await req('GET', `/tarefas/${tarefaId}/sessoes`);
    if (!sessoes.length) {
      containerEl.innerHTML = '<div class="empty-small">Sem sessões de trabalho registradas</div>';
      return;
    }
    containerEl.innerHTML = `
      <div class="sessoes-list">
        ${sessoes.map(s => `
          <div class="sessao-item">
            <div class="sessao-header">
              <span class="sessao-data">${s.data_inicio?.split('T')[0]}</span>
              <span class="sessao-duracao">${fmtDuracao(s.duracao_segundos)}</span>
              <button class="btn btn-sm btn-ghost" onclick="editarSessao('${s.id}')">✎</button>
            </div>
          </div>
        `).join('')}
      </div>`;
  } catch (e) {
    containerEl.innerHTML = `<div class="error-small">${esc(e.message)}</div>`;
  }
}

// Expose globally
if (typeof window !== 'undefined') {
  window.iniciarCronometro = iniciarCronometro;
  window.pararCronometro = pararCronometro;
  window.carregarTimersAtivos = carregarTimersAtivos;
  window.renderTimerDock = renderTimerDock;
  window.modalAdicionarIntervalo = modalAdicionarIntervalo;
  window.criarIntervalo = criarIntervalo;
  window.editarSessao = editarSessao;
  window.salvarSessao = salvarSessao;
  window.deletarSessao = deletarSessao;
  window.editarIntervalo = editarIntervalo;
  window.salvarIntervalo = salvarIntervalo;
  window.deletarIntervalo = deletarIntervalo;
  window.renderSessoesTarefa = renderSessoesTarefa;
}
