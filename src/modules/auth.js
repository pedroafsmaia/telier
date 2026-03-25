// ── AUTHENTICATION MODULE ──
// Login, logout, setup, registration, and auth-related functions

import { req, endpoints } from './api.js';
import { setToken, clearToken, setEU, clearEU, TOKEN, EU } from './state.js';
import { toast } from './ui.js';

export async function init() {
  // Check if user is already logged in
  if (TOKEN) {
    try {
      const user = await endpoints.me();
      setEU(user);
      mostrarApp();
    } catch (erro) {
      console.error('Auth error:', erro);
      clearAuth();
      mostrarLogin();
    }
  } else {
    // Check if setup is needed
    try {
      const { precisa_setup } = await endpoints.needsSetup();
      if (precisa_setup) {
        mostrarSetup();
      } else {
        mostrarLogin();
      }
    } catch {
      mostrarLogin();
    }
  }
}

export async function fazerLogin() {
  const usuario = document.getElementById('l-login')?.value;
  const senha = document.getElementById('l-senha')?.value;

  if (!usuario || !senha) {
    toast('Preencha usuário e senha', 'erro');
    return;
  }

  try {
    const btnLogin = document.getElementById('btn-login');
    btnLogin.classList.add('btn-loading');
    btnLogin.disabled = true;

    const { token, usuario: user } = await endpoints.login(usuario, senha);
    setToken(token);
    setEU(user);

    // Check if password change is required
    if (user.deve_trocar_senha) {
      mostrarSetup(true);
    } else {
      mostrarApp();
    }
  } catch (erro) {
    toast(`Erro ao fazer login: ${erro.message}`, 'erro');
  } finally {
    document.getElementById('btn-login')?.classList.remove('btn-loading');
    document.getElementById('btn-login').disabled = false;
  }
}

export async function fazerSetup(forceChange = false) {
  const nome = document.getElementById('s-nome')?.value;
  const senha = document.getElementById('s-senha')?.value;
  const confirma = document.getElementById('s-confirma')?.value;

  if (!nome || !senha || !confirma) {
    toast('Preencha todos os campos', 'erro');
    return;
  }

  if (senha !== confirma) {
    toast('Senhas não conferem', 'erro');
    return;
  }

  if (senha.length < 6) {
    toast('Senha deve ter pelo menos 6 caracteres', 'erro');
    return;
  }

  try {
    const btnSetup = document.getElementById('btn-setup');
    btnSetup.classList.add('btn-loading');
    btnSetup.disabled = true;

    if (forceChange) {
      // Change existing password
      await req('POST', '/auth/trocar-senha', { nova_senha: senha });
      setEU({ ...EU, deve_trocar_senha: 0 });
      toast('Senha alterada com sucesso', 'ok');
      mostrarApp();
    } else {
      // Initial setup
      const { token, usuario: user } = await endpoints.setup(nome, senha);
      setToken(token);
      setEU(user);
      toast('Setup realizado com sucesso', 'ok');
      mostrarApp();
    }
  } catch (erro) {
    toast(`Erro ao fazer setup: ${erro.message}`, 'erro');
  } finally {
    document.getElementById('btn-setup')?.classList.remove('btn-loading');
    document.getElementById('btn-setup').disabled = false;
  }
}

export async function fazerLogout() {
  try {
    await endpoints.logout();
  } catch {}

  clearAuth();
  mostrarLogin();
  toast('Logout realizado', 'ok');
}

export async function modalCadastroPublico() {
  const html = `
    <form style="display: flex; flex-direction: column; gap: 12px;">
      <input type="text" id="cadastro-nome" placeholder="Nome completo" class="input-control" />
      <input type="email" id="cadastro-email" placeholder="Email" class="input-control" />
      <input type="password" id="cadastro-senha" placeholder="Senha" class="input-control" />
      <input type="password" id="cadastro-confirma" placeholder="Confirmar senha" class="input-control" />
      <button type="button" class="btn btn-primary" onclick="fazerCadastroPublico()" id="btn-cadastro">
        Cadastrar
      </button>
    </form>
  `;

  // Import abrirModal here to avoid circular dependency
  // This will be handled in app.js when all modules are loaded
  console.log('Modal cadastro público preparado');
}

export async function fazerCadastroPublico() {
  const nome = document.getElementById('cadastro-nome')?.value;
  const email = document.getElementById('cadastro-email')?.value;
  const senha = document.getElementById('cadastro-senha')?.value;
  const confirma = document.getElementById('cadastro-confirma')?.value;

  if (!nome || !email || !senha || !confirma) {
    toast('Preencha todos os campos', 'erro');
    return;
  }

  if (senha !== confirma) {
    toast('Senhas não conferem', 'erro');
    return;
  }

  try {
    const btnCadastro = document.getElementById('btn-cadastro');
    btnCadastro.classList.add('btn-loading');
    btnCadastro.disabled = true;

    await endpoints.register(nome, email, senha);
    toast('Cadastro realizado! Faça login para continuar.', 'ok');
    // Close modal and go back to login
    document.querySelector('.modal-overlay')?.remove();
  } catch (erro) {
    toast(`Erro ao cadastrar: ${erro.message}`, 'erro');
  } finally {
    document.getElementById('btn-cadastro')?.classList.remove('btn-loading');
    document.getElementById('btn-cadastro').disabled = false;
  }
}

export function clearAuth() {
  clearToken();
  clearEU();
}

export function isAdminRole() {
  return EU?.papel === 'admin';
}

export function isAdmin() {
  // Import from state when available
  // For now, just check admin role
  return isAdminRole();
}

// Helper functions to show/hide pages
function mostrarLogin() {
  document.getElementById('page-login')?.classList.remove('hidden');
  document.getElementById('page-setup')?.classList.add('hidden');
  document.getElementById('page-app')?.classList.add('hidden');
}

function mostrarSetup(forceChange = false) {
  document.getElementById('page-login')?.classList.add('hidden');
  document.getElementById('page-setup')?.classList.remove('hidden');
  document.getElementById('page-app')?.classList.add('hidden');

  if (forceChange) {
    const setupTitle = document.querySelector('#page-setup h1');
    if (setupTitle) setupTitle.textContent = 'Alterar Senha';
  }
}

function mostrarApp() {
  document.getElementById('page-login')?.classList.add('hidden');
  document.getElementById('page-setup')?.classList.add('hidden');
  document.getElementById('page-app')?.classList.remove('hidden');
}

// Expose globally for onclick handlers (temporary, will be handled in app.js)
if (typeof window !== 'undefined') {
  window.fazerLogin = fazerLogin;
  window.fazerSetup = fazerSetup;
  window.fazerLogout = fazerLogout;
  window.fazerCadastroPublico = fazerCadastroPublico;
  window.isAdmin = isAdmin;
}
