// ── TELIER APP ENTRY POINT ──
// Imports all modules and exposes functions globally for onclick handlers

import * as state from './modules/state.js';
import * as api from './modules/api.js';
import * as auth from './modules/auth.js';
import * as ui from './modules/ui.js';
import * as utils from './modules/utils.js';
import * as dashboard from './modules/dashboard.js';
import * as project from './modules/project.js';
import * as tasks from './modules/tasks.js';
import * as timer from './modules/timer.js';
import * as groups from './modules/groups.js';
import * as admin from './modules/admin.js';
import * as notifications from './modules/notifications.js';
import * as shortcuts from './modules/shortcuts.js';

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Setup keyboard shortcuts
    shortcuts.setupKeyboardShortcuts?.();
    // Load dashboard filters
    dashboard.carregarFiltrosDash?.();
    // Initialize auth and render appropriate view
    await auth.init();
    // Start notifications polling
    notifications.iniciarPollNotificacoes?.();
  } catch (error) {
    console.error('App initialization error:', error);
  }
});

// Expose module functions globally for onclick handlers
// Auth
window.fazerLogin = auth.fazerLogin;
window.fazerSetup = auth.fazerSetup;
window.fazerLogout = auth.fazerLogout;
window.fazerCadastroPublico = auth.fazerCadastroPublico;
window.modalCadastroPublico = auth.modalCadastroPublico;

// Dashboard
window.goHome = dashboard.goHome;
window.renderDash = dashboard.renderDash;
window.setFiltro = dashboard.setFiltro;
window.filtrarProjetosBusca = dashboard.filtrarProjetosBusca;
window.filtrarGrupoDash = dashboard.filtrarGrupoDash;
window.filtrarOrigemDash = dashboard.filtrarOrigemDash;
window.toggleStartday = dashboard.toggleStartday;
window.renderCardsDash = dashboard.renderCardsDash;

// Project & Groups
window.abrirProjeto = project.abrirProjeto;
window.voltarDash = project.voltarDash;
window.abrirGrupo = project.abrirGrupo;
window.renderProjeto = project.renderProjeto;
window.renderGrupo = project.renderGrupo;
window.mudarAba = project.mudarAba;
window.mudarAbaGrupo = project.mudarAbaGrupo;
window.modalNovoProjeto = project.modalNovoProjeto;
window.modalEditarProjeto = project.modalEditarProjeto;
window.modalPermissoes = project.modalPermissoes;
window.modalNovoGrupo = project.modalNovoGrupo;
window.modalEditarGrupo = project.modalEditarGrupo;
window.compartilharGrupo = project.compartilharGrupo;

// Tasks
window.renderKanban = tasks.renderKanban;
window.renderLista = tasks.renderLista;
window.renderMapa = tasks.renderMapa;
window.renderRelatorio = tasks.renderRelatorio;
window.mudarStatus = tasks.mudarStatus;
window.toggleFoco = tasks.toggleFoco;
window.deletarTarefa = tasks.deletarTarefa;
window.renderColabsStack = tasks.renderColabsStack;
window.ordenarLista = tasks.ordenarLista;
window.toggleListaConcluidas = tasks.toggleListaConcluidas;
window.modalNovaTarefa = tasks.modalNovaTarefa;
window.modalEditarTarefa = tasks.modalEditarTarefa;
window.abrirTarefa = tasks.abrirTarefa;
window.duplicarTarefa = tasks.duplicarTarefa;

// Timer
window.iniciarCronometro = timer.iniciarCronometro;
window.pararCronometro = timer.pararCronometro;
window.carregarTimersAtivos = timer.carregarTimersAtivos;
window.renderTimerDock = timer.renderTimerDock;
window.modalAdicionarIntervalo = timer.modalAdicionarIntervalo;
window.criarIntervalo = timer.criarIntervalo;
window.editarSessao = timer.editarSessao;
window.salvarSessao = timer.salvarSessao;
window.deletarSessao = timer.deletarSessao;
window.editarIntervalo = timer.editarIntervalo;
window.salvarIntervalo = timer.salvarIntervalo;
window.deletarIntervalo = timer.deletarIntervalo;
window.renderSessoesTarefa = timer.renderSessoesTarefa;

// Groups (drag & drop)
window.dragProjeto = groups.dragProjeto;
window.dragProjetoEnd = groups.dragProjetoEnd;
window.dragGrupo = groups.dragGrupo;
window.dragGrupoEnd = groups.dragGrupoEnd;
window.dragOver = groups.dragOver;
window.dragLeave = groups.dragLeave;
window.dropProjeto = groups.dropProjeto;
window.toggleGrupo = groups.toggleGrupo;

// Admin
window.abrirCentralAdmin = admin.abrirCentralAdmin;
window.abrirUsuarioAdmin = admin.abrirUsuarioAdmin;
window.exportarTempoAdminCSV = admin.exportarTempoAdminCSV;

// Notifications
window.carregarNotificacoes = notifications.carregarNotificacoes;
window.iniciarPollNotificacoes = notifications.iniciarPollNotificacoes;
window.marcarNotifLida = notifications.marcarNotifLida;
window.marcarTodasNotifLidas = notifications.marcarTodasNotifLidas;
window.abrirNotificacoes = notifications.abrirNotificacoes;
window.fecharPainelNotificacoes = notifications.fecharPainelNotificacoes;
window.renderPainelNotificacoes = notifications.renderPainelNotificacoes;

// Shortcuts & keyboard
window.setupKeyboardShortcuts = shortcuts.setupKeyboardShortcuts;
window.abrirCommandPalette = shortcuts.abrirCommandPalette;
window.fecharCommandPalette = shortcuts.fecharCommandPalette;
window.abrirModalAtalhos = shortcuts.abrirModalAtalhos;
window.toggleSenhaLogin = shortcuts.toggleSenhaLogin;
window.toggleSenhaSetup = shortcuts.toggleSenhaSetup;
window.toggleSenhaCadastro = shortcuts.toggleSenhaCadastro;
window.toggleSenhaObrigatoria = shortcuts.toggleSenhaObrigatoria;
window.toggleSenhaReset = shortcuts.toggleSenhaReset;

// UI
window.toast = ui.toast;
window.toastUndo = ui.toastUndo;
window.abrirModal = ui.abrirModal;
window.fecharModal = ui.fecharModal;
window.confirmar = ui.confirmar;
window.fecharOverlayModal = ui.fecharOverlayModal;
window.btnLoading = ui.btnLoading;
window.syncEyeButton = ui.syncEyeButton;
window.atualizarBadgeNotificacoes = ui.atualizarBadgeNotificacoes;
window.escapeHtml = ui.escapeHtml;
window.alternarTema = ui.alternarTema;
window.alternarPerfilAdmin = ui.alternarPerfilAdmin;
window.mostrar = ui.mostrar;

// Utils
window.esc = utils.esc;
window.iniciais = utils.iniciais;
window.avatar = utils.avatar;
window.prazoFmt = utils.prazoFmt;
window.diasRestantes = utils.diasRestantes;
window.tag = utils.tag;
window.fmtDuracao = utils.fmtDuracao;
window.fmtHoras = utils.fmtHoras;
window.eyeIconSvg = utils.eyeIconSvg;
window.debounce = utils.debounce;
