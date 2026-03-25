// ── AUTH ──
import {
  TOKEN, EU, ADMIN_MODE, ADMIN_MODE_KEY, NEEDS_SETUP, TIMERS, FORCE_PASSWORD_CHANGE,
  _presenceTick, _notifTick, COLEGAS_ATIVOS, PRESENCE_ABERTO, NOTIFS,
  setToken, setEU, setAdminMode, setNeedsSetup, setForcePasswordChange,
  setColegasAtivos, setPresenceAberto, setNotifs, setPresenceTick, setNotifTick,
  setLastNotifSeen, setPresenceHintShown,
} from './state.js';
import { req } from './api.js';
import { toast, abrirModal, fecharModal, btnLoading } from './ui.js';
import { esc, gv, isAdminRole, isAdmin } from './utils.js';

export function eyeIconSvg(isVisible, size = 16, stroke = 1.6) {
  const slash = isVisible
    ? `<path d="M3 3l18 18" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"/>`
    : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" stroke-width="${stroke}"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="${stroke}"/>${slash}</svg>`;
}

export function syncEyeButton(btn, isVisible) {
  if (!btn) return;
  const size = Number(btn.dataset.eyeSize || 16);
  const stroke = Number(btn.dataset.eyeStroke || 1.6);
  btn.innerHTML = eyeIconSvg(isVisible, size, stroke);
  btn.classList.toggle('is-visible', isVisible);
  const label = isVisible ? 'Ocultar senha' : 'Mostrar senha';
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

export function toggleSenhaLogin(btn) {
  const input = document.getElementById('l-senha');
  if (!input) return;
  const isVisible = input.type === 'password';
  input.type = isVisible ? 'text' : 'password';
  syncEyeButton(btn || document.getElementById('l-eye'), isVisible);
}

export function toggleSenhaSetup(btn) {
  const input = document.getElementById('s-senha');
  if (!input) return;
  const isVisible = input.type === 'password';
  input.type = isVisible ? 'text' : 'password';
  syncEyeButton(btn, isVisible);
}

export function toggleSenhaCadastro(btn) {
  const input = document.getElementById('r-senha');
  if (!input) return;
  const isVisible = input.type === 'password';
  input.type = isVisible ? 'text' : 'password';
  syncEyeButton(btn, isVisible);
}

export function toggleSenhaObrigatoria(btn) {
  const first = document.getElementById('m-senha-atual-obg');
  if (!first) return;
  const isVisible = first.type === 'password';
  const t = isVisible ? 'text' : 'password';
  ['m-senha-atual-obg','m-senha-nova-obg','m-senha-nova2-obg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.type = t;
  });
  syncEyeButton(btn, isVisible);
}

export function toggleSenhaReset(btn) {
  const input = document.getElementById('m-reset-senha');
  if (!input) return;
  const isVisible = input.type === 'password';
  input.type = isVisible ? 'text' : 'password';
  syncEyeButton(btn, isVisible);
}

export async function fazerLogin() {
  // Import here to avoid circular dependencies
  const { mostrar } = await import('./app.js');
  const { carregarTimersAtivos } = await import('./timer.js');
  const { iniciarStatusPoll } = await import('./notifications.js');

  const errEl = document.getElementById('login-err');
  errEl.classList.add('hidden');
  btnLoading('btn-login', true);
  try {
    const r = await req('POST', '/auth/login', {
      usuario_login: document.getElementById('l-login').value.trim(),
      senha: document.getElementById('l-senha').value,
    });
    setToken(r.token);
    setEU(r.usuario);
    setForcePasswordChange(!!r.must_change_password || Number(r?.usuario?.deve_trocar_senha || 0) === 1);
    localStorage.setItem('ea_token', r.token);
    localStorage.setItem('ea_user', JSON.stringify(r.usuario));
    if (!isAdminRole()) {
      setAdminMode('normal');
      localStorage.setItem(ADMIN_MODE_KEY, 'normal');
    }
    mostrar('app');
    carregarTimersAtivos();
    iniciarStatusPoll();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
    btnLoading('btn-login', false);
  }
}

export function modalCadastroPublico() {
  abrirModal(`
    <h2>Criar minha conta</h2>
    <p class="modal-copy">Crie seu usuário para acessar o sistema. Depois você pode criar projetos e convidar colaboradores.</p>
    <div class="form-row"><label>Nome completo</label><input id="r-nome" placeholder="Ex: Ana Souza"></div>
    <div class="form-row"><label>Usuário</label><input type="text" id="r-login" placeholder="ex: ana_souza" autocomplete="off"></div>
    <div class="form-row"><label>Senha</label><div style="position:relative"><input type="password" id="r-senha" placeholder="Defina sua senha"><button type="button" class="eye-toggle" data-eye-size="18" data-eye-stroke="1.8" onclick="toggleSenhaCadastro(this)" aria-label="Mostrar senha" title="Mostrar senha"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-reg" onclick="fazerCadastroPublico()">Criar conta</button>
    </div>`);
}

export async function fazerCadastroPublico() {
  const nome = gv('r-nome').trim();
  const usuario_login = gv('r-login').trim();
  const senha = gv('r-senha');
  if (!nome || !usuario_login || !senha) { toast('Preencha todos os campos', 'err'); return; }
  btnLoading('btn-reg', true);
  try {
    await req('POST', '/auth/register', { nome, usuario_login, senha });
    fecharModal();
    toast('Conta criada. Faça login para continuar.');
    document.getElementById('l-login').value = usuario_login;
    document.getElementById('l-senha').focus();
  } catch (e) {
    toast(e.message, 'err');
    btnLoading('btn-reg', false);
  }
}

