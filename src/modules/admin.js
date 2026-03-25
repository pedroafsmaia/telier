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
  toast('Funcionalidade em desenvolvimento', 'info');
}

export async function exportarTempoAdminCSV(projetoId) {
  toast('Funcionalidade em desenvolvimento', 'info');
}

export async function modalNovoColega() {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Cadastrar Colega</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Cadastrar Colega' });
}

// Expose globally
if (typeof window !== 'undefined') {
  window.abrirCentralAdmin = abrirCentralAdmin;
  window.abrirUsuarioAdmin = abrirUsuarioAdmin;
  window.exportarTempoAdminCSV = exportarTempoAdminCSV;
  window.modalNovoColega = modalNovoColega;
}
