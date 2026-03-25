// ── UI UTILITIES ──
// Modal, toast, confirmation dialogs, and UI helpers

export function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.classList.add('visible');
  }, 10);
  setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 250);
  }, 3000);
}

export function toastUndo(msg, onUndo, ttl = 5000) {
  const t = document.createElement('div');
  t.className = 'toast toast-ok';
  t.innerHTML = `<span>${msg}</span><button class="btn btn-sm">Desfazer</button>`;
  t.querySelector('button').onclick = onUndo;
  document.body.appendChild(t);
  setTimeout(() => {
    t.classList.add('visible');
  }, 10);
  setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 250);
  }, ttl);
}

export function abrirModal(html, opts = {}) {
  const { titulo = '', canClose = true, size = '' } = opts;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${size}">
      ${titulo ? `<h2>${titulo}</h2>` : ''}
      <div class="modal-content">${html}</div>
    </div>
  `;

  if (canClose) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fecharOverlayModal(overlay);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fecharOverlayModal(overlay);
    });
  }

  document.body.appendChild(overlay);
  return overlay;
}

export function fecharOverlayModal(overlay) {
  if (overlay) {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 150);
  }
}

export function fecharModal() {
  document.querySelectorAll('.modal-overlay').forEach(fecharOverlayModal);
}

export function confirmar(mensagem, onConfirm, opts = {}) {
  const { titulo = 'Confirmar', cancelTxt = 'Cancelar', okTxt = 'OK' } = opts;

  const html = `
    <p>${mensagem}</p>
    <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: flex-end;">
      <button class="btn btn-ghost cancel-btn">${cancelTxt}</button>
      <button class="btn btn-primary confirm-btn">${okTxt}</button>
    </div>
  `;

  const overlay = abrirModal(html, { titulo, canClose: true });
  const confirmBtn = overlay.querySelector('.confirm-btn');
  const cancelBtn = overlay.querySelector('.cancel-btn');

  confirmBtn.addEventListener('click', () => {
    fecharOverlayModal(overlay);
    if (onConfirm) onConfirm();
  });

  cancelBtn.addEventListener('click', () => {
    fecharOverlayModal(overlay);
  });

  return overlay;
}

export function btnLoading(id, on) {
  const btn = document.getElementById(id);
  if (!btn) return;
  if (on) {
    btn.classList.add('btn-loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
  }
}

export function syncEyeButton(btn, isVisible) {
  if (!btn) return;
  const svg = isVisible
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 5C5.6 5 1.8 10 1.2 12c.6 2 4.4 7 10.8 7s10.2-5 10.8-7c-.6-2-4.4-7-10.8-7z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3l18 18M8 8a4 4 0 0 0 5.3 5.3M21 9s-3-5-9-5-9 5-9 5"/></svg>';
  btn.innerHTML = svg;
}

export function showLoader(container) {
  if (!container) return;
  container.innerHTML = '<div class="spinner"></div>';
}

export function clearLoader(container) {
  if (!container) return;
  container.innerHTML = '';
}

export function showError(container, msg) {
  if (!container) return;
  container.innerHTML = `<div class="alert alert-error">${msg}</div>`;
}

export function showEmpty(container, msg) {
  if (!container) return;
  container.innerHTML = `<div class="empty-state"><p>${msg}</p></div>`;
}

export function atualizarBadgeNotificacoes(total) {
  const badge = document.querySelector('.topbar-bell-dot');
  if (!badge) return;
  if (total > 0) {
    badge.textContent = total > 99 ? '99+' : total;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
