// ── TIMER ──
import {
  TIMERS, SESSAO_TICKS, PROJETO, TAREFAS, RELATORIO_CACHE, TOKEN,
  TIMER_AVISO_HORAS,
  setTimers, setRelatorioCache,
} from './state.js';
import { req, invalidarCacheProjetos } from './api.js';
import { toast, abrirModal, fecharModal, confirmar, btnLoading } from './ui.js';
import { esc, gv, fmtDuracao, fmtHoras, fmtDatetime, fmtDatetimeInput, agora, isAdmin, listarDetalhesTarefa, salvarDetalhesTarefa } from './utils.js';

let _timerMutationLocked = false;

function jsArg(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getTimerEntries() {
  return Object.entries(TIMERS || {});
}

export function getSessaoAtivaTarefa(tarefaId) {
  if (!tarefaId) return null;
  return getTimerEntries().find(([, timer]) => String(timer.tarefaId) === String(tarefaId)) || null;
}

export function getPrimeiraSessaoAtiva() {
  return getTimerEntries()[0] || null;
}

export function timerMutationEmAndamento() {
  return _timerMutationLocked;
}

async function withTimerMutationLock(run) {
  if (_timerMutationLocked) return false;
  _timerMutationLocked = true;
  try {
    await run();
  } finally {
    _timerMutationLocked = false;
  }
  return true;
}

function iconCronometro(tipo) {
  if (tipo === 'start') return '<svg class="btn-icon-svg" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4 2.5l5 3.5-5 3.5v-7z" fill="currentColor"/></svg>';
  if (tipo === 'stop') return '<svg class="btn-icon-svg" width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor"/></svg>';
  if (tipo === 'interval') return '<svg class="btn-icon-svg" width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M5.5 2v7M2 5.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  if (tipo === 'history') return '<svg class="btn-icon-svg" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 5.2h5M4.5 7h5M4.5 8.8h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  return '<svg class="btn-icon-svg" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.5 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function renderTimerActions(opts = {}) {
  const {
    tarefaId,
    tarefaNome = 'Tarefa',
    projetoId = '',
    size = 'sm',
    iconOnly = false, // Substitui 'compact'
    allowStart = true,
    showOpenTask = true,
    showHistory = false,
    showInterval = false,
    stopPropagation = false,
  } = opts;
  const sessaoTarefa = getSessaoAtivaTarefa(tarefaId);
  const sessaoGlobal = getPrimeiraSessaoAtiva();
  const existeOutraSessaoAtiva = !!(sessaoGlobal && (!sessaoTarefa || sessaoGlobal[0] !== sessaoTarefa[0]));
  const busy = timerMutationEmAndamento();
  const clickSuffix = stopPropagation ? ';event.stopPropagation()' : '';
  const btnSizeClass = size === 'sm' ? ' btn-sm' : '';
  const btnIconClass = iconOnly ? ' btn-icon' : '';

  const botoes = [];
  if (sessaoTarefa) {
    botoes.push(`<button type="button" class="btn btn-danger${btnSizeClass}${btnIconClass}" ${busy ? 'disabled' : ''} onclick="pararCronometro('${sessaoTarefa[0]}')${clickSuffix}" title="Encerrar sessão" aria-label="Encerrar sessão">${iconCronometro('stop')}${iconOnly ? '' : 'Encerrar sessão'}</button>`);
  } else if (allowStart) {
    const disabled = busy || existeOutraSessaoAtiva;
    const title = existeOutraSessaoAtiva ? 'Encerre a sessão ativa atual antes de iniciar um novo cronômetro' : 'Iniciar cronômetro';
    botoes.push(`<button type="button" class="btn btn-primary${btnSizeClass}${btnIconClass}" ${disabled ? 'disabled' : ''} onclick="iniciarCronometro('${jsArg(tarefaId)}','${jsArg(tarefaNome)}')${clickSuffix}" title="${title}" aria-label="${title}">${iconCronometro('start')}${iconOnly ? '' : 'Iniciar cronômetro'}</button>`);
  }
  if (showInterval && sessaoTarefa) {
    botoes.push(`<button type="button" class="btn btn-secondary${btnSizeClass}${btnIconClass}" ${busy ? 'disabled' : ''} onclick="modalAdicionarIntervalo('${sessaoTarefa[0]}')${clickSuffix}" title="Adicionar intervalo" aria-label="Adicionar intervalo">${iconCronometro('interval')}${iconOnly ? '' : 'Adicionar intervalo'}</button>`);
  }
  if (showHistory && tarefaId) {
    botoes.push(`<button type="button" class="btn btn-ghost${btnSizeClass}${btnIconClass}" onclick="expandirSessoes('${jsArg(tarefaId)}')${clickSuffix}" title="Ver registros" aria-label="Ver registros">${iconCronometro('history')}${iconOnly ? '' : 'Ver registros'}</button>`);
  }
  if (showOpenTask && tarefaId && projetoId) {
    botoes.push(`<button type="button" class="btn btn-ghost${btnSizeClass}${btnIconClass}" onclick="abrirTarefaContexto('${jsArg(tarefaId)}','${jsArg(projetoId)}')${clickSuffix}" title="Abrir tarefa" aria-label="Abrir tarefa">${iconCronometro('open')}${iconOnly ? '' : 'Abrir tarefa'}</button>`);
  } else if (showOpenTask && existeOutraSessaoAtiva) {
    const tarefaAtiva = sessaoGlobal?.[1] || null;
    if (tarefaAtiva?.tarefaId && tarefaAtiva?.projeto_id) {
      botoes.push(`<button type="button" class="btn btn-ghost${btnSizeClass}${btnIconClass}" onclick="abrirTarefaContexto('${jsArg(tarefaAtiva.tarefaId)}','${jsArg(tarefaAtiva.projeto_id)}')${clickSuffix}" title="Abrir tarefa ativa" aria-label="Abrir tarefa ativa">${iconCronometro('open')}${iconOnly ? '' : 'Abrir tarefa ativa'}</button>`);
    }
  }
  return `<div class="timer-actions-group">${botoes.join('')}</div>`;
}

async function refreshCronometroUI() {
  await carregarTimersAtivos();
  setRelatorioCache(null);
  if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
}

export function limparTicksSessao(tarefaId) {
  const ids = SESSAO_TICKS.get(tarefaId) || [];
  ids.forEach(clearInterval);
  SESSAO_TICKS.delete(tarefaId);
}

export async function carregarTimersAtivos() {
  try {
    const ativas = await req('GET', '/tempo/ativas');
    const timersAtualizados = {};
    for (const s of ativas) {
      timersAtualizados[s.id] = {
        tarefaId: s.tarefa_id,
        tarefa_nome: s.tarefa_nome,
        projeto_nome: s.projeto_nome,
        projeto_id: s.projeto_id,
        inicio: s.inicio,
      };
    }
    setTimers(timersAtualizados);
    renderTimerDock();
    atualizarTempoListaVisivel();
  } catch (e) { console.error(e); }
}

export function atualizarTempoListaVisivel() {
  const abaEl = document.getElementById('aba');
  if (!abaEl || !PROJETO) return;
  const abaAtiva = document.querySelector('.aba.ativa')?.dataset.aba;
  if (abaAtiva !== 'tarefas' && abaAtiva !== 'lista' && abaAtiva !== 'kanban') return;
  // Import renderAbaTarefas dynamically to avoid circular
  import('./tasks.js').then(({ renderAbaTarefas }) => {
    renderAbaTarefas(abaEl, TAREFAS);
  });
}

export async function iniciarCronometro(tarefaId, tarefaNome) {
  const { carregarColegasAtivos } = await import('./notifications.js');
  const started = await withTimerMutationLock(async () => {
    try {
      await req('POST', `/tarefas/${tarefaId}/tempo`, { inicio: agora() }).catch(e => {
        if (e.message.includes('permissão')) throw new Error('Você precisa ser colaborador desta tarefa para iniciar o cronômetro');
        if (e.message.includes('sessão ativa')) throw new Error('Já existe uma sessão ativa. Encerre a sessão atual para iniciar outra.');
        throw e;
      });
      invalidarCacheProjetos();
      await refreshCronometroUI();
      toast('Cronômetro iniciado');
      carregarColegasAtivos();
    } catch (e) { toast(e.message, 'err'); }
  });
  if (!started) toast('Aguarde a ação atual do cronômetro terminar.');
}

export async function pararCronometro(sessaoId) {
  const { carregarColegasAtivos } = await import('./notifications.js');
  const stopped = await withTimerMutationLock(async () => {
    try {
      await req('PUT', `/tempo/${sessaoId}/parar`, { fim: agora() });
      invalidarCacheProjetos();
      await refreshCronometroUI();
      toast('Sessão encerrada');
      carregarColegasAtivos();
    } catch (e) { toast(e.message, 'err'); }
  });
  if (!stopped) toast('Aguarde a ação atual do cronômetro terminar.');
}

export function renderTimerDock() {
  const dock = document.getElementById('timer-dock');
  if (!dock) return;
  const ids = Object.keys(TIMERS);
  if (!ids.length) { dock.innerHTML = ''; return; }

  dock.innerHTML = ids.map(sessaoId => {
    const t = TIMERS[sessaoId];
    const segundos = Math.floor((Date.now() - new Date(t.inicio.replace(' ','T') + 'Z').getTime()) / 1000);
    const horas = segundos / 3600;
    const longo = horas >= TIMER_AVISO_HORAS;
    return `
      <div class="timer-card ativo${longo ? ' timer-longo' : ''}" id="tcard-${sessaoId}">
        <div class="timer-card-grid">
          <div class="timer-card-proj">
            <span class="timer-card-label">Projeto</span>
            <span class="timer-card-proj-name">${esc(t.projeto_nome)}</span>
          </div>
          <div class="timer-card-status">
            <div class="timer-dot"></div>
            <span>Em curso</span>
          </div>
        </div>
        <div class="timer-card-header">
          <div class="timer-card-nome">${esc(t.tarefa_nome)}</div>
        </div>
        <div class="timer-display${longo ? ' timer-alerta' : ''}" id="tdisp-${sessaoId}">${fmtDuracao(segundos)}</div>
        ${longo ? `<div class="timer-aviso"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;margin-right:4px"><path d="M12 3.5l9 15.5H3l9-15.5z" stroke="currentColor" stroke-width="1.9"/><path d="M12 9v5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="16.7" r="1" fill="currentColor"/></svg>Timer rodando há mais de ${Math.floor(horas)}h</div>` : ''}
        ${renderTimerActions({
          tarefaId: t.tarefaId,
          tarefaNome: t.tarefa_nome,
          projetoId: t.projeto_id,
          size: 'sm',
          iconOnly: true,
          showOpenTask: true,
          showHistory: true,
          showInterval: true,
        })}
      </div>`;
  }).join('');

  // Atualizar displays a cada segundo
  clearInterval(window._timerTick);
  window._timerTick = setInterval(() => {
    Object.entries(TIMERS).forEach(([sid, t]) => {
      const el = document.getElementById('tdisp-' + sid);
      if (!el) return;
      const seg = Math.floor((Date.now() - new Date(t.inicio.replace(' ','T') + 'Z').getTime()) / 1000);
      el.textContent = fmtDuracao(seg);
      const card = document.getElementById('tcard-' + sid);
      if (card && seg / 3600 >= TIMER_AVISO_HORAS) {
        card.classList.add('timer-longo');
        el.classList.add('timer-alerta');
      }
    });
  }, 1000);
}

export const renderTimerWidget = renderTimerDock;

export function modalAdicionarIntervalo(sessaoId) {
  abrirModal(`
    <h2>Adicionar intervalo</h2>
    <div class="form-row"><label for="m-tipo">Tipo</label><input id="m-tipo" placeholder="Ex: Lanche, Reunião, Problema técnico..."></div>
    <div class="form-grid">
      <div class="form-row"><label for="m-ini">Início</label><input type="datetime-local" id="m-ini" value="${new Date().toISOString().slice(0,16)}"></div>
      <div class="form-row"><label for="m-fim">Fim (opcional)</label><input type="datetime-local" id="m-fim"></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn" onclick="fecharModal()">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-add-int" onclick="criarIntervalo('${sessaoId}')">Adicionar</button>
    </div>`);
}

export async function criarIntervalo(sessaoId) {
  const tipo = gv('m-tipo').trim();
  if (!tipo) { toast('Tipo obrigatório', 'err'); return; }
  const iniRaw = gv('m-ini');
  const fimRaw = gv('m-fim');
  if (!iniRaw) { toast('Informe o início do intervalo.', 'err'); return; }
  if (fimRaw && fimRaw < iniRaw) { toast('O fim do intervalo deve ser após o início.', 'err'); return; }
  btnLoading('btn-add-int', true);
  try {
    const ini = iniRaw.replace('T', ' ');
    const fim = fimRaw ? fimRaw.replace('T', ' ') : null;
    await req('POST', `/tempo/${sessaoId}/intervalos`, { tipo, inicio: ini, fim });
    invalidarCacheProjetos();
    fecharModal(); toast('Intervalo adicionado');
    await refreshCronometroUI();
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-add-int', false); }
}

export async function renderSessoesTarefa(tarefaId, containerEl) {
  limparTicksSessao(tarefaId);
  try {
    const sessoes = await req('GET', `/tarefas/${tarefaId}/tempo`);
    const totalEl = document.getElementById(`sess-total-${tarefaId}`);
    const ordenadas = [...sessoes].sort((a,b) => new Date(b.inicio.replace(' ','T')+'Z') - new Date(a.inicio.replace(' ','T')+'Z'));
    if (!sessoes.length) {
      if (totalEl) totalEl.textContent = '0.00 hr';
      containerEl.innerHTML = `<div class="sessoes-empty">Nenhuma sessão registrada.</div>`;
      return;
    }

    let totalH = 0;
    const html = ordenadas.map(s => {
      const ativa = !s.fim;
      totalH += parseFloat(s.horas_liquidas || 0);
      const duracaoSeg = ativa
        ? Math.floor((Date.now() - new Date(s.inicio.replace(' ','T')+'Z').getTime())/1000)
        : Math.round((parseFloat(s.horas_liquidas)||0) * 3600);

      const intervalosHtml = s.intervalos?.length ? `
        <div class="intervalos-list">
          ${s.intervalos.map(iv => {
            const dur = iv.fim
              ? Math.round((new Date(iv.fim.replace(' ','T')+'Z') - new Date(iv.inicio.replace(' ','T')+'Z'))/60000)
              : null;
            return `<div class="intervalo-item">
              <div class="intervalo-tipo">${esc(iv.tipo)}</div>
              <div class="intervalo-tempo">${fmtDatetime(iv.inicio)} → ${iv.fim ? fmtDatetime(iv.fim) : 'aberto'}</div>
              ${dur !== null ? `<div class="intervalo-duracao">${dur}min</div>` : ''}
              <button class="btn btn-ghost btn-icon btn-sm" onclick="editarIntervalo('${iv.id}')" title="Editar intervalo" aria-label="Editar intervalo"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>
              <button class="btn btn-danger btn-icon btn-sm" onclick="deletarIntervalo('${iv.id}','${tarefaId}')" title="Excluir intervalo" aria-label="Excluir intervalo"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
            </div>`;
          }).join('')}
        </div>` : '';

      return `
        <div class="sessao-item ${ativa?'ativa':''}">
          <div class="sessao-header">
            <div class="sessao-main">
              <div class="sessao-user">${esc(s.usuario_nome||'—')}</div>
              <div class="sessao-tempo">${fmtDatetime(s.inicio)} → ${s.fim ? fmtDatetime(s.fim) : '<span class="inline-running">rodando</span>'}</div>
            </div>
            <div class="sessao-liquido" ${ativa ? `id="sdur-${s.id}"` : ''}>${fmtDuracao(duracaoSeg)}</div>
            <div class="sessao-actions">
              <button type="button" class="btn btn-ghost btn-icon btn-sm" onclick="editarSessao('${s.id}','${s.inicio}','${s.fim||''}')" title="Editar" aria-label="Editar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" onclick="modalAdicionarIntervalo('${s.id}')" title="Adicionar intervalo" aria-label="Adicionar intervalo"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2v7M2 5.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
              <button type="button" class="btn btn-danger btn-icon btn-sm" onclick="deletarSessao('${s.id}','${tarefaId}')" title="Excluir" aria-label="Excluir"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
            </div>
          </div>
          ${intervalosHtml}
        </div>`;
    }).join('');

      if (totalEl) totalEl.textContent = fmtHoras(totalH);
      containerEl.innerHTML = html;

    // Atualizar sessões ativas
    const intervalIds = [];
    sessoes.filter(s => !s.fim).forEach(s => {
      const tickId = setInterval(() => {
        const el = document.getElementById('sdur-' + s.id);
        if (!el || !document.body.contains(el)) {
          clearInterval(tickId);
          return;
        }
        const seg = Math.floor((Date.now() - new Date(s.inicio.replace(' ','T')+'Z').getTime())/1000);
        el.textContent = fmtDuracao(seg);
      }, 1000);
      intervalIds.push(tickId);
    });
    if (intervalIds.length) SESSAO_TICKS.set(tarefaId, intervalIds);
  } catch (e) {
    containerEl.innerHTML = `<div class="text-danger text-sm">${esc(e.message)}</div>`;
  }
}

export async function editarSessao(sessaoId, inicio, fim) {
  abrirModal(`
    <h2>Editar sessão</h2>
    <div class="form-row"><label for="m-ini">Início</label><input type="datetime-local" id="m-ini" value="${fmtDatetimeInput(inicio)}"></div>
    <div class="form-row"><label for="m-fim">Fim</label><input type="datetime-local" id="m-fim" value="${fmtDatetimeInput(fim)}"></div>
    <div class="modal-footer">
      <button type="button" class="btn" onclick="fecharModal()">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-ed-sess" onclick="salvarSessao('${sessaoId}')">Salvar</button>
    </div>`);
}

export async function salvarSessao(sessaoId) {
  const ini = gv('m-ini');
  if (!ini) { toast('Informe o início da sessão.', 'err'); return; }
  const fimVal = gv('m-fim');
  if (fimVal && fimVal < ini) { toast('O horário de fim deve ser após o início', 'err'); return; }
  btnLoading('btn-ed-sess', true);
  try {
    const fim = fimVal ? fimVal.replace('T',' ') : null;
    await req('PUT', `/tempo/${sessaoId}`, { inicio: ini.replace('T',' '), fim });
    invalidarCacheProjetos();
    fecharModal(); toast('Sessão atualizada');
    await refreshCronometroUI();
  } catch (e) { toast(e.message,'err'); btnLoading('btn-ed-sess', false); }
}

export async function deletarSessao(sessaoId, tarefaId) {
  confirmar('Excluir esta sessão e todos os seus intervalos? Esta ação não pode ser desfeita.', async () => {
    try {
      await req('DELETE', `/tempo/${sessaoId}`);
      invalidarCacheProjetos();
      toast('Sessão excluída');
      await refreshCronometroUI();
    } catch (e) { toast(e.message,'err'); }
  }, { titulo: 'Excluir sessão', btnTexto: 'Excluir', danger: true });
}

export async function editarIntervalo(intervaloId) {
  let intervalo = null;
  try { intervalo = await req('GET', `/intervalos/${intervaloId}`); } catch (e) { toast(e.message, 'err'); }
  abrirModal(`
    <h2>Editar intervalo</h2>
    <div class="form-row"><label for="m-tipo">Tipo</label><input id="m-tipo" placeholder="Lanche, Reunião..." value="${esc(intervalo?.tipo || '')}"></div>
    <div class="form-grid">
      <div class="form-row"><label for="m-ini">Início</label><input type="datetime-local" id="m-ini" value="${fmtDatetimeInput(intervalo?.inicio || '')}"></div>
      <div class="form-row"><label for="m-fim">Fim</label><input type="datetime-local" id="m-fim" value="${fmtDatetimeInput(intervalo?.fim || '')}"></div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn" onclick="fecharModal()">Cancelar</button>
      <button type="button" class="btn btn-primary" id="btn-ed-int" onclick="salvarIntervalo('${intervaloId}')">Salvar</button>
    </div>`);
}

export async function salvarIntervalo(id) {
  const tipo = gv('m-tipo').trim();
  const ini = gv('m-ini');
  const fimRaw = gv('m-fim');
  if (!tipo) { toast('Tipo obrigatório.', 'err'); return; }
  if (!ini) { toast('Informe o início do intervalo.', 'err'); return; }
  if (fimRaw && fimRaw < ini) { toast('O fim do intervalo deve ser após o início.', 'err'); return; }
  btnLoading('btn-ed-int', true);
  try {
    await req('PUT', `/intervalos/${id}`, { tipo, inicio: ini.replace('T',' '), fim: fimRaw ? fimRaw.replace('T',' ') : null });
    invalidarCacheProjetos();
    fecharModal(); toast('Intervalo atualizado');
    await refreshCronometroUI();
  } catch (e) { toast(e.message,'err'); btnLoading('btn-ed-int', false); }
}

export async function deletarIntervalo(id, tarefaId) {
  confirmar('Excluir este intervalo? Esta ação não pode ser desfeita.', async () => {
    try {
      await req('DELETE', `/intervalos/${id}`);
      invalidarCacheProjetos();
      toast('Intervalo excluído');
      await refreshCronometroUI();
    } catch (e) { toast(e.message,'err'); }
  }, { titulo: 'Excluir intervalo', btnTexto: 'Excluir', danger: true });
}

export async function expandirSessoes(tarefaId) {
  const tarefa = TAREFAS.find(t => t.id === tarefaId);
  const nome = tarefa?.nome || tarefaId;

  abrirModal(`
    <h2>Registro de tempo</h2>
    <p class="modal-copy">Tarefa: <strong class="inline-note-strong">${esc(nome)}</strong></p>
    <div class="sessoes-kpi"><span class="sessoes-kpi-label">Total líquido</span><span class="sessoes-kpi-val" id="sess-total-${tarefaId}">--</span></div>
    <div id="sess-inner"><div class="loading"><div class="spinner"></div></div></div>
    <div class="task-details-panel" id="task-details-${tarefaId}">${htmlDetalhesTarefa(tarefaId)}</div>
    <div class="modal-footer">
      <button type="button" class="btn" onclick="fecharModal()">Fechar</button>
    </div>
  `, { lg: true });

  await renderSessoesTarefa(tarefaId, document.getElementById('sess-inner'));
}

export function htmlDetalhesTarefa(tarefaId) {
  const itens = listarDetalhesTarefa(tarefaId);
  const itensHtml = itens.map((item, idx) => `
    <div class="task-detail-item ${item.done ? 'done' : ''}">
      <div class="task-detail-left">
        <input class="task-detail-check" type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleDetalheTarefa('${tarefaId}',${idx},this.checked)">
        <div class="task-detail-text">${esc(item.text)}</div>
      </div>
      <button class="btn btn-danger btn-icon btn-sm" onclick="removerDetalheTarefa('${tarefaId}',${idx})" title="Remover detalhe">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>`).join('');

  return `
    <div class="task-details-header">Detalhes da tarefa</div>
    <div class="task-details-add">
      <input id="task-det-input-${tarefaId}" onkeydown="adicionarDetalheTarefaEnter(event,'${tarefaId}')" placeholder="Ex: Pendência com fornecedor..." aria-label="Detalhe da tarefa">
      <button type="button" class="btn btn-primary btn-sm" onclick="adicionarDetalheTarefa('${tarefaId}')">Adicionar</button>
    </div>
    <div class="task-details-list">${itensHtml || '<div class="inline-muted-sm">Nenhum detalhe adicionado ainda.</div>'}</div>`;
}

export function atualizarDetalhesTarefaUI(tarefaId) {
  const el = document.getElementById(`task-details-${tarefaId}`);
  if (!el) return;
  el.innerHTML = htmlDetalhesTarefa(tarefaId);
}

export function adicionarDetalheTarefa(tarefaId) {
  const input = document.getElementById(`task-det-input-${tarefaId}`);
  if (!input) return;
  const txt = input.value.trim();
  if (!txt) return;
  const itens = listarDetalhesTarefa(tarefaId);
  itens.push({ text: txt, done: false });
  input.value = '';
  salvarDetalhesTarefa(tarefaId, itens);
  atualizarDetalhesTarefaUI(tarefaId);
  const inputNovo = document.getElementById(`task-det-input-${tarefaId}`);
  if (inputNovo) inputNovo.focus();
}

export function adicionarDetalheTarefaEnter(ev, tarefaId) {
  if (ev.key !== 'Enter') return;
  ev.preventDefault();
  adicionarDetalheTarefa(tarefaId);
}

export function toggleDetalheTarefa(tarefaId, idx, done) {
  const itens = listarDetalhesTarefa(tarefaId);
  if (!itens[idx]) return;
  itens[idx].done = !!done;
  salvarDetalhesTarefa(tarefaId, itens);
  atualizarDetalhesTarefaUI(tarefaId);
}

export function removerDetalheTarefa(tarefaId, idx) {
  const itens = listarDetalhesTarefa(tarefaId);
  itens.splice(idx, 1);
  salvarDetalhesTarefa(tarefaId, itens);
  atualizarDetalhesTarefaUI(tarefaId);
}
