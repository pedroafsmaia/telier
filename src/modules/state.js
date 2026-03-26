// ── STATE ──
function resolveApiBase() {
  const fallback = 'https://telier-api.pedroafsmaia.workers.dev';
  if (typeof window === 'undefined') return fallback;
  try {
    const url = new URL(window.location.href);
    const apiParam = url.searchParams.get('api');
    if (apiParam) {
      localStorage.setItem('ea_api', apiParam);
      return apiParam;
    }
    return localStorage.getItem('ea_api') || fallback;
  } catch {
    return fallback;
  }
}

export const API = resolveApiBase();
export let TOKEN = localStorage.getItem('ea_token');
export let EU = JSON.parse(localStorage.getItem('ea_user') || 'null');
export let PROJETO = null;
export let GRUPO_ATUAL = null;
export let TAREFAS = [];
export let USUARIOS = [];
export let FILTRO_STATUS = 'todos';
export let NEEDS_SETUP = false;
export const ADMIN_MODE_KEY = 'ea_admin_mode';
export let ADMIN_MODE = localStorage.getItem('ea_admin_mode') || 'admin';
export let ADMIN_TEMPO_FILTRO = { de: '', ate: '', usuario_id: '' };
export let RELATORIO_CACHE = null; // { projetoId, ts, resumoMap }
export let VISTA_ATUAL = 'dash';
export let BUSCA_DASH = '';
export let _projsDash = [];
export let _ativasDash = [];
export let _gruposDash = [];
export let FILTRO_RESP_TAR = '';
export let FILTRO_ORIGEM_TAREFAS = 'todos';
export let FILTRO_STATUS_TAREFA = 'todos';
export let TASK_MOBILE_FILTERS_OPEN = false;
export let GRUPO_TASK_MOBILE_FILTERS_OPEN = false;
export let TAREFAS_VIEW = 'lista'; // 'kanban' | 'lista'
export let LISTA_SORT = { col: null, dir: 'asc' };
export let LISTA_CONCLUIDAS_EXPANDIDA = false;
export let BUSCA_TAREFA = '';
export let FILTRO_GRUPO_DASH = 'todos';
export let COLEGAS_ATIVOS = [];
export let PRESENCE_ABERTO = false;
export let _presenceTick = null;
export let _presenceHintShown = false;
export let FILTRO_ORIGEM_DASH = 'todos';
export let NOTIFS = [];
export let _notifTick = null;
export let _lastNotifSeen = 0;
export let NOTIF_TAB = 'compartilhamentos';
export const _prazoNotifShown = new Set();
export const STARTDAY_COLLAPSE_KEY = 'telier_startday_collapsed';
export const TIMER_AVISO_HORAS = 4;
export const DASH_FILTERS_KEY = 'telier_dash_filters_v1';
export const GROUPS_HOME_FILTERS_KEY = 'telier_groups_home_filters_v1';
export const DASH_STATUS_OPCOES = new Set(['todos', 'Em andamento', 'A fazer', 'Em revisão', 'Pausado', 'Concluído', 'Arquivado']);
export const GROUPS_STATUS_OPCOES = new Set(['todos', 'Ativo', 'Pausado', 'Arquivado']);
export const REQ_TIMEOUT_MS = 15000;
export const PROJ_CACHE_KEY = 'telier_proj_cache';
export const PROJ_CACHE_TTL = 10000;
export let _pendingUndoAction = null;
export let FORCE_PASSWORD_CHANGE = false;
export let TIMERS = {}; // { sessaoId: { tarefaId, tarefa_nome, projeto_nome, projeto_id, inicio } }
export const SESSAO_TICKS = new Map();
export let GROUPS_HOME_BUSCA = '';
export let GROUPS_HOME_STATUS = 'todos';
export let GROUPS_HOME_SORT = 'ordem';
export let GRUPO_TAREFAS_FILTROS = {
  status: 'todos',
  prioridade: 'todos',
  responsavel: '',
  projeto: '',
  busca: '',
  origem: 'todos',
};

// Setters
export function setToken(v) { TOKEN = v; }
export function setEU(v) { EU = v; }
export function setProjeto(v) { PROJETO = v; }
export function setGrupoAtual(v) { GRUPO_ATUAL = v; }
export function setTarefas(v) { TAREFAS = v; }
export function setUsuarios(v) { USUARIOS = v; }
export function setFiltroStatus(v) { FILTRO_STATUS = v; }
export function setNeedsSetup(v) { NEEDS_SETUP = v; }
export function setAdminMode(v) { ADMIN_MODE = v; }
export function setAdminTempoFiltro(v) { ADMIN_TEMPO_FILTRO = v; }
export function setRelatorioCache(v) { RELATORIO_CACHE = v; }
export function setVistaAtual(v) { VISTA_ATUAL = v; }
export function setBuscaDash(v) { BUSCA_DASH = v; }
export function setProjsDash(v) { _projsDash = v; }
export function setAtivasDash(v) { _ativasDash = v; }
export function setGruposDash(v) { _gruposDash = v; }
export function setFiltroRespTar(v) { FILTRO_RESP_TAR = v; }
export function setFiltroOrigemTarefas(v) { FILTRO_ORIGEM_TAREFAS = v; }
export function setFiltroStatusTarefa(v) { FILTRO_STATUS_TAREFA = v; }
export function setTaskMobileFiltersOpen(v) { TASK_MOBILE_FILTERS_OPEN = v; }
export function setGrupoTaskMobileFiltersOpen(v) { GRUPO_TASK_MOBILE_FILTERS_OPEN = v; }
export function setTarefasView(v) { TAREFAS_VIEW = v; }
export function setListaSort(v) { LISTA_SORT = v; }
export function setListaConcluidasExpandida(v) { LISTA_CONCLUIDAS_EXPANDIDA = v; }
export function setBuscaTarefa(v) { BUSCA_TAREFA = v; }
export function setFiltroGrupoDash(v) { FILTRO_GRUPO_DASH = v; }
export function setColegasAtivos(v) { COLEGAS_ATIVOS = v; }
export function setPresenceAberto(v) { PRESENCE_ABERTO = v; }
export function setPresenceTick(v) { _presenceTick = v; }
export function setPresenceHintShown(v) { _presenceHintShown = v; }
export function setFiltroOrigemDash(v) { FILTRO_ORIGEM_DASH = v; }
export function setNotifs(v) { NOTIFS = v; }
export function setNotifTick(v) { _notifTick = v; }
export function setLastNotifSeen(v) { _lastNotifSeen = v; }
export function setNotifTab(v) { NOTIF_TAB = v; }
export function setPendingUndoAction(v) { _pendingUndoAction = v; }
export function setForcePasswordChange(v) { FORCE_PASSWORD_CHANGE = v; }
export function setTimers(v) { TIMERS = v; }
export function setGroupsHomeBusca(v) { GROUPS_HOME_BUSCA = v; }
export function setGroupsHomeStatus(v) { GROUPS_HOME_STATUS = v; }
export function setGroupsHomeSort(v) { GROUPS_HOME_SORT = v; }
export function setGrupoTarefasFiltros(v) { GRUPO_TAREFAS_FILTROS = v; }
