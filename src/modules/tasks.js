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
import { req, fetchProjetos, invalidarCacheProjetos } from './api.js';
import { toast, abrirModal, fecharModal, confirmar, btnLoading, setBreadcrumb } from './ui.js';
import {
  esc, gv, sel, avatar, iniciais, tag, metaPair, prazoFmt, diasRestantes,
  fmtDuracao, fmtHoras, isAdmin, podeEditar, souDono, tarefaCompartilhadaComigo,
  filtrarColecaoTarefas, normalizarColaboradoresTarefas,
  normalizarStatusProjeto, ST, PT, DT, PO, DO, csvEsc,
} from './utils.js';
import { expandirSessoes, renderTimerActions } from './timer.js';

const FASES = ['Estudo preliminar','Anteprojeto','Projeto básico','Projeto executivo','Em obra'];
const STATUS_PROJ = ['A fazer','Em andamento','Em revisão','Pausado','Concluído','Arquivado'];
const STATUS_TAR = ['A fazer','Em andamento','Bloqueada','Concluída'];
const PRIORS = ['Alta','Média','Baixa'];
const DIFS = ['Simples','Moderada','Complexa'];
const FOCUS_ICON_FILLED = '<svg class="btn-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.3l2.7 5.46 6.03.88-4.36 4.25 1.03 6.01L12 17.1l-5.4 2.84 1.03-6.01L3.27 9.64l6.03-.88L12 3.3z"/></svg>';
const FOCUS_ICON_OUTLINE = '<svg class="btn-icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.3l2.7 5.46 6.03.88-4.36 4.25 1.03 6.01L12 17.1l-5.4 2.84 1.03-6.01L3.27 9.64l6.03-.88L12 3.3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';

let _quickAddNome = '';
let _quickAddStep = 0;
let _buscaTarefaTick;
const TASKS_HOME_FILTERS_KEY = 'telier_tasks_home_filters';
let _myTasksFilters = {
  busca: '',
  origem: 'todos',
  status: 'todos',
  projeto: '',
};
let _taskContextOrigin = null;

function sanitizeTasksHomeFilters(raw = {}) {
  return {
    busca: typeof raw.busca === 'string' ? raw.busca.slice(0, 120) : '',
    origem: ['todos', 'meus', 'compartilhadas'].includes(raw.origem) ? raw.origem : 'todos',
    status: ['todos', 'A fazer', 'Em andamento', 'Bloqueada', 'Concluída'].includes(raw.status) ? raw.status : 'todos',
    projeto: typeof raw.projeto === 'string' ? raw.projeto : '',
  };
}

function loadTasksHomeFilters() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(TASKS_HOME_FILTERS_KEY) || '{}');
    _myTasksFilters = sanitizeTasksHomeFilters(raw);
  } catch {
    _myTasksFilters = sanitizeTasksHomeFilters({});
  }
}

function saveTasksHomeFilters() {
  sessionStorage.setItem(TASKS_HOME_FILTERS_KEY, JSON.stringify(_myTasksFilters));
}

function updateTasksHomeFilters(patch = {}) {
  _myTasksFilters = sanitizeTasksHomeFilters({ ..._myTasksFilters, ...patch });
  saveTasksHomeFilters();
}

function projectTaskUiStateKey(projectId) {
  return `telier_project_task_state_${projectId}`;
}

function persistProjectTaskUiState(projectId = PROJETO?.id) {
  if (!projectId) return;
  try {
    localStorage.setItem(projectTaskUiStateKey(projectId), JSON.stringify({
      busca: BUSCA_TAREFA,
      origem: FILTRO_ORIGEM_TAREFAS,
      status: FILTRO_STATUS_TAREFA,
      responsavel: FILTRO_RESP_TAR,
      sort: LISTA_SORT,
      concluidasExpandida: LISTA_CONCLUIDAS_EXPANDIDA,
    }));
  } catch {}
}

export function restaurarEstadoTarefasProjeto(projectId) {
  const defaults = {
    busca: '',
    origem: 'todos',
    status: 'todos',
    responsavel: '',
    sort: { col: null, dir: 'asc' },
    concluidasExpandida: false,
  };
  let state = defaults;
  if (projectId) {
    try {
      const raw = localStorage.getItem(projectTaskUiStateKey(projectId));
      if (raw) {
        const parsed = JSON.parse(raw);
        state = {
          busca: typeof parsed?.busca === 'string' ? parsed.busca : defaults.busca,
          origem: ['todos', 'meus', 'compartilhadas'].includes(parsed?.origem) ? parsed.origem : defaults.origem,
          status: ['todos', 'A fazer', 'Em andamento', 'Bloqueada', 'Concluída'].includes(parsed?.status) ? parsed.status : defaults.status,
          responsavel: typeof parsed?.responsavel === 'string' ? parsed.responsavel : defaults.responsavel,
          sort: parsed?.sort && typeof parsed.sort === 'object'
            ? {
                col: ['nome', 'prioridade', 'complexidade', 'data'].includes(parsed.sort.col) ? parsed.sort.col : null,
                dir: parsed.sort.dir === 'desc' ? 'desc' : 'asc',
              }
            : defaults.sort,
          concluidasExpandida: parsed?.concluidasExpandida === true,
        };
      }
    } catch {}
  }
  setBuscaTarefa(state.busca);
  setFiltroOrigemTarefas(state.origem);
  setFiltroStatusTarefa(state.status);
  setFiltroRespTar(state.responsavel);
  setListaSort(state.sort);
  setListaConcluidasExpandida(state.concluidasExpandida);
  setTaskMobileFiltersOpen(false);
}

async function _recarregarProjeto(aba) {
  const { recarregarProjeto } = await import('./project.js');
  return recarregarProjeto(aba);
}

