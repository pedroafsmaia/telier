// ── SHORTCUTS MODULE ──
// Keyboard shortcuts and command palette

import { _projsDash, TAREFAS, PROJETO, VISTA_ATUAL } from './state.js';
import { debounce } from './utils.js';

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', handleGlobalKeyDown);
}

function handleGlobalKeyDown(e) {
  // Cmd/Ctrl + K: Open command palette
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    abrirCommandPalette();
    return;
  }

  // Cmd/Ctrl + /: Toggle help
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    abrirModalAtalhos();
    return;
  }

  // Escape: Close modals
  if (e.key === 'Escape') {
    fecharCommandPalette();
  }
}

export function abrirCommandPalette() {
  // Check if already open
  if (document.querySelector('.cmd-palette-overlay.open')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'cmd-palette-overlay open';
  overlay.innerHTML = `
    <div class="cmd-palette">
      <input type="text" class="cmd-palette-input" placeholder="Buscar projetos, tarefas, ações..." autofocus>
      <div class="cmd-palette-results"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('.cmd-palette-input');
  const resultsEl = overlay.querySelector('.cmd-palette-results');
  let selectedIndex = 0;
  let items = [];

  const performSearch = debounce((query) => {
    selectedIndex = 0;
    items = [];

    if (!query.trim()) {
      renderDefaultActions(resultsEl, items);
      return;
    }

    const q = query.toLowerCase();

    // Search projects
    if (_projsDash && Array.isArray(_projsDash)) {
      _projsDash.forEach(proj => {
        if (proj.nome.toLowerCase().includes(q)) {
          items.push({
            type: 'project',
            icon: '📋',
            label: proj.nome,
            detail: 'Projeto',
            action: () => {
              window.abrirProjeto(proj.id);
              fecharCommandPalette();
            }
          });
        }
      });
    }

    // Search tasks if in project
    if (TAREFAS && Array.isArray(TAREFAS)) {
      TAREFAS.forEach(tarefa => {
        if (tarefa.nome.toLowerCase().includes(q)) {
          items.push({
            type: 'task',
            icon: '✓',
            label: tarefa.nome,
            detail: 'Tarefa',
            action: () => {
              window.abrirTarefa?.(tarefa.id);
              fecharCommandPalette();
            }
          });
        }
      });
    }

    // Add action suggestions
    if ('novo'.includes(q)) {
      items.push({
        type: 'action',
        icon: '➕',
        label: 'Novo projeto',
        detail: 'Ação',
        action: () => {
          window.modalNovoProjeto?.();
          fecharCommandPalette();
        }
      });
    }

    if ('novo'.includes(q) && PROJETO) {
      items.push({
        type: 'action',
        icon: '➕',
        label: 'Nova tarefa',
        detail: 'Ação',
        action: () => {
          window.modalNovaTarefa?.(PROJETO.id);
          fecharCommandPalette();
        }
      });
    }

    if ('dashboard'.includes(q) || 'dashboard'.includes(q)) {
      items.push({
        type: 'action',
        icon: '🏠',
        label: 'Ir para dashboard',
        detail: 'Ação',
        action: () => {
          window.goHome?.();
          fecharCommandPalette();
        }
      });
    }

    renderResults(resultsEl, items, selectedIndex);
  });

  input.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % Math.max(items.length, 1);
      updateSelected(resultsEl, selectedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1);
      updateSelected(resultsEl, selectedIndex);
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      items[selectedIndex].action?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fecharCommandPalette();
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      fecharCommandPalette();
    }
  });

  // Show default actions on open
  renderDefaultActions(resultsEl, items);
}

function renderDefaultActions(el, items) {
  items.length = 0;
  items.push({
    type: 'action',
    icon: '⌘',
    label: 'Novo projeto',
    detail: 'Ação',
    action: () => {
      window.modalNovoProjeto?.();
      fecharCommandPalette();
    }
  });

  if (PROJETO) {
    items.push({
      type: 'action',
      icon: '➕',
      label: 'Nova tarefa',
      detail: 'Ação',
      action: () => {
        window.modalNovaTarefa?.(PROJETO.id);
        fecharCommandPalette();
      }
    });
  }

  items.push({
    type: 'action',
    icon: '🏠',
    label: 'Dashboard',
    detail: 'Ação',
    action: () => {
      window.goHome?.();
      fecharCommandPalette();
    }
  });

  items.push({
    type: 'action',
    icon: '?',
    label: 'Atalhos de teclado',
    detail: 'Ajuda',
    action: () => {
      abrirModalAtalhos();
      fecharCommandPalette();
    }
  });

  renderResults(el, items, 0);
}

function renderResults(el, items, selectedIndex) {
  el.innerHTML = items.map((item, i) => `
    <div class="cmd-palette-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}">
      <span class="cmd-palette-item-icon">${item.icon}</span>
      <span class="cmd-palette-item-text">${item.label}</span>
      <span class="cmd-palette-item-type">${item.detail}</span>
    </div>
  `).join('');

  // Add click handlers
  el.querySelectorAll('.cmd-palette-item').forEach((elem, i) => {
    elem.addEventListener('click', () => {
      items[i]?.action?.();
    });
  });
}

function updateSelected(el, selectedIndex) {
  el.querySelectorAll('.cmd-palette-item').forEach((item, i) => {
    item.classList.toggle('selected', i === selectedIndex);
  });
}

export function fecharCommandPalette() {
  const overlay = document.querySelector('.cmd-palette-overlay');
  if (overlay) {
    overlay.remove();
  }
}

export function abrirModalAtalhos() {
  const html = `
    <div style="padding:24px;">
      <h2 style="margin:0 0 24px 0;font-size:1.4rem;font-weight:600">Atalhos de Teclado</h2>
      <div style="display:grid;gap:12px;font-size:var(--fs-090)">
        <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg3);border-radius:var(--r);padding:10px 12px">
          <span style="font-family:monospace;color:var(--text3)">Cmd/Ctrl + K</span>
          <span>Abrir command palette</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg3);border-radius:var(--r);padding:10px 12px">
          <span style="font-family:monospace;color:var(--text3)">Cmd/Ctrl + /</span>
          <span>Abrir atalhos</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg3);border-radius:var(--r);padding:10px 12px">
          <span style="font-family:monospace;color:var(--text3)">Esc</span>
          <span>Fechar modal</span>
        </div>
        <div style="margin-top:12px;padding:12px;background:var(--bg3);border-radius:var(--r);font-size:var(--fs-080);color:var(--text3)">
          <strong>Dica:</strong> Use a command palette para navegar rapidamente entre projetos e tarefas.
        </div>
      </div>
    </div>
  `;

  window.abrirModal?.(html, { titulo: 'Atalhos de Teclado' });
}

export function toggleSenhaLogin(btn) {
  const input = btn.previousElementSibling;
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.title = isPassword ? 'Ocultar senha' : 'Mostrar senha';
}

export function toggleSenhaSetup(btn) {
  const input = btn.closest('.form-row')?.querySelector('input[type="password"]');
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  btn.title = isPassword ? 'Ocultar senha' : 'Mostrar senha';
}

export function toggleSenhaCadastro(btn) {
  toggleSenhaSetup(btn);
}

export function toggleSenhaObrigatoria(btn) {
  toggleSenhaSetup(btn);
}

export function toggleSenhaReset(btn) {
  toggleSenhaSetup(btn);
}

// Expose globally
if (typeof window !== 'undefined') {
  window.setupKeyboardShortcuts = setupKeyboardShortcuts;
  window.abrirCommandPalette = abrirCommandPalette;
  window.fecharCommandPalette = fecharCommandPalette;
  window.abrirModalAtalhos = abrirModalAtalhos;
  window.toggleSenhaLogin = toggleSenhaLogin;
  window.toggleSenhaSetup = toggleSenhaSetup;
  window.toggleSenhaCadastro = toggleSenhaCadastro;
  window.toggleSenhaObrigatoria = toggleSenhaObrigatoria;
  window.toggleSenhaReset = toggleSenhaReset;
}
