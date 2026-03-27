// ── APP ENTRY POINT ──
import {
  TOKEN, EU, NEEDS_SETUP, FORCE_PASSWORD_CHANGE, ADMIN_MODE, ADMIN_MODE_KEY,
  TAREFAS, TASK_MOBILE_FILTERS_OPEN, LISTA_CONCLUIDAS_EXPANDIDA,
  API,
  setToken, setEU, setNeedsSetup, setForcePasswordChange, setAdminMode, setNotifTab,
  setFiltroOrigemTarefas, setFiltroRespTar, setFiltroStatusTarefa,
  setTaskMobileFiltersOpen, setTarefasView, setListaConcluidasExpandida,
} from './modules/state.js';
import { req, invalidarCacheProjetos } from './modules/api.js';
import { toast, aplicarTema, alternarTema, fecharModal, setShellViewFromRoute } from './modules/ui.js';
import { isAdminRole } from './modules/utils.js';
import { renderDash, carregarFiltrosDash, salvarFiltrosDash, renderDashLoadingState, renderDashEmptyState, renderProjetosDash, renderCardsDash, filtrarProjetosBusca, filtrarGrupoDash, filtrarOrigemDash, setFiltro, getDragJustEnded, dragProjeto, dragProjetoEnd, dragGrupo, dragGrupoEnd, dragOver, dragLeave, dropProjeto, toggleGrupo } from './modules/dashboard.js';
import { abrirProjeto, voltarDash, renderProjeto, mudarAba, renderAba, renderProjetoAoVivo, recarregarProjeto, modalNovoProjeto, criarProjeto, modalEditarProjeto, salvarProjeto, deletarProjeto } from './modules/project.js';
import { renderGroupsHome, abrirGrupo, renderGrupo, mudarAbaGrupo, renderAbaGrupo, renderGrupoAbaProjetos, renderGrupoAbaTarefas, renderGrupoAbaMapa, renderGrupoAbaAoVivo, renderGrupoAbaRelatorio, carregarTarefasGrupo, carregarAoVivoGrupo, carregarAoVivoProjeto, modalNovoGrupo, criarGrupo, modalEditarGrupo, compartilharGrupo, modalCompartilharGrupo, salvarGrupo, adicionarPermGrupo, removerPermGrupo, sairGrupoCompartilhado, sairProjetoCompartilhado, acaoGrupo, modalMoverTodosGrupo, deletarGrupo } from './modules/groups.js';
import { atualizarBadgeNotificacoes, filtrarNotificacoesPainel, renderPainelNotificacoes, carregarNotificacoes, iniciarPollNotificacoes, carregarStatus, iniciarStatusPoll, marcarNotifLida, marcarTodasNotifLidas, abrirNotificacoes, fecharPainelNotificacoes, carregarColegasAtivos, iniciarPollPresenca, renderPresenceDock, togglePresencePanel, fecharPresencePanelFora } from './modules/notifications.js';
import { carregarTimersAtivos, iniciarCronometro, pararCronometro, renderTimerWidget, renderTimerDock, modalAdicionarIntervalo, criarIntervalo, editarSessao, salvarSessao, deletarSessao, editarIntervalo, salvarIntervalo, deletarIntervalo, expandirSessoes, adicionarDetalheTarefa, adicionarDetalheTarefaEnter, toggleDetalheTarefa, removerDetalheTarefa } from './modules/timer.js';
import { atualizarPrazoHint, renderColabsStack, renderAoVivoStream, alternarTarefasView, renderAbaTarefas, renderKanbanInterno, criarTarefaKanban, renderListaInterna, ordenarLista, renderMapa, renderRelatorio, renderDecisoes, mudarStatus, toggleFoco, deletarTarefa, modalEditarDecisao, salvarDecisaoEditada, deletarDecisao, modalPermissoes, adicionarPerm, removerPerm, modalNovaTarefa, criarTarefa, modalEditarTarefa, salvarTarefa, duplicarTarefa, quickAddMostrarStep2, quickAddCancelar, quickAddConfirmar, quickAddTarefa, filtrarTarefasBusca, exportarTempoProjetoCSV, modalColabsTarefa, sairTarefaCompartilhada, adicionarColab, removerColab, modalNovaDecisao, criarDecisao, aplicarFiltroOrigemProjeto, aplicarFiltroResponsavelProjeto, aplicarFiltroStatusProjeto, alternarListaConcluidasProjeto, renderTarefasHome, abrirTarefaContexto, continuarUltimaTarefa, setTarefasHomeBusca, setTarefasHomeOrigem, setTarefasHomeStatus, setTarefasHomeProjeto, fecharDetalheTarefaContexto } from './modules/tasks.js';
import { abrirCentralAdmin, renderTimelineHoje, exportarTempoAdminCSV, aplicarFiltroTempoAdmin, limparFiltroTempoAdmin, abrirUsuarioAdmin, modalNovoColega, promoverAdmin, modalNovoColega_legacy, criarColega } from './modules/admin.js';
import { fazerLogin, fazerSetup, fazerLogout, fazerCadastroPublico, modalCadastroPublico, modalTrocaSenhaObrigatoria, salvarSenhaObrigatoria, modalResetSenhaUsuario, resetarSenhaUsuario, toggleSenhaLogin, toggleSenhaSetup, toggleSenhaCadastro, toggleSenhaObrigatoria, toggleSenhaReset } from './modules/auth.js';
import { initShortcuts } from './modules/shortcuts.js';

