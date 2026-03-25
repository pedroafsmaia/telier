(function attachBaseComponents(global) {
  const root = global.TelierFrontend = global.TelierFrontend || {};
  root.components = root.components || {};

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function attrsToString(attrs = {}) {
    return Object.entries(attrs)
      .filter(([, value]) => value !== undefined && value !== null && value !== false)
      .map(([key, value]) => (value === true ? key : `${key}="${esc(value)}"`))
      .join(' ');
  }

  function button({ label, variant = 'default', onClick = '', attrs = {}, disabled = false }) {
    const cls = variant === 'primary' ? 'v2-btn v2-btn-primary' : 'v2-btn';
    return `<button class="${cls}" ${disabled ? 'disabled' : ''} ${onClick ? `onclick="${onClick}"` : ''} ${attrsToString(attrs)}>${esc(label)}</button>`;
  }

  function iconButton({ label = 'Ação', icon = '•', onClick = '', attrs = {}, disabled = false }) {
    return `<button class="v2-icon-btn" aria-label="${esc(label)}" title="${esc(label)}" ${disabled ? 'disabled' : ''} ${onClick ? `onclick="${onClick}"` : ''} ${attrsToString(attrs)}>${esc(icon)}</button>`;
  }

  function input({ placeholder = '', value = '', id = '', type = 'text', attrs = {}, disabled = false }) {
    return `<input class="v2-input" type="${esc(type)}" ${id ? `id="${esc(id)}"` : ''} placeholder="${esc(placeholder)}" value="${esc(value)}" ${disabled ? 'disabled' : ''} ${attrsToString(attrs)}>`;
  }

  function select({ options = [], id = '', selected = '', attrs = {}, disabled = false }) {
    const html = options
      .map((op) => `<option value="${esc(op.value)}" ${String(op.value) === String(selected) ? 'selected' : ''}>${esc(op.label)}</option>`)
      .join('');
    return `<select class="v2-select" ${id ? `id="${esc(id)}"` : ''} ${disabled ? 'disabled' : ''} ${attrsToString(attrs)}>${html}</select>`;
  }

  function panel({ title = '', body = '' }) {
    return `<section class="v2-panel">${title ? `<h3 class="v2-panel-title">${esc(title)}</h3>` : ''}${body}</section>`;
  }

  function emptyState({ title = 'Sem conteúdo', description = '' }) {
    return `<div class="v2-empty"><strong>${esc(title)}</strong><p>${esc(description)}</p></div>`;
  }

  function tabs({ items = [], active = '' }) {
    return `<div class="v2-tabs">${items.map((it) => `<button class="v2-tab ${it.id === active ? 'is-active' : ''}" ${it.onClick ? `onclick="${it.onClick}"` : ''} data-tab-id="${esc(it.id || '')}">${esc(it.label || '')}</button>`).join('')}</div>`;
  }

  function searchField({ placeholder = 'Buscar', value = '', attrs = {} }) {
    return `<input class="v2-search" type="search" placeholder="${esc(placeholder)}" value="${esc(value)}" ${attrsToString(attrs)}>`;
  }

  function filterBar({ content = '' }) {
    return `<div class="v2-filterbar">${content}</div>`;
  }

  root.components.base = {
    button,
    iconButton,
    input,
    select,
    panel,
    emptyState,
    tabs,
    searchField,
    filterBar,
  };
})(window);
