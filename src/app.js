// ── APP ENTRY POINT ──
import {
  TOKEN, EU, NEEDS_SETUP, FORCE_PASSWORD_CHANGE, ADMIN_MODE, ADMIN_MODE_KEY,
  API,
  setToken, setEU, setNeedsSetup, setForcePasswordChange, setAdminMode, setNotifTab,
} from './modules/state.js';
import { req, invalidarCacheProjetos } from './modules/api.js';
import { toast, aplicarTema, alternarTema, fecharModal } from './modules/ui.js';
import { isAdminRole } from './modules/utils.js';
import { renderDash, carregarFiltrosDash, salvarFiltrosDash, renderInicioDia, toggleStartday, renderDashLoadingState, renderDashEmptyState, renderProjetosDash, renderCardsDash, filtrarProjetosBusca, filtrarGrupoDash, filtrarOrigemDash, setFiltro, getDragJustEnded, dragProjeto, dragProjetoEnd, dragGrupo, dragGrupoEnd, dragOver, dragLeave, dropProjeto, toggleGrupo } from './modules/dashboard.js';
import { abrirProjeto, voltarDash, renderProjeto, mudarAba, renderAba, renderProjetoAoVivo, recarregarProjeto, modalNovoProjeto, criarProjeto, modalEditarProjeto, salvarProjeto, deletarProjeto } from './modules/project.js';
import { abrirGrupo, renderGrupo, mudarAbaGrupo, renderAbaGrupo, renderGrupoAbaProjetos, renderGrupoAbaTarefas, renderGrupoAbaMapa, renderGrupoAbaAoVivo, renderGrupoAbaRelatorio, carregarTarefasGrupo, carregarAoVivoGrupo, carregarAoVivoProjeto, modalNovoGrupo, criarGrupo, modalEditarGrupo, compartilharGrupo, modalCompartilharGrupo, salvarGrupo, adicionarPermGrupo, removerPermGrupo, sairGrupoCompartilhado, sairProjetoCompartilhado, acaoGrupo, modalMoverTodosGrupo, deletarGrupo } from './modules/groups.js';
import { atualizarBadgeNotificacoes, filtrarNotificacoesPainel, renderPainelNotificacoes, carregarNotificacoes, iniciarPollNotificacoes, carregarStatus, iniciarStatusPoll, marcarNotifLida, marcarTodasNotifLidas, abrirNotificacoes, fecharPainelNotificacoes, carregarColegasAtivos, iniciarPollPresenca, renderPresenceDock, togglePresencePanel, fecharPresencePanelFora } from './modules/notifications.js';
import { carregarTimersAtivos, iniciarCronometro, pararCronometro, renderTimerWidget, expandirSessoes, adicionarDetalheTarefa, adicionarDetalheTarefaEnter, toggleDetalheTarefa, removerDetalheTarefa } from './modules/timer.js';
import { atualizarPrazoHint, renderColabsStack, renderAoVivoStream, renderAbaTarefas, renderKanbanInterno, criarTarefaKanban, renderListaInterna, ordenarLista, renderMapa, renderRelatorio, renderDecisoes, mudarStatus, toggleFoco, deletarTarefa, modalEditarDecisao, salvarDecisaoEditada, deletarDecisao, modalPermissoes, adicionarPerm, removerPerm, modalNovaTarefa, criarTarefa, modalEditarTarefa, salvarTarefa, duplicarTarefa, quickAddMostrarStep2, quickAddCancelar, quickAddConfirmar, quickAddTarefa, filtrarTarefasBusca, exportarTempoProjetoCSV, modalColabsTarefa, sairTarefaCompartilhada, adicionarColab, removerColab, modalNovaDecisao, criarDecisao } from './modules/tasks.js';
import { abrirCentralAdmin, renderTimelineHoje, exportarTempoAdminCSV, aplicarFiltroTempoAdmin, limparFiltroTempoAdmin, abrirUsuarioAdmin, modalNovoColega, promoverAdmin, modalNovoColega_legacy, criarColega } from './modules/admin.js';
import { fazerLogin, fazerSetup, fazerLogout, fazerCadastroPublico, modalCadastroPublico, modalTrocaSenhaObrigatoria, salvarSenhaObrigatoria, modalResetSenhaUsuario, resetarSenhaUsuario, toggleSenhaLogin, toggleSenhaSetup, toggleSenhaCadastro, toggleSenhaObrigatoria, toggleSenhaReset } from './modules/auth.js';
import { initShortcuts } from './modules/shortcuts.js';

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
  if (setupBtn) setupBtn.style.display = (tela === 'login' && NEEDS_SETUP) ? 'inline-flex' : 'none';
  if (btnNotifs && tela !== 'app') btnNotifs.style.display = 'none';
  if (tela === 'app') {
    document.getElementById('topbar-nome').textContent = EU?.nome || '';
    atualizarBadgeNotificacoes(0);
    iniciarStatusPoll();
    syncAdminModeUI();
    renderDash();
    if (FORCE_PASSWORD_CHANGE) {
      setTimeout(() => modalTrocaSenhaObrigatoria(), 120);
    }
  }
}

export function goHome() {
  invalidarCacheProjetos();
  renderDash();
}

export function syncAdminModeUI() {
  const btn = document.getElementById('btn-admin-toggle');
  if (!btn) return;
  if (!isAdminRole()) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'inline-flex';
  btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0"><path d="M1 4l3-3M1 4h4M11 8l-3 3M11 8H7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>${ADMIN_MODE === 'admin' ? 'Visão admin' : 'Visão membro'}`;
  btn.title = ADMIN_MODE === 'admin'
    ? 'Clique para usar o sistema como usuário normal'
    : 'Clique para voltar ao perfil admin';
}

export function alternarPerfilAdmin() {
  if (!isAdminRole()) return;
  const novoModo = ADMIN_MODE === 'admin' ? 'normal' : 'admin';
  setAdminMode(novoModo);
  localStorage.setItem(ADMIN_MODE_KEY, novoModo);
  syncAdminModeUI();
  toast(novoModo === 'admin' ? 'Modo admin ativado' : 'Modo membro ativado');
  renderDash();
}

// ── WINDOW EVENT HANDLERS ──
window.addEventListener('load', async () => {
  const temaSalvo = localStorage.getItem('ea_tema') || 'dark';
  aplicarTema(temaSalvo);
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
Object.defineProperty(window, '_dragJustEnded', {
  get() { return getDragJustEnded(); },
  configurable: true,
});

// ── EXPOSE ALL FUNCTIONS ON WINDOW ──
Object.assign(window, {
  // app
  mostrar,
  goHome,
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
  renderInicioDia,
  toggleStartday,
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
  expandirSessoes,
  adicionarDetalheTarefa,
  adicionarDetalheTarefaEnter,
  toggleDetalheTarefa,
  removerDetalheTarefa,
  // tasks
  atualizarPrazoHint,
  renderColabsStack,
  renderAoVivoStream,
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
});