function filtrarTarefasTransversais(tarefas) {
  let lista = [...(tarefas || [])];
  if (_myTasksFilters.origem === 'meus') lista = lista.filter(t => t.dono_id === EU?.id);
  else if (_myTasksFilters.origem === 'compartilhadas') lista = lista.filter(t => tarefaCompartilhadaComigo(t));
  if (_myTasksFilters.status !== 'todos') lista = lista.filter(t => t.status === _myTasksFilters.status);
  if (_myTasksFilters.projeto) lista = lista.filter(t => String(t.projeto_id) === String(_myTasksFilters.projeto));
  if (_myTasksFilters.busca) {
    const busca = _myTasksFilters.busca.toLowerCase();
    lista = lista.filter(t =>
      (t.nome || '').toLowerCase().includes(busca) ||
      (t.projeto_nome || '').toLowerCase().includes(busca) ||
      (t.grupo_nome || '').toLowerCase().includes(busca)
    );
  }
  return lista;
}

export async function carregarTarefasUsuarioAtivas() {
  const projetos = await fetchProjetos(new URLSearchParams());
  const projetosAtivos = (projetos || []).filter(p => normalizarStatusProjeto(p.status) !== 'Arquivado');
  const tarefasPorProjeto = await Promise.all(projetosAtivos.map(async projeto => {
    const tarefas = await req('GET', `/projetos/${projeto.id}/tarefas`).catch(() => []);
    return normalizarColaboradoresTarefas(tarefas).map(t => ({
      ...t,
      projeto_id: t.projeto_id || projeto.id,
      projeto_nome: t.projeto_nome || projeto.nome,
      grupo_id: projeto.grupo_id || null,
      grupo_nome: projeto.grupo_nome || '',
      projeto_status: projeto.status,
    }));
  }));
  const tarefas = tarefasPorProjeto.flat().filter(t => t.status !== 'Concluída' || tarefaCompartilhadaComigo(t) || t.dono_id === EU?.id);
  return {
    tarefas,
    projetosFiltro: [...new Map(tarefas.map(t => [t.projeto_id, { id: t.projeto_id, nome: t.projeto_nome }])).values()],
  };
}

export function renderTaskOpsList(tarefas = [], opts = {}) {
  const timerAtivoPorTarefa = {};
  Object.entries(TIMERS).forEach(([sid, timer]) => { timerAtivoPorTarefa[timer.tarefaId] = sid; });
  const emptyMessage = opts.emptyMessage || 'Nenhuma tarefa encontrada.';
  const rows = tarefas.map(t => {
    const minha = t.dono_id === EU?.id;
    const podeCron = minha || (t.colaboradores_ids || []).includes(EU?.id) || isAdmin();
    const sessaoAtiva = timerAtivoPorTarefa[t.id] || t.sessao_ativa_id || null;
    const prazoHoje = t.data ? prazoFmt(t.data, true) : '—';
    return `
      <article class="ops-row">
        <div class="ops-row-main">
          <div class="ops-row-title ${t.status === 'Concluída' ? 'concluida' : ''}">${esc(t.nome || t.tarefa_nome || 'Tarefa sem nome')}</div>
          <div class="ops-row-context">${esc(t.projeto_nome || '—')}${t.grupo_nome ? ` · ${esc(t.grupo_nome)}` : ''}</div>
        </div>
        <div class="ops-row-meta">
          ${metaPair('Status', t.status || '—', t.status === 'Bloqueada' ? 'is-alert' : 'is-muted')}
          ${metaPair('Prazo', prazoHoje, t.data && diasRestantes(t.data) <= 0 ? 'is-alert' : 'is-muted')}
          ${t.prioridade ? metaPair('Prioridade', t.prioridade, t.prioridade === 'Alta' ? 'is-warn' : 'is-muted') : ''}
          ${t.complexidade ? metaPair('Complexidade', t.complexidade, 'is-muted') : ''}
        </div>
        <div class="ops-row-actions">
          ${renderTimerActions({
            tarefaId: t.id || t.tarefa_id,
            tarefaNome: t.nome || t.tarefa_nome || 'Tarefa',
            projetoId: t.projeto_id,
            size: 'sm',
            iconOnly: true,
            showOpenTask: true,
            showHistory: false,
            showInterval: false,
            allowStart: podeCron,
          })}
        </div>
      </article>`;
  }).join('');
  return `<div class="ops-list">${rows || `<div class="table-empty-row">${emptyMessage}</div>`}</div>`;
}

export function renderTaskOperationalSurface(opts = {}) {
  const {
    mode = 'expanded',
    kicker = '',
    title = '',
    description = '',
    actionsHtml = '',
    metricsHtml = '',
    overviewHtml = '',
    filtersHtml = '',
    listEyebrow = 'Fila operacional',
    listTitle = 'Lista operacional',
    listCopy = '',
    listKpi = '',
    tarefas = [],
    emptyMessage = 'Nenhuma tarefa encontrada.',
  } = opts;

  const layoutClass = mode === 'today' ? 'task-ops-surface task-ops-surface--today' : 'task-ops-surface task-ops-surface--expanded';

  return `
    <section class="${layoutClass}">
      <header class="task-ops-header">
        <div class="task-ops-header__main">
          ${kicker ? `<div class="section-kicker">${kicker}</div>` : ''}
          ${title ? `<h1 class="dash-title">${esc(title)}</h1>` : ''}
          ${description ? `<p class="dash-sub dash-sub-tight">${esc(description)}</p>` : ''}
        </div>
        ${actionsHtml ? `<div class="task-ops-header__actions">${actionsHtml}</div>` : ''}
      </header>
      ${metricsHtml ? `<div class="task-ops-metrics">${metricsHtml}</div>` : ''}
      ${overviewHtml ? `<div class="task-ops-overview">${overviewHtml}</div>` : ''}
      ${filtersHtml ? filtersHtml : ''}
      <section class="task-view-surface task-ops-list-surface">
        <div class="task-view-head">
          <div>
            <div class="task-view-eyebrow">${esc(listEyebrow)}</div>
            <div class="task-view-title">${esc(listTitle)}</div>
            ${listCopy ? `<div class="task-view-copy">${esc(listCopy)}</div>` : ''}
          </div>
          ${listKpi ? `<div class="task-view-kpi">${listKpi}</div>` : ''}
        </div>
        ${renderTaskOpsList(tarefas, { emptyMessage })}
      </section>
    </section>`;
}

