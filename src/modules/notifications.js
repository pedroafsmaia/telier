// ── NOTIFICATIONS ──
import {
  TOKEN, NOTIFS, NOTIF_TAB, COLEGAS_ATIVOS, PRESENCE_ABERTO,
  _presenceTick, _presenceHintShown, _lastNotifSeen, _notifTick,
  setNotifs, setNotifTab, setColegasAtivos, setPresenceAberto,
  setPresenceHintShown, setLastNotifSeen, setPresenceTick, setNotifTick,
} from './state.js';
import { req } from './api.js';
import { toast } from './ui.js';
import { esc, fmtDuracao, avatar } from './utils.js';

export function atualizarBadgeNotificacoes(total) {
  const btn = document.getElementById('btn-notifs');
  const badge = document.getElementById('notif-badge');
  if (!btn || !badge) return;
  btn.style.display = TOKEN ? 'inline-flex' : 'none';
  const n = Number(total || 0);
  const txt = n > 99 ? '99+' : String(n);
  badge.textContent = txt;
  badge.classList.toggle('hidden', n <= 0);
}

export function filtrarNotificacoesPainel(itens) {
  if (NOTIF_TAB === 'todas') return itens;
  if (NOTIF_TAB === 'prazos') {
    return itens.filter(n => n.tipo === 'timer_longo');
  }
  if (NOTIF_TAB === 'compartilhamentos') {
    return itens.filter(n => (n.tipo || '').includes('compartilhamento'));
  }
  return itens;
}

export function renderPainelNotificacoes() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const itens = filtrarNotificacoesPainel(NOTIFS || []);
  const lista = itens.map(n => {
    const rawDate = String(n.criado_em || '').trim();
    const parsedDate = rawDate ? new Date(rawDate.replace(' ', 'T') + 'Z') : null;
    const dataFmt = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
      : 'Data indisponível';
    const onOpen = n.escopo === 'projeto' && n.entidade_id
      ? `marcarNotifLida('${n.id}', () => { fecharPainelNotificacoes(); abrirProjeto('${n.entidade_id}'); })`
      : `marcarNotifLida('${n.id}')`;
    return `<div class="notif-item ${n.lida_em ? '' : 'nao-lida'}" onclick="${onOpen}">
      <div class="notif-item-head">
        <div class="notif-title">${esc(n.titulo || 'Notificação')}</div>
        <div class="notif-stamp">${esc(dataFmt)}</div>
      </div>
      <div class="notif-meta">${n.ator_nome ? `por ${esc(n.ator_nome)}` : 'Sistema'}</div>
      ${n.mensagem ? `<div class="notif-msg">${esc(n.mensagem)}</div>` : ''}
    </div>`;
  }).join('') || '<div class="empty-state is-plain"><div class="empty-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div><div class="empty-text">Tudo limpo por aqui</div><div class="empty-sub">Sem notificações nesta aba.</div></div>';

  panel.innerHTML = `
    <div class="notif-panel-head">
      <div>
        <div class="section-kicker">Comunicações</div>
        <div class="notif-panel-title">Notificações</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="fecharPainelNotificacoes()">Fechar</button>
    </div>
    <div class="notif-tabs">
      <button class="notif-tab ${NOTIF_TAB==='compartilhamentos'?'ativo':''}" onclick="setNotifTab('compartilhamentos');renderPainelNotificacoes()">Compartilhamentos</button>
      <button class="notif-tab ${NOTIF_TAB==='prazos'?'ativo':''}" onclick="setNotifTab('prazos');renderPainelNotificacoes()">Alertas</button>
      <button class="notif-tab ${NOTIF_TAB==='todas'?'ativo':''}" onclick="setNotifTab('todas');renderPainelNotificacoes()">Todas</button>
    </div>
    <div class="notif-panel-body">
      <div class="notif-list">${lista}</div>
    </div>
    <div class="notif-panel-footer">
      <button class="btn btn-ghost" onclick="carregarNotificacoes(true)">Atualizar</button>
      <button class="btn btn-primary" onclick="marcarTodasNotifLidas()">Marcar todas como lidas</button>
    </div>`;
}

