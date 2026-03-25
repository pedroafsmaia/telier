// ── DASHBOARD MODULE ──
// Dashboard rendering, filters, project cards, groups

import { fetchProjetos, req } from './api.js';
import { PROJETO, FILTRO_STATUS, FILTRO_ORIGEM_DASH, FILTRO_GRUPO_DASH, BUSCA_DASH, _projsDash, _ativasDash, _gruposDash, _prazoNotifShown, VISTA_ATUAL, STARTDAY_COLLAPSE_KEY, EU, ADMIN_MODE, setFiltroStatus, setFiltroOrigemDash, setFiltroGrupoDash, setBuscaDash, setProjsDash, setAtivasDash, setGruposDash, setVistaAtual } from './state.js';
import { toast } from './ui.js';
import { esc, diasRestantes, prazoFmt, fmtHoras, normalizarStatusProjeto, projetoConcluido, avatar, tag } from './utils.js';

// Helper functions
function isAdminRole() {
  return EU?.papel === 'admin';
}

function isAdmin() {
  return isAdminRole() && ADMIN_MODE === 'admin';
}

const DASH_FILTERS_KEY = 'telier_dash_filters_v1';

// Load/save dashboard filters from localStorage
export function carregarFiltrosDash() {
  try {
    const saved = localStorage.getItem(DASH_FILTERS_KEY);
    if (saved) {
      const { status, origem, grupo, busca } = JSON.parse(saved);
      if (status) setFiltroStatus(status);
      if (origem) setFiltroOrigemDash(origem);
      if (grupo !== undefined) setFiltroGrupoDash(grupo);
      if (busca) setBuscaDash(busca);
    }
  } catch {}
}

export function salvarFiltrosDash() {
  try {
    localStorage.setItem(DASH_FILTERS_KEY, JSON.stringify({
      status: FILTRO_STATUS,
      origem: FILTRO_ORIGEM_DASH,
      grupo: FILTRO_GRUPO_DASH,
      busca: BUSCA_DASH,
    }));
  } catch {}
}

export function filtrarProjetosBusca(v) {
  setBuscaDash(v);
  salvarFiltrosDash();
  renderDash();
}

export function filtrarGrupoDash(v) {
  setFiltroGrupoDash(v);
  salvarFiltrosDash();
  renderDash();
}

export function filtrarOrigemDash(v) {
  setFiltroOrigemDash(v);
  salvarFiltrosDash();
  renderDash();
}

export function setFiltro(f) {
  setFiltroStatus(f);
  salvarFiltrosDash();
  renderDash();
}

// Render start-of-day card section
export function renderInicioDia(projetos, ativas, ultimaSessao = null, focoGlobal = null, resumoHoje = null) {
  const collapsed = localStorage.getItem(STARTDAY_COLLAPSE_KEY) === '1';
  const btnText = collapsed ? 'Expandir' : 'Recolher';
  return `
    <div class="startday-wrap dash-header-spaced${collapsed ? ' collapsed' : ''}" id="startday-wrap">
      <div class="startday-head">
        <h2 class="startday-title">Seu dia</h2>
        <button type="button" class="startday-toggle" onclick="toggleStartday()" title="Recolher/expandir">${btnText}</button>
      </div>
      <div class="startday-grid">
        ${focoGlobal?.projeto_id
          ? `<div class="startday-card">
              <h4>Seu foco agora</h4>
              <div class="startday-main">${esc(focoGlobal.tarefa_nome || '—')}</div>
              <div class="startday-sub">${esc(focoGlobal.projeto_nome || 'Projeto')}</div>
              <div class="startday-actions">
                <button class="btn btn-sm btn-primary" onclick="abrirProjeto('${focoGlobal.projeto_id}')">Ir para tarefa</button>
              </div>
            </div>`
          : ''}
        <div class="startday-card">
          <h4>Última sessão</h4>
          <div class="startday-main">
            ${ultimaSessao
              ? `${esc(ultimaSessao.projeto_nome)} · ${ultimaSessao.horas}h`
              : 'Inicie seu primeiro cronômetro'}
          </div>
          <div class="startday-actions">
            ${ultimaSessao
              ? `<button class="btn btn-sm btn-primary" onclick="abrirProjeto('${ultimaSessao.projeto_id}')">Retomar tarefa</button>`
              : `<button class="btn btn-sm" disabled>Retomar tarefa</button>`}
          </div>
        </div>

        ${resumoHoje && Number(resumoHoje.horas_hoje || 0) > 0 ? `
        <div class="startday-card">
          <h4>Hoje</h4>
          <div class="startday-main">${parseFloat(resumoHoje.horas_hoje).toFixed(1)}h trabalhadas</div>
          <div class="startday-sub">${resumoHoje.tarefas} tarefa${resumoHoje.tarefas !== 1 ? 's' : ''} · ${resumoHoje.sessoes} sess${resumoHoje.sessoes !== 1 ? 'ões' : 'ão'}</div>
          <div class="startday-actions">
            <button class="btn btn-sm" onclick="abrirCentralAdmin('tempo')">Ver relatório</button>
          </div>
        </div>` : ''}
      </div>
    </div>`;
}

