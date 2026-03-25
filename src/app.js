// ── TELIER APP ENTRY POINT ──
// Imports all modules and exposes functions globally for onclick handlers

import * as state from './modules/state.js';
import * as api from './modules/api.js';
import * as auth from './modules/auth.js';
import * as ui from './modules/ui.js';
import * as utils from './modules/utils.js';
import * as dashboard from './modules/dashboard.js';

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load dashboard filters
    dashboard.carregarFiltrosDash?.();
    // Initialize auth and render appropriate view
    await auth.init();
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
window.renderDash = dashboard.renderDash;
window.setFiltro = dashboard.setFiltro;
window.filtrarProjetosBusca = dashboard.filtrarProjetosBusca;
window.filtrarGrupoDash = dashboard.filtrarGrupoDash;
window.filtrarOrigemDash = dashboard.filtrarOrigemDash;
window.toggleStartday = dashboard.toggleStartday;
window.renderCardsDash = dashboard.renderCardsDash;

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

// TODO: Import and expose additional modules as they are created
// - Project handlers
// - Task handlers
// - Timer handlers
// - Group handlers
// - Admin handlers
// - Notification handlers
// - Shortcut handlers