export async function carregarNotificacoes(silencioso = true) {
  if (!TOKEN) {
    setNotifs([]);
    atualizarBadgeNotificacoes(0);
    return;
  }
  try {
    const data = await req('GET', '/notificacoes');
    const itens = Array.isArray(data?.itens) ? data.itens : [];
    const naoLidas = Number(data?.nao_lidas || 0);
    const novoMaisRecente = itens.length ? Date.parse(String(itens[0].criado_em || '').replace(' ', 'T') + 'Z') : 0;
    if (_lastNotifSeen && novoMaisRecente > _lastNotifSeen && !silencioso) {
      const ult = itens[0];
      if (ult?.titulo) toast(ult.titulo);
    }
    setLastNotifSeen(Math.max(_lastNotifSeen, Number.isFinite(novoMaisRecente) ? novoMaisRecente : 0));
    setNotifs(itens);
    atualizarBadgeNotificacoes(naoLidas);
    if (document.getElementById('notif-panel')?.classList.contains('aberto')) {
      renderPainelNotificacoes();
    }
  } catch (e) {
    if (!silencioso) toast(e.message, 'err');
  }
}

export function iniciarPollNotificacoes() {
  if (!TOKEN) return;
  if (_notifTick) clearInterval(_notifTick);
  req('POST', '/notificacoes/gerar-automaticas').catch(() => {});
  carregarNotificacoes(true);
  setNotifTick(setInterval(() => {
    req('POST', '/notificacoes/gerar-automaticas').catch(() => {});
    carregarNotificacoes(false);
  }, 30000));
}

export async function carregarStatus() {
  try {
    const data = await req('GET', '/status');
    setColegasAtivos(Array.isArray(data.colegas_ativos) ? data.colegas_ativos : []);
    renderPresenceDock();
    atualizarBadgeNotificacoes(data.notifs_nao_lidas);
  } catch {}
}

export function iniciarStatusPoll() {
  if (!TOKEN) return;
  if (window._statusTick) clearInterval(window._statusTick);
  carregarStatus();
  window._statusTick = setInterval(carregarStatus, 30000);
}

export async function marcarNotifLida(id, abrirLink = null) {
  try {
    await req('PUT', `/notificacoes/${id}/lida`, {});
    await carregarNotificacoes(true);
    if (abrirLink) abrirLink();
  } catch (e) {
    toast(e.message, 'err');
  }
}

export async function marcarTodasNotifLidas() {
  try {
    await req('PUT', '/notificacoes/lidas', {});
    await carregarNotificacoes(true);
    toast('Notificações marcadas como lidas');
    renderPainelNotificacoes();
  } catch (e) {
    toast(e.message, 'err');
  }
}

export function abrirNotificacoes() {
  const panel = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (!panel || !overlay) return;
  panel.classList.add('aberto');
  panel.setAttribute('aria-hidden', 'false');
  overlay.classList.add('aberto');
  renderPainelNotificacoes();
}

export function fecharPainelNotificacoes() {
  const panel = document.getElementById('notif-panel');
  const overlay = document.getElementById('notif-overlay');
  if (!panel || !overlay) return;
  panel.classList.remove('aberto');
  panel.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('aberto');
}

export async function carregarColegasAtivos() {
  if (!TOKEN) {
    setColegasAtivos([]);
    setPresenceHintShown(false);
    renderPresenceDock();
    return;
  }
  try {
    const data = await req('GET', '/tempo/colegas-ativos');
    setColegasAtivos(Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : []);
    if (!COLEGAS_ATIVOS.length && !_presenceHintShown) {
      setPresenceHintShown(true);
      toast('Nenhum colaborador ativo agora');
    }
    if (COLEGAS_ATIVOS.length) setPresenceHintShown(false);
    renderPresenceDock();
  } catch {
    setColegasAtivos([]);
    renderPresenceDock();
  }
}

export function iniciarPollPresenca() {
  if (!TOKEN) return;
  if (_presenceTick) clearInterval(_presenceTick);
  setPresenceTick(setInterval(carregarColegasAtivos, 30000));
  carregarColegasAtivos();
}