const LAST_DASHBOARD_HASH_KEY = 'telier_last_dashboard_hash';
let _routerReady = false;
let _routeState = { name: 'tasks', params: {} };

function normalizeHash(hash) {
  const raw = (hash || '').replace(/^#/, '').trim();
  if (!raw) return '/tarefas';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function parseHashRoute(hash = window.location.hash) {
  const path = normalizeHash(hash);
  const segs = path.split('/').filter(Boolean);
  if (!segs.length || segs[0] === 'hoje' || segs[0] === 'minhas-tarefas') return { name: 'tasks', params: {}, hash: '#/tarefas' };
  if (segs[0] === 'tarefas') {
    if (segs[1] && segs[2]) return { name: 'task', params: { id: segs[1], projectId: segs[2] }, hash: `#/tarefas/${segs[1]}/${segs[2]}` };
    return { name: 'tasks', params: {}, hash: '#/tarefas' };
  }
  if (segs[0] === 'projetos') {
    if (segs[1]) return { name: 'project', params: { id: segs[1] }, hash: `#/projetos/${segs[1]}` };
    return { name: 'projects', params: {}, hash: '#/projetos' };
  }
  if (segs[0] === 'grupos') {
    if (segs[1]) return { name: 'group', params: { id: segs[1] }, hash: `#/grupos/${segs[1]}` };
    return { name: 'groups', params: {}, hash: '#/grupos' };
  }
  if (segs[0] === 'admin') {
    const tab = segs[1] || 'agora';
    return { name: 'admin', params: { tab }, hash: `#/admin/${tab}` };
  }
  return { name: 'tasks', params: {}, hash: '#/tarefas' };
}

function routeToHash(name, params = {}) {
  if (name === 'today' || name === 'tasks') return '#/tarefas';
  if (name === 'projects') return '#/projetos';
  if (name === 'groups') return '#/grupos';
  if (name === 'admin') return `#/admin/${params.tab || 'agora'}`;
  if (name === 'task' && params.id && params.projectId) return `#/tarefas/${params.id}/${params.projectId}`;
  if (name === 'project' && params.id) return `#/projetos/${params.id}`;
  if (name === 'group' && params.id) return `#/grupos/${params.id}`;
  return '#/tarefas';
}

function rememberDashboardHash(hash = window.location.hash) {
  const route = parseHashRoute(hash);
  if (route.name === 'tasks' || route.name === 'projects') {
    localStorage.setItem(LAST_DASHBOARD_HASH_KEY, route.hash);
  }
}

async function renderCurrentRoute(opts = {}) {
  const route = parseHashRoute();
  if (window.location.hash !== route.hash) {
    window.location.replace(route.hash);
    return;
  }
  _routeState = route;
  setShellViewFromRoute(route.name);
  if (route.name === 'tasks' || route.name === 'projects') {
    rememberDashboardHash(route.hash);
  }
  if (opts.invalidateProjects) invalidarCacheProjetos();

  if (route.name === 'tasks') {
    await renderTarefasHome({ fromRoute: true });
    return;
  }
  if (route.name === 'projects') {
    await renderDash({ routeKind: 'projects' });
    return;
  }
  if (route.name === 'groups') {
    await renderGroupsHome({ fromRoute: true });
    return;
  }
  if (route.name === 'group' && route.params.id) {
    await abrirGrupo(route.params.id, { fromRoute: true });
    return;
  }
  if (route.name === 'project' && route.params.id) {
    await abrirProjeto(route.params.id, { fromRoute: true });
    return;
  }
  if (route.name === 'task' && route.params.id && route.params.projectId) {
    await abrirTarefaContexto(route.params.id, route.params.projectId, { fromRoute: true });
    return;
  }
  if (route.name === 'admin') {
    await abrirCentralAdmin(route.params.tab || 'agora', { fromRoute: true });
    return;
  }
  window.location.hash = '#/tarefas';
}

export async function navigateToRoute(name, params = {}, opts = {}) {
  const hash = routeToHash(name, params);
  if (opts.invalidateProjects) invalidarCacheProjetos();
  if (window.location.hash !== hash) {
    if (opts.replace) window.location.replace(hash);
    else window.location.hash = hash;
    return;
  }
  await renderCurrentRoute(opts);
}

export function getCurrentAppRoute() {
  return { ..._routeState, params: { ..._routeState.params } };
}

export async function refreshCurrentRoute(opts = {}) {
  await renderCurrentRoute(opts);
}

export function goToday() { closeSidebarDrawer(); return navigateToRoute('tasks'); }
export function goTasks() { closeSidebarDrawer(); return navigateToRoute('tasks'); }
export function goProjects() { closeSidebarDrawer(); return navigateToRoute('projects'); }
export function goGroups() { closeSidebarDrawer(); return navigateToRoute('groups'); }
export function goAdmin(tab = 'agora') { closeSidebarDrawer(); return navigateToRoute('admin', { tab }); }
export function goTask(id, projectId) { closeSidebarDrawer(); return navigateToRoute('task', { id, projectId }); }
export function goProjeto(id) { closeSidebarDrawer(); return navigateToRoute('project', { id }); }
export function goGrupo(id) { closeSidebarDrawer(); return navigateToRoute('group', { id }); }
export function closeSidebarDrawer() {
  document.body.classList.remove('sidebar-drawer-open');
}
export function toggleSidebarDrawer() {
  document.body.classList.toggle('sidebar-drawer-open');
}

function bindResponsiveShellEvents() {
  const mobileMq = window.matchMedia('(max-width: 900px)');
  const syncDrawerState = () => {
    if (!mobileMq.matches) closeSidebarDrawer();
  };
  syncDrawerState();
  if (typeof mobileMq.addEventListener === 'function') {
    mobileMq.addEventListener('change', syncDrawerState);
  } else if (typeof mobileMq.addListener === 'function') {
    mobileMq.addListener(syncDrawerState);
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSidebarDrawer();
  });
}

// ── INIT ──
async function init() {
  if (API === 'SUBSTITUA_PELA_URL_DO_SEU_WORKER') {
    document.getElementById('content').innerHTML = `<div class="api-empty"><div class="api-empty-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5l9 15.5H3l9-15.5z" stroke="currentColor" stroke-width="1.7"/><path d="M12 9v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16.7" r="1" fill="currentColor"/></svg></div><div class="api-empty-text">Configure a URL do Worker em <code style="color:var(--red)">const API</code> no início do script.<br>Siga as instruções em <strong>INSTRUÇÕES.md</strong>.</div></div>`;
    document.getElementById('page-app').classList.remove('hidden');
    return;
  }
  try {
    const setup = await req('GET', '/auth/needs-setup').catch(() => ({ needs_setup: false }));
    setNeedsSetup(!!setup.needs_setup);
    if (!TOKEN) { mostrar('login'); return; }
    const eu = await req('GET', '/auth/me');
    setEU(eu);
    setForcePasswordChange(Number(eu?.deve_trocar_senha || 0) === 1);
    localStorage.setItem('ea_user', JSON.stringify(eu));
    mostrar('app');
  } catch {
    setToken(null);
    localStorage.removeItem('ea_token');
    localStorage.removeItem('ea_user');
    mostrar('login');
  }
}

export function mostrar(tela) {
  window.scrollTo(0, 0);
  ['login','setup','app'].forEach(t => document.getElementById('page-' + t).classList.toggle('hidden', t !== tela));
  const setupBtn = document.getElementById('btn-admin-setup');
  const btnNotifs = document.getElementById('btn-notifs');
  if (setupBtn) setupBtn.classList.toggle('hidden', !(tela === 'login' && NEEDS_SETUP));
  if (btnNotifs && tela !== 'app') btnNotifs.style.display = 'none';
  if (tela === 'app') {
    const userNameEl = document.getElementById('sidebar-user-name');
    if (userNameEl) userNameEl.textContent = EU?.nome || '';
    atualizarBadgeNotificacoes(0);
    iniciarStatusPoll();
    syncAdminModeUI();
    if (!_routerReady) {
      window.addEventListener('hashchange', () => {
        if (document.getElementById('page-app')?.classList.contains('hidden')) return;
        renderCurrentRoute();
      });
      _routerReady = true;
    }
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#/tarefas';
    } else {
      renderCurrentRoute();
    }
    if (FORCE_PASSWORD_CHANGE) {
      setTimeout(() => modalTrocaSenhaObrigatoria(), 120);
    }
  }
}

