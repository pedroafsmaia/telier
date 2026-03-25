// ── ADMIN MODULE ──
// Admin panel and system management

import { req } from './api.js';
import { toast } from './ui.js';
import { esc } from './utils.js';

export async function abrirCentralAdmin(aba = 'resumo') {
  try {
    // TODO: Fetch admin data
    document.getElementById('content').innerHTML = `
      <div class="admin-panel">
        <h1>Central de Administração</h1>
        <div class="admin-nav">
          <button class="admin-nav-btn ${aba === 'resumo' ? 'ativo' : ''}">Resumo</button>
          <button class="admin-nav-btn ${aba === 'tempo' ? 'ativo' : ''}">Tempo</button>
          <button class="admin-nav-btn ${aba === 'usuarios' ? 'ativo' : ''}">Usuários</button>
          <button class="admin-nav-btn ${aba === 'relatorios' ? 'ativo' : ''}">Relatórios</button>
        </div>
        <div id="admin-content"></div>
      </div>`;
  } catch (e) {
    toast(e.message, 'erro');
  }
}

export async function abrirUsuarioAdmin(usuarioId) {
  // TODO: Implement user admin view
}

export async function exportarTempoAdminCSV(projetoId) {
  // TODO: Export time data as CSV
}

// Expose globally
if (typeof window !== 'undefined') {
  window.abrirCentralAdmin = abrirCentralAdmin;
  window.abrirUsuarioAdmin = abrirUsuarioAdmin;
  window.exportarTempoAdminCSV = exportarTempoAdminCSV;
}