export async function abrirTarefaContexto(taskId, projectId, opts = {}) {
  if (!taskId || !projectId) return;
  if (!opts.fromRoute) {
    return window.goTask ? window.goTask(taskId, projectId) : null;
  }
  _taskContextOrigin = { taskId: String(taskId), projectId: String(projectId) };
  const { abrirProjeto } = await import('./project.js');
  const projetoJaAberto = String(PROJETO?.id || '') === String(projectId);
  if (!projetoJaAberto) {
    await abrirProjeto(projectId, { fromRoute: true });
  }
  if (opts.expandTime) expandirSessoes(taskId);
  else modalEditarTarefa(taskId);
}

export async function continuarUltimaTarefa() {
  try {
    const ativas = await req('GET', '/tempo/ativas').catch(() => []);
    const ativa = (ativas || [])[0];
    if (ativa?.tarefa_id && ativa?.projeto_id) {
      return abrirTarefaContexto(ativa.tarefa_id, ativa.projeto_id);
    }
    const ultima = await req('GET', '/tempo/ultima-sessao').catch(() => null);
    if (ultima?.tarefa_id && ultima?.projeto_id) {
      return abrirTarefaContexto(ultima.tarefa_id, ultima.projeto_id);
    }
    toast('Nenhuma tarefa recente para continuar', 'err');
  } catch (e) {
    toast(e.message, 'err');
  }
}