export function goHome() {
  return goTasks();
}

export function syncAdminModeUI() {
  const btn = document.getElementById('btn-admin-toggle');
  const adminLink = document.getElementById('sidebar-link-admin');
  if (!btn) return;
  if (!isAdminRole()) {
    btn.classList.add('hidden');
    if (adminLink) adminLink.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  if (adminLink) adminLink.classList.remove('hidden');
  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0"><path d="M1 4l3-3M1 4h4M11 8l-3 3M11 8H7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>${ADMIN_MODE === 'admin' ? 'Modo administrador' : 'Modo colaborador'}`;
  btn.title = ADMIN_MODE === 'admin'
    ? 'Clique para usar o sistema como colaborador'
    : 'Clique para voltar ao modo administrador';
}

export function alternarPerfilAdmin() {
  if (!isAdminRole()) return;
  const novoModo = ADMIN_MODE === 'admin' ? 'normal' : 'admin';
  setAdminMode(novoModo);
  localStorage.setItem(ADMIN_MODE_KEY, novoModo);
  syncAdminModeUI();
  toast(novoModo === 'admin' ? 'Modo administrador ativado' : 'Modo colaborador ativado');
  refreshCurrentRoute({ invalidateProjects: true });
}

// ── WINDOW EVENT HANDLERS ──
window.addEventListener('load', async () => {
  const temaSalvo = localStorage.getItem('ea_tema') || 'dark';
  aplicarTema(temaSalvo);
  bindResponsiveShellEvents();
  carregarFiltrosDash();
  initShortcuts();
  await init();
  if (TOKEN) await carregarTimersAtivos();
  if (TOKEN) iniciarStatusPoll();
});

window.addEventListener('focus', () => {
  if (TOKEN) carregarStatus();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && TOKEN) carregarStatus();
});

// ── EXPOSE _dragJustEnded AS LIVE GETTER ──
Object.defineProperties(window, {
  _dragJustEnded: {
    get() { return getDragJustEnded(); },
    configurable: true,
  },
  TAREFAS: {
    get() { return TAREFAS; },
    configurable: true,
  },
  TASK_MOBILE_FILTERS_OPEN: {
    get() { return TASK_MOBILE_FILTERS_OPEN; },
    configurable: true,
  },
  LISTA_CONCLUIDAS_EXPANDIDA: {
    get() { return LISTA_CONCLUIDAS_EXPANDIDA; },
    configurable: true,
  },
});

// ── EXPOSE ALL FUNCTIONS ON WINDOW ──
Object.assign(window, {
  // app
  mostrar,
  goHome,
  goToday,
  goTasks,
  goProjects,
  goGroups,
  goAdmin,
  goTask,
  goProjeto,
  goGrupo,
  closeSidebarDrawer,
  toggleSidebarDrawer,
  navigateToRoute,
  refreshCurrentRoute,
  getCurrentAppRoute,
  syncAdminModeUI,
  alternarPerfilAdmin,
  // ui
  alternarTema,
  aplicarTema,
  fecharModal,
  // dashboard
  renderDash,
  carregarFiltrosDash,
  salvarFiltrosDash,
  renderDashLoadingState,
  renderDashEmptyState,
  renderProjetosDash,
  renderCardsDash,
  filtrarProjetosBusca,
  filtrarGrupoDash,
  filtrarOrigemDash,
  setFiltro,
  getDragJustEnded,
  dragProjeto,
  dragProjetoEnd,
  dragGrupo,
  dragGrupoEnd,
  dragOver,
  dragLeave,
  dropProjeto,
  toggleGrupo,
  // project
  abrirProjeto,
  voltarDash,
  renderProjeto,
  mudarAba,
  renderAba,
  renderProjetoAoVivo,
  recarregarProjeto,
  modalNovoProjeto,
  criarProjeto,
  modalEditarProjeto,
  salvarProjeto,
  deletarProjeto,
  // groups
  renderGroupsHome,
  abrirGrupo,
  renderGrupo,
  mudarAbaGrupo,
  renderAbaGrupo,
  renderGrupoAbaProjetos,
  renderGrupoAbaTarefas,
  renderGrupoAbaMapa,
  renderGrupoAbaAoVivo,
  renderGrupoAbaRelatorio,
  carregarTarefasGrupo,
  carregarAoVivoGrupo,
  carregarAoVivoProjeto,
  modalNovoGrupo,
  criarGrupo,
  modalEditarGrupo,
  compartilharGrupo,
  modalCompartilharGrupo,
  salvarGrupo,
  adicionarPermGrupo,
  removerPermGrupo,
  sairGrupoCompartilhado,
  sairProjetoCompartilhado,
  acaoGrupo,
  modalMoverTodosGrupo,
  deletarGrupo,
  // notifications
  atualizarBadgeNotificacoes,
  filtrarNotificacoesPainel,
  renderPainelNotificacoes,
  carregarNotificacoes,
  iniciarPollNotificacoes,
  carregarStatus,
  iniciarStatusPoll,
  marcarNotifLida,
  marcarTodasNotifLidas,
  abrirNotificacoes,
  fecharPainelNotificacoes,
  carregarColegasAtivos,
  iniciarPollPresenca,
  renderPresenceDock,
  togglePresencePanel,
  fecharPresencePanelFora,
  // timer
  carregarTimersAtivos,
  iniciarCronometro,
  pararCronometro,
  renderTimerWidget,
  renderTimerDock,
  modalAdicionarIntervalo,
  criarIntervalo,
  editarSessao,
  salvarSessao,
  deletarSessao,
  editarIntervalo,
  salvarIntervalo,
  deletarIntervalo,
  expandirSessoes,
  adicionarDetalheTarefa,
  adicionarDetalheTarefaEnter,
  toggleDetalheTarefa,
  removerDetalheTarefa,
  // tasks
  atualizarPrazoHint,
  renderColabsStack,
  renderAoVivoStream,
  alternarTarefasView,
  renderAbaTarefas,
  renderKanbanInterno,
  criarTarefaKanban,
  renderListaInterna,
  ordenarLista,
  renderMapa,
  renderRelatorio,
  renderDecisoes,
  mudarStatus,
  toggleFoco,
  deletarTarefa,
  modalEditarDecisao,
  salvarDecisaoEditada,
  deletarDecisao,
  modalPermissoes,
  adicionarPerm,
  removerPerm,
  modalNovaTarefa,
  criarTarefa,
  modalEditarTarefa,
  salvarTarefa,
  renderTarefasHome,
  abrirTarefaContexto,
  continuarUltimaTarefa,
  setTarefasHomeBusca,
  setTarefasHomeOrigem,
  setTarefasHomeStatus,
  setTarefasHomeProjeto,
  fecharDetalheTarefaContexto,
  duplicarTarefa,
  quickAddMostrarStep2,
  quickAddCancelar,
  quickAddConfirmar,
  quickAddTarefa,
  filtrarTarefasBusca,
  exportarTempoProjetoCSV,
  modalColabsTarefa,
  sairTarefaCompartilhada,
  adicionarColab,
  removerColab,
  modalNovaDecisao,
  criarDecisao,
  aplicarFiltroOrigemProjeto,
  aplicarFiltroResponsavelProjeto,
  aplicarFiltroStatusProjeto,
  alternarListaConcluidasProjeto,
  // admin
  abrirCentralAdmin,
  renderTimelineHoje,
  exportarTempoAdminCSV,
  aplicarFiltroTempoAdmin,
  limparFiltroTempoAdmin,
  abrirUsuarioAdmin,
  modalNovoColega,
  promoverAdmin,
  modalNovoColega_legacy,
  criarColega,
  // auth
  fazerLogin,
  fazerSetup,
  fazerLogout,
  fazerCadastroPublico,
  modalCadastroPublico,
  modalTrocaSenhaObrigatoria,
  salvarSenhaObrigatoria,
  modalResetSenhaUsuario,
  resetarSenhaUsuario,
  toggleSenhaLogin,
  toggleSenhaSetup,
  toggleSenhaCadastro,
  toggleSenhaObrigatoria,
  toggleSenhaReset,
  // setters exposed for template string onclicks
  setNotifTab,
  setFiltroOrigemTarefas,
  setFiltroRespTar,
  setFiltroStatusTarefa,
  setTaskMobileFiltersOpen,
  setTarefasView,
  setListaConcluidasExpandida,
});
