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
    const sessao = await req('POST', `/tarefas/${tarefaId}/tempo`, { inicio: new Date().toISOString() });
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
    await req('PUT', `/tempo/${sessaoId}/parar`, {});
    toast('Sessão finalizada', 'ok');
    renderTimerDock();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

// Render timer dock (floating timer display)
export async function renderTimerDock() {
  const dock = document.getElementById('timer-dock');
  if (!dock) return;
  try {
    const ativas = await req('GET', '/tempo/ativas');
    if (!ativas || !ativas.length) {
      dock.innerHTML = '';
      return;
    }
    dock.innerHTML = `
      <div class="timer-dock-list">
        ${ativas.map(s => {
          const inicioMs = new Date(s.inicio.replace(' ', 'T')).getTime();
          const decorrido = Math.floor((Date.now() - inicioMs) / 1000);
          const horas = Math.floor(decorrido / 3600);
          const min = Math.floor((decorrido % 3600) / 60);
          const tempoStr = horas > 0 ? `${horas}h ${min}min` : `${min}min`;
          return `
            <div class="timer-dock-item">
              <div class="timer-dock-info">
                <span class="timer-dock-tarefa">${esc(s.tarefa_nome)}</span>
                <span class="timer-dock-proj muted-detail">${esc(s.projeto_nome)}</span>
              </div>
              <span class="timer-dock-tempo">${tempoStr}</span>
              <button class="btn btn-sm btn-ghost" onclick="pararCronometro('${s.id}')">■ Parar</button>
            </div>
          `;
        }).join('')}
      </div>`;
  } catch {
    dock.innerHTML = '';
  }
}

// Modal to add interval to session
export async function modalAdicionarIntervalo(sessaoId) {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Adicionar Intervalo</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Adicionar Intervalo' });
}

export async function criarIntervalo(sessaoId) {
  toast('Funcionalidade em desenvolvimento', 'info');
}

// Session editing functions
export async function editarSessao(sessaoId, inicio, fim) {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Editar Sessão</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Editar Sessão' });
}

export async function salvarSessao(sessaoId) {
  toast('Funcionalidade em desenvolvimento', 'info');
}

export async function deletarSessao(sessaoId, tarefaId) {
  toast('Funcionalidade em desenvolvimento', 'info');
}

// Interval editing
export async function editarIntervalo(intervaloId) {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Editar Intervalo</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Editar Intervalo' });
}

export async function salvarIntervalo(id) {
  toast('Funcionalidade em desenvolvimento', 'info');
}

export async function deletarIntervalo(id, tarefaId) {
  toast('Funcionalidade em desenvolvimento', 'info');
}

// Render sessions for a task
export async function renderSessoesTarefa(tarefaId, containerEl) {
  if (!containerEl) return;
  try {
    const sessoes = await req('GET', `/tarefas/${tarefaId}/tempo`);
    if (!sessoes.length) {
      containerEl.innerHTML = '<div class="empty-small">Sem sessões de trabalho registradas</div>';
      return;
    }
    containerEl.innerHTML = `
      <div class="sessoes-list">
        ${sessoes.map(s => {
          // Backend retorna s.inicio (datetime string), s.fim (nullable), s.horas_liquidas (float)
          const data = (s.inicio || '').split('T')[0] || (s.inicio || '').split(' ')[0] || '—';
          const duracaoH = s.horas_liquidas != null
            ? `${parseFloat(s.horas_liquidas).toFixed(2)}h`
            : (s.fim ? '—' : 'em andamento');
          return `
            <div class="sessao-item">
              <div class="sessao-header">
                <span class="sessao-data">${esc(data)}</span>
                <span class="sessao-duracao">${esc(duracaoH)}</span>
                ${s.usuario_nome ? `<span class="sessao-user muted-detail">${esc(s.usuario_nome)}</span>` : ''}
                <button class="btn btn-sm btn-ghost" onclick="editarSessao('${s.id}')">✎</button>
              </div>
            </div>
          `;
        }).join('')}
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