export function toggleStartday() {
  const el = document.getElementById('startday-wrap');
  if (!el) return;
  el.classList.toggle('collapsed');
  const collapsed = el.classList.contains('collapsed');
  localStorage.setItem(STARTDAY_COLLAPSE_KEY, collapsed ? '1' : '0');
  const btn = el.querySelector('.startday-toggle');
  if (btn) btn.textContent = collapsed ? 'Expandir' : 'Recolher';
}

function renderDashLoadingState() {
  return `
    <div class="startday-wrap dash-header-spaced">
      <div class="startday-head">
        <div class="startday-title">Seu dia</div>
        <span class="skeleton-pill"></span>
      </div>
      <div class="startday-grid">
        ${'<div class="startday-card skeleton-card"></div>'.repeat(4)}
      </div>
    </div>
    <div class="dash-header dash-header-loading">
      <div class="dash-skeleton-line"></div>
    </div>
    <div class="dash-skeleton">${'<div class="dash-skeleton-card"></div>'.repeat(4)}</div>`;
}

function renderDashEmptyState(vazioTexto, opts = {}) {
  const titulo = opts.titulo || 'Sem projetos por aqui';
  const mostrarGuia = !!opts.mostrarGuia;
  return `<div class="empty-state"><div class="empty-icon" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 18h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 18V9.5h4V18M13 18V6h4v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 7.5l2-2 2 2M14 4l2-2 2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="empty-text">${titulo}</div><div class="empty-sub">${vazioTexto}</div>${mostrarGuia ? `<div class="empty-guide"><div class="empty-guide-item">1. Crie um projeto.</div><div class="empty-guide-item">2. Abra o projeto e adicione a primeira tarefa.</div><div class="empty-guide-item">3. Defina prioridade e prazo para organizar o fluxo.</div><div class="empty-cta"><button class="btn btn-sm btn-primary" onclick="modalNovoProjeto()">+ Criar primeiro projeto</button></div></div>` : ''}</div>`;
}

function projetoArquivadoNoDash(proj) {
  if (!proj) return false;
  return normalizarStatusProjeto(proj.status) === 'Arquivado' || (proj.grupo_status || '') === 'Arquivado';
}

function grupoProgressToneClass(pctConcl, atrasados) {
  if (pctConcl === 100) return 'is-done';
  if (atrasados) return 'is-alert';
  return '';
}

function grupoStatusToneClass(status) {
  if (status === 'Pausado') return 'is-paused';
  if (status === 'Arquivado') return 'is-muted';
  if (status === 'Concluído') return 'is-done';
  return '';
}

