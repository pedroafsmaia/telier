// ── PROJECT MODULE ──
// Project detail rendering, group management, modal handlers

import { req } from './api.js';
import { PROJETO, GRUPO_ATUAL, TAREFAS, VISTA_ATUAL, EU, ADMIN_MODE, setProjeto, setGrupoAtual, setTarefas, setVistaAtual } from './state.js';
import { toast } from './ui.js';
import { esc, tag, normalizarStatusProjeto } from './utils.js';

// Helper functions
function isAdminRole() {
  return EU?.papel === 'admin';
}

function isAdmin() {
  return isAdminRole() && ADMIN_MODE === 'admin';
}

// Helper for breadcrumb
function setBreadcrumb(partes) {
  const el = document.getElementById('topbar-breadcrumb');
  if (!el) return;
  if (!partes.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = partes.map((p, i) =>
    `<span>${i > 0 ? ' / ' : ''}${typeof p === 'string' ? p : `<button onclick="abrirProjeto('${p.id}')">${esc(p.nome)}</button>`}</span>`
  ).join('');
}

function slideContent(direction) {
  const c = document.getElementById('content');
  if (!c) return;
  c.style.animation = `slideContent${direction === 'left' ? 'In' : 'Out'} .3s ease-out forwards`;
}

// Open project detail view
export async function abrirProjeto(id) {
  window.scrollTo(0, 0);
  const c = document.getElementById('content');

  // Show skeleton while loading
  c.innerHTML = `
    <div style="opacity:0.4">
      <button class="btn-back" style="visibility:hidden">← Voltar para projetos</button>
      <div class="proj-hero" style="opacity:0.5">
        <div style="height:40px;background:var(--bg3);border-radius:var(--r);margin-bottom:12px;animation:pulse 1.2s ease infinite"></div>
        <div style="height:20px;background:var(--bg3);border-radius:var(--r);width:60%;animation:pulse 1.2s ease infinite"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <div style="height:32px;width:80px;background:var(--bg3);border-radius:var(--r);animation:pulse 1.2s ease infinite"></div>
        <div style="height:32px;width:80px;background:var(--bg3);border-radius:var(--r);animation:pulse 1.2s ease infinite"></div>
      </div>
    </div>
  `;

  try {
    const [projeto, tarefas, decisoes, resumoHoras] = await Promise.all([
      req('GET', `/projetos/${id}`),
      req('GET', `/projetos/${id}/tarefas`),
      req('GET', `/projetos/${id}/decisoes`).catch(() => []),
      req('GET', `/projetos/${id}/horas-por-usuario`).catch(() => []),
    ]);
    const abaSalva = sessionStorage.getItem(`telier_proj_aba_${id}`) || 'tarefas';
    slideContent('right');
    renderProjeto(projeto, tarefas, decisoes, abaSalva, resumoHoras);
    setProjeto(projeto);
    setTarefas(tarefas);
    setVistaAtual('projeto');
  } catch (e) {
    c.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
  }
}

// Back to dashboard
export function voltarDash() {
  slideContent('left');
  invalidarCacheProjetos?.();
  renderDash?.();
}

function invalidarCacheProjetos() {
  localStorage.removeItem('telier_proj_cache');
}

// Open group detail view
export async function abrirGrupo(id) {
  window.scrollTo(0, 0);
  const c = document.getElementById('content');

  // Show skeleton while loading
  c.innerHTML = `
    <div style="opacity:0.4">
      <button class="btn-back" style="visibility:hidden">← Voltar para projetos</button>
      <div class="proj-hero" style="opacity:0.5">
        <div style="height:40px;background:var(--bg3);border-radius:var(--r);margin-bottom:12px;animation:pulse 1.2s ease infinite"></div>
        <div style="height:20px;background:var(--bg3);border-radius:var(--r);width:60%;animation:pulse 1.2s ease infinite"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <div style="height:32px;width:80px;background:var(--bg3);border-radius:var(--r);animation:pulse 1.2s ease infinite"></div>
        <div style="height:32px;width:80px;background:var(--bg3);border-radius:var(--r);animation:pulse 1.2s ease infinite"></div>
      </div>
    </div>
  `;

  try {
    const [grupo, projetos] = await Promise.all([
      req('GET', `/grupos/${id}`),
      req('GET', `/projetos`),
    ]);
    const projetosDoGrupo = projetos.filter(p => p.grupo_id === id);
    const abaSalva = sessionStorage.getItem(`telier_grupo_aba_${id}`) || 'projetos';
    slideContent('right');
    renderGrupo(grupo, projetosDoGrupo, abaSalva);
    setGrupoAtual(grupo);
    setVistaAtual('grupo');
  } catch (e) {
    c.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
  }
}

// Render project detail
export function renderProjeto(proj, tarefas, decisoes, abaAtiva, resumoHoras = []) {
  setProjeto(proj);
  setTarefas(tarefas);

  const statusProj = normalizarStatusProjeto(proj.status);
  const isArq = statusProj === 'Arquivado';
  const isPaus = statusProj === 'Pausado';
  const podeEditar = !isArq && (proj.pode_editar || isAdmin());

  setBreadcrumb([
    { id: null, nome: 'Projetos', label: 'Projetos' },
    { id: proj.id, nome: proj.nome }
  ]);

  document.getElementById('content').innerHTML = `
    <button class="btn-back" onclick="voltarDash()">← Voltar para projetos</button>
    <div class="proj-hero" data-status="${esc(proj.status || 'A fazer')}">
      <div class="proj-hero-top">
        <div class="proj-hero-left">
          <div class="proj-nome ${isArq ? 'is-muted' : ''}">${esc(proj.nome)}</div>
          ${proj.descricao ? `<div class="proj-dono muted-detail">${esc(proj.descricao)}</div>` : ''}
        </div>
        <div class="proj-hero-actions">
          ${podeEditar ? `<button class="btn btn-sm" onclick="modalEditarProjeto('${proj.id}')">Editar projeto</button>` : ''}
          <button class="btn btn-sm" onclick="modalPermissoes('${proj.id}')">Compartilhar</button>
        </div>
      </div>
      <div class="proj-meta">
        <div class="proj-meta-item"><span class="proj-meta-label">Status</span>${tag(proj.status || 'A fazer')}</div>
        ${proj.prazo ? `<div class="proj-meta-item"><span class="proj-meta-label">Prazo</span><span class="tag tag-gray">${proj.prazo}</span></div>` : ''}
        ${proj.area_m2 ? `<div class="proj-meta-item"><span class="proj-meta-label">Área</span><span class="tag tag-gray mono">${Number(proj.area_m2).toLocaleString('pt-BR')} m²</span></div>` : ''}
        ${proj.total_horas ? `<div class="proj-meta-item"><span class="proj-meta-label">Horas</span><span class="tag tag-gray mono">${proj.total_horas}h</span></div>` : ''}
      </div>
      ${isArq ? `<div class="alert-banner"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> Projeto arquivado — apenas leitura.</div>` : ''}
    </div>
    <div class="abas abas-spaced">
      <button class="aba ${abaAtiva==='tarefas'?'ativa':''}" data-aba="tarefas" onclick="mudarAba('tarefas')">Tarefas${tarefas.length ? ` <span class="tab-count">${tarefas.length}</span>` : ''}</button>
      <button class="aba ${abaAtiva==='kanban'?'ativa':''}" data-aba="kanban" onclick="mudarAba('kanban')">Kanban</button>
      <button class="aba ${abaAtiva==='mapa'?'ativa':''}" data-aba="mapa" onclick="mudarAba('mapa')">Mapa de Foco</button>
      <button class="aba ${abaAtiva==='relatorio'?'ativa':''}" data-aba="relatorio" onclick="mudarAba('relatorio')">Relatório</button>
      <button class="aba ${abaAtiva==='decisoes'?'ativa':''}" data-aba="decisoes" onclick="mudarAba('decisoes')">Decisões</button>
    </div>
    <div id="aba-conteudo"></div>`;

  mudarAba(abaAtiva);
}

// Render group detail
export function renderGrupo(grupo, projetos, abaAtiva = 'projetos') {
  setGrupoAtual(grupo);

  const podeGer = grupo.pode_gerenciar || isAdmin();

  setBreadcrumb([
    { id: null, nome: 'Projetos', label: 'Projetos' },
    { id: grupo.id, nome: grupo.nome }
  ]);

  document.getElementById('content').innerHTML = `
    <button class="btn-back" onclick="voltarDash()">← Voltar para projetos</button>
    <div class="proj-hero" data-status="${esc(grupo.status || 'Ativo')}">
      <div class="proj-hero-top">
        <div class="proj-hero-left">
          <div class="proj-nome">${esc(grupo.nome)}</div>
          ${grupo.descricao ? `<div class="proj-dono muted-detail">${esc(grupo.descricao)}</div>` : ''}
        </div>
        <div class="proj-hero-actions">
          ${podeGer ? `<button class="btn btn-sm" onclick="modalEditarGrupo('${grupo.id}')">Editar grupo</button>` : ''}
          <button class="btn btn-sm" onclick="compartilharGrupo('${grupo.id}')">Compartilhar</button>
        </div>
      </div>
      <div class="proj-meta">
        <div class="proj-meta-item"><span class="proj-meta-label">Status</span>${tag(grupo.status || 'Ativo')}</div>
        <div class="proj-meta-item"><span class="proj-meta-label">Projetos</span><span class="tag tag-gray">${projetos.length}</span></div>
      </div>
    </div>
    <div class="abas abas-spaced">
      <button class="aba ${abaAtiva==='projetos'?'ativa':''}" data-aba="projetos" onclick="mudarAbaGrupo('projetos')">Projetos${projetos.length ? ` <span class="tab-count">${projetos.length}</span>` : ''}</button>
      <button class="aba ${abaAtiva==='tarefas'?'ativa':''}" data-aba="tarefas" onclick="mudarAbaGrupo('tarefas')">Tarefas</button>
      <button class="aba ${abaAtiva==='mapa'?'ativa':''}" data-aba="mapa" onclick="mudarAbaGrupo('mapa')">Mapa</button>
      <button class="aba ${abaAtiva==='relatorio'?'ativa':''}" data-aba="relatorio" onclick="mudarAbaGrupo('relatorio')">Relatório</button>
      <button class="aba ${abaAtiva==='aovivo'?'ativa':''}" data-aba="aovivo" onclick="mudarAbaGrupo('aovivo')">Ao vivo</button>
    </div>
    <div id="aba-grupo"></div>`;

  renderAbaGrupo(abaAtiva, projetos);
}

export function mudarAba(aba) {
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  sessionStorage.setItem(`telier_proj_aba_${PROJETO?.id}`, aba);
  // TODO: Render appropriate tab content
}

export function mudarAbaGrupo(aba) {
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  sessionStorage.setItem(`telier_grupo_aba_${GRUPO_ATUAL?.id}`, aba);
  // TODO: Render appropriate tab content
}

function renderAbaGrupo(aba, projetos) {
  const el = document.getElementById('aba-grupo');
  if (!el) return;
  // TODO: Implement tab rendering
  el.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>';
}

// Placeholder functions for modal handlers
export async function modalNovoProjeto(preselectGrupoId = '') {
  const { abrirModal, toast } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Novo Projeto</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Novo Projeto' });
}

export async function modalEditarProjeto(id) {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Editar Projeto</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Editar Projeto' });
}

export async function modalPermissoes(projetoId) {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Permissões</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Permissões' });
}

export async function modalNovoGrupo() {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Novo Grupo</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Novo Grupo' });
}

export async function modalEditarGrupo(id) {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Editar Grupo</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Editar Grupo' });
}

export async function compartilharGrupo(id) {
  const { abrirModal } = window;
  const html = `
    <div style="padding: 24px;">
      <h2>Compartilhar Grupo</h2>
      <div style="color: var(--text3); margin: 16px 0;">
        <strong>Funcionalidade em desenvolvimento</strong>
        <p style="margin-top: 8px; font-size: 0.9rem;">Esta funcionalidade será implementada em breve.</p>
      </div>
    </div>
  `;
  abrirModal?.(html, { titulo: 'Compartilhar Grupo' });
}

// Expose globally
if (typeof window !== 'undefined') {
  window.abrirProjeto = abrirProjeto;
  window.voltarDash = voltarDash;
  window.abrirGrupo = abrirGrupo;
  window.renderProjeto = renderProjeto;
  window.renderGrupo = renderGrupo;
  window.mudarAba = mudarAba;
  window.mudarAbaGrupo = mudarAbaGrupo;
  window.modalNovoProjeto = modalNovoProjeto;
  window.modalEditarProjeto = modalEditarProjeto;
  window.modalPermissoes = modalPermissoes;
  window.modalNovoGrupo = modalNovoGrupo;
  window.modalEditarGrupo = modalEditarGrupo;
  window.compartilharGrupo = compartilharGrupo;
}