export function renderPresenceDock() {
  const dock = document.getElementById('presence-dock');
  if (!dock) return;
  document.body.classList.toggle('has-presence', COLEGAS_ATIVOS.length > 0);
  const topbarPresence = document.getElementById('topbar-presence');
  if (topbarPresence) {
    if (COLEGAS_ATIVOS.length > 0) {
      const avatarsHtml = COLEGAS_ATIVOS.slice(0, 3)
        .map(c => avatar(c.usuario_nome, 'avatar-sm')).join('');
      topbarPresence.innerHTML = `
        <button class="topbar-presence-chip"
                onclick="togglePresencePanel()"
                title="${COLEGAS_ATIVOS.length} colega(s) online">
          <span class="presence-live-dot"></span>
          <div class="topbar-presence-avatars">${avatarsHtml}</div>
          <span class="topbar-presence-count">${COLEGAS_ATIVOS.length}</span>
        </button>`;
      topbarPresence.style.display = '';
    } else {
      topbarPresence.style.display = 'none';
    }
  }
  if (!COLEGAS_ATIVOS.length) {
    clearInterval(window._presenceDisplayTick);
    dock.innerHTML = '';
    return;
  }

  const avatarsHtml = COLEGAS_ATIVOS.slice(0, 3)
    .map(c => avatar(c.usuario_nome, 'avatar-sm')).join('');

  const toggleHtml = `
    <button class="presence-toggle" onclick="togglePresencePanel()" title="Colaboradores ativos agora">
      <div class="presence-online-dot"></div>
      <div class="presence-toggle-avatars">${avatarsHtml}</div>
      <span class="presence-count">${COLEGAS_ATIVOS.length} ativo${COLEGAS_ATIVOS.length === 1 ? '' : 's'}</span>
    </button>`;

  if (!PRESENCE_ABERTO) { dock.innerHTML = toggleHtml; return; }

  const itemsHtml = COLEGAS_ATIVOS.map(c => {
    const inicioIso = String(c.inicio || '').replace(' ', 'T');
    const inicioMs = Date.parse(inicioIso.endsWith('Z') ? inicioIso : `${inicioIso}Z`);
    const seg = Number.isFinite(inicioMs) ? Math.floor((Date.now() - inicioMs) / 1000) : 0;
    const clickAbrir = c.projeto_id ? `abrirProjeto('${c.projeto_id}')` : 'return';
    return `
      <div class="presence-item" onclick="${clickAbrir}" title="${c.projeto_id ? 'Abrir projeto' : 'Sem projeto ativo'}">
        ${avatar(c.usuario_nome, 'avatar-sm')}
        <div class="presence-item-info">
          <div class="presence-item-nome">${esc(c.usuario_nome)}</div>
          <div class="presence-item-tarefa">${esc(c.tarefa_nome || 'Sem cronômetro ativo')}</div>
          <div class="presence-item-projeto">${esc(c.projeto_nome || 'Disponível')}</div>
        </div>
        <div class="presence-item-tempo">${fmtDuracao(seg)}</div>
      </div>`;
  }).join('');

  dock.innerHTML = `
    <div class="presence-panel">
      <div class="presence-panel-header">Ativos agora</div>
      ${itemsHtml}
    </div>
    ${toggleHtml}`;

  clearInterval(window._presenceDisplayTick);
  window._presenceDisplayTick = setInterval(() => {
    if (!PRESENCE_ABERTO) return;
    COLEGAS_ATIVOS.forEach((c, idx) => {
      const inicioIso = String(c.inicio || '').replace(' ', 'T');
      const inicioMs = Date.parse(inicioIso.endsWith('Z') ? inicioIso : `${inicioIso}Z`);
      const seg = Number.isFinite(inicioMs) ? Math.floor((Date.now() - inicioMs) / 1000) : 0;
      const els = dock.querySelectorAll('.presence-item-tempo');
      if (els[idx]) els[idx].textContent = fmtDuracao(seg);
    });
  }, 1000);
}

export function togglePresencePanel() {
  setPresenceAberto(!PRESENCE_ABERTO);
  renderPresenceDock();
  if (PRESENCE_ABERTO) {
    setTimeout(() => {
      document.addEventListener('click', fecharPresencePanelFora, { once: true, capture: true });
    }, 10);
  }
}

export function fecharPresencePanelFora(e) {
  const dock = document.getElementById('presence-dock');
  if (dock && !dock.contains(e.target)) {
    setPresenceAberto(false);
    renderPresenceDock();
  } else if (PRESENCE_ABERTO) {
    setTimeout(() => {
      document.addEventListener('click', fecharPresencePanelFora, { once: true, capture: true });
    }, 10);
  }
}
