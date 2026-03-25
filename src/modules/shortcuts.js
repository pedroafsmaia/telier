// ── SHORTCUTS MODULE ──
// Keyboard shortcuts and command palette

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
    // TODO: Show keyboard shortcuts
    return;
  }

  // Escape: Close modals
  if (e.key === 'Escape') {
    fecharModal();
  }
}

export function abrirCommandPalette() {
  // TODO: Implement command palette
  console.log('Command palette: TODO');
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
  window.toggleSenhaLogin = toggleSenhaLogin;
  window.toggleSenhaSetup = toggleSenhaSetup;
  window.toggleSenhaCadastro = toggleSenhaCadastro;
  window.toggleSenhaObrigatoria = toggleSenhaObrigatoria;
  window.toggleSenhaReset = toggleSenhaReset;
}
