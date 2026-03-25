// ── TIMER MODULE ──

import { req } from './api.js';
import { toast, fecharModal, confirmar } from './ui.js';
import { esc } from './utils.js';

let _sessaoEditando = null;
let _intervaloEditando = null;

export async function carregarTimersAtivos() {
  try { return await req('GET', '/tempo/ativas'); } catch { return []; }
}

export async function iniciarCronometro(tarefaId, tarefaNome) {
  try {
    const sessao = await req('POST', `/tarefas/${tarefaId}/tempo`, { inicio: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    toast(`Cronômetro iniciado: ${tarefaNome}`, 'ok');
    renderTimerDock();
    return sessao;
  } catch (e) { toast(e.message, 'erro'); }
}

export async function pararCronometro(sessaoId) {
  try {
    await req('PUT', `/tempo/${sessaoId}/parar`, {});
    toast('Sessão finalizada', 'ok');
    renderTimerDock();
  } catch (e) { toast(e.message, 'erro'); }
}

export async function renderTimerDock() {
  const dock = document.getElementById('timer-dock');
  if (!dock) return;
  try {
    const ativas = await req('GET', '/tempo/ativas');
    if (!ativas?.length) return (dock.innerHTML = '');
    dock.innerHTML = `<div class="timer-dock-list">${ativas.map(s => {
      const inicioMs = new Date(String(s.inicio).replace(' ', 'T')).getTime();
      const decorrido = Math.floor((Date.now() - inicioMs) / 60_000);
      return `<div class="timer-dock-item"><div class="timer-dock-info"><span class="timer-dock-tarefa">${esc(s.tarefa_nome)}</span><span class="timer-dock-proj muted-detail">${esc(s.projeto_nome)} · ${decorrido}min</span></div><div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="editarSessao('${s.id}','${esc(s.inicio || '')}','${esc(s.fim || '')}')">Editar</button><button class="btn btn-sm btn-ghost" onclick="pararCronometro('${s.id}')">■ Parar</button></div></div>`;
    }).join('')}</div>`;
  } catch { dock.innerHTML = ''; }
}

export async function modalAdicionarIntervalo(sessaoId) {
  _sessaoEditando = sessaoId;
  const html = `<form id="form-add-int" class="form-grid"><input name="tipo" placeholder="Tipo (ex: Pausa)" required><input name="inicio" type="datetime-local" required><input name="fim" type="datetime-local"><button class="btn btn-primary" type="submit">Adicionar</button></form>`;
  const overlay = window.abrirModal?.(html, { titulo: 'Adicionar Intervalo' });
  overlay?.querySelector('#form-add-int')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    body.inicio = body.inicio?.replace('T', ' ');
    body.fim = body.fim?.replace('T', ' ');
    await criarIntervalo(sessaoId, body);
    fecharModal();
  });
}

export async function criarIntervalo(sessaoId, body = null) {
  try {
    const payload = body || { tipo: 'Pausa', inicio: new Date().toISOString().slice(0, 19).replace('T', ' ') };
    await req('POST', `/tempo/${sessaoId}/intervalos`, payload);
    toast('Intervalo criado', 'ok');
  } catch (e) { toast(e.message, 'erro'); }
}

export async function editarSessao(sessaoId, inicio = '', fim = '') {
  _sessaoEditando = sessaoId;
  const html = `<form id="form-editar-sessao" class="form-grid"><input name="inicio" type="datetime-local" value="${String(inicio).slice(0, 16).replace(' ', 'T')}"><input name="fim" type="datetime-local" value="${String(fim || '').slice(0, 16).replace(' ', 'T')}"><div style="display:flex;gap:8px"><button class="btn btn-primary" type="submit">Salvar</button><button class="btn" type="button" onclick="modalAdicionarIntervalo('${sessaoId}')">+ Intervalo</button><button class="btn btn-danger" type="button" onclick="deletarSessao('${sessaoId}')">Excluir sessão</button></div></form>`;
  const overlay = window.abrirModal?.(html, { titulo: 'Editar Sessão' });
  overlay?.querySelector('#form-editar-sessao')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    await salvarSessao(sessaoId, data);
    fecharModal();
  });
}

