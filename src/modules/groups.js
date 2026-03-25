// ── GROUPS MODULE ──
// Group drag-drop and management

import { req } from './api.js';
import { toast } from './ui.js';

let _dragProjetoId = null;
let _dragGrupoId = null;
let _dragPreviewEl = null;

export function dragProjeto(e, projetoId) {
  e.stopPropagation();
  _dragProjetoId = projetoId;
  e.dataTransfer.effectAllowed = 'move';
}

export function dragProjetoEnd(e) {
  _dragProjetoId = null;
  document.querySelectorAll('.proj-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.grupo-section.drag-over').forEach(el => el.classList.remove('drag-over'));
}

export function dragGrupo(e, grupoId) {
  e.stopPropagation();
  _dragGrupoId = grupoId;
  e.dataTransfer.effectAllowed = 'move';
}

export function dragGrupoEnd(e) {
  _dragGrupoId = null;
  document.querySelectorAll('.grupo-section.dragging').forEach(el => el.classList.remove('dragging'));
}

export function dragOver(e, grupoId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}

export function dragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('drag-over');
  }
}

export async function dropProjeto(e, grupoId) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  toast('Funcionalidade em desenvolvimento', 'info');
}

export function toggleGrupo(grupoId) {
  const collapsed = JSON.parse(localStorage.getItem('telier_grupos_collapsed') || '[]');
  const idx = collapsed.indexOf(grupoId);
  if (idx >= 0) collapsed.splice(idx, 1);
  else collapsed.push(grupoId);
  localStorage.setItem('telier_grupos_collapsed', JSON.stringify(collapsed));
  // Re-render via dashboard
  window.renderDash?.();
}

// Expose globally
if (typeof window !== 'undefined') {
  window.dragProjeto = dragProjeto;
  window.dragProjetoEnd = dragProjetoEnd;
  window.dragGrupo = dragGrupo;
  window.dragGrupoEnd = dragGrupoEnd;
  window.dragOver = dragOver;
  window.dragLeave = dragLeave;
  window.dropProjeto = dropProjeto;
  window.toggleGrupo = toggleGrupo;
}
