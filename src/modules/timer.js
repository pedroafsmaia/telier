// ── TIMER ──
import {
  TIMERS, SESSAO_TICKS, PROJETO, TAREFAS, RELATORIO_CACHE, TOKEN,
  TIMER_AVISO_HORAS,
  setTimers, setRelatorioCache,
} from './state.js';
import { req } from './api.js';
import { toast, abrirModal, fecharModal, confirmar, btnLoading } from './ui.js';
import { esc, gv, fmtDuracao, fmtHoras, fmtDatetime, fmtDatetimeInput, agora, isAdmin, listarDetalhesTarefa, salvarDetalhesTarefa } from './utils.js';

export function limparTicksSessao(tarefaId) {
  const ids = SESSAO_TICKS.get(tarefaId) || [];
  ids.forEach(clearInterval);
  SESSAO_TICKS.delete(tarefaId);
}

export async function carregarTimersAtivos() {
  try {
    const ativas = await req('GET', '/tempo/ativas');
    for (const s of ativas) {
      if (!TIMERS[s.id]) {
        TIMERS[s.id] = {
          tarefaId: s.tarefa_id,
          tarefa_nome: s.tarefa_nome,
          projeto_nome: s.projeto_nome,
          projeto_id: s.projeto_id,
          inicio: s.inicio,
        };
      }
    }
    renderTimerDock();
    atualizarTempoListaVisivel();
  } catch {}
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
  try {
    const { id, inicio } = await req('POST', `/tarefas/${tarefaId}/tempo`, { inicio: agora() }).catch(e => {
      if (e.message.includes('permissão')) throw new Error('Você precisa ser colaborador desta tarefa para cronometrar');
      throw e;
    });
    TIMERS[id] = {
      tarefaId,
      tarefa_nome: tarefaNome,
      projeto_nome: PROJETO?.nome || '',
      projeto_id: PROJETO?.id || '',
      inicio,
    };
    renderTimerDock();
    atualizarTempoListaVisivel();
    toast('Cronômetro iniciado');
    carregarColegasAtivos();
  } catch (e) { toast(e.message, 'err'); }
}

export async function pararCronometro(sessaoId) {
  const { carregarColegasAtivos } = await import('./notifications.js');
  try {
    await req('PUT', `/tempo/${sessaoId}/parar`, { fim: agora() });
    delete TIMERS[sessaoId];
    renderTimerDock();
    atualizarTempoListaVisivel();
    toast('Cronômetro parado');
    setRelatorioCache(null);
    carregarColegasAtivos();
    // Recarregar se estiver na página do projeto certo
    if (PROJETO) {
      const { recarregarProjeto } = await import('./project.js');
      await recarregarProjeto();
    }
  } catch (e) { toast(e.message, 'err'); }
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
        <div class="timer-actions">
          <button class="btn btn-sm" onclick="modalAdicionarIntervalo('${sessaoId}')"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" style="margin-right:4px"><path d="M5.5 2v7M2 5.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Intervalo</button>
          <button class="btn btn-sm btn-danger" onclick="pararCronometro('${sessaoId}')"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" style="margin-right:4px"><rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor"/></svg>Parar</button>
        </div>
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
    <div class="form-row"><label>Tipo</label><input id="m-tipo" placeholder="Ex: Lanche, Reunião, Problema técnico..."></div>
    <div class="form-grid">
      <div class="form-row"><label>Início</label><input type="datetime-local" id="m-ini" value="${new Date().toISOString().slice(0,16)}"></div>
      <div class="form-row"><label>Fim (opcional)</label><input type="datetime-local" id="m-fim"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-add-int" onclick="criarIntervalo('${sessaoId}')">Adicionar</button>
    </div>`);
}

export async function criarIntervalo(sessaoId) {
  const tipo = gv('m-tipo').trim();
  if (!tipo) { toast('Tipo obrigatório', 'err'); return; }
  btnLoading('btn-add-int', true);
  try {
    const ini = gv('m-ini').replace('T', ' ');
    const fim = gv('m-fim') ? gv('m-fim').replace('T', ' ') : null;
    await req('POST', `/tempo/${sessaoId}/intervalos`, { tipo, inicio: ini, fim });
    fecharModal(); toast('Intervalo adicionado');
    if (PROJETO) {
      const { recarregarProjeto } = await import('./project.js');
      await recarregarProjeto();
    }
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
              <button class="btn btn-danger btn-icon btn-sm" onclick="editarIntervalo('${iv.id}')" title="Editar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>
              <button class="btn btn-danger btn-icon btn-sm" onclick="deletarIntervalo('${iv.id}','${tarefaId}')" title="Excluir"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
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
              <button class="btn btn-ghost btn-icon btn-sm" onclick="editarSessao('${s.id}','${s.inicio}','${s.fim||''}')" title="Editar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="modalAdicionarIntervalo('${s.id}')" title="Adicionar intervalo"><svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2v7M2 5.5h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
              <button class="btn btn-danger btn-icon btn-sm" onclick="deletarSessao('${s.id}','${tarefaId}')" title="Excluir"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
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
    <div class="form-row"><label>Início</label><input type="datetime-local" id="m-ini" value="${fmtDatetimeInput(inicio)}"></div>
    <div class="form-row"><label>Fim</label><input type="datetime-local" id="m-fim" value="${fmtDatetimeInput(fim)}"></div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-ed-sess" onclick="salvarSessao('${sessaoId}')">Salvar</button>
    </div>`);
}

