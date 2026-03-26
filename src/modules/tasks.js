// ── TASKS ──
import {
  EU, PROJETO, TAREFAS, USUARIOS, RELATORIO_CACHE, TIMERS,
  FILTRO_ORIGEM_TAREFAS, FILTRO_STATUS_TAREFA, FILTRO_RESP_TAR,
  BUSCA_TAREFA, TAREFAS_VIEW, LISTA_SORT, LISTA_CONCLUIDAS_EXPANDIDA,
  TASK_MOBILE_FILTERS_OPEN,
  setTarefas, setUsuarios, setRelatorioCache, setBuscaTarefa,
  setFiltroOrigemTarefas, setFiltroStatusTarefa, setFiltroRespTar,
  setTarefasView, setListaSort, setListaConcluidasExpandida, setTaskMobileFiltersOpen,
} from './state.js';
import { req } from './api.js';
import { toast, abrirModal, fecharModal, confirmar, btnLoading } from './ui.js';
import {
  esc, gv, sel, avatar, iniciais, tag, prazoFmt, diasRestantes,
  fmtDuracao, fmtHoras, isAdmin, podeEditar, souDono, tarefaCompartilhadaComigo,
  filtrarColecaoTarefas, normalizarColaboradoresTarefas,
  normalizarStatusProjeto, ST, PT, DT, PO, DO, csvEsc,
} from './utils.js';
import { expandirSessoes } from './timer.js';

const FASES = ['Estudo preliminar','Anteprojeto','Projeto básico','Projeto executivo','Em obra'];
const STATUS_PROJ = ['A fazer','Em andamento','Em revisão','Pausado','Concluído','Arquivado'];
const STATUS_TAR = ['A fazer','Em andamento','Bloqueada','Concluída'];
const PRIORS = ['Alta','Média','Baixa'];
const DIFS = ['Simples','Moderada','Complexa'];

let _quickAddNome = '';
let _quickAddStep = 0;
let _buscaTarefaTick;

async function _recarregarProjeto(aba) {
  const { recarregarProjeto } = await import('./project.js');
  return recarregarProjeto(aba);
}

export function atualizarPrazoHint() {
  const el = document.getElementById('m-data-hint');
  if (!el) return;
  const data = gv('m-data');
  el.textContent = data ? `Prazo definido: ${prazoFmt(data)}` : 'Sem prazo definido';
}

export function renderColabsStack(ids = [], max = 3) {
  const visible = ids.slice(0, max);
  const extra = ids.length - max;
  const html = visible.map(id => {
    const u = USUARIOS.find(u => u.id === id);
    return u ? avatar(u.nome, 'avatar-sm') : '';
  }).join('');
  return `<div class="colabs-stack">${html}${
    extra > 0 ? `<span class="colabs-stack-more">+${extra}</span>` : ''
  }</div>`;
}