// Main dashboard render
export async function renderDash() {
  window.scrollTo(0, 0);
  document.title = 'Telier';
  setBreadcrumb([]);
  const c = document.getElementById('content');
  c.innerHTML = renderDashLoadingState();
  try {
    const params = new URLSearchParams();
    if (FILTRO_STATUS !== 'todos') params.set('status', FILTRO_STATUS);
    if (isAdminRole() && ADMIN_MODE === 'normal') params.set('as_member', '1');
    const [projetos, ativas, grupos, ultimaSessao, resumoHoje, focoGlobal] = await Promise.all([
      fetchProjetos(params),
      req('GET', `/tempo/ativas${isAdminRole() && ADMIN_MODE === 'normal' ? '?as_member=1' : ''}`).catch(() => []),
      req('GET', `/grupos${isAdminRole() && ADMIN_MODE === 'normal' ? '?as_member=1' : ''}`).catch(() => []),
      req('GET', '/tempo/ultima-sessao').catch(() => null),
      req('GET', '/tempo/resumo-hoje').catch(() => null),
      req('GET', '/auth/foco-global').catch(() => null),
    ]);

    setProjsDash(projetos);
    setAtivasDash(ativas);
    setGruposDash(grupos);

    projetos.forEach(p => {
      if (_prazoNotifShown.has(p.id)) return;
      const dias = diasRestantes(p.prazo);
      if (dias !== null && dias >= 0 && dias <= 3 && !projetoConcluido(p.status) && p.dono_id === EU?.id) {
        _prazoNotifShown.add(p.id);
        const msg = dias === 0
          ? `"${p.nome}" vence hoje.`
          : `"${p.nome}" vence em ${dias} dia${dias === 1 ? '' : 's'}.`;
        toast(`Prazo próximo: ${msg}`, 'ok');
      }
    });

    const projetosAtivos = projetos.filter(p => !projetoArquivadoNoDash(p));
    const projetosArquivados = projetos.filter(p => projetoArquivadoNoDash(p));
    const projetosVisiveisBase = FILTRO_STATUS === 'Arquivado' ? projetosArquivados : projetosAtivos;
    const gruposVisiveisBase = (grupos || []).filter(g => FILTRO_STATUS === 'Arquivado'
      ? (g.status || 'Ativo') === 'Arquivado'
      : (g.status || 'Ativo') !== 'Arquivado');
    const compartilhados = projetosVisiveisBase.filter(p => Number(p.compartilhado_comigo) === 1);
    const emAndamento = projetosAtivos.filter(p => !['Concluído'].includes(normalizarStatusProjeto(p.status))).length;
    const meus = projetosVisiveisBase.filter(p => Number(p.compartilhado_comigo) !== 1).length;

    const filtros = ['todos','Em andamento','A fazer','Em revisão','Pausado','Concluído','Arquivado'];
    const statusCountMap = Object.fromEntries(filtros.map(f => [f,
      f === 'todos'
        ? projetosVisiveisBase.length
        : (f === 'Arquivado'
          ? projetosArquivados.length
          : projetosAtivos.filter(p => normalizarStatusProjeto(p.status) === f).length)
    ]));

    let html = `
      ${renderInicioDia(projetos, ativas, ultimaSessao, focoGlobal, resumoHoje)}
      <div class="dash-header dash-header-spaced">
        <div>
          <div class="dash-title">Projetos</div>
        </div>
        <div class="dash-actions">
          ${isAdmin() ? `<button class="btn" onclick="abrirCentralAdmin()">Central admin</button>` : ''}
          ${isAdmin() ? `<button class="btn" onclick="modalNovoColega()">Cadastrar admin</button>` : ''}
          <button class="btn" onclick="modalNovoGrupo()">+ Grupo</button>
          <button class="btn btn-primary" onclick="modalNovoProjeto()">+ Novo projeto</button>
        </div>
      </div>
      ${compartilhados.length ? `<div class="share-hint"><strong>${compartilhados.length}</strong> projeto${compartilhados.length===1?'':'s'} compartilhado${compartilhados.length===1?'':'s'} com você no momento.</div>` : ''}
      <div class="dash-toolbar">
        <div class="dash-toolbar-row">
          <input type="search" class="search-dash" id="busca-dash" placeholder="Buscar projeto..." value="${esc(BUSCA_DASH)}" oninput="filtrarProjetosBusca(this.value)">
          <div class="segmented">
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH==='todos'?'ativo':''}" data-origem="todos" onclick="filtrarOrigemDash('todos')">Todos${projetosVisiveisBase.length > 0 ? `<span class="seg-count">${projetosVisiveisBase.length}</span>` : ''}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH==='meus'?'ativo':''}" data-origem="meus" onclick="filtrarOrigemDash('meus')">Meus${meus > 0 ? `<span class="seg-count">${meus}</span>` : ''}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH==='compartilhados'?'ativo':''}" data-origem="compartilhados" onclick="filtrarOrigemDash('compartilhados')">Compartilhados${compartilhados.length > 0 ? `<span class="seg-count">${compartilhados.length}</span>` : ''}</button>
          </div>
        </div>
        <div class="dash-toolbar-row">
          <select class="resp-filter select-control flex-shrink-0" onchange="filtrarGrupoDash(this.value)">
            <option value="todos" ${FILTRO_GRUPO_DASH==='todos'?'selected':''}>Todos os grupos</option>
            <option value="sem" ${FILTRO_GRUPO_DASH==='sem'?'selected':''}>Sem grupo</option>
            ${gruposVisiveisBase.map(g => `<option value="${g.id}" ${FILTRO_GRUPO_DASH===g.id?'selected':''}>${esc(g.nome)}</option>`).join('')}
          </select>
          <div class="toolbar-sep"></div>
          ${filtros.map(f => { const label = { 'todos':'Todos' }[f] || f; const cnt = statusCountMap[f] || 0; return `<button class="filter-btn ${FILTRO_STATUS===f?'ativo':''}" onclick="setFiltro('${esc(f)}')">${label}${cnt > 0 ? `<span class="seg-count">${cnt}</span>` : ''}</button>`; }).join('')}
        </div>
      </div>
      <div id="cards-grid-dash">`;

    html += renderProjetosDash(projetosVisiveisBase, gruposVisiveisBase) + '</div>';
    const slide = VISTA_ATUAL === 'projeto';
    setVistaAtual('dash');
    c.innerHTML = html;
    if (slide) slideContent('left');
  } catch (e) {
    c.innerHTML = `<div class="error-block">${esc(e.message)}<div class="muted-detail"><button class="btn btn-sm" onclick="renderDash()">Tentar novamente</button></div></div>`;
  }
}