export function modalTrocaSenhaObrigatoria() {
  if (!FORCE_PASSWORD_CHANGE || document.getElementById('m-senha-atual-obg')) return;
  abrirModal(`
    <h2>Atualize sua senha</h2>
    <p class="modal-copy">Por segurança, você precisa trocar sua senha antes de continuar.</p>
    <div class="form-row"><label>Senha atual</label><input id="m-senha-atual-obg" type="password" autocomplete="current-password"></div>
    <div class="form-row"><label>Nova senha</label><input id="m-senha-nova-obg" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres"></div>
    <div class="form-row"><label>Confirmar nova senha</label><div style="position:relative"><input id="m-senha-nova2-obg" type="password" autocomplete="new-password"><button type="button" class="eye-toggle" data-eye-size="18" data-eye-stroke="1.8" onclick="toggleSenhaObrigatoria(this)" aria-label="Mostrar senha" title="Mostrar senha"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>
    <div class="modal-footer">
      <button class="btn btn-primary" id="btn-salvar-senha-obg" onclick="salvarSenhaObrigatoria()">Salvar nova senha</button>
    </div>
  `, { locked: true });
}

export async function salvarSenhaObrigatoria() {
  const atual = gv('m-senha-atual-obg');
  const nova = gv('m-senha-nova-obg');
  const nova2 = gv('m-senha-nova2-obg');
  if (!atual || !nova || !nova2) { toast('Preencha todos os campos', 'err'); return; }
  if (nova !== nova2) { toast('As novas senhas não coincidem', 'err'); return; }
  if (nova.length < 8) { toast('A nova senha deve ter no mínimo 8 caracteres', 'err'); return; }
  btnLoading('btn-salvar-senha-obg', true);
  try {
    await req('POST', '/auth/trocar-senha', { senha_atual: atual, nova_senha: nova });
    setForcePasswordChange(false);
    if (EU) {
      EU.deve_trocar_senha = 0;
      localStorage.setItem('ea_user', JSON.stringify(EU));
    }
    fecharModal();
    toast('Senha atualizada com sucesso');
  } catch (e) {
    toast(e.message, 'err');
    btnLoading('btn-salvar-senha-obg', false);
  }
}

export function modalResetSenhaUsuario(usuarioId, nomeUsuario) {
  abrirModal(`
    <h2>Redefinir senha</h2>
    <p class="modal-copy">Defina uma senha temporária para <strong>${esc(nomeUsuario)}</strong>. A sessão atual do usuário será encerrada.</p>
    <div class="form-row"><label>Nova senha temporária</label><div style="position:relative"><input id="m-reset-senha" type="password" placeholder="Mínimo 8 caracteres"><button type="button" class="eye-toggle" data-eye-size="18" data-eye-stroke="1.8" onclick="toggleSenhaReset(this)" aria-label="Mostrar senha" title="Mostrar senha"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>
    <div class="form-row" style="margin-top:-10px;margin-bottom:12px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0">
        <input type="checkbox" id="m-reset-obrigar" checked style="width:auto">
        <span>Exigir troca no próximo login</span>
      </label>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-reset-senha" onclick="resetarSenhaUsuario('${usuarioId}')">Salvar senha</button>
    </div>
  `);
}

export async function resetarSenhaUsuario(usuarioId) {
  const nova = gv('m-reset-senha');
  const exigir = !!document.getElementById('m-reset-obrigar')?.checked;
  if (!nova || nova.length < 8) { toast('Senha deve ter no mínimo 8 caracteres', 'err'); return; }
  btnLoading('btn-reset-senha', true);
  try {
    await req('PUT', `/usuarios/${usuarioId}/senha`, { nova_senha: nova, exigir_troca: exigir });
    fecharModal();
    toast('Senha redefinida com sucesso');
  } catch (e) {
    toast(e.message, 'err');
    btnLoading('btn-reset-senha', false);
  }
}

export async function fazerSetup() {
  const errEl = document.getElementById('setup-err');
  errEl.classList.add('hidden');
  btnLoading('btn-setup', true);
  try {
    await req('POST', '/auth/setup', {
      nome: document.getElementById('s-nome').value.trim(),
      usuario_login: document.getElementById('s-login').value.trim(),
      senha: document.getElementById('s-senha').value,
    });
    toast('Conta criada com sucesso!');
    const { mostrar } = await import('./app.js');
    mostrar('login');
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
    btnLoading('btn-setup', false);
  }
}

export async function fazerLogout() {
  const timersAtivos = Object.keys(TIMERS).length;
  if (timersAtivos > 0) {
    const plural = timersAtivos === 1 ? '1 cronômetro ativo' : `${timersAtivos} cronômetros ativos`;
    if (!confirm(`Você tem ${plural}. Os cronômetros continuarão rodando no servidor. Deseja sair mesmo assim?`)) return;
  }
  if (_presenceTick) clearInterval(_presenceTick);
  if (_notifTick) clearInterval(_notifTick);
  if (window._statusTick) clearInterval(window._statusTick);
  if (window._presenceDisplayTick) clearInterval(window._presenceDisplayTick);
  setColegasAtivos([]);
  setPresenceAberto(false);
  setNotifs([]);
  setLastNotifSeen(0);

  const { atualizarBadgeNotificacoes } = await import('./notifications.js');
  atualizarBadgeNotificacoes(0);
  setPresenceHintShown(false);
  const pd = document.getElementById('presence-dock');
  if (pd) pd.innerHTML = '';
  try { await req('POST', '/auth/logout'); } catch {}
  setToken(null);
  setEU(null);
  setForcePasswordChange(false);
  localStorage.removeItem('ea_token');
  localStorage.removeItem('ea_user');
  localStorage.removeItem(ADMIN_MODE_KEY);
  setAdminMode('admin');
  const { mostrar } = await import('./app.js');
  mostrar('login');
}
