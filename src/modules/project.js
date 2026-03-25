// ── PROJECT MODULE ──
// Project detail rendering, group management, modal handlers

import { req, invalidarCacheProjetos } from './api.js';
import { PROJETO, GRUPO_ATUAL, TAREFAS, VISTA_ATUAL, EU, ADMIN_MODE, setProjeto, setGrupoAtual, setTarefas, setVistaAtual } from './state.js';
import { toast, fecharModal, confirmar } from './ui.js';
import { esc, tag, normalizarStatusProjeto } from './utils.js';
import { renderLista, renderKanban, renderMapa, renderRelatorio } from './tasks.js';
import { renderDash } from './dashboard.js';

let _decisoesAtivas = [];
let _projetosGrupoAtual = [];
let _grupoTarefas = [];

function isAdminRole() {
  return EU?.papel === 'admin';
}

function isAdmin() {
  return isAdminRole() && ADMIN_MODE === 'admin';
}

function setBreadcrumb(partes) {
  const el = document.getElementById('topbar-breadcrumb');
  if (!el) return;
  if (!partes.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = partes.map((p, i) =>
    `<span>${i > 0 ? ' / ' : ''}${typeof p === 'string' ? p : `<button onclick="${p.onClick || `abrirProjeto('${p.id}')`}">${esc(p.nome)}</button>`}</span>`
  ).join('');
}

function slideContent(direction) {
  const c = document.getElementById('content');
  if (!c) return;
  c.style.animation = `slideContent${direction === 'left' ? 'In' : 'Out'} .3s ease-out forwards`;
}

export async function abrirProjeto(id) {
  window.scrollTo(0, 0);
  const c = document.getElementById('content');
  c.innerHTML = '<div class="empty-small">Carregando projeto...</div>';
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

export function voltarDash() {
  slideContent('left');
  invalidarCacheProjetos();
  renderDash();
}

export async function abrirGrupo(id) {
  window.scrollTo(0, 0);
  const c = document.getElementById('content');
  c.innerHTML = '<div class="empty-small">Carregando grupo...</div>';

  try {
    const [grupo, projetos] = await Promise.all([
      req('GET', `/grupos/${id}`),
      req('GET', `/projetos`),
    ]);
    const projetosDoGrupo = projetos.filter(p => p.grupo_id === id);
    const abaSalva = sessionStorage.getItem(`telier_grupo_aba_${id}`) || 'projetos';
    slideContent('right');
    await renderGrupo(grupo, projetosDoGrupo, abaSalva);
    setGrupoAtual(grupo);
    setVistaAtual('grupo');
  } catch (e) {
    c.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
  }
}

export function renderProjeto(proj, tarefas, decisoes, abaAtiva) {
  setProjeto(proj);
  setTarefas(tarefas);
  _decisoesAtivas = decisoes || [];

  const statusProj = normalizarStatusProjeto(proj.status);
  const isArq = statusProj === 'Arquivado';
  const podeEditar = !isArq && (proj.pode_editar || isAdmin());

  setBreadcrumb([
    { id: null, nome: 'Projetos', onClick: 'voltarDash()' },
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
      </div>
      ${isArq ? `<div class="alert-banner">Projeto arquivado — apenas leitura.</div>` : ''}
    </div>
    <div class="abas abas-spaced">
      <button class="aba ${abaAtiva==='tarefas'?'ativa':''}" data-aba="tarefas" onclick="mudarAba('tarefas')">Tarefas</button>
      <button class="aba ${abaAtiva==='kanban'?'ativa':''}" data-aba="kanban" onclick="mudarAba('kanban')">Kanban</button>
      <button class="aba ${abaAtiva==='mapa'?'ativa':''}" data-aba="mapa" onclick="mudarAba('mapa')">Mapa de Foco</button>
      <button class="aba ${abaAtiva==='relatorio'?'ativa':''}" data-aba="relatorio" onclick="mudarAba('relatorio')">Relatório</button>
      <button class="aba ${abaAtiva==='decisoes'?'ativa':''}" data-aba="decisoes" onclick="mudarAba('decisoes')">Decisões</button>
    </div>
    <div id="aba-conteudo"></div>`;

  mudarAba(abaAtiva);
}

export async function renderGrupo(grupo, projetos, abaAtiva = 'projetos') {
  setGrupoAtual(grupo);
  _projetosGrupoAtual = projetos || [];
  _grupoTarefas = [];

  const podeGer = grupo.pode_gerenciar || isAdmin();

  setBreadcrumb([
    { id: null, nome: 'Projetos', onClick: 'voltarDash()' },
    { id: grupo.id, nome: grupo.nome, onClick: `abrirGrupo('${grupo.id}')` }
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
    </div>
    <div class="abas abas-spaced">
      <button class="aba ${abaAtiva==='projetos'?'ativa':''}" data-aba="projetos" onclick="mudarAbaGrupo('projetos')">Projetos</button>
      <button class="aba ${abaAtiva==='tarefas'?'ativa':''}" data-aba="tarefas" onclick="mudarAbaGrupo('tarefas')">Tarefas</button>
      <button class="aba ${abaAtiva==='mapa'?'ativa':''}" data-aba="mapa" onclick="mudarAbaGrupo('mapa')">Mapa</button>
      <button class="aba ${abaAtiva==='relatorio'?'ativa':''}" data-aba="relatorio" onclick="mudarAbaGrupo('relatorio')">Relatório</button>
      <button class="aba ${abaAtiva==='aovivo'?'ativa':''}" data-aba="aovivo" onclick="mudarAbaGrupo('aovivo')">Ao vivo</button>
    </div>
    <div id="aba-grupo"></div>`;

  await renderAbaGrupo(abaAtiva, projetos);
}

export function mudarAba(aba) {
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  sessionStorage.setItem(`telier_proj_aba_${PROJETO?.id}`, aba);
  const container = document.getElementById('aba-conteudo');
  if (!container) return;
  switch (aba) {
    case 'tarefas':
      renderLista(TAREFAS, container);
      break;
    case 'kanban':
      renderKanban(TAREFAS, container);
      break;
    case 'mapa':
      renderMapa(TAREFAS, container);
      break;
    case 'relatorio':
      renderRelatorio(TAREFAS, container, PROJETO?.id);
      break;
    case 'decisoes':
      renderAbaDecisoes(container);
      break;
    default:
      container.innerHTML = '';
  }
}

export function mudarAbaGrupo(aba) {
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  sessionStorage.setItem(`telier_grupo_aba_${GRUPO_ATUAL?.id}`, aba);
  renderAbaGrupo(aba, _projetosGrupoAtual);
}

async function carregarTarefasDoGrupo(projetos) {
  const listas = await Promise.all((projetos || []).map((p) => req('GET', `/projetos/${p.id}/tarefas`).catch(() => [])));
  return listas.flat().map(t => ({ ...t, projeto_nome: projetos.find(p => p.id === t.projeto_id)?.nome || '' }));
}

function renderAbaDecisoes(container) {
  if (!_decisoesAtivas.length) {
    container.innerHTML = '<div class="empty-small">Nenhuma decisão registrada</div>';
    return;
  }
  container.innerHTML = `<div class="decisoes-list">${_decisoesAtivas.map(d => `<div class="decisao-item"><div class="decisao-titulo">${esc(d.titulo || d.texto || d.descricao || '—')}</div></div>`).join('')}</div>`;
}

async function renderAbaGrupo(aba, projetos) {
  const el = document.getElementById('aba-grupo');
  if (!el) return;
  if (aba === 'projetos') {
    if (!projetos?.length) {
      el.innerHTML = '<div class="empty-small">Nenhum projeto neste grupo</div>';
      return;
    }
    el.innerHTML = `<div class="cards-grid">${projetos.map(p => `<div class="proj-card" onclick="abrirProjeto('${p.id}')"><div class="proj-title">${esc(p.nome)}</div><div class="proj-status">${tag(p.status || 'A fazer')}</div></div>`).join('')}</div>`;
    return;
  }
  if (!_grupoTarefas.length && ['tarefas', 'mapa', 'relatorio'].includes(aba)) {
    el.innerHTML = '<div class="empty-small">Carregando tarefas do grupo...</div>';
    _grupoTarefas = await carregarTarefasDoGrupo(projetos);
  }
  if (aba === 'tarefas') return renderLista(_grupoTarefas, el);
  if (aba === 'mapa') return renderMapa(_grupoTarefas, el);
  if (aba === 'relatorio') return renderRelatorio(_grupoTarefas, el, null);
  if (aba === 'aovivo') {
    const ids = new Set((projetos || []).map(p => p.id));
    const ativas = await req('GET', '/tempo/ativas').catch(() => []);
    const filtradas = ativas.filter(a => ids.has(a.projeto_id));
    el.innerHTML = filtradas.length
      ? `<div class="sessoes-list">${filtradas.map(s => `<div class="sessao-item"><strong>${esc(s.usuario_nome || s.usuario_login || 'Usuário')}</strong> · ${esc(s.tarefa_nome)} <span class="muted-detail">(${esc(s.projeto_nome)})</span></div>`).join('')}</div>`
      : '<div class="empty-small">Nenhum cronômetro ativo neste grupo</div>';
    return;
  }
  el.innerHTML = '';
}

export async function modalNovoProjeto(preselectGrupoId = '') {
  const grupos = await req('GET', '/grupos').catch(() => []);
  const { abrirModal } = window;
  const html = `
    <form id="form-novo-projeto" class="form-grid">
      <input name="nome" placeholder="Nome do projeto" required>
      <textarea name="descricao" placeholder="Descrição"></textarea>
      <select name="status"><option>A fazer</option><option>Em andamento</option><option>Em revisão</option><option>Pausado</option><option>Concluído</option><option>Arquivado</option></select>
      <input name="prazo" type="date">
      <input name="area_m2" type="number" step="0.01" placeholder="Área (m²)">
      <select name="grupo_id"><option value="">Sem grupo</option>${grupos.map(g => `<option value="${g.id}" ${preselectGrupoId===g.id?'selected':''}>${esc(g.nome)}</option>`).join('')}</select>
      <div><button class="btn btn-primary" type="submit">Criar projeto</button></div>
    </form>`;
  const overlay = abrirModal?.(html, { titulo: 'Novo Projeto' });
  overlay?.querySelector('#form-novo-projeto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const body = Object.fromEntries(fd.entries());
      await req('POST', '/projetos', body);
      fecharModal();
      invalidarCacheProjetos();
      await renderDash();
      toast('Projeto criado', 'ok');
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}

export async function modalEditarProjeto(id) {
  const [projeto, grupos] = await Promise.all([req('GET', `/projetos/${id}`), req('GET', '/grupos').catch(() => [])]);
  const { abrirModal } = window;
  const html = `
    <form id="form-editar-projeto" class="form-grid">
      <input name="nome" value="${esc(projeto.nome || '')}" required>
      <input name="fase" value="${esc(projeto.fase || 'Estudo preliminar')}" placeholder="Fase">
      <select name="status"><option ${projeto.status==='A fazer'?'selected':''}>A fazer</option><option ${projeto.status==='Em andamento'?'selected':''}>Em andamento</option><option ${projeto.status==='Em revisão'?'selected':''}>Em revisão</option><option ${projeto.status==='Pausado'?'selected':''}>Pausado</option><option ${projeto.status==='Concluído'?'selected':''}>Concluído</option><option ${projeto.status==='Arquivado'?'selected':''}>Arquivado</option></select>
      <select name="prioridade"><option ${projeto.prioridade==='Alta'?'selected':''}>Alta</option><option ${projeto.prioridade==='Média'?'selected':''}>Média</option><option ${projeto.prioridade==='Baixa'?'selected':''}>Baixa</option></select>
      <input name="prazo" type="date" value="${esc(projeto.prazo || '')}">
      <input name="area_m2" type="number" step="0.01" value="${esc(projeto.area_m2 || '')}">
      <select name="grupo_id"><option value="">Sem grupo</option>${grupos.map(g => `<option value="${g.id}" ${projeto.grupo_id===g.id?'selected':''}>${esc(g.nome)}</option>`).join('')}</select>
      <div><button class="btn btn-primary" type="submit">Salvar</button></div>
    </form>`;
  const overlay = abrirModal?.(html, { titulo: 'Editar Projeto' });
  overlay?.querySelector('#form-editar-projeto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      await req('PUT', `/projetos/${id}`, body);
      fecharModal();
      invalidarCacheProjetos();
      await abrirProjeto(id);
      toast('Projeto atualizado', 'ok');
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}

export async function modalPermissoes(projetoId) {
  const [projeto, usuarios] = await Promise.all([req('GET', `/projetos/${projetoId}`), req('GET', '/usuarios')]);
  const { abrirModal } = window;
  const html = `
    <div>
      <div class="muted-detail" style="margin-bottom:8px">Dono: ${esc(projeto.dono_nome || '—')}</div>
      <form id="form-add-perm" style="display:flex;gap:8px;margin-bottom:12px">
        <select name="usuario_id" style="flex:1"><option value="">Selecionar usuário</option>${usuarios.filter(u => u.id !== projeto.dono_id).map(u => `<option value="${u.id}">${esc(u.nome)} (${esc(u.usuario_login)})</option>`).join('')}</select>
        <button class="btn" type="submit">Adicionar</button>
      </form>
      <div>${(projeto.editores || []).map(ed => `<div class="sessao-item" style="display:flex;justify-content:space-between"><span>${esc(ed.nome)} <small class="muted-detail">${esc(ed.origem || 'manual')}</small></span>${ed.origem === 'manual' ? `<button class="btn btn-sm" onclick="removerPermissaoProjeto('${projetoId}','${ed.usuario_id}')">Remover</button>` : ''}</div>`).join('') || '<div class="empty-small">Sem editores adicionais</div>'}</div>
    </div>`;
  const overlay = abrirModal?.(html, { titulo: 'Permissões do projeto' });
  overlay?.querySelector('#form-add-perm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usuario_id = new FormData(e.currentTarget).get('usuario_id');
    if (!usuario_id) return;
    try {
      await req('POST', `/projetos/${projetoId}/permissoes`, { usuario_id });
      fecharModal();
      modalPermissoes(projetoId);
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}

export async function removerPermissaoProjeto(projetoId, usuarioId) {
  await req('DELETE', `/projetos/${projetoId}/permissoes/${usuarioId}`);
  toast('Permissão removida', 'ok');
  fecharModal();
  modalPermissoes(projetoId);
}

export async function modalNovoGrupo() {
  const { abrirModal } = window;
  const html = `<form id="form-novo-grupo" class="form-grid"><input name="nome" placeholder="Nome" required><textarea name="descricao" placeholder="Descrição"></textarea><button class="btn btn-primary" type="submit">Criar grupo</button></form>`;
  const overlay = abrirModal?.(html, { titulo: 'Novo Grupo' });
  overlay?.querySelector('#form-novo-grupo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await req('POST', '/grupos', Object.fromEntries(new FormData(e.currentTarget).entries()));
      fecharModal();
      renderDash();
      toast('Grupo criado', 'ok');
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}

export async function modalEditarGrupo(id) {
  const grupo = await req('GET', `/grupos/${id}`);
  const { abrirModal } = window;
  const html = `<form id="form-editar-grupo" class="form-grid"><input name="nome" value="${esc(grupo.nome || '')}" required><textarea name="descricao">${esc(grupo.descricao || '')}</textarea><select name="status"><option ${grupo.status==='Ativo'?'selected':''}>Ativo</option><option ${grupo.status==='Pausado'?'selected':''}>Pausado</option><option ${grupo.status==='Arquivado'?'selected':''}>Arquivado</option></select><button class="btn btn-primary" type="submit">Salvar</button></form>`;
  const overlay = abrirModal?.(html, { titulo: 'Editar Grupo' });
  overlay?.querySelector('#form-editar-grupo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await req('PUT', `/grupos/${id}`, Object.fromEntries(new FormData(e.currentTarget).entries()));
    fecharModal();
    await abrirGrupo(id);
    toast('Grupo atualizado', 'ok');
  });
}

export async function compartilharGrupo(id) {
  const [grupo, usuarios] = await Promise.all([req('GET', `/grupos/${id}`), req('GET', '/usuarios')]);
  const { abrirModal } = window;
  const html = `
    <div>
      <form id="form-add-grupo" style="display:flex;gap:8px;margin-bottom:12px">
        <select name="usuario_id" style="flex:1"><option value="">Selecionar usuário</option>${usuarios.filter(u => u.id !== grupo.dono_id).map(u => `<option value="${u.id}">${esc(u.nome)} (${esc(u.usuario_login)})</option>`).join('')}</select>
        <button class="btn" type="submit">Adicionar</button>
      </form>
      <div>${(grupo.colaboradores || []).map(c => `<div class="sessao-item" style="display:flex;justify-content:space-between"><span>${esc(c.nome)}</span><button class="btn btn-sm" onclick="removerPermissaoGrupo('${id}','${c.usuario_id}')">Remover</button></div>`).join('') || '<div class="empty-small">Sem colaboradores</div>'}</div>
    </div>`;
  const overlay = abrirModal?.(html, { titulo: `Compartilhar ${grupo.nome}` });
  overlay?.querySelector('#form-add-grupo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usuario_id = new FormData(e.currentTarget).get('usuario_id');
    if (!usuario_id) return;
    await req('POST', `/grupos/${id}/permissoes`, { usuario_id });
    fecharModal();
    compartilharGrupo(id);
  });
}

export async function removerPermissaoGrupo(grupoId, usuarioId) {
  confirmar('Remover este colaborador do grupo?', async () => {
    await req('DELETE', `/grupos/${grupoId}/permissoes/${usuarioId}`);
    toast('Colaborador removido', 'ok');
    fecharModal();
    compartilharGrupo(grupoId);
  });
}

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
  window.removerPermissaoProjeto = removerPermissaoProjeto;
  window.removerPermissaoGrupo = removerPermissaoGrupo;
}
