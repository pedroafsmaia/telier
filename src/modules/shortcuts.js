// ── SHORTCUTS ──
import { PROJETO, FORCE_PASSWORD_CHANGE } from './state.js';

export function initShortcuts() {
  document.addEventListener('keydown', async e => {
    if (FORCE_PASSWORD_CHANGE && !document.getElementById('page-app')?.classList.contains('hidden')) {
      return;
    }
    const emInput = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);

    if (e.key === 'Enter') {
      if (!document.getElementById('page-login').classList.contains('hidden')) {
        const { fazerLogin } = await import('./auth.js');
        fazerLogin();
      }
      if (!document.getElementById('page-setup').classList.contains('hidden')) {
        const { fazerSetup } = await import('./auth.js');
        fazerSetup();
      }
    }

    if (!emInput && !document.querySelector('.modal-overlay')) {
      // N — nova tarefa (dentro de projeto, aba Tarefas)
      if (e.key === 'n' || e.key === 'N') {
        const abaAtiva = document.querySelector('.aba.ativa')?.dataset.aba;
        if (PROJETO && document.getElementById('aba') &&
            (abaAtiva === 'tarefas' || abaAtiva === 'lista' || abaAtiva === 'kanban' || !abaAtiva)) {
          e.preventDefault();
          const { modalNovaTarefa } = await import('./tasks.js');
          modalNovaTarefa(PROJETO.id);
        }
      }
      // P — novo projeto (no dashboard)
      if (e.key === 'p' || e.key === 'P') {
        if (!PROJETO && document.getElementById('cards-grid-dash')) {
          e.preventDefault();
          const { modalNovoProjeto } = await import('./project.js');
          modalNovoProjeto();
        }
      }
      // / — focar busca no dashboard
      if (e.key === '/') {
        const busca = document.getElementById('busca-dash');
        if (busca) { e.preventDefault(); busca.focus(); busca.select(); }
      }
      // G — ir para dashboard
      if (e.key === 'g' || e.key === 'G') {
        if (PROJETO) {
          e.preventDefault();
          const { renderDash } = await import('./dashboard.js');
          renderDash();
        }
      }
    }
  });
}