export async function salvarSessao(sessaoId, data = null) {
  try {
    const form = data || Object.fromEntries(new FormData(document.getElementById('form-editar-sessao')).entries());
    await req('PUT', `/tempo/${sessaoId}`, {
      inicio: form.inicio?.replace('T', ' '),
      fim: form.fim ? form.fim.replace('T', ' ') : null,
    });
    toast('Sessão salva', 'ok');
    renderTimerDock();
  } catch (e) { toast(e.message, 'erro'); }
}

export async function deletarSessao(sessaoId) {
  confirmar('Excluir esta sessão?', async () => {
    await req('DELETE', `/tempo/${sessaoId}`);
    toast('Sessão excluída', 'ok');
    fecharModal();
    renderTimerDock();
  });
}

export async function editarIntervalo(intervaloId, tipo = '', inicio = '', fim = '') {
  _intervaloEditando = intervaloId;
  const html = `<form id="form-editar-intervalo" class="form-grid"><input name="tipo" value="${esc(tipo || 'Pausa')}" required><input name="inicio" type="datetime-local" value="${String(inicio).slice(0, 16).replace(' ', 'T')}"><input name="fim" type="datetime-local" value="${String(fim || '').slice(0, 16).replace(' ', 'T')}"><div style="display:flex;gap:8px"><button class="btn btn-primary" type="submit">Salvar</button><button class="btn btn-danger" type="button" onclick="deletarIntervalo('${intervaloId}')">Excluir</button></div></form>`;
  const overlay = window.abrirModal?.(html, { titulo: 'Editar Intervalo' });
  overlay?.querySelector('#form-editar-intervalo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarIntervalo(intervaloId, Object.fromEntries(new FormData(e.currentTarget).entries()));
    fecharModal();
  });
}

export async function salvarIntervalo(id, data = null) {
  try {
    const form = data || Object.fromEntries(new FormData(document.getElementById('form-editar-intervalo')).entries());
    await req('PUT', `/intervalos/${id}`, {
      tipo: form.tipo,
      inicio: form.inicio?.replace('T', ' '),
      fim: form.fim ? form.fim.replace('T', ' ') : null,
    });
    toast('Intervalo salvo', 'ok');
  } catch (e) { toast(e.message, 'erro'); }
}

export async function deletarIntervalo(id) {
  confirmar('Excluir este intervalo?', async () => {
    await req('DELETE', `/intervalos/${id}`);
    toast('Intervalo excluído', 'ok');
    fecharModal();
  });
}

export async function renderSessoesTarefa(tarefaId, containerEl) {
  if (!containerEl) return;
  try {
    const sessoes = await req('GET', `/tarefas/${tarefaId}/tempo`);
    if (!sessoes.length) {
      containerEl.innerHTML = '<div class="empty-small">Sem sessões de trabalho registradas</div>';
      return;
    }
    containerEl.innerHTML = `<div class="sessoes-list">${sessoes.map(s => `<div class="sessao-item"><div class="sessao-header"><span class="sessao-data">${esc((s.inicio || '').split(' ')[0] || '')}</span><span class="sessao-duracao">${esc(s.horas_liquidas != null ? `${parseFloat(s.horas_liquidas).toFixed(2)}h` : '—')}</span><button class="btn btn-sm btn-ghost" onclick="editarSessao('${s.id}','${esc(s.inicio || '')}','${esc(s.fim || '')}')">✎</button></div>${(s.intervalos || []).map(i => `<div class="muted-detail">${esc(i.tipo)}: ${esc(i.inicio)} - ${esc(i.fim || '...')} <button class="btn btn-sm" onclick="editarIntervalo('${i.id}','${esc(i.tipo)}','${esc(i.inicio)}','${esc(i.fim || '')}')">Editar</button></div>`).join('')}<button class="btn btn-sm" onclick="modalAdicionarIntervalo('${s.id}')">+ Intervalo</button></div>`).join('')}</div>`;
  } catch (e) {
    containerEl.innerHTML = `<div class="error-small">${esc(e.message)}</div>`;
  }
}

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