export async function salvarSessao(sessaoId) {
  const ini = gv('m-ini');
  const fimVal = gv('m-fim');
  if (fimVal && fimVal < ini) { toast('O horário de fim deve ser após o início', 'err'); return; }
  btnLoading('btn-ed-sess', true);
  try {
    const fim = fimVal ? fimVal.replace('T',' ') : null;
    await req('PUT', `/tempo/${sessaoId}`, { inicio: ini.replace('T',' '), fim });
    fecharModal(); toast('Sessão atualizada');
    setRelatorioCache(null);
    if (PROJETO) {
      const { recarregarProjeto } = await import('./project.js');
      await recarregarProjeto();
    }
  } catch (e) { toast(e.message,'err'); btnLoading('btn-ed-sess', false); }
}

export async function deletarSessao(sessaoId, tarefaId) {
  confirmar('Excluir esta sessão e todos os seus intervalos? Esta ação não pode ser desfeita.', async () => {
    try {
      await req('DELETE', `/tempo/${sessaoId}`);
      toast('Sessão excluída');
      if (PROJETO) {
        const { recarregarProjeto } = await import('./project.js');
        await recarregarProjeto();
      }
    } catch (e) { toast(e.message,'err'); }
  }, { titulo: 'Excluir sessão', btnTexto: 'Excluir', danger: true });
}

export async function editarIntervalo(intervaloId) {
  abrirModal(`
    <h2>Editar intervalo</h2>
    <div class="form-row"><label>Tipo</label><input id="m-tipo" placeholder="Lanche, Reunião..."></div>
    <div class="form-grid">
      <div class="form-row"><label>Início</label><input type="datetime-local" id="m-ini"></div>
      <div class="form-row"><label>Fim</label><input type="datetime-local" id="m-fim"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-ed-int" onclick="salvarIntervalo('${intervaloId}')">Salvar</button>
    </div>`);
}

export async function salvarIntervalo(id) {
  btnLoading('btn-ed-int', true);
  try {
    await req('PUT', `/intervalos/${id}`, { tipo: gv('m-tipo'), inicio: gv('m-ini').replace('T',' '), fim: gv('m-fim') ? gv('m-fim').replace('T',' ') : null });
    fecharModal(); toast('Intervalo atualizado');
    if (PROJETO) {
      const { recarregarProjeto } = await import('./project.js');
      await recarregarProjeto();
    }
  } catch (e) { toast(e.message,'err'); btnLoading('btn-ed-int', false); }
}

export async function deletarIntervalo(id, tarefaId) {
  confirmar('Excluir este intervalo? Esta ação não pode ser desfeita.', async () => {
    try {
      await req('DELETE', `/intervalos/${id}`);
      toast('Intervalo excluído');
      if (PROJETO) {
        const { recarregarProjeto } = await import('./project.js');
        await recarregarProjeto();
      }
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
      <button class="btn" onclick="fecharModal()">Fechar</button>
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
      <input id="task-det-input-${tarefaId}" onkeydown="adicionarDetalheTarefaEnter(event,'${tarefaId}')" placeholder="Ex: Pendência com fornecedor, material faltando, ponto de atenção...">
      <button class="btn btn-primary btn-sm" onclick="adicionarDetalheTarefa('${tarefaId}')">Adicionar</button>
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
