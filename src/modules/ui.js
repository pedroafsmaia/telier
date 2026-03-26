// ── UI ──
import { esc } from './utils.js';
import { _pendingUndoAction, setPendingUndoAction } from './state.js';

// ── TOAST ──
let _toastTimer;
export function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  if (_pendingUndoAction?.timeout) clearTimeout(_pendingUndoAction.timeout);
  setPendingUndoAction(null);
  el.textContent = msg;
  el.className = tipo === 'err' ? 'toast-err' : 'toast-ok';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

export function toastUndo(msg, onUndo, ttl = 5000) {
  const el = document.getElementById('toast');
  if (_pendingUndoAction?.timeout) clearTimeout(_pendingUndoAction.timeout);
  const newAction = {
    onUndo,
    timeout: setTimeout(() => {
      setPendingUndoAction(null);
      el.classList.add('hidden');
    }, ttl),
  };
  setPendingUndoAction(newAction);

  el.className = '';
  el.innerHTML = `<span>${esc(msg)}</span><button class="toast-undo-btn" id="toast-undo-btn" type="button">Desfazer</button>`;
  const undoBtn = document.getElementById('toast-undo-btn');
  if (undoBtn) {
    undoBtn.onclick = () => {
      const atual = _pendingUndoAction;
      if (!atual) return;
      clearTimeout(atual.timeout);
      setPendingUndoAction(null);
      Promise.resolve(atual.onUndo()).catch(() => {});
      el.classList.add('hidden');
    };
  }
}

// ── MODAL ──
export function fecharOverlayModal(overlay) {
  if (!overlay) return;
  if (overlay._onKeydown) {
    document.removeEventListener('keydown', overlay._onKeydown);
    overlay._onKeydown = null;
  }
  if (typeof overlay._onClose === 'function') {
    try { overlay._onClose(); } catch {}
    overlay._onClose = null;
  }
  overlay.remove();
}

export function abrirModal(html, opts = {}) {
  const id = 'modal_' + Date.now();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = id;
  const sizeClass = opts.xl ? 'modal-xl' : (opts.lg ? 'modal-lg' : '');
  overlay.innerHTML = `<div class="modal ${sizeClass}">${html}</div>`;
  if (typeof opts.onClose === 'function') overlay._onClose = opts.onClose;
  if (!opts.locked) {
    overlay.addEventListener('click', e => { if (e.target === overlay) fecharOverlayModal(overlay); });
    const onKey = e => { if (e.key === 'Escape') fecharOverlayModal(overlay); };
    overlay._onKeydown = onKey;
    document.addEventListener('keydown', onKey);
  }
  document.getElementById('modais').appendChild(overlay);
  setTimeout(() => overlay.querySelector('input:not([type=date]):not([type=number])')?.focus(), 60);
  return overlay;
}

export function confirmar(mensagem, onConfirm, opts = {}) {
  const titulo = opts.titulo || 'Confirmar';
  const btnTexto = opts.btnTexto || 'Confirmar';
  const btnCls = opts.danger ? 'btn-danger-solid' : 'btn-primary';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal" style="max-width:400px">
    <h2 style="margin-bottom:10px">${esc(titulo)}</h2>
    <p class="modal-copy" style="margin-bottom:24px">${esc(mensagem)}</p>
    <div class="modal-footer">
      <button class="btn" id="confirm-cancel">Cancelar</button>
      <button class="btn ${btnCls}" id="confirm-ok">${esc(btnTexto)}</button>
    </div></div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) fecharOverlayModal(overlay); });
  const onKey = e => { if (e.key === 'Escape') fecharOverlayModal(overlay); };
  overlay._onKeydown = onKey;
  document.addEventListener('keydown', onKey);
  overlay.querySelector('#confirm-cancel').addEventListener('click', () => fecharOverlayModal(overlay));
  overlay.querySelector('#confirm-ok').addEventListener('click', () => { fecharOverlayModal(overlay); onConfirm(); });
  document.getElementById('modais').appendChild(overlay);
}

export function fecharModal() { document.querySelectorAll('.modal-overlay').forEach(fecharOverlayModal); }

// ── BREADCRUMB ──
export function setBreadcrumb(partes) {
  // partes: [{label, onClick?}]  — último é "atual" sem click
  const el = document.getElementById('topbar-breadcrumb');
  if (!el) return;
  if (!partes.length) { el.innerHTML = ''; return; }
  const visible = partes.length > 3 ? [partes[0], { label: '…' }, ...partes.slice(-2)] : partes;
  el.innerHTML = visible.map((p, i) => {
    const isUltimo = i === visible.length - 1;
    const cls = isUltimo ? 'topbar-crumb atual' : 'topbar-crumb';
    const onclick = (!isUltimo && p.onClick && p.label !== '…') ? `onclick="${p.onClick}"` : '';
    const sep = i > 0 ? '<span class="topbar-sep-crumb">/</span>' : '';
    return `${sep}<span class="${cls}" ${onclick} title="${esc(p.label)}">${esc(p.label)}</span>`;
  }).join('');
}

export function setShellView(view) {
  document.querySelectorAll('.sidebar-link[data-shell-view]').forEach(link => {
    link.classList.toggle('is-active', link.dataset.shellView === view);
  });
}

export function setShellViewFromRoute(routeName) {
  const view = (routeName === 'projects' || routeName === 'project')
    ? 'projects'
    : (routeName === 'groups' || routeName === 'group')
      ? 'groups'
      : routeName === 'admin'
        ? 'admin'
        : 'tasks';
  setShellView(view);
}

// ── BUTTON LOADING ──
export function btnLoading(id, on) {
  const b = document.getElementById(id);
  if (!b) return;
  if (on && !b.dataset.loadingLabel) b.dataset.loadingLabel = b.textContent.trim();
  if (!on && b.dataset.loadingLabel) delete b.dataset.loadingLabel;
  b.disabled = on;
  b.setAttribute('aria-busy', on ? 'true' : 'false');
  b.classList.toggle('btn-loading', on);
}

// ── TEMA ──
export function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('ea_tema', tema);
  const btn = document.getElementById('icon-tema-svg');
  if (!btn) return;
  if (tema === 'dark') {
    btn.innerHTML = '<path d="M12.5 9.5A5.5 5.5 0 0 1 5.5 2.5a5.5 5.5 0 1 0 7 7z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>';
  } else {
    btn.innerHTML = '<circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 1v1.5M7.5 12v1.5M1 7.5h1.5M12 7.5h1.5M3.05 3.05l1.06 1.06M10.9 10.9l1.06 1.06M3.05 11.95l1.06-1.06M10.9 4.1l1.06-1.06" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
  }
}

export function alternarTema() {
  const atual = document.documentElement.getAttribute('data-theme') || 'dark';
  aplicarTema(atual === 'dark' ? 'light' : 'dark');
}

// ── SLIDE CONTENT ──
export function slideContent(direction) {
  const c = document.getElementById('content');
  if (!c) return;
  const x = direction === 'right' ? '28px' : '-28px';
  c.style.transition = 'none';
  c.style.transform = `translateX(${x})`;
  c.style.opacity = '0';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    c.style.transition = 'transform .26s cubic-bezier(.25,.46,.45,.94), opacity .2s ease';
    c.style.transform = 'translateX(0)';
    c.style.opacity = '1';
  }));
}
