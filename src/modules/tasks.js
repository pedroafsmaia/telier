// ── TASKS MODULE ──

import { req } from './api.js';
import { PROJETO, TAREFAS, LISTA_SORT, LISTA_CONCLUIDAS_EXPANDIDA, setTarefas, setListaSort, setFiltroConcluidas } from './state.js';
import { toast, fecharModal, confirmar } from './ui.js';
import { esc, tag, fmtHoras, avatar } from './utils.js';

const STATUS_ORDEM = ['A fazer', 'Em andamento', 'Em revisão', 'Concluído'];
const PRIORIDADE_ORDEM = ['Alta', 'Média', 'Baixa'];

const prazoDe = (t) => t.prazo || t.data || '';

export function renderKanban(tarefas, container) {
  if (!container) return;
  const grouped = {};
  STATUS_ORDEM.forEach(s => grouped[s] = tarefas.filter(t => t.status === s));
  const projetoIds = new Set((tarefas || []).map(t => t.projeto_id).filter(Boolean));
  const canCreate = !!PROJETO?.id && projetoIds.size <= 1 && (projetoIds.size === 0 || projetoIds.has(PROJETO.id));

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px">${canCreate ? `<button class="btn btn-sm btn-primary" onclick="modalNovaTarefa('${PROJETO?.id || ''}')">+ Nova tarefa</button>` : ''}</div>
    <div class="kanban-board">
      ${STATUS_ORDEM.map(status => `<div class="kanban-col"><div class="kanban-header"><h3>${status}</h3><span class="kanban-count">${grouped[status].length}</span></div><div class="kanban-items">${grouped[status].map(t => `<div class="kanban-card" onclick="abrirTarefa('${t.id}')"><div class="card-title">${esc(t.nome)}</div><div class="card-meta">${t.prioridade ? `<span>${tag(t.prioridade)}</span>` : ''}${prazoDe(t) ? `<span class="card-prazo">📅 ${esc(prazoDe(t))}</span>` : ''}</div></div>`).join('')}</div></div>`).join('')}
    </div>`;
}

export function renderLista(tarefas, container) {
  if (!container) return;
  const base = [...tarefas];
  const projetoIds = new Set((tarefas || []).map(t => t.projeto_id).filter(Boolean));
  const canCreate = !!PROJETO?.id && projetoIds.size <= 1 && (projetoIds.size === 0 || projetoIds.has(PROJETO.id));
  if (LISTA_SORT.col) {
    base.sort((a, b) => {
      const dir = LISTA_SORT.dir === 'asc' ? 1 : -1;
      if (LISTA_SORT.col === 'nome') return a.nome.localeCompare(b.nome) * dir;
      if (LISTA_SORT.col === 'prioridade') return ((PRIORIDADE_ORDEM.indexOf(a.prioridade) - PRIORIDADE_ORDEM.indexOf(b.prioridade)) || 0) * dir;
      if (LISTA_SORT.col === 'prazo') return ((new Date(prazoDe(a) || '2999-01-01')) - (new Date(prazoDe(b) || '2999-01-01'))) * dir;
      return 0;
    });
  }

  const concluidas = base.filter(t => t.status === 'Concluído');
  const ativas = base.filter(t => t.status !== 'Concluído');

  container.innerHTML = `
    <div class="lista-view">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">${canCreate ? `<button class="btn btn-sm btn-primary" onclick="modalNovaTarefa('${PROJETO?.id || ''}')">+ Nova tarefa</button>` : ''}</div>
      ${ativas.length ? `<div class="lista-section"><div class="lista-header"><h3>Ativas</h3><span class="lista-count">${ativas.length}</span></div><table class="lista-table"><thead><tr><th onclick="ordenarLista('nome')">Tarefa</th><th onclick="ordenarLista('prioridade')">Prioridade</th><th onclick="ordenarLista('prazo')">Prazo</th><th>Status</th></tr></thead><tbody>${ativas.map(t => `<tr onclick="abrirTarefa('${t.id}')"><td><strong>${esc(t.nome)}</strong></td><td>${t.prioridade ? tag(t.prioridade) : '-'}</td><td>${esc(prazoDe(t) || '-')}</td><td>${tag(t.status)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${concluidas.length ? `<div class="lista-section"><button class="lista-section-toggle" onclick="toggleListaConcluidas()">${LISTA_CONCLUIDAS_EXPANDIDA ? '▼' : '▶'} Concluídas (${concluidas.length})</button>${LISTA_CONCLUIDAS_EXPANDIDA ? `<table class="lista-table is-concluded"><tbody>${concluidas.map(t => `<tr onclick="abrirTarefa('${t.id}')"><td><del>${esc(t.nome)}</del></td><td>${esc(prazoDe(t) || '-')}</td></tr>`).join('')}</tbody></table>` : ''}</div>` : ''}
    </div>`;
}

export function renderMapa(tarefas, container) {
  if (!container) return;
  const comPrazo = tarefas.filter(t => prazoDe(t) && t.status !== 'Concluído').sort((a, b) => new Date(prazoDe(a)) - new Date(prazoDe(b)));
  if (!comPrazo.length) {
    container.innerHTML = '<div class="empty-small">Nenhuma tarefa com prazo</div>';
    return;
  }
  container.innerHTML = `<div class="mapa-timeline">${comPrazo.map((t) => {
    const dias = Math.ceil((new Date(prazoDe(t)) - new Date()) / 86400000);
    return `<div class="mapa-item ${dias <= 7 && dias > 0 ? 'urgente' : ''}" onclick="abrirTarefa('${t.id}')"><div class="mapa-dot"></div><div class="mapa-content"><div class="mapa-title">${esc(t.nome)}</div><div class="mapa-date">${esc(prazoDe(t))}</div></div></div>`;
  }).join('')}</div>`;
}

export async function renderRelatorio(tarefas, container) {
  if (!container) return;
  const stats = {
    total: tarefas.length,
    concluidas: tarefas.filter(t => t.status === 'Concluído').length,
    ativas: tarefas.filter(t => t.status !== 'Concluído').length,
    horas: tarefas.reduce((sum, t) => sum + (Number(t.total_horas) || 0), 0),
  };
  const pctConcluidas = stats.total ? Math.round((stats.concluidas / stats.total) * 100) : 0;
  container.innerHTML = `<div class="relatorio-view"><div class="relatorio-cards"><div class="stat-card"><div class="stat-label">Total de tarefas</div><div class="stat-value">${stats.total}</div></div><div class="stat-card"><div class="stat-label">Concluídas</div><div class="stat-value">${stats.concluidas}<span class="stat-pct">${pctConcluidas}%</span></div></div><div class="stat-card"><div class="stat-label">Ativas</div><div class="stat-value">${stats.ativas}</div></div><div class="stat-card"><div class="stat-label">Horas trabalhadas</div><div class="stat-value">${fmtHoras(stats.horas)}</div></div></div></div>`;
}

async function reloadProjetoTarefas() {
  if (!PROJETO?.id) return;
  const tarefas = await req('GET', `/projetos/${PROJETO.id}/tarefas`);
  setTarefas(tarefas);
  window.mudarAba?.(sessionStorage.getItem(`telier_proj_aba_${PROJETO.id}`) || 'tarefas');
}

export async function mudarStatus(tarefaId, novoStatus, selEl) {
  const old = selEl?.value;
  if (selEl) selEl.value = novoStatus;
  try {
    await req('PATCH', `/tarefas/${tarefaId}`, { status: novoStatus });
    await reloadProjetoTarefas();
    toast(`Status atualizado para ${novoStatus}`, 'ok');
  } catch (e) {
    if (selEl) selEl.value = old;
    toast(e.message, 'erro');
  }
}

export async function toggleFoco(id, focoAtual) {
  try {
    if (focoAtual) await req('DELETE', `/tarefas/${id}/foco`);
    else await req('PUT', `/tarefas/${id}/foco`, {});
    await reloadProjetoTarefas();
    toast(focoAtual ? 'Removido do foco' : 'Adicionado ao foco', 'ok');
  } catch (e) {
    toast(e.message, 'erro');
  }
}

export async function deletarTarefa(id) {
  confirmar('Deseja deletar esta tarefa?', async () => {
    try {
      await req('DELETE', `/tarefas/${id}`, {});
      await reloadProjetoTarefas();
      toast('Tarefa deletada', 'ok');
    } catch (e) {
      toast(e.message, 'erro');
    }
  });
}

export function renderColabsStack(ids = [], max = 3) {
  return ids.slice(0, max).map(() => `<span class="colab-avatar">${avatar('Colaborador', 'xs')}</span>`).join('');
}

export function ordenarLista(col) {
  const dir = (LISTA_SORT.col === col && LISTA_SORT.dir === 'asc') ? 'desc' : 'asc';
  setListaSort({ col, dir });
  window.mudarAba?.('tarefas');
}

export function toggleListaConcluidas() {
  setFiltroConcluidas(!LISTA_CONCLUIDAS_EXPANDIDA);
  window.mudarAba?.('tarefas');
}

function formTaskHtml(task = {}) {
  return `<form id="form-task" class="form-grid">
    <input name="nome" placeholder="Nome" value="${esc(task.nome || '')}" required>
    <textarea name="descricao" placeholder="Descrição">${esc(task.descricao || '')}</textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <select name="status"><option ${task.status==='A fazer'?'selected':''}>A fazer</option><option ${task.status==='Em andamento'?'selected':''}>Em andamento</option><option ${task.status==='Em revisão'?'selected':''}>Em revisão</option><option ${task.status==='Concluído'?'selected':''}>Concluído</option></select>
      <select name="prioridade"><option ${task.prioridade==='Alta'?'selected':''}>Alta</option><option ${task.prioridade==='Média'?'selected':''}>Média</option><option ${task.prioridade==='Baixa'?'selected':''}>Baixa</option></select>
    </div>
    <input name="data" type="date" value="${esc(prazoDe(task) || '')}">
    <button class="btn btn-primary" type="submit">Salvar</button>
  </form>`;
}

export async function modalNovaTarefa(projetoId) {
  const overlay = window.abrirModal?.(formTaskHtml(), { titulo: 'Nova Tarefa' });
  overlay?.querySelector('#form-task')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    await req('POST', `/projetos/${projetoId}/tarefas`, body);
    fecharModal();
    await reloadProjetoTarefas();
    toast('Tarefa criada', 'ok');
  });
}

export async function modalEditarTarefa(id) {
  const t = TAREFAS.find(x => x.id === id);
  if (!t) return toast('Tarefa não encontrada', 'erro');
  const overlay = window.abrirModal?.(formTaskHtml(t), { titulo: 'Editar Tarefa' });
  overlay?.querySelector('#form-task')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await req('PUT', `/tarefas/${id}`, Object.fromEntries(new FormData(e.currentTarget).entries()));
    fecharModal();
    await reloadProjetoTarefas();
    toast('Tarefa atualizada', 'ok');
  });
}

export async function abrirTarefa(id) {
  const t = TAREFAS.find(x => x.id === id);
  if (!t) return toast('Tarefa não encontrada', 'erro');
  const html = `<div><h3 style="margin-bottom:8px">${esc(t.nome)}</h3><div class="muted-detail" style="margin-bottom:8px">${esc(t.descricao || 'Sem descrição')}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${tag(t.status)}${tag(t.prioridade || 'Média')}</div><div style="margin-top:12px;display:flex;gap:8px"><button class="btn" onclick="modalEditarTarefa('${id}')">Editar</button><button class="btn" onclick="duplicarTarefa('${id}')">Duplicar</button><button class="btn btn-danger" onclick="deletarTarefa('${id}')">Excluir</button></div></div>`;
  window.abrirModal?.(html, { titulo: 'Detalhes da tarefa' });
}

export async function duplicarTarefa(id) {
  await req('POST', `/tarefas/${id}/duplicar`, {});
  await reloadProjetoTarefas();
  toast('Tarefa duplicada', 'ok');
}

export function dragTarefa(e, tarefaId) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('tarefa-id', tarefaId);
}

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
  window.dragTarefa = dragTarefa;
}