function renderProjetosDash(projetos, grupos) {
  const busca = BUSCA_DASH.toLowerCase().trim();
  let lista = busca ? projetos.filter(p => p.nome.toLowerCase().includes(busca)) : projetos;

  if (FILTRO_ORIGEM_DASH === 'meus') lista = lista.filter(p => Number(p.compartilhado_comigo) !== 1);
  else if (FILTRO_ORIGEM_DASH === 'compartilhados') lista = lista.filter(p => Number(p.compartilhado_comigo) === 1);

  if (FILTRO_GRUPO_DASH === 'sem') lista = lista.filter(p => !p.grupo_id);
  else if (FILTRO_GRUPO_DASH !== 'todos') {
    const filtered = lista.filter(p => String(p.grupo_id) === String(FILTRO_GRUPO_DASH));
    if (filtered.length === 0 && lista.length > 0) {
      setFiltroGrupoDash('todos');
      salvarFiltrosDash();
    }
    else lista = filtered;
  }

  if (!lista.length) {
    const vazioInicial = !busca && FILTRO_STATUS === 'todos' && FILTRO_GRUPO_DASH === 'todos' && FILTRO_ORIGEM_DASH === 'todos';
    const vazioTexto = FILTRO_ORIGEM_DASH === 'compartilhados'
      ? 'Nenhum projeto compartilhado com você no contexto atual.'
      : (busca ? 'Tente outro termo de busca' : FILTRO_STATUS !== 'todos' ? 'Tente outro filtro' : 'Comece criando seu primeiro projeto.');
    const titulo = FILTRO_ORIGEM_DASH === 'compartilhados' ? 'Sem compartilhamentos no momento' : 'Sem projetos por aqui';
    return renderDashEmptyState(vazioTexto, { titulo, mostrarGuia: vazioInicial });
  }

  const collapsed = JSON.parse(localStorage.getItem('telier_grupos_collapsed') || '[]');
  const isCollapsed = id => collapsed.includes(id);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  function calcGrupoKpis(items) {
    return items.reduce((acc, projeto) => {
      const status = projeto.status || '';
      const prazo = projeto.prazo ? new Date(`${projeto.prazo}T00:00:00`) : null;
      if (prazo) prazo.setHours(0, 0, 0, 0);
      acc.area += Number(projeto.area_m2 || 0);
      acc.horas += Number(projeto.total_horas || 0);
      if (status === 'Concluído') acc.concluidos += 1;
      if (status === 'Em andamento' || status === 'Em revisão') acc.ativos += 1;
      if (prazo && prazo < hoje && status !== 'Concluído' && status !== 'Arquivado') acc.atrasados += 1;
      return acc;
    }, { area: 0, horas: 0, concluidos: 0, atrasados: 0, ativos: 0 });
  }

  let html = '';
  const compartilhados = lista.filter(p => Number(p.compartilhado_comigo) === 1);
  let listaAgrupada = lista;

  if (FILTRO_ORIGEM_DASH === 'todos' && compartilhados.length) {
    html += `<div class="shared-spotlight">
      <div class="dash-section-title"><h3>Compartilhados comigo</h3><span class="dash-section-note">Acesso direto ou herdado por grupo</span></div>
      <div class="cards-grid">${renderCardsDash(compartilhados)}</div>
    </div>`;
    listaAgrupada = lista.filter(p => Number(p.compartilhado_comigo) !== 1);
    if (listaAgrupada.length) {
      html += `<div class="dash-section-title"><h3>Meus projetos (organizados por grupo)</h3><span class="dash-section-note">Projetos sob sua propriedade ou gestão direta</span></div>`;
    }
  }

  const temGrupos = (grupos || []).length > 0;

  // Render all groups
  for (const grupo of (grupos || [])) {
    const gprojetos = listaAgrupada.filter(p => String(p.grupo_id) === String(grupo.id));
    const col = isCollapsed(grupo.id);
    const kpis = calcGrupoKpis(gprojetos);
    const pctConcl = gprojetos.length ? Math.round((kpis.concluidos / gprojetos.length) * 100) : 0;
    const grupoStatus = grupo.status || 'Ativo';
    const grupoArquivado = grupoStatus === 'Arquivado';
    const progressColor = pctConcl === 100 ? 'var(--green)' : 'var(--blue)';

    html += `
      <div class="grupo-section ${grupoArquivado ? 'is-archived' : ''}" id="gs-${grupo.id}"
        draggable="true"
        ondragstart="dragGrupo(event,'${grupo.id}')"
        ondragend="dragGrupoEnd(event)"
        ondragover="dragOver(event,'${grupo.id}')"
        ondragleave="dragLeave(event)"
        ondrop="dropProjeto(event,'${grupo.id}')">
        <div class="grupo-card" data-status="${esc(grupoStatus)}">
          <div class="grupo-card-header">
            <span class="grupo-toggle ${col ? 'collapsed' : ''}" onclick="toggleGrupo('${grupo.id}')" title="${col ? 'Expandir' : 'Recolher'}">▼</span>
            <div class="grupo-title-area">
              <span class="grupo-nome">${esc(grupo.nome)}</span>
            </div>
            <div class="grupo-props">
              <div class="grupo-prop">
                <span class="grupo-prop-val">${gprojetos.length}</span>
                <span class="grupo-prop-lbl">Projetos</span>
              </div>
              ${kpis.area > 0 ? `<div class="grupo-prop"><span class="grupo-prop-val">${kpis.area.toLocaleString('pt-BR',{maximumFractionDigits:0})} m²</span><span class="grupo-prop-lbl">Área</span></div>` : ''}
              ${kpis.horas > 0 ? `<div class="grupo-prop"><span class="grupo-prop-val">${fmtHoras(kpis.horas)}</span><span class="grupo-prop-lbl">Horas</span></div>` : ''}
              <div class="grupo-prop">
                <span class="grupo-prop-val ${grupoProgressToneClass(pctConcl, kpis.atrasados)}">${pctConcl}%</span>
                <span class="grupo-prop-lbl">${kpis.atrasados ? `⚠ ${kpis.atrasados}d atr.` : 'Progresso'}</span>
              </div>
              ${grupo.status && grupo.status !== 'Ativo' ? `<div class="grupo-prop"><span class="grupo-prop-val ${grupoStatusToneClass(grupo.status)}">${esc(grupo.status)}</span><span class="grupo-prop-lbl">Status</span></div>` : ''}
            </div>
            <div class="grupo-actions" onclick="event.stopPropagation()">
              <button class="btn btn-primary btn-sm" onclick="abrirGrupo('${grupo.id}')">Abrir</button>
              <button class="btn btn-ghost btn-sm" onclick="compartilharGrupo('${grupo.id}')">Compartilhar</button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="modalEditarGrupo('${grupo.id}')" title="Configurações do grupo"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>
            </div>
          </div>
          ${!col && gprojetos.length > 0 ? `
          <div class="grupo-card-prog">
            <div class="grupo-card-prog-fill" style="width:${pctConcl}%;background:${progressColor}"></div>
          </div>` : ''}
          ${col ? '' : `
          <div class="grupo-card-body">
            <div class="grupo-drop-indicator tight">Solte para mover para ${esc(grupo.nome)}</div>
            ${gprojetos.length
              ? `<div class="grupo-content-shell"><div class="grupo-project-grid">${renderCardsDash(gprojetos)}</div></div>`
              : `<div class="grupo-empty-zone with-action"><span class="grupo-drop-hint">Arraste projetos aqui</span><button class="btn btn-sm" onclick="event.stopPropagation();modalNovoProjeto('${grupo.id}')">+ Criar projeto neste grupo</button></div>`}
          </div>`}
        </div>
      </div>`;
  }

  // Ungrouped projects
  const grupoIds = new Set((grupos || []).map(g => String(g.id)));
  const semGrupo = listaAgrupada.filter(p => !p.grupo_id || !grupoIds.has(String(p.grupo_id)));
  if (semGrupo.length || temGrupos) {
    if (temGrupos) {
      html += `<div class="grupo-section sem-grupo"
        ondragover="dragOver(event,null)"
        ondragleave="dragLeave(event)"
        ondrop="dropProjeto(event,null)">
        <div class="grupo-sem-label">Sem grupo</div>
        <div class="grupo-drop-indicator">Solte para remover do grupo</div>
        ${semGrupo.length
          ? `<div class="cards-grid">${renderCardsDash(semGrupo)}</div>`
          : `<div class="grupo-empty-zone"><span class="grupo-drop-hint">Arraste projetos aqui para desagrupar</span></div>`}
      </div>`;
    } else {
      html += `<div class="cards-grid">${renderCardsDash(semGrupo)}</div>`;
    }
  }

  return html || renderDashEmptyState('Crie um projeto para começar a organizar tarefas e prazo.', { mostrarGuia: false });
}