export async function renderTarefasHome(opts = {}) {
  if (!opts.fromRoute) {
    return window.goTasks ? window.goTasks() : null;
  }
  _taskContextOrigin = null;
  loadTasksHomeFilters();
  window.scrollTo(0, 0);
  document.title = 'Tarefas · Telier';
  setBreadcrumb([{ label: 'Tarefas' }]);
  const c = document.getElementById('content');
  c.innerHTML = `<div class="skeleton-list" aria-live="polite" aria-busy="true">
    <div class="skeleton-block">
      <div class="skeleton-line w-45"></div>
      <div class="skeleton-line w-80"></div>
      <div class="skeleton-line w-100"></div>
    </div>
    <div class="skeleton-block">
      <div class="skeleton-line w-30"></div>
      <div class="skeleton-line w-100"></div>
      <div class="skeleton-line w-60"></div>
    </div>
  </div>`;
  try {
    const [dadosTarefas, resumoHoje, recentes, ativas, focoGlobal, tarefasOperacao] = await Promise.all([
      carregarTarefasUsuarioAtivas(),
      req('GET', '/tempo/resumo-hoje').catch(() => null),
      req('GET', '/tempo/sessoes-recentes?limit=6').catch(() => []),
      req('GET', '/tempo/ativas').catch(() => []),
      req('GET', '/auth/foco-global').catch(() => null),
      req('GET', '/tarefas/operacao-hoje').catch(() => []),
    ]);
    const { tarefas, projetosFiltro } = dadosTarefas;
    const mapaTarefas = new Map();
    (tarefasOperacao || []).forEach(t => mapaTarefas.set(String(t.id || t.tarefa_id), t));
    (tarefas || []).forEach(t => {
      const key = String(t.id || t.tarefa_id);
      if (!mapaTarefas.has(key)) mapaTarefas.set(key, t);
    });
    const tarefasCompletas = Array.from(mapaTarefas.values());
    const tarefasFiltradas = filtrarTarefasTransversais(tarefasCompletas);
    const minhas = tarefasCompletas.filter(t => t.dono_id === EU?.id).length;
    const compartilhadas = tarefasCompletas.filter(t => tarefaCompartilhadaComigo(t)).length;

    const ativo = (ativas || [])[0] || null;
    const tarefaFoco = tarefasCompletas.find(t => t.foco) || null;
    const tarefaUrgente = tarefasCompletas
      .filter(t => {
        const dias = diasRestantes(t.data || null);
        return dias !== null && dias <= 1 && t.status !== 'Concluída';
      })
      .sort((a, b) => (a.data || '9999-12-31').localeCompare(b.data || '9999-12-31'))[0] || null;

    const prioridade = ativo
      ? {
          titulo: ativo.tarefa_nome || 'Tarefa ativa',
          projeto: ativo.projeto_nome || 'Projeto não informado',
          status: 'Em andamento',
          prazo: prazoFmt((tarefasCompletas.find(t => String(t.id) === String(ativo.tarefa_id))?.data) || null, true),
          tarefaId: ativo.tarefa_id,
          projetoId: ativo.projeto_id,
        }
      : (focoGlobal?.tarefa_id && focoGlobal?.projeto_id)
        ? {
            titulo: focoGlobal.tarefa_nome || 'Tarefa em foco',
            projeto: focoGlobal.projeto_nome || 'Projeto não informado',
            status: 'Em foco',
            prazo: prazoFmt((tarefasCompletas.find(t => String(t.id) === String(focoGlobal.tarefa_id))?.data) || null, true),
            tarefaId: focoGlobal.tarefa_id,
            projetoId: focoGlobal.projeto_id,
          }
        : tarefaFoco
          ? {
              titulo: tarefaFoco.nome,
              projeto: tarefaFoco.projeto_nome,
              status: tarefaFoco.status || 'Em foco',
              prazo: prazoFmt(tarefaFoco.data || null, true),
              tarefaId: tarefaFoco.id,
              projetoId: tarefaFoco.projeto_id,
            }
          : tarefaUrgente
            ? {
                titulo: tarefaUrgente.nome,
                projeto: tarefaUrgente.projeto_nome,
                status: tarefaUrgente.status || 'A fazer',
                prazo: prazoFmt(tarefaUrgente.data || null, true),
                tarefaId: tarefaUrgente.id,
                projetoId: tarefaUrgente.projeto_id,
              }
            : null;

    const retomadaMap = new Map();
    const registrarRetomada = (item) => {
      if (!item?.tarefaId || retomadaMap.has(item.tarefaId)) return;
      retomadaMap.set(item.tarefaId, item);
    };

    (recentes || []).forEach((s) => registrarRetomada({
      tarefaId: s.tarefa_id,
      projetoId: s.projeto_id,
      titulo: s.tarefa_nome,
      projeto: s.projeto_nome,
      tempo: fmtHoras(parseFloat(s.horas_liquidas ?? s.horas ?? 0)),
    }));

    tarefasCompletas
      .filter(t => t.status === 'Em andamento' || t.foco)
      .forEach((t) => registrarRetomada({
        tarefaId: t.id,
        projetoId: t.projeto_id,
        titulo: t.nome,
        projeto: t.projeto_nome,
        tempo: t.sessao_ativa_id ? 'Em curso' : (t.data ? `Prazo ${prazoFmt(t.data, true)}` : 'Sem tempo recente'),
      }));

    const retomadas = Array.from(retomadaMap.values()).slice(0, 5);
    const statusTabs = ['todos', 'A fazer', 'Em andamento', 'Bloqueada', 'Concluída'];
    const statusCountMap = Object.fromEntries(statusTabs.map(status => [
      status,
      status === 'todos' ? tarefasCompletas.length : tarefasCompletas.filter(t => t.status === status).length,
    ]));

    const filtersHtml = `<div class="dash-toolbar task-view-toolbar task-toolbar-studio">
        <div class="dash-toolbar-row dash-toolbar-primary">
          <div class="task-toolbar-main dash-toolbar-searchblock">
            <div class="dash-toolbar-label">Consulta</div>
            <input type="search" class="search-dash search-tarefa" placeholder="Buscar tarefa, projeto ou grupo..." value="${esc(_myTasksFilters.busca)}" oninput="setTarefasHomeBusca(this.value)">
          </div>
          <div class="dash-toolbar-switches">
            <div class="dash-toolbar-label">Escopo</div>
            <div class="segmented">
              <button class="segmented-btn ${_myTasksFilters.origem==='todos'?'ativo':''}" onclick="setTarefasHomeOrigem('todos')">Todas${tarefasCompletas.length ? `<span class="seg-count">${tarefasCompletas.length}</span>` : ''}</button>
              <button class="segmented-btn ${_myTasksFilters.origem==='meus'?'ativo':''}" onclick="setTarefasHomeOrigem('meus')">Minhas${minhas ? `<span class="seg-count">${minhas}</span>` : ''}</button>
              <button class="segmented-btn ${_myTasksFilters.origem==='compartilhadas'?'ativo':''}" onclick="setTarefasHomeOrigem('compartilhadas')">Compartilhadas${compartilhadas ? `<span class="seg-count">${compartilhadas}</span>` : ''}</button>
            </div>
          </div>
          <div class="dash-toolbar-field">
            <div class="dash-toolbar-label">Projeto</div>
            <select class="resp-filter select-control flex-shrink-0" onchange="setTarefasHomeProjeto(this.value)">
              <option value="">Todos os projetos</option>
              ${projetosFiltro.map(p => `<option value="${p.id}" ${String(_myTasksFilters.projeto) === String(p.id) ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="dash-toolbar-row dash-toolbar-secondary">
          <div class="dash-toolbar-field dash-toolbar-statusfield">
            <div class="dash-toolbar-label">Status</div>
            <div class="dash-status-grid">
              ${statusTabs.map(status => {
                const label = status === 'todos' ? 'Todos' : status;
                const count = statusCountMap[status] || 0;
                return `<button class="filter-btn ${_myTasksFilters.status===status?'ativo':''}" onclick="setTarefasHomeStatus('${esc(status)}')">${label}${count ? `<span class="seg-count">${count}</span>` : ''}</button>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>`;

    const horasHoje = parseFloat(resumoHoje?.horas_hoje || 0);

    c.innerHTML = renderTaskOperationalSurface({
      mode: 'today',
      kicker: 'Operação diária',
      title: 'Tarefas',
      description: 'Priorize, retome e execute o trabalho em uma única superfície operacional.',
      actionsHtml: `
        <button class="btn" onclick="continuarUltimaTarefa()">Abrir última tarefa</button>
        <button class="btn btn-primary" onclick="modalNovaTarefa()">Nova tarefa</button>`,
      overviewHtml: `
        <div class="today-layout">
          <div class="today-layout__main">
            <section class="today-block">
              <div class="task-view-eyebrow">Prioridade do dia</div>
              ${prioridade ? `
                <div class="today-priority__title">${esc(prioridade.titulo)}</div>
                <div class="today-priority__project">Projeto: ${esc(prioridade.projeto || 'Não informado')}</div>
                <div class="today-priority__meta">
                  <div class="meta-pair"><span class="meta-pair-label">Status</span><span class="meta-pair-value">${esc(prioridade.status || 'A fazer')}</span></div>
                  <div class="meta-pair"><span class="meta-pair-label">Prazo</span><span class="meta-pair-value mono">${esc(prioridade.prazo || 'Sem prazo')}</span></div>
                  <div class="meta-pair"><span class="meta-pair-label">Sessão</span><span class="meta-pair-value">${ativo ? 'Cronômetro em andamento' : 'Sem sessão ativa'}</span></div>
                </div>
              <div class="today-priority__actions">
                ${ativo
                    ? `<button class="btn btn-primary" onclick="abrirTarefaContexto('${prioridade.tarefaId}','${prioridade.projetoId}')">Abrir tarefa</button>`
                    : `<button class="btn btn-primary" onclick="iniciarCronometro('${prioridade.tarefaId}','${esc(prioridade.titulo)}')">Iniciar cronômetro</button>`}
                ${ativo ? '' : `<button class="btn" onclick="abrirTarefaContexto('${prioridade.tarefaId}','${prioridade.projetoId}')">Abrir tarefa</button>`}
              </div>`
                : `<div class="today-empty">Nenhuma tarefa em foco. Escolha uma para começar o dia.</div>`}
            </section>

            <section class="today-block">
              <div class="task-view-eyebrow">Continuar de onde parou</div>
              ${retomadas.length
                ? `<div class="today-resume-list">${retomadas.map(item => `
                  <button class="today-resume-row" onclick="abrirTarefaContexto('${item.tarefaId}','${item.projetoId}')">
                    <span class="today-resume-row__main">
                      <span class="today-resume-row__title">${esc(item.titulo)}</span>
                      <span class="today-resume-row__project">${esc(item.projeto)}</span>
                    </span>
                    <span class="today-resume-row__time mono">${esc(item.tempo || '—')}</span>
                  </button>`).join('')}</div>`
                : `<div class="today-empty">Sem histórico recente para retomar agora.</div>`}
            </section>
          </div>
          <aside class="today-layout__side">
            <section class="today-block">
              <div class="task-view-eyebrow">Hoje até agora</div>
              <div class="today-total-hours mono">${horasHoje.toFixed(1)}h</div>
              <div class="today-summary-grid">
                <div class="today-summary-item"><span class="today-summary-label">Sessões</span><strong>${resumoHoje?.sessoes || 0}</strong></div>
                <div class="today-summary-item"><span class="today-summary-label">Tarefas</span><strong>${resumoHoje?.tarefas || 0}</strong></div>
                <div class="today-summary-item"><span class="today-summary-label">Ativas</span><strong>${(ativas || []).length}</strong></div>
                <div class="today-summary-item"><span class="today-summary-label">Em andamento</span><strong>${tarefasCompletas.filter(t => t.status === 'Em andamento' || t.sessao_ativa_id).length}</strong></div>
              </div>
            </section>
          </aside>
        </div>`,
      filtersHtml,
      listEyebrow: 'Tarefas',
      listTitle: 'Lista operacional de tarefas',
      listCopy: 'Use os filtros para definir escopo e execute com cronômetro diretamente na linha da tarefa.',
      listKpi: `${tarefasFiltradas.length} resultado${tarefasFiltradas.length === 1 ? '' : 's'} · ${recentes.length} recente${recentes.length === 1 ? '' : 's'}`,
      tarefas: tarefasFiltradas,
      emptyMessage: 'Nenhuma tarefa encontrada.',
    });

  } catch (e) {
    c.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
  }
}

export async function renderMinhasTarefas(opts = {}) {
  return renderTarefasHome(opts);
}

export function setTarefasHomeBusca(valor = '') {
  updateTasksHomeFilters({ busca: valor });
  return renderTarefasHome({ fromRoute: true });
}

export function setTarefasHomeOrigem(valor = 'todos') {
  updateTasksHomeFilters({ origem: valor });
  return renderTarefasHome({ fromRoute: true });
}

export function setTarefasHomeStatus(valor = 'todos') {
  updateTasksHomeFilters({ status: valor });
  return renderTarefasHome({ fromRoute: true });
}

export function setTarefasHomeProjeto(valor = '') {
  updateTasksHomeFilters({ projeto: valor });
  return renderTarefasHome({ fromRoute: true });
}

export function fecharDetalheTarefaContexto() {
  fecharModal();
  if (!_taskContextOrigin?.projectId) return;
  const rotaAtual = window.getCurrentAppRoute?.();
  if (rotaAtual?.name === 'task') {
    window.navigateToRoute?.('project', { id: _taskContextOrigin.projectId }, { replace: true });
  }
  _taskContextOrigin = null;
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

export function alternarTarefasView(view) {
  const nextView = view === 'kanban' ? 'kanban' : 'lista';
  setTarefasView(nextView);
  if (PROJETO?.id) localStorage.setItem(`telier_project_task_view_${PROJETO.id}`, nextView);
  renderAbaTarefas(document.getElementById('aba'), TAREFAS);
}

export function aplicarFiltroOrigemProjeto(valor) {
  setFiltroOrigemTarefas(valor);
  persistProjectTaskUiState();
  renderAbaTarefas(document.getElementById('aba'), TAREFAS);
}

export function aplicarFiltroResponsavelProjeto(valor) {
  setFiltroRespTar(valor);
  persistProjectTaskUiState();
  renderAbaTarefas(document.getElementById('aba'), TAREFAS);
}

export function aplicarFiltroStatusProjeto(valor) {
  setFiltroStatusTarefa(valor);
  persistProjectTaskUiState();
  renderAbaTarefas(document.getElementById('aba'), TAREFAS);
}

export function alternarListaConcluidasProjeto() {
  setListaConcluidasExpandida(!LISTA_CONCLUIDAS_EXPANDIDA);
  persistProjectTaskUiState();
  const tableShell = document.querySelector('#tarefas-view-container .task-list-surface');
  if (tableShell) renderListaInterna(document.getElementById('tarefas-view-container'), TAREFAS);
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
        <div class="task-view-copy">Abra o projeto já no ponto de execução: buscar, filtrar, priorizar e agir.</div>
      </div>
      <div class="task-surface-actions">
        <div class="task-view-kpi">${pendentes} pendente${pendentes!==1?'s':''} · ${concluidas} concluída${concluidas!==1?'s':''}</div>
        ${!projetoArquivado ? `<button class="btn btn-primary btn-sm" onclick="modalNovaTarefa('${PROJETO?.id}')">Nova tarefa</button>` : ''}
      </div>
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
            <button class="segmented-btn ${FILTRO_ORIGEM_TAREFAS==='todos'?'ativo':''}" onclick="aplicarFiltroOrigemProjeto('todos')">Todas${tarefas.length ? `<span class="seg-count">${tarefas.length}</span>` : ''}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_TAREFAS==='meus'?'ativo':''}" onclick="aplicarFiltroOrigemProjeto('meus')">Minhas${meus ? `<span class="seg-count">${meus}</span>` : ''}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_TAREFAS==='compartilhadas'?'ativo':''}" onclick="aplicarFiltroOrigemProjeto('compartilhadas')">Compartilhadas${compartilhadas ? `<span class="seg-count">${compartilhadas}</span>` : ''}</button>
          </div>
        </div>
        <div class="task-toolbar-actions">
          <button class="btn btn-sm task-mobile-filter-btn" onclick="setTaskMobileFiltersOpen(!TASK_MOBILE_FILTERS_OPEN);renderAbaTarefas(document.getElementById('aba'),TAREFAS)">Filtros</button>
          <div class="view-toggle">
            <button class="view-toggle-btn ${TAREFAS_VIEW==='lista'?'ativo':''}"
                    onclick="alternarTarefasView('lista')"
                    title="Vista lista">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="10" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="6" width="10" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="10" width="10" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
            <button class="view-toggle-btn ${TAREFAS_VIEW==='kanban'?'ativo':''}"
                    onclick="alternarTarefasView('kanban')"
                    title="Vista kanban">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
                <rect x="5.25" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
                <rect x="9.5" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="dash-toolbar-row dash-toolbar-secondary task-mobile-secondary ${TASK_MOBILE_FILTERS_OPEN ? 'is-open' : ''}">
          <div class="task-toolbar-summary task-toolbar-summary-grid">
            ${responsaveis.length > 1 ? `
              <div class="dash-toolbar-field">
                <div class="dash-toolbar-label">Responsável</div>
                <select class="resp-filter select-control" onchange="aplicarFiltroResponsavelProjeto(this.value)">
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
              return `<button class="filter-btn ${FILTRO_STATUS_TAREFA===s?'ativo':''}" onclick="aplicarFiltroStatusProjeto('${esc(s)}')">${label}${cnt ? `<span class="seg-count">${cnt}</span>` : ''}</button>`;
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
    const diasT = diasRestantes(t.data || null);
    const urgt = diasT !== null && diasT <= 2 && t.status !== 'Concluída';

    const cronHtml = renderTimerActions({
      tarefaId: t.id,
      tarefaNome: t.nome,
      projetoId: PROJETO?.id,
      size: 'sm',
      iconOnly: true,
      allowStart: podeCron,
      showOpenTask: false,
      showHistory: false,
      showInterval: false,
      stopPropagation: true,
    });

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
        ${minha ? `<button class="foco-pin foco-pin-compact ${t.foco?'ativo':''}"
                            onclick="toggleFoco('${t.id}',${!!t.foco});event.stopPropagation()"
                            title="${t.foco?'Remover foco':'Marcar como foco'}">${t.foco ? FOCUS_ICON_FILLED : FOCUS_ICON_OUTLINE}</button>` : ''}
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
        ${tag(t.prioridade, PT[t.prioridade])}
        ${t.data
          ? `<span class="tag ${urgt?(diasT<=0?'tag-red':'tag-yellow'):'tag-gray'} chip-mono">
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
      ? `<button class="foco-pin ${t.foco?'ativo':''}" onclick="toggleFoco('${t.id}',${!!t.foco})" title="${t.foco?'Remover foco':'Marcar como foco'}">${t.foco ? FOCUS_ICON_FILLED : FOCUS_ICON_OUTLINE}</button>`
      : `<span class="foco-placeholder">${t.foco ? FOCUS_ICON_FILLED : ''}</span>`;

    const podeCron = !projetoArquivado && (minha || (t.colaboradores_ids || []).includes(EU?.id) || isAdmin());
    const timerAcoes = renderTimerActions({
      tarefaId: t.id,
      tarefaNome: t.nome,
      projetoId: PROJETO?.id,
      size: 'sm',
      iconOnly: true,
      allowStart: podeCron,
      showOpenTask: false,
      showHistory: false,
      showInterval: false,
    });

    const dataStr = t.data || null;
    const diasTarefa = diasRestantes(dataStr);
    const urgenteTar = diasTarefa !== null && diasTarefa <= 2 && t.status !== 'Concluída';
    const data = dataStr ? prazoFmt(dataStr, true) : '—';

    return `<article class="ops-row" data-status="${esc(t.status)}">
      <div class="ops-row-main">
        <div class="ops-row-title ${t.foco&&minha?'em-foco':''} ${t.status==='Concluída'?'concluida':''}">${esc(t.nome)}</div>
        <div class="ops-row-context">${esc(PROJETO?.nome || 'Projeto')} · ${esc(t.dono_nome||'—')}</div>
      </div>
      <div class="ops-row-meta">
        <span onclick="event.stopPropagation()">${pin}</span>
        ${metaPair('Complexidade', t.complexidade || '—', 'is-muted')}
        ${metaPair('Prioridade', t.prioridade || '—', t.prioridade === 'Alta' ? 'is-warn' : 'is-muted')}
        <span onclick="event.stopPropagation()">${canEdit ? `
          <select class="status-sel status-select" onchange="mudarStatus('${t.id}',this.value,this)">
            ${['A fazer','Em andamento','Bloqueada','Concluída'].map(s =>
              `<option value="${s}" ${s===t.status?'selected':''}>${s}</option>`
            ).join('')}
          </select>` : metaPair('Status', t.status || '—', t.status === 'Bloqueada' ? 'is-alert' : 'is-muted')}</span>
        ${metaPair('Prazo', data, urgenteTar ? 'is-alert' : 'is-muted')}
      </div>
      <div class="ops-row-actions">
        ${timerAcoes}
        ${podeCron ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="modalColabsTarefa('${t.id}')" title="Colaboradores da tarefa"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 11.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M9 7a2 2 0 1 0 0-4M12 11.5c0-1.65-1.12-3.04-2.66-3.43" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>` : ''}
        ${canEdit ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="modalEditarTarefa('${t.id}')" title="Editar tarefa"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>` : ''}
      </div>
    </article>`;
  }

  const rowsPend = pendOrdenadas.map(t => rowHtml(t)).join('');
  const rowsConc = concOrdenadas.map(t => rowHtml(t)).join('');

  el.innerHTML = `
    <div class="task-view-surface task-list-surface">
    <div class="task-list-head">
      <div>
        <div class="task-view-eyebrow">Operação do projeto</div>
        <div class="task-view-title">Lista de tarefas</div>
        <div class="task-view-copy">As ações de execução ficam acima da dobra e a lista continua no mesmo contexto do projeto.</div>
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
        <button type="button" class="btn btn-primary btn-sm" onclick="quickAddConfirmar('${PROJETO?.id}')">Criar</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="quickAddCancelar()">Cancelar</button>
      </div>
    </form>` : ''}
    <div class="task-table-shell">
      <div class="ops-row-stack">
        ${rowsPend || `<div style="text-align:center;color:var(--text-muted);padding:24px"><div style="font-style:italic">Nenhuma tarefa ainda.</div><div style="font-size:var(--fs-080);margin-top:8px;color:var(--text-secondary)">Comece por uma tarefa principal, com prioridade e prazo.</div>${!projetoArquivado ? `<button class="btn btn-sm btn-primary empty-state-create-btn" onclick="modalNovaTarefa('${PROJETO?.id}')">Criar primeira tarefa</button>` : ''}</div>`}
      </div>
      ${concOrdenadas.length ? `<button class="btn btn-ghost btn-sm task-list-toggle-btn" onclick="alternarListaConcluidasProjeto()">${LISTA_CONCLUIDAS_EXPANDIDA ? 'Ocultar' : 'Mostrar'} ${concOrdenadas.length} concluída${concOrdenadas.length!==1?'s':''}</button>` : ''}
      ${LISTA_CONCLUIDAS_EXPANDIDA ? `<div class="ops-row-stack" style="margin-top:8px">${rowsConc}</div>` : ''}
    </div>
    <div class="tasks-cards task-cards-refined">
      ${todas.map(t => {
        const minha = t.dono_id === EU?.id;
        const canEdit = !projetoArquivado && (minha || podeEditar(PROJETO) || isAdmin());
        const podeCron = !projetoArquivado && (minha || (t.colaboradores_ids || []).includes(EU?.id) || isAdmin());
        const data = t.data ? prazoFmt(t.data, true) : '—';
        const statusBtn = canEdit
          ? `<select class="status-sel status-select" style="height:28px;padding:2px 4px;font-size:var(--fs-xs)" onchange="mudarStatus('${t.id}',this.value,this)">
              ${['A fazer','Em andamento','Bloqueada','Concluída'].map(s =>
                `<option value="${s}" ${s===t.status?'selected':''}>${s}</option>`
              ).join('')}
            </select>`
          : `<span class="tag">${esc(t.status)}</span>`;
        return `<div class="task-card ${t.status==='Concluída'?'concluida':''}" data-status="${esc(t.status)}">
          <div class="task-card-header">
            <div class="task-card-title ${t.foco&&minha?'em-foco':''} ${t.status==='Concluída'?'concluida':''}">${esc(t.nome)}</div>
            ${minha ? `<button class="task-card-foco ${t.foco?'ativo':''} " onclick="toggleFoco('${t.id}',${!!t.foco}); event.stopPropagation()" title="${t.foco?'Remover foco':'Marcar como foco'}">${t.foco ? FOCUS_ICON_FILLED : FOCUS_ICON_OUTLINE}</button>` : ''}
          </div>
          <div class="task-card-meta">
            <div class="task-card-chip">${avatar(t.dono_nome,'avatar-sm')} <span>${esc(t.dono_nome||'—')}</span></div>
            ${t.colaboradores_ids?.length ? renderColabsStack(t.colaboradores_ids) : ''}
            ${tag(t.complexidade, DT[t.complexidade])}
            ${tag(t.prioridade, PT[t.prioridade])}
            <span class="inline-muted-sm" style="margin-left:auto">${esc(data)}</span>
          </div>
          <div class="task-card-footer">
            <div style="flex:1">${statusBtn}</div>
            <div class="task-card-actions">
              <button class="btn btn-ghost btn-icon btn-sm" onclick="expandirSessoes('${t.id}')" title="Detalhes"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 5.2h5M4.5 7h5M4.5 8.8h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>
              ${podeCron ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="modalColabsTarefa('${t.id}'); event.stopPropagation()" title="Colaboradores"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4.5" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 11.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M9 7a2 2 0 1 0 0-4M12 11.5c0-1.65-1.12-3.04-2.66-3.43" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></button>` : ''}
              ${canEdit ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="duplicarTarefa('${t.id}')" title="Duplicar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="2" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="5" y="6" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/></svg></button>` : ''}
              ${canEdit ? `<button class="btn btn-ghost btn-icon btn-sm" onclick="modalEditarTarefa('${t.id}')" title="Editar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>` : ''}
              ${canEdit ? `<button class="btn btn-danger btn-icon btn-sm" onclick="deletarTarefa('${t.id}')" title="Excluir"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>` : ''}
              ${renderTimerActions({
                tarefaId: t.id,
                tarefaNome: t.nome,
                projetoId: PROJETO?.id,
                size: 'sm',
                iconOnly: true,
                allowStart: podeCron,
                showOpenTask: false,
                showHistory: true,
                showInterval: false,
              })}
            </div>
          </div>
        </div>`;
      }).join('') || `<div style="text-align:center;color:var(--text-muted);padding:24px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r2)"><div style="font-style:italic">Nenhuma tarefa ainda.</div><div style="font-size:var(--fs-080);margin-top:8px;color:var(--text-secondary)">Comece por uma tarefa principal, com prioridade e prazo.</div>${!projetoArquivado ? `<button class="btn btn-sm btn-primary empty-state-create-btn" onclick="modalNovaTarefa('${PROJETO?.id}')">Criar primeira tarefa</button>` : ''}</div>`}
    </div>
    </div>`;
}

export function ordenarLista(col) {
  if (LISTA_SORT.col === col) {
    setListaSort({ col, dir: LISTA_SORT.dir === 'asc' ? 'desc' : 'asc' });
  } else {
    setListaSort({ col, dir: 'asc' });
  }
  persistProjectTaskUiState();
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
            ${bloqueadas.map(t => metaPair('Bloqueada', t.nome, 'is-alert')).join('')}
          </div>
        </div>` : ''}
      <div class="mapa-list">
        ${pendentes.map((t, i) => {
          const minha = t.dono_id === EU?.id;
          const podeCron = minha || (t.colaboradores_ids||[]).includes(EU?.id) || isAdmin();
          const diasT = diasRestantes(t.data || null);
          const urgt = diasT !== null && diasT <= 2;

          const cronHtml = renderTimerActions({
            tarefaId: t.id,
            tarefaNome: t.nome,
            projetoId: PROJETO?.id,
            size: 'sm',
            iconOnly: true,
            allowStart: podeCron,
            showOpenTask: false,
            showHistory: false,
            showInterval: false,
            stopPropagation: true,
          });

          return `
          <div class="mapa-item ${t.foco&&minha?'is-foco':''}">
            <div class="mapa-rank">${String(i+1).padStart(2,'0')}</div>
            <div class="mapa-body">
              <div class="mapa-nome">${esc(t.nome)}</div>
              <div class="mapa-sub">${esc(t.dono_nome || 'Sem responsável')}</div>
            </div>
            <div class="mapa-tags">
              ${metaPair('Prioridade', t.prioridade, t.prioridade === 'Alta' ? 'is-warn' : 'is-muted')}
              ${metaPair('Complexidade', t.complexidade, 'is-muted')}
              ${t.foco&&minha ? metaPair('Foco', 'Meu foco', 'is-info') : ''}
              ${urgt ? metaPair('Prazo', diasT<=0?'Vencida':`${diasT}d`, diasT<=0?'is-alert':'is-warn') : ''}
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
    el.innerHTML = `<div class="skeleton-block" aria-live="polite" aria-busy="true">
      <div class="skeleton-line w-30"></div>
      <div class="skeleton-line w-100"></div>
      <div class="skeleton-line w-80"></div>
    </div>`;
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
         Exportar CSV
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
        ${(souDono(d.dono_id)||canEdit) ? `<div style="display:flex;gap:4px;flex-shrink:0"><button class="decisao-del decisao-edit" onclick="modalEditarDecisao('${d.id}','${projetoId}',\`${d.descricao.replace(/`/g,'&#96;')}\`,'${d.data||''}')" title="Editar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button><button class="decisao-del" onclick="deletarDecisao('${d.id}','${projetoId}')" title="Excluir"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></div>` : ''}
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
    invalidarCacheProjetos();
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
    invalidarCacheProjetos();
    await _recarregarProjeto();
  } catch (e) { toast(e.message, 'err'); }
}

export async function deletarTarefa(id) {
  confirmar('Excluir esta tarefa? Esta ação não pode ser desfeita.', async () => {
    try { await req('DELETE', `/tarefas/${id}`); invalidarCacheProjetos(); toast('Tarefa excluída'); await _recarregarProjeto(); }
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
    invalidarCacheProjetos();
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
      invalidarCacheProjetos();
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

export async function modalNovaTarefa(projetoId = '') {
  let projetoSelect = '';
  if (!projetoId) {
    const projetos = await fetchProjetos(new URLSearchParams());
    const projetosAtivos = (projetos || []).filter(p => normalizarStatusProjeto(p.status) !== 'Arquivado');
    projetoSelect = `
    <div class="modal-section">
      <div class="modal-section-title">Contexto estrutural</div>
      <div class="form-row"><label>Projeto</label>
        <select id="m-projeto-id">
          <option value="">Selecione um projeto</option>
          ${projetosAtivos.map(p => `<option value="${p.id}">${esc(p.nome)}${p.grupo_nome ? ` · ${esc(p.grupo_nome)}` : ''}</option>`).join('')}
        </select>
      </div>
    </div>`;
  }
  abrirModal(`
    <h2>Nova tarefa</h2>
    <div class="modal-hint">Esta janela altera apenas a tarefa.</div>
    ${projetoSelect}
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
  const projetoDestino = projetoId || gv('m-projeto-id');
  const nome = gv('m-nome').trim();
  if (!projetoDestino) { toast('Selecione um projeto', 'err'); return; }
  if (!nome) { toast('Nome obrigatório', 'err'); return; }
  btnLoading('btn-criar-tar', true);
  try {
    await req('POST', `/projetos/${projetoDestino}/tarefas`, {
      nome,
      status: gv('m-status'),
      prioridade: gv('m-prior'),
      complexidade: gv('m-dific'),
      data: gv('m-data')||null,
      descricao: gv('m-desc') || null,
    });
    invalidarCacheProjetos();
    fecharModal(); toast('Tarefa criada');
    if (PROJETO?.id && String(PROJETO.id) === String(projetoDestino)) await _recarregarProjeto('lista');
    else if (window.goTasks) await window.goTasks();
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-criar-tar', false); }
}

export async function modalEditarTarefa(id) {
  const t = TAREFAS.find(t => t.id === id);
  if (!t) return;
  const veioDeRotaProfunda = !!_taskContextOrigin?.projectId;
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
      <button class="btn" onclick="${veioDeRotaProfunda ? 'fecharDetalheTarefaContexto()' : 'fecharModal()'}">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-tar" onclick="salvarTarefa('${id}')">Salvar</button>
    </div>`, {
    onClose: veioDeRotaProfunda
      ? () => {
          const rotaAtual = window.getCurrentAppRoute?.();
          if (rotaAtual?.name === 'task' && _taskContextOrigin?.projectId) {
            window.navigateToRoute?.('project', { id: _taskContextOrigin.projectId }, { replace: true });
          }
          _taskContextOrigin = null;
        }
      : undefined,
  });
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
    invalidarCacheProjetos();
    if (_taskContextOrigin?.projectId) fecharDetalheTarefaContexto();
    else fecharModal();
    toast('Tarefa atualizada');
    await _recarregarProjeto();
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-salvar-tar', false); }
}

export async function duplicarTarefa(id) {
  try {
    await req('POST', `/tarefas/${id}/duplicar`, {});
    invalidarCacheProjetos();
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
    invalidarCacheProjetos();
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
    persistProjectTaskUiState();
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
      invalidarCacheProjetos();
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
    invalidarCacheProjetos();
    toast('Colaborador adicionado');
    fecharModal();
    modalColabsTarefa(tarefaId);
  } catch (e) { toast(e.message,'err'); btnLoading('btn-add-colab', false); }
}

export async function removerColab(tarefaId, usuarioId) {
  confirmar('Remover este colaborador da tarefa? Ele não poderá mais iniciar o cronômetro nesta tarefa.', async () => {
    try {
      await req('DELETE', `/tarefas/${tarefaId}/colaboradores/${usuarioId}`);
      invalidarCacheProjetos();
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