export function renderAoVivoStream(sessoes, opts = {}) {
  const mostrarProjeto = !!opts.mostrarProjeto;
  const abrir = typeof opts.abrir === 'function' ? opts.abrir : null;
  const titulo = opts.titulo || 'Ao vivo';
  const copy = opts.copy || 'Sessões ativas neste momento.';
  const resumo = `${sessoes.length} sess${sessoes.length === 1 ? 'ão ativa' : 'ões ativas'}`;
  return `
    <div class="task-view-surface">
      <div class="task-view-head">
        <div>
          <div class="task-view-eyebrow">${titulo}</div>
          <div class="task-view-title">${resumo}</div>
          <div class="task-view-copy">${copy}</div>
        </div>
        <div class="task-view-kpi">Atualiza ao recarregar a aba</div>
      </div>
      <div class="task-live-list">
        ${sessoes.map(s => {
          const seg = s.inicio
            ? Math.max(0, Math.floor((Date.now() - new Date(s.inicio.replace(' ','T')+'Z').getTime()) / 1000))
            : 0;
          const onclick = abrir ? `onclick="${abrir(s)}"` : '';
          const clickable = abrir ? ' clickable' : '';
          return `
            <div class="task-live-item${clickable}" ${onclick}>
              <div class="task-live-dot"></div>
              <div class="task-live-main">
                <div class="task-live-title">${esc(s.tarefa_nome)}</div>
                <div class="task-live-sub">
                  ${mostrarProjeto ? `${esc(s.projeto_nome)} · ` : ''}${esc(s.usuario_nome)} · iniciado ${fmtDuracao(seg)} atr&aacute;s
                </div>
              </div>
              <div class="task-live-aside">
                <div class="resp-chip">${avatar(s.usuario_nome,'avatar-sm')} <span>${esc(s.usuario_nome)}</span></div>
                <div class="task-live-time">${fmtDuracao(seg)}</div>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

export function renderAbaTarefas(el, tarefas) {
  const projetoArquivado = (
    normalizarStatusProjeto(PROJETO?.status) === 'Arquivado' ||
    (PROJETO?.grupo_status || null) === 'Arquivado'
  );
  const responsaveis = [...new Map(tarefas.map(t => [t.dono_id, { id: t.dono_id, nome: t.dono_nome }])).values()];
  const statusTabs = ['todos', 'A fazer', 'Em andamento', 'Bloqueada', 'Concluída'];
  const compartilhadas = tarefas.filter(t => tarefaCompartilhadaComigo(t)).length;
  const meus = tarefas.filter(t => t.dono_id === EU?.id).length;
  const baseFiltrada = filtrarColecaoTarefas(tarefas, { status: 'todos' });
  const filtradas = filtrarColecaoTarefas(tarefas);
  const pendentes = filtradas.filter(t => t.status !== 'Concluída').length;
  const concluidas = filtradas.filter(t => t.status === 'Concluída').length;
  const statusCountMap = Object.fromEntries(statusTabs.map(s => [s,
    s === 'todos' ? baseFiltrada.length : baseFiltrada.filter(t => t.status === s).length
  ]));

  const toolbarHtml = `
    <div class="task-surface-head">
      <div>
        <div class="section-kicker">Operação</div>
        <div class="task-view-title">Tarefas do projeto</div>
        <div class="task-view-copy">Controle ativo de execução, responsabilidade e ritmo de entrega.</div>
      </div>
      <div class="task-view-kpi">${pendentes} pendente${pendentes!==1?'s':''} · ${concluidas} concluída${concluidas!==1?'s':''}</div>
    </div>
    <div class="dash-toolbar task-view-toolbar task-toolbar-studio">
      <div class="dash-toolbar-row dash-toolbar-primary">
        <div class="task-toolbar-main dash-toolbar-searchblock">
          <div class="dash-toolbar-label">Consulta</div>
          <input type="search" class="search-dash search-tarefa" placeholder="Buscar tarefa..."
                 value="${esc(BUSCA_TAREFA)}" oninput="filtrarTarefasBusca(this.value)">
        </div>
        <div class="dash-toolbar-switches">
          <div class="dash-toolbar-label">Escopo</div>
          <div class="segmented">
            <button class="segmented-btn ${FILTRO_ORIGEM_TAREFAS==='todos'?'ativo':''}" onclick="setFiltroOrigemTarefas('todos');renderAbaTarefas(document.getElementById('aba'),TAREFAS)">Todas${tarefas.length ? `<span class="seg-count">${tarefas.length}</span>` : ''}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_TAREFAS==='meus'?'ativo':''}" onclick="setFiltroOrigemTarefas('meus');renderAbaTarefas(document.getElementById('aba'),TAREFAS)">Minhas${meus ? `<span class="seg-count">${meus}</span>` : ''}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_TAREFAS==='compartilhadas'?'ativo':''}" onclick="setFiltroOrigemTarefas('compartilhadas');renderAbaTarefas(document.getElementById('aba'),TAREFAS)">Compartilhadas${compartilhadas ? `<span class="seg-count">${compartilhadas}</span>` : ''}</button>
          </div>
        </div>
        <div class="task-toolbar-actions">
          <button class="btn btn-sm task-mobile-filter-btn" onclick="setTaskMobileFiltersOpen(!TASK_MOBILE_FILTERS_OPEN);renderAbaTarefas(document.getElementById('aba'),TAREFAS)">Filtros</button>
          <div class="view-toggle">
            <button class="view-toggle-btn ${TAREFAS_VIEW==='lista'?'ativo':''}"
                    onclick="setTarefasView('lista');renderAbaTarefas(document.getElementById('aba'),TAREFAS)"
                    title="Vista lista">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="10" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="6" width="10" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="10" width="10" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
            <button class="view-toggle-btn ${TAREFAS_VIEW==='kanban'?'ativo':''}"
                    onclick="setTarefasView('kanban');renderAbaTarefas(document.getElementById('aba'),TAREFAS)"
                    title="Vista kanban">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
                <rect x="5.25" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
                <rect x="9.5" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
              </svg>
            </button>
          </div>
          ${!projetoArquivado ? `<button class="btn btn-primary btn-sm" onclick="modalNovaTarefa('${PROJETO?.id}')">Nova tarefa</button>` : ''}
        </div>
      </div>
      <div class="dash-toolbar-row dash-toolbar-secondary task-mobile-secondary ${TASK_MOBILE_FILTERS_OPEN ? 'is-open' : ''}">
          <div class="task-toolbar-summary task-toolbar-summary-grid">
            ${responsaveis.length > 1 ? `
              <div class="dash-toolbar-field">
                <div class="dash-toolbar-label">Responsável</div>
                <select class="resp-filter select-control" onchange="setFiltroRespTar(this.value);renderAbaTarefas(document.getElementById('aba'),TAREFAS)">
                <option value="">Todos os responsáveis</option>
                ${responsaveis.map(r => `<option value="${r.id}" ${FILTRO_RESP_TAR===r.id?'selected':''}>${esc(r.nome)}</option>`).join('')}
                </select>
              </div>` : ''}
            <div class="dash-toolbar-field dash-toolbar-statusfield">
              <div class="dash-toolbar-label">Status</div>
              <div class="dash-status-grid">
            ${statusTabs.map(s => {
              const label = s === 'todos' ? 'Todos' : s;
              const cnt = statusCountMap[s] || 0;
              return `<button class="filter-btn ${FILTRO_STATUS_TAREFA===s?'ativo':''}" onclick="setFiltroStatusTarefa('${esc(s)}');renderAbaTarefas(document.getElementById('aba'),TAREFAS)">${label}${cnt ? `<span class="seg-count">${cnt}</span>` : ''}</button>`;
            }).join('')}
              </div>
            </div>
          </div>
          <div class="task-view-kpi">${pendentes} pendente${pendentes!==1?'s':''} · ${concluidas} concluída${concluidas!==1?'s':''}</div>
        </div>
    </div>`;

  el.innerHTML = toolbarHtml + `<div id="tarefas-view-container"></div>`;
  const container = document.getElementById('tarefas-view-container');
  if (TAREFAS_VIEW === 'lista') renderListaInterna(container, tarefas);
  else renderKanbanInterno(container, tarefas);
}

export function renderKanbanInterno(el, tarefas) {
  if (!el) return;

  const projetoArquivado = (
    normalizarStatusProjeto(PROJETO?.status) === 'Arquivado' ||
    (PROJETO?.grupo_status || null) === 'Arquivado'
  );
  const cols = [
    { status: 'A fazer', cor: 'var(--gray)' },
    { status: 'Em andamento', cor: 'var(--blue)' },
    { status: 'Bloqueada', cor: 'var(--red)' },
    { status: 'Concluída', cor: 'var(--green)' },
  ];

  const filtradas = filtrarColecaoTarefas(tarefas);

  const timerAtivoPorTarefa = {};
  Object.entries(TIMERS).forEach(([sid, timer]) => { timerAtivoPorTarefa[timer.tarefaId] = sid; });

  function cardHtml(t) {
    const minha = t.dono_id === EU?.id;
    const canEdit = !projetoArquivado && (minha || podeEditar(PROJETO) || isAdmin());
    const podeCron = !projetoArquivado && (minha || (t.colaboradores_ids || []).includes(EU?.id) || isAdmin());
    const sessaoAtiva = timerAtivoPorTarefa[t.id];
    const diasT = diasRestantes(t.data || null);
    const urgt = diasT !== null && diasT <= 2 && t.status !== 'Concluída';

    const cronHtml = sessaoAtiva
      ? `<button class="btn btn-danger btn-sm kanban-cron-btn"
                 onclick="pararCronometro('${sessaoAtiva}');event.stopPropagation()"
                 title="Parar cronômetro">
           <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="margin-right:3px">
             <rect x="1.5" y="1.5" width="7" height="7" rx="1" fill="currentColor"/>
           </svg>${TIMERS[sessaoAtiva] ? fmtDuracao(Math.floor((Date.now()-new Date((TIMERS[sessaoAtiva].inicio||'').replace(' ','T')+'Z').getTime())/1000)) : ''}
         </button>`
      : podeCron
        ? `<button class="btn btn-ghost btn-sm kanban-cron-btn"
                   onclick="iniciarCronometro('${t.id}','${esc(t.nome)}');event.stopPropagation()"
                   title="Iniciar cronômetro" style="color:var(--green)">
             <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="margin-right:3px">
               <path d="M3 1.5l5 3.5-5 3.5v-7z" fill="currentColor"/>
             </svg>Iniciar
           </button>`
        : '';

    const colabIds = t.colaboradores_ids || [];
    const colabNomes = t.colaboradores_nomes || [];
    const maxAvs = 3;
    const todosIds = [t.dono_id, ...colabIds];
    const todosNomes = [t.dono_nome, ...colabNomes];
    const visiveis = todosIds.slice(0, maxAvs);
    const extra = todosIds.length - maxAvs;
    const tooltipExtra = extra > 0 ? todosNomes.slice(maxAvs).join(', ') : '';

    const avsHtml = `<div class="kanban-avs">
      ${visiveis.map((id, i) => {
        const nome = todosNomes[i] || '?';
        const isDono = id === t.dono_id;
        return `<div class="avatar avatar-sm kanban-av${isDono?' kanban-av-dono':''}"
                     style="margin-left:${i>0?'-6px':'0'};border:2px solid var(--bg-card)"
                     title="${esc(nome)}${isDono?' (dono)':''}">${iniciais(nome)}</div>`;
      }).join('')}
      ${extra > 0
        ? `<div class="avatar avatar-sm kanban-av-more" title="${esc(tooltipExtra)}"
               style="margin-left:-6px;border:2px solid var(--bg-card)">+${extra}</div>`
        : ''}
    </div>`;

    const borderStyle = t.foco && minha
      ? 'border-left:3px solid var(--accent);border-radius:0 var(--r) var(--r) 0'
      : t.status === 'Bloqueada'
        ? 'border-left:3px solid var(--red);border-radius:0 var(--r) var(--r) 0'
        : '';

    const isConcluida = t.status === 'Concluída';

    return `<div class="kanban-card" draggable="true" data-tarefa-id="${t.id}"
                 style="${borderStyle}"
                 ondragstart="event.dataTransfer.setData('tarefaId',this.dataset.tarefaId)"
                 onclick="modalEditarTarefa('${t.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px">
        <div style="font-size:var(--fs-base);color:${isConcluida?'var(--text-muted)':'var(--text)'};
                    ${isConcluida?'text-decoration:line-through;':''}line-height:1.35;flex:1">
          ${esc(t.nome)}
        </div>
        ${minha ? `<button class="foco-pin ${t.foco?'ativo':''}" style="font-size:14px;flex-shrink:0"
                            onclick="toggleFoco('${t.id}',${!!t.foco});event.stopPropagation()"
                            title="${t.foco?'Remover foco':'Marcar como foco'}">${t.foco?'★':'☆'}</button>` : ''}
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
        ${tag(t.prioridade, PT[t.prioridade])}
        ${t.data
          ? `<span class="tag ${urgt?(diasT<=0?'tag-red':'tag-yellow'):'tag-gray'} mono" style="font-size:var(--fs-xs)">
               ${urgt?`<svg width="9" height="9" viewBox="0 0 24 24" fill="none" style="vertical-align:-1px;margin-right:1px"><path d="M12 3.5l9 15.5H3l9-15.5z" stroke="currentColor" stroke-width="2"/><path d="M12 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.7" r="1" fill="currentColor"/></svg>`:''}${diasT<=0?'vencida':prazoFmt(t.data,true)}
             </span>`
          : ''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px;gap:6px">
        ${avsHtml}
        <div style="display:flex;gap:4px;align-items:center" onclick="event.stopPropagation()">
          ${cronHtml}
          ${canEdit && !isConcluida ? `
            <button class="btn btn-ghost btn-icon btn-sm"
                    onclick="modalEditarTarefa('${t.id}');event.stopPropagation()"
                    title="Editar">
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                <path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/>
              </svg>
            </button>` : ''}
        </div>
      </div>
    </div>`;
  }

  function inlineAddHtml(status) {
    const canCreate = !projetoArquivado && (podeEditar(PROJETO) || isAdmin());
    if (!canCreate) return '';
    const inputId = `kb-add-${status.replace(/\s/g,'_')}`;
    return `<div class="kb-inline-add">
      <input type="text" id="${inputId}" class="kb-inline-input"
             placeholder="+ Nova tarefa"
             onkeydown="if(event.key==='Enter'&&this.value.trim()){
               criarTarefaKanban(this.value.trim(),'${status}');this.value='';
             } else if(event.key==='Escape'){this.blur();}"
             onclick="event.stopPropagation()">
    </div>`;
  }

  let kbConclExpand = sessionStorage.getItem('kb_concl_expand') === '1';

  const colsHtml = cols.map(({ status, cor }) => {
    const items = filtradas.filter(t => t.status === status);
    const isConc = status === 'Concluída';
    const mostrar = isConc ? items.slice(0, kbConclExpand ? undefined : 2) : items;
    const extra = isConc && !kbConclExpand && items.length > 2 ? items.length - 2 : 0;

    return `<div class="kanban-col" data-status="${status}"
                 ondragover="event.preventDefault();this.classList.add('drag-over')"
                 ondragleave="this.classList.remove('drag-over')"
                 ondrop="this.classList.remove('drag-over');mudarStatus(event.dataTransfer.getData('tarefaId'),'${status}',null)">
      <div class="kanban-col-header" style="border-top-color:${cor}">
        ${status}
        ${items.length > 0 ? `<span style="color:var(--text-muted);font-weight:400">${items.length}</span>` : ''}
      </div>
      ${mostrar.map(cardHtml).join('')}
      ${extra > 0 ? `<div style="text-align:center;font-size:var(--fs-xs);color:var(--text-muted);padding:6px 0;cursor:pointer"
                         onclick="sessionStorage.setItem('kb_concl_expand','1');renderKanbanInterno(this.closest('#tarefas-view-container,#aba'),TAREFAS)">
                       + ${extra} mais
                     </div>` : ''}
      ${inlineAddHtml(status)}
    </div>`;
  }).join('');

  el.innerHTML = `<div class="task-view-surface"><div class="kanban-board">${colsHtml}</div></div>`;
}

export async function criarTarefaKanban(nome, status) {
  if (!PROJETO?.id || !nome.trim()) return;
  try {
    await req('POST', `/projetos/${PROJETO.id}/tarefas`, {
      nome: nome.trim(),
      status,
      prioridade: 'Média',
      complexidade: 'Moderada',
    });
    await _recarregarProjeto('tarefas');
  } catch (e) { toast(e.message, 'err'); }
}

export function renderListaInterna(el, tarefas) {
  const projetoArquivado = (
    normalizarStatusProjeto(PROJETO?.status) === 'Arquivado' ||
    (PROJETO?.grupo_status || null) === 'Arquivado'
  );
  const tarefasFiltradas = filtrarColecaoTarefas(tarefas);
  const pendFilt = tarefasFiltradas.filter(t => t.status !== 'Concluída');
  const concFilt = tarefasFiltradas.filter(t => t.status === 'Concluída');

  let pendOrdenadas = [...pendFilt];
  let concOrdenadas = [...concFilt];
  if (LISTA_SORT.col) {
    const dir = LISTA_SORT.dir === 'asc' ? 1 : -1;
    const comparar = (a, b) => {
      if (LISTA_SORT.col === 'nome') return dir * a.nome.localeCompare(b.nome);
      if (LISTA_SORT.col === 'prioridade') return dir * ((PO[a.prioridade] ?? 1) - (PO[b.prioridade] ?? 1));
      if (LISTA_SORT.col === 'complexidade') return dir * ((DO[a.complexidade] ?? 1) - (DO[b.complexidade] ?? 1));
      if (LISTA_SORT.col === 'data') {
        const da = a.data || '9999-99-99';
        const db = b.data || '9999-99-99';
        return dir * da.localeCompare(db);
      }
      return 0;
    };
    pendOrdenadas.sort(comparar);
    concOrdenadas.sort(comparar);
  }
  const todas = [...pendOrdenadas, ...concOrdenadas];

  const timerAtivoPorTarefa = {};
  Object.entries(TIMERS).forEach(([sid, timer]) => { timerAtivoPorTarefa[timer.tarefaId] = sid; });

  function rowHtml(t) {
    const minha = t.dono_id === EU?.id;
    const canEdit = !projetoArquivado && (minha || podeEditar(PROJETO) || isAdmin());
    const pin = minha
      ? `<button class="foco-pin ${t.foco?'ativo':''}" onclick="toggleFoco('${t.id}',${!!t.foco})" title="${t.foco?'Remover foco':'Marcar como foco'}">${t.foco?'★':'☆'}</button>`
      : `<span class="foco-placeholder">${t.foco?'★':''}</span>`;

    const podeCron = !projetoArquivado && (minha || (t.colaboradores_ids || []).includes(EU?.id) || isAdmin());
    const sessaoAtiva = timerAtivoPorTarefa[t.id];

    const horas = sessaoAtiva
      ? `<button class="btn btn-sm btn-danger" onclick="pararCronometro('${sessaoAtiva}')" title="Parar cronômetro"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" style="margin-right:4px"><rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor"/></svg>Parar</button>`
      : podeCron
        ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="iniciarCronometro('${t.id}','${esc(t.nome)}')" title="Iniciar cronômetro" style="color:var(--green)"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2.5l5 3.5-5 3.5v-7z" fill="currentColor"/></svg></button>`
        : '';

    const dataStr = t.data || null;
    const diasTarefa = diasRestantes(dataStr);
    const urgenteTar = diasTarefa !== null && diasTarefa <= 2 && t.status !== 'Concluída';
    const data = dataStr ? prazoFmt(dataStr, true) : '—';

    return `<tr data-status="${esc(t.status)}">
      <td style="width:36px" onclick="event.stopPropagation()">${pin}</td>
      <td class="td-nome ${t.foco&&minha?'em-foco':''} ${t.status==='Concluída'?'concluida':''}">
        <div class="td-nome-main">${esc(t.nome)}</div>
      </td>
      <td><div class="resp-chip">${avatar(t.dono_nome,'avatar-sm')} <span>${esc(t.dono_nome||'—')}</span></div>${t.colaboradores_ids?.length ? renderColabsStack(t.colaboradores_ids) : ''}</td>
      <td>${tag(t.complexidade, DT[t.complexidade])}</td>
      <td>${tag(t.prioridade, PT[t.prioridade])}</td>
      <td onclick="event.stopPropagation()">
        ${canEdit ? `
          <select class="status-sel status-select" onchange="mudarStatus('${t.id}',this.value,this)">
            ${['A fazer','Em andamento','Bloqueada','Concluída'].map(s =>
              `<option value="${s}" ${s===t.status?'selected':''}>${s}</option>`
            ).join('')}
          </select>` : tag(t.status)}
      </td>
      <td>${horas}</td>
      <td>
        <span class="mono mono-cell-muted"
              style="${urgenteTar ? `color:${diasTarefa <= 0 ? 'var(--red)' : 'var(--yellow)'}` : ''}">
          ${urgenteTar
            ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" style="vertical-align:-1px;margin-right:2px"><path d="M12 3.5l9 15.5H3l9-15.5z" stroke="currentColor" stroke-width="2"/><path d="M12 9v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.7" r="1" fill="currentColor"/></svg>`
            : ''}${esc(data)}
        </span>
      </td>
      <td><div class="td-ações">
        <button class="btn btn-ghost btn-icon btn-sm" onclick="expandirSessoes('${t.id}')" title="Abrir detalhes e registro de tempo"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 5.2h5M4.5 7h5M4.5 8.8h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>
        ${podeCron ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="modalColabsTarefa('${t.id}')" title="Colaboradores da tarefa"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 11.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M9 7a2 2 0 1 0 0-4M12 11.5c0-1.65-1.12-3.04-2.66-3.43" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>` : ''}
        ${canEdit ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="duplicarTarefa('${t.id}')" title="Duplicar tarefa"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="5" y="6" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/></svg></button>` : ''}
        ${canEdit ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="modalEditarTarefa('${t.id}')" title="Editar tarefa"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>` : ''}
        ${canEdit ? `<button class="btn btn-danger btn-icon btn-sm" onclick="deletarTarefa('${t.id}')" title="Excluir tarefa"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>` : ''}
      </div></td>
    </tr>`;
  }

  const rowsPend = pendOrdenadas.map(t => rowHtml(t)).join('');
  const rowsConc = concOrdenadas.map(t => rowHtml(t)).join('');
  const tbodyConc = concOrdenadas.length ? `
    <tr class="concluidas-sep" onclick="setListaConcluidasExpandida(!LISTA_CONCLUIDAS_EXPANDIDA);renderListaInterna(this.closest('table').parentElement.parentElement,TAREFAS)"
        style="cursor:pointer">
      <td colspan="9" style="padding:8px 12px;font-size:var(--fs-xs);color:var(--text-muted);background:var(--bg-card);user-select:none">
        ${LISTA_CONCLUIDAS_EXPANDIDA ? '▼' : '▶'}
        ${concOrdenadas.length} concluída${concOrdenadas.length!==1?'s':''}
        — clique para ${LISTA_CONCLUIDAS_EXPANDIDA?'recolher':'expandir'}
      </td>
    </tr>
    ${LISTA_CONCLUIDAS_EXPANDIDA ? rowsConc : ''}` : '';

  el.innerHTML = `
    <div class="task-view-surface task-list-surface">
    <div class="task-list-head">
      <div>
        <div class="task-view-eyebrow">Operação do projeto</div>
        <div class="task-view-title">Lista de tarefas</div>
      </div>
      <div class="task-view-kpi">${pendFilt.length} pendente${pendFilt.length!==1?'s':''} · ${concFilt.length} concluída${concFilt.length!==1?'s':''}</div>
    </div>
    ${!projetoArquivado ? `<form class="quick-add-form" onsubmit="quickAddTarefa(event,'${PROJETO?.id}')">
      <input
        type="text"
        id="quick-add-input"
        class="quick-add-input"
        placeholder="Adicionar tarefa — pressione Enter para criar com defaults"
        autocomplete="off"
      >
      <div id="quick-add-step2" style="display:none;align-items:center;gap:8px;padding:6px 0;flex-wrap:wrap">
        <span style="font-size:var(--fs-xs);color:var(--text-muted)">Prioridade:</span>
        <select id="qa-prioridade" class="qa-sel" onkeydown="if(event.key==='Escape')quickAddCancelar()">
          <option>Alta</option>
          <option selected>Média</option>
          <option>Baixa</option>
        </select>
        <span style="font-size:var(--fs-xs);color:var(--text-muted)">Complexidade:</span>
        <select id="qa-complexidade" class="qa-sel" onkeydown="if(event.key==='Enter'){event.preventDefault();quickAddConfirmar('${PROJETO?.id}')}else if(event.key==='Escape')quickAddCancelar()">
          <option>Simples</option>
          <option selected>Moderada</option>
          <option>Complexa</option>
        </select>
        <button type="button" class="btn btn-primary btn-sm" onclick="quickAddConfirmar('${PROJETO?.id}')">✓ Criar</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="quickAddCancelar()">✕</button>
      </div>
    </form>` : ''}
    <div class="task-table-shell">
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th></th>
          <th onclick="ordenarLista('nome')" style="cursor:pointer;user-select:none">
            Tarefa ${LISTA_SORT.col==='nome' ? (LISTA_SORT.dir==='asc'?'↑':'↓') : ''}
          </th>
          <th>Origem</th>
          <th onclick="ordenarLista('complexidade')" style="cursor:pointer;user-select:none">
            Complexidade ${LISTA_SORT.col==='complexidade' ? (LISTA_SORT.dir==='asc'?'↑':'↓') : ''}
          </th>
          <th onclick="ordenarLista('prioridade')" style="cursor:pointer;user-select:none">
            Prioridade ${LISTA_SORT.col==='prioridade' ? (LISTA_SORT.dir==='asc'?'↑':'↓') : ''}
          </th>
          <th>Status</th>
          <th>Tempo</th>
          <th onclick="ordenarLista('data')" style="cursor:pointer;user-select:none">
            Data ${LISTA_SORT.col==='data' ? (LISTA_SORT.dir==='asc'?'↑':'↓') : ''}
          </th>
          <th>Ações</th>
        </tr></thead>
        <tbody>${rowsPend || `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px"><div style="font-style:italic">Nenhuma tarefa ainda.</div><div style="font-size:var(--fs-080);margin-top:8px;color:var(--text-secondary)">Comece por uma tarefa principal, com prioridade e prazo.</div>${!projetoArquivado ? `<button class="btn btn-sm btn-primary" style="margin-top:10px" onclick="modalNovaTarefa('${PROJETO?.id}')">+ Criar primeira tarefa</button>` : ''}</td></tr>`}${tbodyConc}</tbody>
      </table>
    </div>
    </div>
    <div class="tasks-cards task-cards-refined">
      ${todas.map(t => {
        const minha = t.dono_id === EU?.id;
        const canEdit = !projetoArquivado && (minha || podeEditar(PROJETO) || isAdmin());
        const podeCron = !projetoArquivado && (minha || (t.colaboradores_ids || []).includes(EU?.id) || isAdmin());
        const timerAtivoPorTarefa2 = {};
        Object.entries(TIMERS).forEach(([sid, timer]) => { timerAtivoPorTarefa2[timer.tarefaId] = sid; });
        const sessaoAtiva = timerAtivoPorTarefa2[t.id];
        const data = t.data ? prazoFmt(t.data, true) : '—';
        const statusBtn = canEdit
          ? `<select class="status-sel status-select" style="height:28px;padding:2px 4px;font-size:var(--fs-xs)" onchange="mudarStatus('${t.id}',this.value,this)">
              ${['A fazer','Em andamento','Bloqueada','Concluída'].map(s =>
                `<option value="${s}" ${s===t.status?'selected':''}>${s}</option>`
              ).join('')}
            </select>`
          : `<span class="tag" style="font-size:var(--fs-xs)">${esc(t.status)}</span>`;
        return `<div class="task-card ${t.status==='Concluída'?'concluida':''}" data-status="${esc(t.status)}">
          <div class="task-card-header">
            <div class="task-card-title ${t.foco&&minha?'em-foco':''} ${t.status==='Concluída'?'concluida':''}">${esc(t.nome)}</div>
            ${minha ? `<button class="task-card-foco ${t.foco?'ativo':''} " onclick="toggleFoco('${t.id}',${!!t.foco}); event.stopPropagation()" title="${t.foco?'Remover foco':'Marcar como foco'}">${t.foco?'★':'☆'}</button>` : ''}
          </div>
          <div class="task-card-meta">
            <div class="task-card-chip">${avatar(t.dono_nome,'avatar-sm')} <span>${esc(t.dono_nome||'—')}</span></div>
            ${t.colaboradores_ids?.length ? renderColabsStack(t.colaboradores_ids) : ''}
            ${tag(t.complexidade, DT[t.complexidade])}
            ${tag(t.prioridade, PT[t.prioridade])}
            <span class="task-card-chip" style="margin-left:auto;color:var(--text-muted);border:none;background:transparent">${esc(data)}</span>
          </div>
          <div class="task-card-footer">
            <div style="flex:1">${statusBtn}</div>
            <div class="task-card-actions">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="expandirSessoes('${t.id}')"; title="Detalhes"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 5.2h5M4.5 7h5M4.5 8.8h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>
              ${podeCron ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="modalColabsTarefa('${t.id}'); event.stopPropagation()" title="Colaboradores" style="font-size:16px">👥</button>` : ''}
              ${canEdit ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="duplicarTarefa('${t.id}')" title="Duplicar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="5" y="6" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/></svg></button>` : ''}
              ${canEdit ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="modalEditarTarefa('${t.id}')" title="Editar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>` : ''}
              ${canEdit ? `<button class="btn btn-danger btn-icon btn-sm" onclick="deletarTarefa('${t.id}')" title="Excluir"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>` : ''}
              ${sessaoAtiva ? `<button class="btn btn-danger btn-sm " onclick="pararCronometro('${sessaoAtiva}')" style="font-size:var(--fs-xs)" title="Parar"><svg width="11" height="11" viewBox="0 0 11 11" fill="none" style="margin-right:4px"><rect x="2" y="2" width="7" height="7" rx="1" fill="currentColor"/></svg>Parar</button>` : (podeCron ? `<button class="btn btn-ghost btn-sm" onclick="iniciarCronometro('${t.id}','${esc(t.nome)}')" style="color:var(--green)" title="Iniciar"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="margin-right:4px"><path d="M4 2.5l5 3.5-5 3.5v-7z" fill="currentColor"/></svg>Cronômetro</button>` : '')}
            </div>
          </div>
        </div>`;
      }).join('') || `<div style="text-align:center;color:var(--text-muted);padding:24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r2)"><div style="font-style:italic">Nenhuma tarefa ainda.</div><div style="font-size:var(--fs-080);margin-top:8px;color:var(--text-secondary)">Comece por uma tarefa principal, com prioridade e prazo.</div>${!projetoArquivado ? `<button class="btn btn-sm btn-primary" style="margin-top:10px" onclick="modalNovaTarefa('${PROJETO?.id}')">+ Criar primeira tarefa</button>` : ''}</div>`}
    </div>
    </div>`;
}

export function ordenarLista(col) {
  if (LISTA_SORT.col === col) {
    setListaSort({ col, dir: LISTA_SORT.dir === 'asc' ? 'desc' : 'asc' });
  } else {
    setListaSort({ col, dir: 'asc' });
  }
  const el = document.getElementById('tarefas-view-container') || document.getElementById('aba');
  if (el) renderListaInterna(el, TAREFAS);
}

export function renderMapa(el, tarefas) {
  const pendentes = [...tarefas.filter(t => t.status !== 'Concluída' && t.status !== 'Bloqueada')]
    .sort((a, b) => {
      const p = (PO[a.prioridade]??1) - (PO[b.prioridade]??1);
      if (p) return p;
      const d = (DO[a.complexidade]??1) - (DO[b.complexidade]??1);
      if (d) return d;
      const da = a.data || '9999-99-99';
      const db = b.data || '9999-99-99';
      return da.localeCompare(db);
    });

  if (!pendentes.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M8 12.5l2.6 2.6L16.5 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="empty-text">Todas as tarefas concluídas</div></div>`;
    return;
  }

  const bloqueadas = tarefas.filter(t => t.status === 'Bloqueada');
  el.innerHTML = `
    <div class="task-view-surface">
      <div class="task-view-head">
        <div>
          <div class="task-view-eyebrow">Mapa de foco</div>
          <div class="task-view-title">${pendentes.length} prioridade${pendentes.length !== 1 ? 's' : ''} em sequência</div>
          <div class="task-view-copy">Ordenado por prioridade, complexidade e prazo. A tarefa #01 é o melhor ponto de partida.</div>
        </div>
        <div class="task-view-kpi">${bloqueadas.length} bloqueada${bloqueadas.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="mapa-intro">Use esta fila para decidir a próxima tarefa a iniciar sem perder contexto.</div>
      ${bloqueadas.length ? `
        <div class="task-view-surface" style="padding:12px 14px;background:rgba(231,68,68,.06);border-color:rgba(231,68,68,.2);box-shadow:none">
          <div class="task-view-eyebrow" style="color:var(--red)">Bloqueadas</div>
          <div class="task-view-copy" style="color:var(--red)">Não iniciar agora:</div>
          <div class="task-status-strip">
            ${bloqueadas.map(t => `<span class="tag tag-red">${esc(t.nome)}</span>`).join('')}
          </div>
        </div>` : ''}
      <div class="mapa-list">
        ${pendentes.map((t, i) => {
          const minha = t.dono_id === EU?.id;
          const podeCron = minha || (t.colaboradores_ids||[]).includes(EU?.id) || isAdmin();
          const sessaoAtiva = Object.entries(TIMERS).find(([,timer]) => timer.tarefaId === t.id)?.[0];
          const diasT = diasRestantes(t.data || null);
          const urgt = diasT !== null && diasT <= 2;

          const cronHtml = sessaoAtiva
            ? `<button class="btn btn-danger btn-sm"
                       onclick="pararCronometro('${sessaoAtiva}');event.stopPropagation()"
                       style="flex-shrink:0">
                 <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="margin-right:3px">
                   <rect x="1.5" y="1.5" width="7" height="7" rx="1" fill="currentColor"/>
                 </svg>Parar
               </button>`
            : podeCron
              ? `<button class="btn btn-ghost btn-sm"
                         onclick="iniciarCronometro('${t.id}','${esc(t.nome)}');event.stopPropagation()"
                         style="color:var(--green);flex-shrink:0">
                   <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="margin-right:3px">
                     <path d="M3 1.5l5 3.5-5 3.5v-7z" fill="currentColor"/>
                   </svg>Iniciar
                 </button>`
              : '';

          return `
          <div class="mapa-item ${t.foco&&minha?'is-foco':''}">
            <div class="mapa-rank">${String(i+1).padStart(2,'0')}</div>
            <div class="mapa-body">
              <div class="mapa-nome">${esc(t.nome)}</div>
              <div class="mapa-sub">${esc(t.dono_nome || 'Sem responsável')}</div>
            </div>
            <div class="mapa-tags">
              ${tag(t.prioridade, PT[t.prioridade])}
              ${tag(t.complexidade, DT[t.complexidade])}
              ${t.foco&&minha ? '<span class="tag tag-purple">Meu foco</span>' : ''}
              ${urgt ? `<span class="tag ${diasT<=0?'tag-red':'tag-yellow'} mono" style="font-size:var(--fs-xs)">
                          ${diasT<=0?'vencida':diasT+'d'}
                        </span>` : ''}
              ${cronHtml}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

export async function renderRelatorio(el, tarefas) {
  const projetoId = PROJETO?.id;

  let resumoMap;
  if (RELATORIO_CACHE && RELATORIO_CACHE.projetoId === projetoId && (Date.now() - RELATORIO_CACHE.ts) < 60000) {
    resumoMap = RELATORIO_CACHE.resumoMap;
  } else {
    el.innerHTML = `<div class="loading"><div class="spinner"></div> Calculando horas...</div>`;
    const byTarefa = await req('GET', `/projetos/${projetoId}/relatorio`);
    resumoMap = byTarefa;
    setRelatorioCache({ projetoId, ts: Date.now(), resumoMap });
  }

  const grupos = {};
  tarefas.forEach(t => { (grupos[t.status] = grupos[t.status]||[]).push(t); });
  const grpOrder = ['Em andamento','Bloqueada','A fazer','Concluída'];

  function horasItem(tarefaId) {
    const resumo = resumoMap[tarefaId] || [];
    if (!resumo.length) return '';
    const total = resumo.reduce((s,r) => s + (parseFloat(r.horas_liquidas)||0), 0);
    const detalhe = resumo.length > 1
      ? resumo.map(r => `<span class="text-xxs text-muted">${esc(r.usuario_nome)}: ${fmtHoras(parseFloat(r.horas_liquidas||0))}</span>`).join(' · ')
      : '';
    return `<div style="text-align:right">
      <div class="rel-horas">${fmtHoras(total)}</div>
      ${detalhe ? `<div class="inline-detail-row">${detalhe}</div>` : ''}
    </div>`;
  }

  let html = '';
  grpOrder.forEach(s => {
    if (!grupos[s]?.length) return;
    const lista = grupos[s];
    const totalGrupo = lista.reduce((sum, t) => {
      const r = resumoMap[t.id] || [];
      return sum + r.reduce((s2,r2) => s2 + (parseFloat(r2.horas_liquidas)||0), 0);
    }, 0);
    html += `<div class="rel-group">
      <div class="rel-group-header">
        <div class="rel-group-title">${tag(s)} <span>${lista.length}</span></div>
        ${totalGrupo > 0 ? `<div class="rel-group-total">${fmtHoras(totalGrupo)}</div>` : ''}
      </div>
      ${lista.map(t => `
        <div class="rel-item" style="cursor:pointer"
             onclick="expandirSessoes('${t.id}')"
             title="Ver detalhes de tempo desta tarefa">
          <div class="rel-nome">${esc(t.nome)}</div>
          <div class="resp-chip">${avatar(t.dono_nome,'avatar-sm')}</div>
          ${horasItem(t.id)}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="color:var(--text-muted);flex-shrink:0">
            <path d="M4.5 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>`).join('')}
    </div>`;
  });

  const exportBtn = PROJETO?.id && Object.values(resumoMap).some(r => r.length > 0)
    ? `<button class="btn btn-sm" onclick="exportarTempoProjetoCSV('${PROJETO.id}')">
         ↓ Exportar CSV
       </button>`
    : '';
  const totalHorasProjeto = Object.values(resumoMap).reduce((sum, lista) =>
    sum + (lista || []).reduce((acc, item) => acc + (parseFloat(item.horas_liquidas) || 0), 0)
  , 0);

  el.innerHTML = `
    <div class="task-view-surface report-surface">
      <div class="task-view-head">
        <div>
          <div class="task-view-eyebrow">Relatório do projeto</div>
          <div class="task-view-title">${tarefas.length} tarefa${tarefas.length !== 1 ? 's' : ''}</div>
          <div class="task-view-copy">Tempo registrado por status e por tarefa.</div>
        </div>
        ${exportBtn || `<div class="task-view-kpi">${fmtHoras(totalHorasProjeto)}</div>`}
      </div>
      ${html || `<div class="empty-state"><div class="empty-icon" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><rect x="7" y="4" width="10" height="15" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M10 4.5h4M10 9h4M10 12h4M10 15h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div><div class="empty-text">Nenhuma tarefa</div></div>`}
    </div>`;
}

export function renderDecisoes(projetoId, decisoes, canEdit) {
  const el = document.getElementById('decisoes-sec');
  if (!el) return;
  el.innerHTML = `
    <div class="decisoes-shell">
    <div class="decisoes-sep"></div>
    <div class="decisoes-header">
      <div>
        <div class="section-kicker">Registro do projeto</div>
        <div class="decisoes-title">Decisões e referências</div>
      </div>
      ${canEdit ? `<button class="btn btn-sm" onclick="modalNovaDecisao('${projetoId}')">+ Adicionar</button>` : ''}
    </div>
    ${decisoes.length ? decisoes.map(d => `
      <div class="decisao-item">
        <div class="decisao-data">${d.data||''}</div>
        <div class="decisao-corpo">
          <div class="decisao-texto">${esc(d.descricao)}</div>
          <div class="decisao-autor">${avatar(d.dono_nome,'avatar-sm')} ${esc(d.dono_nome||'—')}</div>
        </div>
        ${(souDono(d.dono_id)||canEdit) ? `<div style="display:flex;gap:4px;flex-shrink:0"><button class="decisao-del" onclick="modalEditarDecisao('${d.id}','${projetoId}',\`${d.descricao.replace(/`/g,'&#96;')}\`,'${d.data||''}')" title="Editar" style="color:var(--text-secondary)"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button><button class="decisao-del" onclick="deletarDecisao('${d.id}','${projetoId}')" title="Excluir"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></div>` : ''}
      </div>`).join('')
    : `<div class="decisoes-empty">Nenhuma decisão registrada ainda.</div>`}
    </div>`;
}

export async function mudarStatus(tarefaId, novoStatus, selEl) {
  const statusAnterior = TAREFAS.find(t => t.id === tarefaId)?.status;
  if (selEl) { selEl.disabled = true; selEl.style.opacity = '0.5'; }
  try {
    await req('PATCH', `/tarefas/${tarefaId}`, { status: novoStatus });
    setTarefas(TAREFAS.map(t => t.id === tarefaId ? { ...t, status: novoStatus } : t));
    setRelatorioCache(null);
    toast('Status atualizado');
    if (PROJETO) {
      const conc = TAREFAS.filter(t => t.status === 'Concluída').length;
      const pct = TAREFAS.length ? Math.round(conc / TAREFAS.length * 100) : 0;
      const fill = document.querySelector('.proj-prog-fill');
      const txt = document.querySelector('.proj-prog-text');
      if (fill) { fill.style.width = pct + '%'; fill.className = 'proj-prog-fill ' + (pct===100?'done':'partial'); }
      if (txt) txt.textContent = `${conc}/${TAREFAS.length} concluídas · ${pct}%`;
    }
  } catch (e) {
    toast(e.message, 'err');
    if (selEl && statusAnterior) selEl.value = statusAnterior;
  } finally {
    if (selEl) { selEl.disabled = false; selEl.style.opacity = ''; }
  }
}

export async function toggleFoco(id, focoAtual) {
  try {
    focoAtual ? await req('DELETE', `/tarefas/${id}/foco`) : await req('PUT', `/tarefas/${id}/foco`);
    await _recarregarProjeto();
  } catch (e) { toast(e.message, 'err'); }
}

export async function deletarTarefa(id) {
  confirmar('Excluir esta tarefa? Esta ação não pode ser desfeita.', async () => {
    try { await req('DELETE', `/tarefas/${id}`); toast('Tarefa excluída'); await _recarregarProjeto(); }
    catch (e) { toast(e.message, 'err'); }
  }, { titulo: 'Excluir tarefa', btnTexto: 'Excluir', danger: true });
}

export function modalEditarDecisao(id, projetoId, descricaoAtual, dataAtual) {
  abrirModal(`
    <h2>Editar decisão</h2>
    <div class="form-row"><label>Data</label><input type="date" id="m-dec-data" value="${dataAtual}"></div>
    <div class="form-row"><label>Descrição</label><textarea id="m-dec-desc" rows="4" style="width:100%;resize:vertical">${esc(descricaoAtual)}</textarea></div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-dec" onclick="salvarDecisaoEditada('${id}','${projetoId}')">Salvar</button>
    </div>`);
}

export async function salvarDecisaoEditada(id, projetoId) {
  const descricao = document.getElementById('m-dec-desc').value.trim();
  const data = document.getElementById('m-dec-data').value;
  if (!descricao) { toast('Descrição obrigatória', 'err'); return; }
  btnLoading('btn-salvar-dec', true);
  try {
    await req('PUT', `/decisoes/${id}`, { descricao, data });
    fecharModal();
    toast('Decisão atualizada');
    const decisoes = await req('GET', `/projetos/${projetoId}/decisoes`);
    renderDecisoes(projetoId, decisoes, podeEditar(PROJETO));
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-salvar-dec', false); }
}

export async function deletarDecisao(id, projetoId) {
  confirmar('Excluir esta decisão? Esta ação não pode ser desfeita.', async () => {
    try {
      await req('DELETE', `/decisoes/${id}`);
      const decisoes = await req('GET', `/projetos/${projetoId}/decisoes`);
      renderDecisoes(projetoId, decisoes, podeEditar(PROJETO));
      toast('Excluído');
    } catch (e) { toast(e.message, 'err'); }
  }, { titulo: 'Excluir decisão', btnTexto: 'Excluir', danger: true });
}

export async function modalPermissoes(projetoId) {
  if (!USUARIOS.length) setUsuarios(await req('GET', '/usuarios'));
  const proj = PROJETO?.id === projetoId ? PROJETO : await req('GET', `/projetos/${projetoId}`);
  const editores = [...(proj.editores || [])].sort((a, b) => {
    if ((a.origem || 'manual') === (b.origem || 'manual')) return (a.nome || '').localeCompare(b.nome || '');
    return (a.origem || 'manual') === 'manual' ? -1 : 1;
  });
  const editIds = editores.map(e => e.usuario_id);
  const disponiveis = USUARIOS.filter(u => u.id !== proj.dono_id && !editIds.includes(u.id));

  const editorRows = editores.map(e => `
    <div class="editor-row">
      <div class="editor-info">${avatar(e.nome)} ${esc(e.nome)} <span class="inline-user-handle">@${esc(e.usuario_login)}</span> ${e.origem === 'grupo' ? tag('Herdado do grupo', 'tag-gray', 'Acesso vindo do grupo do projeto') : tag('Manual', 'tag-cyan', 'Acesso dado diretamente no projeto')}</div>
      ${e.origem === 'grupo'
        ? `<span class="inline-muted-sm">Remova no grupo para revogar</span>`
        : `<button class="editor-del" onclick="removerPerm('${projetoId}','${e.usuario_id}')" title="Remover"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`}
    </div>`).join('') || `<div class="inline-muted-sm">Nenhum colaborador adicionado</div>`;

  abrirModal(`
    <h2>Colaboradores do projeto</h2>
    <p class="modal-copy">Acesso manual vale só neste projeto. Acesso herdado vem do grupo atual e deve ser gerenciado na janela do grupo.</p>
    <div class="form-row"><label>Colaboradores com acesso</label><div class="editor-list">${editorRows}</div></div>
    ${disponiveis.length ? `
    <div class="form-sep"></div>
    <div class="form-row"><label>Adicionar colaborador (usuários registrados)</label>
      <div style="display:flex;gap:8px">
        <select id="m-editor" style="flex:1">${disponiveis.map(u=>`<option value="${u.id}">${esc(u.nome)} (@${esc(u.usuario_login)})</option>`).join('')}</select>
        <button class="btn btn-sm btn-primary" id="btn-add-perm" onclick="adicionarPerm('${projetoId}')">Adicionar</button>
      </div>
    </div>` : `<div class="inline-muted-sm" style="margin-top:8px">Todos os usuários cadastrados já foram adicionados.</div>`}
    <div class="modal-footer"><button class="btn" onclick="fecharModal()">Fechar</button></div>`, { lg: true });
}

export async function adicionarPerm(projetoId) {
  const uid = gv('m-editor');
  if (!uid) return;
  btnLoading('btn-add-perm', true);
  try {
    await req('POST', `/projetos/${projetoId}/permissoes`, { usuario_id: uid });
    toast('Colaborador adicionado ao projeto');
    fecharModal();
    if (PROJETO?.id === projetoId) {
      const { setProjeto } = await import('./state.js');
      setProjeto(await req('GET', `/projetos/${projetoId}`));
    }
    modalPermissoes(projetoId);
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-add-perm', false); }
}

export async function removerPerm(projetoId, usuarioId) {
  confirmar('Remover este colaborador do projeto? Ele perderá o acesso de edição.', async () => {
    try {
      await req('DELETE', `/projetos/${projetoId}/permissoes/${usuarioId}`);
      toast('Colaborador removido do projeto');
      fecharModal();
      if (PROJETO?.id === projetoId) {
        const { setProjeto } = await import('./state.js');
        setProjeto(await req('GET', `/projetos/${projetoId}`));
      }
      modalPermissoes(projetoId);
    } catch (e) { toast(e.message, 'err'); }
  }, { titulo: 'Remover colaborador', btnTexto: 'Remover', danger: true });
}

export async function modalNovaTarefa(projetoId) {
  abrirModal(`
    <h2>Nova tarefa</h2>
    <div class="modal-hint">Esta janela altera apenas a tarefa.</div>
    <div class="modal-section">
      <div class="modal-section-title">Detalhes da tarefa</div>
      <div class="form-row"><label>Título da tarefa</label><input id="m-nome" placeholder="Ex: Detalhar corte da escada"></div>
      <div class="form-row" style="margin-bottom:0"><label>Descrição detalhada</label><textarea id="m-desc" placeholder="Contexto e orientações para execução"></textarea></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Planejamento</div>
      <div class="form-grid">
        <div class="form-row"><label>Status</label>${sel('m-status',STATUS_TAR,'A fazer')}</div>
        <div class="form-row"><label>Prioridade</label>${sel('m-prior',PRIORS,'Média')}</div>
        <div class="form-row"><label>Complexidade</label>${sel('m-dific',DIFS,'Moderada')}<div class="field-hint">Use a mesma escala da prioridade: Simples (baixa), Moderada (média), Complexa (alta).</div></div>
        <div class="form-row"><label>Prazo da tarefa</label><input type="date" id="m-data" oninput="atualizarPrazoHint()"><div id="m-data-hint" class="prazo-hint"></div></div>
      </div>
    </div>
    <div class="modal-footer modal-footer-sticky">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-criar-tar" onclick="criarTarefa('${projetoId}')">Criar tarefa</button>
    </div>`);
  atualizarPrazoHint();
}

export async function criarTarefa(projetoId) {
  const nome = gv('m-nome').trim();
  if (!nome) { toast('Nome obrigatório', 'err'); return; }
  btnLoading('btn-criar-tar', true);
  try {
    await req('POST', `/projetos/${projetoId}/tarefas`, {
      nome,
      status: gv('m-status'),
      prioridade: gv('m-prior'),
      complexidade: gv('m-dific'),
      data: gv('m-data')||null,
      descricao: gv('m-desc') || null,
    });
    fecharModal(); toast('Tarefa criada'); await _recarregarProjeto('lista');
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-criar-tar', false); }
}

export async function modalEditarTarefa(id) {
  const t = TAREFAS.find(t => t.id === id);
  if (!t) return;
  abrirModal(`
    <h2>Editar tarefa</h2>
    <div class="modal-hint">Esta janela altera apenas a tarefa.</div>
    <div class="modal-section">
      <div class="modal-section-title">Detalhes da tarefa</div>
      <div class="form-row"><label>Título da tarefa</label><input id="m-nome" value="${esc(t.nome)}"></div>
      <div class="form-row" style="margin-bottom:0"><label>Descrição detalhada</label><textarea id="m-desc">${esc(t.descricao || '')}</textarea></div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Planejamento</div>
      <div class="form-grid">
        <div class="form-row"><label>Status</label>${sel('m-status',STATUS_TAR,t.status)}</div>
        <div class="form-row"><label>Prioridade</label>${sel('m-prior',PRIORS,t.prioridade)}</div>
        <div class="form-row"><label>Complexidade</label>${sel('m-dific',DIFS,t.complexidade||t.dificuldade)}<div class="field-hint">Use a mesma escala da prioridade: Simples (baixa), Moderada (média), Complexa (alta).</div></div>
        <div class="form-row"><label>Prazo da tarefa</label><input type="date" id="m-data" value="${t.data||''}" oninput="atualizarPrazoHint()"><div id="m-data-hint" class="prazo-hint"></div></div>
      </div>
    </div>
    <div class="modal-footer modal-footer-sticky">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-tar" onclick="salvarTarefa('${id}')">Salvar</button>
    </div>`);
  atualizarPrazoHint();
}

export async function salvarTarefa(id) {
  const nome = gv('m-nome').trim();
  if (!nome) { toast('Nome obrigatório', 'err'); return; }
  btnLoading('btn-salvar-tar', true);
  try {
    await req('PUT', `/tarefas/${id}`, {
      nome,
      status: gv('m-status'),
      prioridade: gv('m-prior'),
      complexidade: gv('m-dific'),
      data: gv('m-data')||null,
      descricao: gv('m-desc') || null,
    });
    fecharModal(); toast('Tarefa atualizada'); await _recarregarProjeto();
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-salvar-tar', false); }
}

export async function duplicarTarefa(id) {
  try {
    await req('POST', `/tarefas/${id}/duplicar`, {});
    toast('Tarefa duplicada');
    await _recarregarProjeto('lista');
  } catch (e) {
    toast(e.message, 'err');
  }
}

export function quickAddMostrarStep2() {
  const wrap = document.getElementById('quick-add-step2');
  if (wrap) wrap.style.display = 'flex';
  const selEl = document.getElementById('qa-prioridade');
  if (selEl) selEl.focus();
}

export function quickAddCancelar() {
  _quickAddNome = '';
  _quickAddStep = 0;
  const input = document.getElementById('quick-add-input');
  if (input) { input.value = ''; input.disabled = false; input.focus(); }
  const wrap = document.getElementById('quick-add-step2');
  if (wrap) wrap.style.display = 'none';
}

export async function quickAddConfirmar(projetoId) {
  const prioridade = document.getElementById('qa-prioridade')?.value || 'Média';
  const complexidade = document.getElementById('qa-complexidade')?.value || 'Moderada';
  const input = document.getElementById('quick-add-input');
  input.disabled = true;
  try {
    await req('POST', `/projetos/${projetoId}/tarefas`, {
      nome: _quickAddNome,
      status: 'A fazer',
      prioridade,
      dificuldade: complexidade,
    });
    quickAddCancelar();
    toast('Tarefa criada');
    await _recarregarProjeto('lista');
  } catch (err) {
    toast(err.message, 'err');
    input.disabled = false;
    input.focus();
  }
}

export async function quickAddTarefa(e, projetoId) {
  e.preventDefault();
  const input = document.getElementById('quick-add-input');
  const nome = input?.value.trim();
  if (!nome || !projetoId) return;
  _quickAddNome = nome;
  input.disabled = true;
  quickAddMostrarStep2();
}

export function filtrarTarefasBusca(value) {
  clearTimeout(_buscaTarefaTick);
  _buscaTarefaTick = setTimeout(() => {
    setBuscaTarefa(value);
    renderAbaTarefas(document.getElementById('aba'), TAREFAS);
  }, 180);
}

export async function exportarTempoProjetoCSV(projetoId) {
  try {
    toast('Gerando CSV...');
    const projetoNome = PROJETO?.nome || 'projeto';
    const tarefas = await req('GET', `/projetos/${projetoId}/tarefas`);
    const linhas = [['Tarefa','Origem','Início','Fim','Horas líquidas','Intervalos']];
    for (const t of tarefas) {
      const sessoes = await req('GET', `/tarefas/${t.id}/tempo`);
      for (const s of sessoes) {
        const intervalosStr = (s.intervalos || [])
          .map(i => `${i.tipo}(${i.inicio}→${i.fim || 'aberto'})`).join('; ');
        linhas.push([
          csvEsc(t.nome), csvEsc(s.usuario_nome || ''),
          csvEsc(s.inicio || ''), csvEsc(s.fim || ''),
          String(s.horas_liquidas || 0), csvEsc(intervalosStr),
        ]);
      }
    }
    const csv = linhas.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telier_${projetoNome.replace(/\s+/g,'_')}_tempo.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exportado');
  } catch (err) { toast(err.message, 'err'); }
}

export async function modalColabsTarefa(tarefaId) {
  if (!USUARIOS.length) setUsuarios(await req('GET', '/usuarios'));
  const tarefa = TAREFAS.find(t => t.id === tarefaId);
  let colabs = [];
  try { colabs = await req('GET', `/tarefas/${tarefaId}/colaboradores`); } catch {}

  const colabIds = colabs.map(c => c.id);
  const podeGerenciar = tarefa?.dono_id === EU?.id || isAdmin();
  const souColab = colabIds.includes(EU?.id);
  const disponiveis = USUARIOS.filter(u => u.id !== tarefa?.dono_id && !colabIds.includes(u.id) && u.id !== EU?.id);

  const colabRows = colabs.map(c => `
    <div class="colab-row">
      <div class="colab-info">${avatar(c.nome)} <span>${esc(c.nome)}</span> <span class="inline-user-handle">@${esc(c.usuario_login)}</span></div>
      ${podeGerenciar ? `<button class="colab-del" onclick="removerColab('${tarefaId}','${c.id}')" title="Remover"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>` : ''}
    </div>`).join('') || `<div class="inline-muted-sm">Nenhum colaborador adicionado</div>`;

  abrirModal(`
    <h2>Colaboradores da tarefa</h2>
    <p class="modal-copy">Colaboradores podem iniciar o cronômetro nesta tarefa. Cada um vê apenas suas próprias sessões.</p>
    <div class="form-row"><label>Colaboradores atuais</label><div class="colab-list">${colabRows}</div></div>
    ${podeGerenciar && disponiveis.length ? `
    <div class="form-row"><label>Adicionar colaborador</label>
      <div style="display:flex;gap:8px">
        <select id="m-colab" style="flex:1">${disponiveis.map(u=>`<option value="${u.id}">${esc(u.nome)} (@${esc(u.usuario_login)})</option>`).join('')}</select>
        <button class="btn btn-sm btn-primary" id="btn-add-colab" onclick="adicionarColab('${tarefaId}')">Adicionar</button>
      </div>
    </div>` : podeGerenciar ? `<div class="inline-muted-sm" style="margin-top:8px">Todos os membros já são colaboradores.</div>` : ''}
    ${!podeGerenciar && souColab ? `<div class="form-row"><label>Saída voluntária</label><button class="btn btn-danger" onclick="sairTarefaCompartilhada('${tarefaId}','${esc(tarefa?.nome || 'Tarefa')}')">Sair desta tarefa</button></div>` : ''}
    <div class="modal-footer"><button class="btn" onclick="fecharModal()">Fechar</button></div>`, { lg: true });
}

export async function sairTarefaCompartilhada(tarefaId, nomeTarefa) {
  confirmar(`Sair da tarefa "${nomeTarefa}"? Você deixará de ser colaborador desta tarefa.`, async () => {
    try {
      await req('DELETE', `/tarefas/${tarefaId}/sair`);
      fecharModal();
      toast('Você saiu da tarefa');
      await _recarregarProjeto('lista');
    } catch (e) { toast(e.message,'err'); }
  }, { titulo: 'Sair da tarefa', btnTexto: 'Sair da tarefa', danger: true });
}

export async function adicionarColab(tarefaId) {
  const uid = gv('m-colab');
  if (!uid) return;
  btnLoading('btn-add-colab', true);
  try {
    await req('POST', `/tarefas/${tarefaId}/colaboradores`, { usuario_id: uid });
    toast('Colaborador adicionado');
    fecharModal();
    modalColabsTarefa(tarefaId);
  } catch (e) { toast(e.message,'err'); btnLoading('btn-add-colab', false); }
}

export async function removerColab(tarefaId, usuarioId) {
  confirmar('Remover este colaborador da tarefa? Ele não poderá mais iniciar o cronômetro nesta tarefa.', async () => {
    try {
      await req('DELETE', `/tarefas/${tarefaId}/colaboradores/${usuarioId}`);
      toast('Colaborador removido');
      fecharModal();
      modalColabsTarefa(tarefaId);
    } catch (e) { toast(e.message,'err'); }
  }, { titulo: 'Remover colaborador', btnTexto: 'Remover', danger: true });
}

export function modalNovaDecisao(projetoId) {
  abrirModal(`
    <h2>Nova decisão ou referência</h2>
    <div class="form-row"><label>Data</label><input type="date" id="m-data" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="form-row"><label>Descrição</label><textarea id="m-desc" placeholder="Decisão tomada, material definido, link de arquivo, norma técnica..."></textarea></div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-criar-dec" onclick="criarDecisao('${projetoId}')">Salvar</button>
    </div>`);
}

export async function criarDecisao(projetoId) {
  const desc = gv('m-desc').trim();
  if (!desc) { toast('Descrição obrigatória', 'err'); return; }
  btnLoading('btn-criar-dec', true);
  try {
    await req('POST', `/projetos/${projetoId}/decisoes`, { descricao: desc, data: gv('m-data') });
    fecharModal(); toast('Decisão registrada');
    const decisoes = await req('GET', `/projetos/${projetoId}/decisoes`);
    renderDecisoes(projetoId, decisoes, podeEditar(PROJETO));
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-criar-dec', false); }
}