export function renderCardsDash(projetos) {
  return projetos.map(p => {
    const statusProjeto = normalizarStatusProjeto(p.status);
    const total = parseInt(p.total_tarefas) || 0;
    const conc = parseInt(p.tarefas_concluidas) || 0;
    const pct = total ? Math.round(conc / total * 100) : 0;
    const dias = diasRestantes(p.prazo);
    const urgente = dias !== null && dias <= 7 && !projetoConcluido(statusProjeto);
    const timerAtivo = _ativasDash && _ativasDash.some(a => a.projeto_id === p.id);
    const compartilhado = Number(p.compartilhado_comigo) === 1;

    return `
      <div class="proj-card ${urgente ? 'urgent' : ''}" draggable="true" ondragstart="dragProjeto(event,'${p.id}')" ondragend="dragProjetoEnd(event)" onclick="abrirProjeto('${p.id}')">
        <div class="proj-card-header">
          <div class="proj-card-title">
            <div class="proj-title">${esc(p.nome)}</div>
            ${compartilhado ? '<svg class="proj-shared-icon" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l4 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' : ''}
          </div>
          ${p.dono ? `<div class="proj-avatar">${avatar(p.dono, 'sm')}</div>` : ''}
        </div>
        <div class="proj-card-body">
          ${p.total_tarefas ? `<div class="proj-progress"><div class="proj-prog-bar"><div class="proj-prog-fill" style="width:${pct}%"></div></div><span class="proj-prog-text">${conc}/${total}</span></div>` : ''}
        </div>
        <div class="proj-card-footer">
          <div class="proj-meta">
            ${prazoFmt(p.prazo) ? `<span class="proj-meta-item${urgente ? ' urgent' : ''}">📅 ${prazoFmt(p.prazo)}</span>` : ''}
            ${p.area_m2 ? `<span class="proj-meta-item">📐 ${Math.round(p.area_m2)} m²</span>` : ''}
          </div>
          <div class="proj-status">${tag(statusProjeto)}</div>
        </div>
      </div>`;
  }).join('');
}

// Helper functions
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

// Expose globally
if (typeof window !== 'undefined') {
  window.renderDash = renderDash;
  window.setFiltro = setFiltro;
  window.filtrarProjetosBusca = filtrarProjetosBusca;
  window.filtrarGrupoDash = filtrarGrupoDash;
  window.filtrarOrigemDash = filtrarOrigemDash;
  window.toggleStartday = toggleStartday;
  window.renderCardsDash = renderCardsDash;
  window.slideContent = slideContent;
  window.setBreadcrumb = setBreadcrumb;
}
