// ── TASKS MODULE ──
// Task rendering views: Kanban, Lista, Mapa, Relatório

import { req } from './api.js';
import { TAREFAS, LISTA_SORT, LISTA_CONCLUIDAS_EXPANDIDA, setTarefas } from './state.js';
import { toast } from './ui.js';
import { esc, tag, fmtHoras, avatar } from './utils.js';

// Render Kanban view
export function renderKanban(tarefas, container) {
  if (!container) return;

  const statuses = ['A fazer', 'Em andamento', 'Em revisão', 'Concluído'];
  const grouped = {};
  statuses.forEach(s => grouped[s] = tarefas.filter(t => t.status === s));

  container.innerHTML = `
    <div class="kanban-board">
      ${statuses.map(status => `
        <div class="kanban-col" data-status="${esc(status)}">
          <div class="kanban-header">
            <h3>${status}</h3>
            <span class="kanban-count">${grouped[status].length}</span>
          </div>
          <div class="kanban-items">
            ${grouped[status].map(t => `
              <div class="kanban-card" draggable="true" ondragstart="dragTarefa(event,'${t.id}')" onclick="abrirTarefa('${t.id}')">
                <div class="card-title">${esc(t.nome)}</div>
                <div class="card-meta">
                  ${t.prioridade ? `<span>${tag(t.prioridade)}</span>` : ''}
                  ${t.prazo ? `<span class="card-prazo">📅 ${t.prazo}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>`;
}

// Render Lista view
export function renderLista(tarefas, container) {
  if (!container) return;

  const concluidas = tarefas.filter(t => t.status === 'Concluído');
  const ativas = tarefas.filter(t => t.status !== 'Concluído');

  container.innerHTML = `
    <div class="lista-view">
      ${ativas.length ? `
        <div class="lista-section">
          <div class="lista-header">
            <h3>Ativas</h3>
            <span class="lista-count">${ativas.length}</span>
          </div>
          <table class="lista-table">
            <thead>
              <tr>
                <th onclick="ordenarLista('nome')">Tarefa</th>
                <th onclick="ordenarLista('prioridade')">Prioridade</th>
                <th onclick="ordenarLista('prazo')">Prazo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${ativas.map(t => `
                <tr onclick="abrirTarefa('${t.id}')">
                  <td><strong>${esc(t.nome)}</strong></td>
                  <td>${t.prioridade ? tag(t.prioridade) : '-'}</td>
                  <td>${t.prazo || '-'}</td>
                  <td>${tag(t.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}

      ${concluidas.length ? `
        <div class="lista-section">
          <button class="lista-section-toggle" onclick="toggleListaConcluidas()">
            ${LISTA_CONCLUIDAS_EXPANDIDA ? '▼' : '▶'} Concluídas (${concluidas.length})
          </button>
          ${LISTA_CONCLUIDAS_EXPANDIDA ? `
            <table class="lista-table is-concluded">
              <tbody>
                ${concluidas.map(t => `
                  <tr onclick="abrirTarefa('${t.id}')">
                    <td><del>${esc(t.nome)}</del></td>
                    <td>${t.prazo || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>` : ''}
        </div>` : ''}
    </div>`;
}

// Render Mapa de Foco (Focus map / timeline)
export function renderMapa(tarefas, container) {
  if (!container) return;

  const comPrazo = tarefas.filter(t => t.prazo && t.status !== 'Concluído').sort((a, b) =>
    new Date(a.prazo) - new Date(b.prazo)
  );

  if (!comPrazo.length) {
    container.innerHTML = '<div class="empty-small">Nenhuma tarefa com prazo</div>';
    return;
  }

  container.innerHTML = `
    <div class="mapa-timeline">
      ${comPrazo.map((t, i) => {
        const dias = Math.ceil((new Date(t.prazo) - new Date()) / 86400000);
        const urgente = dias <= 7 && dias > 0;
        return `
          <div class="mapa-item ${urgente ? 'urgente' : ''}" onclick="abrirTarefa('${t.id}')">
            <div class="mapa-dot"></div>
            <div class="mapa-content">
              <div class="mapa-title">${esc(t.nome)}</div>
              <div class="mapa-date">${t.prazo} ${dias > 0 ? `(${dias}d)` : '(hoje)'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>`;
}

// Render Relatório (Report / summary)
export async function renderRelatorio(tarefas, container, projetoId) {
  if (!container) return;

  try {
    const stats = {
      total: tarefas.length,
      concluidas: tarefas.filter(t => t.status === 'Concluído').length,
      ativas: tarefas.filter(t => t.status !== 'Concluído').length,
      horas: tarefas.reduce((sum, t) => sum + (Number(t.total_horas) || 0), 0),
    };

    const pctConcluidas = stats.total ? Math.round((stats.concluidas / stats.total) * 100) : 0;

    container.innerHTML = `
      <div class="relatorio-view">
        <div class="relatorio-cards">
          <div class="stat-card">
            <div class="stat-label">Total de tarefas</div>
            <div class="stat-value">${stats.total}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Concluídas</div>
            <div class="stat-value">${stats.concluidas}<span class="stat-pct">${pctConcluidas}%</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Ativas</div>
            <div class="stat-value">${stats.ativas}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Horas trabalhadas</div>
            <div class="stat-value">${fmtHoras(stats.horas)}</div>
          </div>
        </div>
        <div class="relatorio-progress">
          <div class="progress-label">Progresso geral</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pctConcluidas}%"></div>
          </div>
          <div class="progress-detail">${stats.concluidas} de ${stats.total} tarefas concluídas</div>
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = `<div class="error-small">${esc(e.message)}</div>`;
  }
}

// Task actions
export async function mudarStatus(tarefaId, novoStatus, selEl) {
  const statusAnterior = selEl?.value;

  // Optimistic UI: update immediately
  if (selEl) selEl.value = novoStatus;

  try {
    await req('PATCH', `/tarefas/${tarefaId}`, { status: novoStatus });
    toast(`Status atualizado para ${novoStatus}`, 'ok');
  } catch (e) {
    // Rollback on error
    if (selEl) selEl.value = statusAnterior;
    toast(e.message, 'erro');
  }
}

export async function toggleFoco(id, focoAtual) {
  const focoNovo = focoAtual ? 0 : 1;
  const btnEl = document.querySelector(`[data-tarefa-id="${id}"] .btn-foco`);
  const classAnterior = btnEl?.className;

  // Optimistic UI: update immediately
  if (btnEl) {
    btnEl.classList.toggle('ativo', focoNovo === 1);
  }

  try {
    await req('PATCH', `/tarefas/${id}`, { foco: focoNovo });
    toast(focoAtual ? 'Removido do foco' : 'Adicionado ao foco', 'ok');
  } catch (e) {
    // Rollback on error
    if (btnEl && classAnterior) btnEl.className = classAnterior;
    toast(e.message, 'erro');
  }
}

export async function deletarTarefa(id) {
  try {
    await req('DELETE', `/tarefas/${id}`, {});
    toast('Tarefa deletada', 'ok');
  } catch (e) {
    toast(e.message, 'erro');
  }
}

// UI helpers
export function renderColabsStack(ids = [], max = 3) {
  return ids.slice(0, max).map(id => `<span class="colab-avatar">${avatar('Colaborador', 'xs')}</span>`).join('');
}

export function ordenarLista(col) {
  // TODO: Implement list sorting
}

export function toggleListaConcluidas() {
  // TODO: Toggle concluded tasks visibility
}

// Modals
export async function modalNovaTarefa(projetoId) {
  // TODO: Implement task creation modal
}

export async function modalEditarTarefa(id) {
  // TODO: Implement task edit modal
}

export async function abrirTarefa(id) {
  // TODO: Implement task detail view
}

export async function duplicarTarefa(id) {
  // TODO: Duplicate task
}

export function dragTarefa(e, tarefaId) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('tarefa-id', tarefaId);
}

// Expose globally
if (typeof window !== 'undefined') {
  window.renderKanban = renderKanban;
  window.renderLista = renderLista;
  window.renderMapa = renderMapa;
  window.renderRelatorio = renderRelatorio;
  window.mudarStatus = mudarStatus;
  window.toggleFoco = toggleFoco;
  window.deletarTarefa = deletarTarefa;
  window.renderColabsStack = renderColabsStack;
  window.ordenarLista = ordenarLista;
  window.toggleListaConcluidas = toggleListaConcluidas;
  window.modalNovaTarefa = modalNovaTarefa;
  window.modalEditarTarefa = modalEditarTarefa;
  window.abrirTarefa = abrirTarefa;
  window.duplicarTarefa = duplicarTarefa;
}
