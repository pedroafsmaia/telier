// ── GROUPS ──
import {
  EU, GRUPO_ATUAL, USUARIOS, _gruposDash,
  GRUPO_TASK_MOBILE_FILTERS_OPEN,
  setGrupoAtual, setVistaAtual, setUsuarios, setGrupoTaskMobileFiltersOpen, setGruposDash, setProjsDash,
} from './state.js';
import { req, invalidarCacheProjetos } from './api.js';
import { toast, toastUndo, abrirModal, fecharModal, confirmar, btnLoading, setBreadcrumb, setShellView, slideContent } from './ui.js';
import {
  esc, gv, sel, avatar, tag, metaPair, fmtHoras, prazoFmt, diasRestantes, souDono, isAdmin, normalizarStatusProjeto,
  formatarFaseProjeto, formatarStatusProjeto, formatarProgressoProjeto,
  PT, PO, DT, DO, normalizarColaboradoresTarefas, tarefaCompartilhadaComigo,
} from './utils.js';
import { renderAoVivoStream } from './tasks.js';

export async function renderGroupsHome(opts = {}) {
  if (!opts.fromRoute) {
    return window.goGroups ? window.goGroups() : null;
  }
  window.scrollTo(0, 0);
  setShellView('groups');
  setVistaAtual('groups');
  document.title = 'Grupos · Telier';
  setBreadcrumb([{ label: 'Grupos' }]);
  const c = document.getElementById('content');
  c.innerHTML = `<div class="skeleton-list" aria-live="polite" aria-busy="true">
    <div class="skeleton-block"><div class="skeleton-line w-45"></div><div class="skeleton-line w-100"></div><div class="skeleton-line w-60"></div></div>
    <div class="skeleton-block"><div class="skeleton-line w-30"></div><div class="skeleton-line w-100"></div><div class="skeleton-line w-80"></div></div>
  </div>`;
  try {
    const [grupos, projetos, ativas] = await Promise.all([
      req('GET', '/grupos').catch(() => []),
      req('GET', '/projetos').catch(() => []),
      req('GET', '/tempo/ativas').catch(() => []),
    ]);
    setGruposDash(grupos);
    setProjsDash(projetos);

    const gruposOrdenados = [...(grupos || [])].sort((a, b) => {
      const ao = Number(a.ordem || 0);
      const bo = Number(b.ordem || 0);
      if (ao !== bo) return ao - bo;
      return (a.nome || '').localeCompare(b.nome || '');
    });
    const projetosAtivos = (projetos || []).filter(p => normalizarStatusProjeto(p.status) !== 'Arquivado');
    const semGrupo = projetosAtivos.filter(p => !p.grupo_id);
    const projetosComGrupo = projetosAtivos.filter(p => p.grupo_id);

    const htmlGrupos = gruposOrdenados.map(grupo => {
      const projetosGrupo = projetosAtivos.filter(p => String(p.grupo_id) === String(grupo.id));
      const totalProjetos = projetosGrupo.length;
      const totalTarefas = projetosGrupo.reduce((acc, p) => acc + Number(p.total_tarefas || 0), 0);
      const concluidas = projetosGrupo.reduce((acc, p) => acc + Number(p.tarefas_concluidas || 0), 0);
      const pendentes = Math.max(0, totalTarefas - concluidas);
      const sessoesAtivas = (ativas || []).filter(a => projetosGrupo.some(p => String(p.id) === String(a.projeto_id))).length;
      const atrasados = projetosGrupo.filter(p => {
        const dias = diasRestantes(p.prazo);
        return dias !== null && dias < 0 && !['Concluído', 'Arquivado'].includes(normalizarStatusProjeto(p.status));
      }).length;
      const preview = projetosGrupo
        .sort((a, b) => {
          const ad = a.prazo || '9999-99-99';
          const bd = b.prazo || '9999-99-99';
          return ad.localeCompare(bd) || (a.nome || '').localeCompare(b.nome || '');
        })
        .slice(0, 3);

      return `
        <article class="group-shell-card" data-status="${esc(grupo.status || 'Ativo')}">
          <div class="group-shell-card-head">
            <div class="group-shell-card-main">
              <div class="section-kicker">Grupo</div>
              <div class="group-shell-card-title-row">
                <h3 class="group-shell-card-title">${esc(grupo.nome)}</h3>
                ${metaPair('Status', grupo.status || 'Ativo', (grupo.status || 'Ativo') === 'Arquivado' ? 'is-alert' : 'is-muted')}
              </div>
              <p class="group-shell-card-copy">${esc(grupo.descricao || 'Base de coordenação para projetos e tarefas relacionados.')}</p>
            </div>
            <div class="group-shell-card-actions">
              <button class="btn btn-sm btn-primary" onclick="abrirGrupo('${grupo.id}')">Abrir grupo</button>
              <button class="btn btn-sm" onclick="modalEditarGrupo('${grupo.id}')">Editar</button>
            </div>
          </div>
          <div class="group-shell-card-metrics">
            <div class="dash-metric">
              <div class="dash-metric-label">Projetos</div>
              <div class="dash-metric-value">${totalProjetos}</div>
            </div>
            <div class="dash-metric">
              <div class="dash-metric-label">Pendências</div>
              <div class="dash-metric-value">${pendentes}</div>
            </div>
            <div class="dash-metric">
              <div class="dash-metric-label">Tempo em curso</div>
              <div class="dash-metric-value">${sessoesAtivas}</div>
            </div>
            <div class="dash-metric">
              <div class="dash-metric-label">Atrasados</div>
              <div class="dash-metric-value ${atrasados ? 'is-overdue' : ''}">${atrasados}</div>
            </div>
          </div>
          <div class="group-shell-project-strip">
            <div class="group-shell-project-strip-head">
              <span>Projetos do grupo</span>
              <span>${concluidas}/${totalTarefas} tarefas concluídas</span>
            </div>
            ${preview.length ? preview.map(projeto => `
              <button class="group-shell-project-row" onclick="abrirProjeto('${projeto.id}')">
                <span class="group-shell-project-name">${esc(projeto.nome)}</span>
                <span class="group-shell-project-meta">${Number(projeto.total_tarefas || 0)} tarefas</span>
              </button>
            `).join('') : `<div class="group-shell-empty">Nenhum projeto vinculado a este grupo.</div>`}
          </div>
        </article>`;
    }).join('');

    c.innerHTML = `
      <div class="dash-header dash-header-spaced dash-head-grid">
        <div class="dash-head-main">
          <div class="section-kicker">Estrutura operacional</div>
          <div class="dash-title">Grupos</div>
          <div class="dash-sub dash-sub-tight">A navegação estrutural do Telier parte daqui: grupos organizam projetos e concentram a operação por contexto de trabalho.</div>
        </div>
        <div class="dash-actions">
          <button class="btn" onclick="goProjects()">Ver projetos</button>
          <button class="btn btn-primary" onclick="modalNovoGrupo()">Novo grupo</button>
        </div>
      </div>
      <div class="dash-metrics-strip group-shell-summary">
        <div class="dash-metric"><div class="dash-metric-label">Grupos ativos</div><div class="dash-metric-value">${gruposOrdenados.length}</div></div>
        <div class="dash-metric"><div class="dash-metric-label">Projetos vinculados</div><div class="dash-metric-value">${projetosComGrupo.length}</div></div>
        <div class="dash-metric"><div class="dash-metric-label">Projetos sem grupo</div><div class="dash-metric-value">${semGrupo.length}</div></div>
      </div>
      <div class="groups-shell-grid">
        <section class="groups-shell-main">
          ${htmlGrupos || `<div class="empty-state"><div class="empty-text">Nenhum grupo cadastrado</div><div class="empty-sub">Crie um grupo para recuperar a navegação estrutural do sistema.</div><div class="empty-cta"><button class="btn btn-primary" onclick="modalNovoGrupo()">Criar grupo</button></div></div>`}
        </section>
        <aside class="groups-shell-side">
          <div class="section-shell group-shell-side-card">
            <div class="section-head">
              <div>
                <div class="section-kicker">Sem grupo</div>
                <div class="section-title">${semGrupo.length} projeto${semGrupo.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div class="group-shell-side-copy">Projetos fora de grupos continuam acessíveis, mas ficam fora da navegação principal do escritório.</div>
            <div class="group-shell-side-list">
              ${semGrupo.slice(0, 5).map(projeto => `
                <button class="group-shell-side-item" onclick="abrirProjeto('${projeto.id}')">
                  <span>${esc(projeto.nome)}</span>
                  <span>${Number(projeto.total_tarefas || 0)} tarefas</span>
                </button>
              `).join('') || `<div class="group-shell-empty">Nenhum projeto solto no momento.</div>`}
            </div>
          </div>
        </aside>
      </div>`;
  } catch (e) {
    c.innerHTML = `<div class="error-block">${esc(e.message)}<div class="muted-detail"><button class="btn btn-sm" onclick="renderGroupsHome()">Tentar novamente</button></div></div>`;
  }
}

export async function abrirGrupo(id, opts = {}) {
  if (!opts.fromRoute) {
    return window.goGrupo ? window.goGrupo(id) : null;
  }
  window.scrollTo(0, 0);
  setShellView('groups');
  const c = document.getElementById('content');
  c.style.opacity = '0.4';
  c.style.pointerEvents = 'none';
  try {
    const [grupo, projetos] = await Promise.all([
      req('GET', `/grupos/${id}`),
      req('GET', `/projetos`),
    ]);
    const projetosDoGrupo = projetos.filter(p => p.grupo_id === id);
    c.style.opacity = '';
    c.style.pointerEvents = '';
    const abaSalva = sessionStorage.getItem(`telier_grupo_aba_${id}`) || 'tarefas';
    slideContent('right');
    renderGrupo(grupo, projetosDoGrupo, abaSalva);
    setVistaAtual('grupo');
  } catch (e) {
    c.style.opacity = '';
    c.style.pointerEvents = '';
    c.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
  }
}

export function renderGrupo(grupo, projetos, abaAtiva = 'projetos') {
  setGrupoAtual(grupo);
  GRUPO_ATUAL._projetos = projetos;
  GRUPO_ATUAL._tarefasCache = null;
  GRUPO_ATUAL._tarefasCacheKey = null;
  const isArq = (grupo.status || 'Ativo') === 'Arquivado';
  const isPaus = (grupo.status || 'Ativo') === 'Pausado';
  const podeGer = !!(grupo.pode_gerenciar || souDono(grupo.dono_id) || isAdmin());

  setBreadcrumb([
    { label: 'Grupos', onClick: 'renderGroupsHome()' },
    { label: grupo.nome },
  ]);

  const nProjetos = projetos.length;
  const nAtrasados = grupo.projetos_atrasados || 0;

  document.getElementById('content').innerHTML = `
    <button class="btn-back" onclick="renderGroupsHome()">← Voltar para grupos</button>
    <section class="detail-shell"><div class="proj-hero detail-hero" data-status="${esc(grupo.status || 'Ativo')}">
      <div class="proj-hero-top">
        <div class="proj-hero-left">
          <div class="section-kicker">Grupo</div>
          <div class="proj-nome ${isArq ? 'is-muted' : ''}">${esc(grupo.nome)}</div>
          ${grupo.descricao ? `<div class="proj-dono muted-detail">${esc(grupo.descricao)}</div>` : ''}
          <div class="dash-sub dash-sub-tight">Estrutura de coordenação para agrupar projetos, operação compartilhada e acompanhamento transversal.</div>
        </div>
        <div class="proj-hero-actions">
          ${podeGer ? `<button class="btn btn-sm" onclick="modalEditarGrupo('${grupo.id}')">Editar grupo</button>` : ''}
          <button class="btn btn-sm" onclick="modalCompartilharGrupo('${grupo.id}')">Compartilhar grupo</button>
        </div>
      </div>
      <div class="proj-meta">
        <div class="proj-meta-item">${metaPair('Status', grupo.status || 'Ativo', (grupo.status || 'Ativo') === 'Arquivado' ? 'is-alert' : 'is-muted')}</div>
        <div class="proj-meta-item">${metaPair('Projetos', `${grupo.total_projetos ?? nProjetos}`, 'is-muted')}</div>
        ${grupo.area_total_m2 ? `<div class="proj-meta-item">${metaPair('Área total', `${Number(grupo.area_total_m2).toLocaleString('pt-BR')} m²`, 'is-muted')}</div>` : ''}
        ${grupo.total_horas ? `<div class="proj-meta-item">${metaPair('Horas totais', fmtHoras(Number(grupo.total_horas)), 'is-muted')}</div>` : ''}
        ${nAtrasados > 0 ? `<div class="proj-meta-item">${metaPair('Atrasados', `${nAtrasados}`, 'is-alert')}</div>` : ''}
      </div>
      <div class="dash-metrics-strip detail-metrics-strip">
        <div class="dash-metric">
          <div class="dash-metric-label">Projetos</div>
          <div class="dash-metric-value">${grupo.total_projetos ?? nProjetos}</div>
        </div>
        ${grupo.area_total_m2 ? `<div class="dash-metric">
          <div class="dash-metric-label">Área total</div>
          <div class="dash-metric-value">${Number(grupo.area_total_m2).toLocaleString('pt-BR')} m²</div>
        </div>` : ''}
        ${grupo.total_horas ? `<div class="dash-metric">
          <div class="dash-metric-label">Horas totais</div>
          <div class="dash-metric-value">${fmtHoras(Number(grupo.total_horas))}</div>
        </div>` : ''}
        ${nAtrasados > 0 ? `<div class="dash-metric">
          <div class="dash-metric-label">Atrasados</div>
          <div class="dash-metric-value">${nAtrasados}</div>
        </div>` : ''}
      </div>
      ${isArq ? `
        <div class="alert-banner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          Grupo arquivado — projetos internos em somente leitura.
        </div>` : ''}
      ${isPaus ? `
        <div class="alert-banner is-warning">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/><path d="M10 8v8M14 8v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          Grupo pausado — atividades em espera.
        </div>` : ''}
    </div></section>
    <div class="abas abas-spaced detail-nav">
      <button class="aba ${abaAtiva==='tarefas'?'ativa':''}" data-aba="tarefas" onclick="mudarAbaGrupo('tarefas')">Tarefas</button>
      <button class="aba ${abaAtiva==='projetos'?'ativa':''}" data-aba="projetos" onclick="mudarAbaGrupo('projetos')">Projetos${nProjetos ? ` <span class="tab-count">${nProjetos}</span>` : ''}</button>
    </div>
    <div id="aba-grupo"></div>`;

  renderAbaGrupo(abaAtiva, projetos);
}

export function mudarAbaGrupo(aba) {
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  if (GRUPO_ATUAL?.id) sessionStorage.setItem(`telier_grupo_aba_${GRUPO_ATUAL.id}`, aba);
  const projetos = GRUPO_ATUAL?._projetos || [];
  renderAbaGrupo(aba, projetos);
}

export function renderAbaGrupo(aba, projetos) {
  const el = document.getElementById('aba-grupo');
  if (!el) return;
  if (aba === 'tarefas') renderGrupoAbaTarefas(el);
  else renderGrupoAbaProjetos(el, projetos);
}

export async function carregarTarefasGrupo(grupo = GRUPO_ATUAL) {
  if (!grupo) return [];
  const projetos = grupo._projetos || [];
  const listas = await Promise.all(projetos.map(p =>
    req('GET', `/projetos/${p.id}/tarefas`).catch(() => []).then(tarefas =>
      normalizarColaboradoresTarefas(tarefas).map(t => ({
        ...t,
        projeto_id: t.projeto_id || p.id,
        projeto_nome: t.projeto_nome || p.nome,
        grupo_id: grupo.id,
        grupo_nome: grupo.nome,
      }))
    )
  ));
  const tarefas = listas.flat();
  return tarefas;
}

export async function carregarAoVivoGrupo(grupo = GRUPO_ATUAL) {
  if (!grupo) return [];
  const projetos = grupo._projetos || [];
  const ids = new Set(projetos.map(p => String(p.id)));
  const ativas = await req('GET', '/tempo/ativas').catch(() => []);
  return (ativas || []).filter(s => ids.has(String(s.projeto_id)));
}

export async function carregarAoVivoProjeto(projetoId) {
  if (!projetoId) return [];
  const ativas = await req('GET', '/tempo/ativas').catch(() => []);
  return (ativas || []).filter(s => String(s.projeto_id) === String(projetoId));
}

export function renderGrupoAbaProjetos(el, projetos) {
  if (!projetos.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-text">Nenhum projeto neste grupo</div><div class="empty-sub">Arraste projetos aqui ou crie um novo associado a este grupo.</div></div>`;
    return;
  }
  import('./dashboard.js').then(({ renderCardsDash }) => {
    el.innerHTML = `
      <div class="section-shell">
        <div class="section-head">
          <div>
            <div class="section-kicker">Projetos do grupo</div>
            <div class="section-title">${projetos.length} projeto${projetos.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="cards-grid cards-grid-projects">${renderCardsDash(projetos)}</div>
      </div>`;
  });
}

export async function renderGrupoAbaTarefas(el) {
  if (!GRUPO_ATUAL?.id) return;
  el.innerHTML = `<div class="skeleton-list" aria-live="polite" aria-busy="true">
    <div class="skeleton-block"><div class="skeleton-line w-30"></div><div class="skeleton-line w-100"></div><div class="skeleton-line w-80"></div></div>
    <div class="skeleton-block"><div class="skeleton-line w-45"></div><div class="skeleton-line w-100"></div><div class="skeleton-line w-60"></div></div>
  </div>`;
  try {
    const tarefas = await carregarTarefasGrupo();
    const responsaveis = [...new Map(tarefas.map(t => [t.dono_id, { id: t.dono_id, nome: t.dono_nome }])).values()];
    const projetosFiltro = [...new Map(tarefas.map(t => [t.projeto_id, { id: t.projeto_id, nome: t.projeto_nome || 'Projeto' }])).values()];
    const compartilhadas = tarefas.filter(t => tarefaCompartilhadaComigo(t)).length;
    const minhas = tarefas.filter(t => t.dono_id === EU?.id).length;

    let filtroStatus = 'todos';
    let filtroPrior = 'todos';
    let filtroResp = '';
    let filtroProjeto = '';
    let filtroBusca = '';
    let filtroOrigem = 'todos';

    function aplicar() {
      filtroStatus = window._gtFiltroStatus || 'todos';
      filtroPrior = window._gtFiltroPrior || 'todos';
      filtroResp = window._gtFiltroResp || '';
      filtroProjeto = window._gtFiltroProjeto || '';
      filtroBusca = window._gtBusca || '';
      filtroOrigem = window._gtFiltroOrigem || 'todos';
      let lista = [...tarefas];
      if (filtroOrigem === 'meus') lista = lista.filter(t => t.dono_id === EU?.id);
      else if (filtroOrigem === 'compartilhadas') lista = lista.filter(t => tarefaCompartilhadaComigo(t));
      if (filtroStatus !== 'todos') lista = lista.filter(t => t.status === filtroStatus);
      if (filtroPrior !== 'todos') lista = lista.filter(t => t.prioridade === filtroPrior);
      if (filtroResp) lista = lista.filter(t => t.dono_id === filtroResp);
      if (filtroProjeto) lista = lista.filter(t => String(t.projeto_id) === String(filtroProjeto));
      if (filtroBusca) lista = lista.filter(t => (t.nome || '').toLowerCase().includes(filtroBusca.toLowerCase()));
      const tbody = document.getElementById('gt-tbody');
      if (!tbody) return;
      tbody.innerHTML = lista.length ? lista.map(t => `
        <article class="ops-row clickable-row" onclick="abrirProjeto('${t.projeto_id}')">
          <div class="ops-row-main">
            <div class="ops-row-title ${t.status==='Concluída'?'concluida':''}">${esc(t.nome)}</div>
            <div class="ops-row-context">${esc(t.projeto_nome || '—')}</div>
          </div>
          <div class="ops-row-meta">
            <div class="resp-chip">${avatar(t.dono_nome,'avatar-sm')} <span>${esc(t.dono_nome||'—')}</span></div>
            ${metaPair('Prioridade', t.prioridade || '—', t.prioridade === 'Alta' ? 'is-warn' : 'is-muted')}
            ${metaPair('Status', t.status || '—', t.status === 'Bloqueada' ? 'is-alert' : 'is-muted')}
            ${metaPair('Prazo', t.data ? prazoFmt(t.data,true) : '—', t.data && diasRestantes(t.data) <= 0 ? 'is-alert' : 'is-muted')}
          </div>
        </article>`).join('')
      : `<div class="table-empty-row">Nenhuma tarefa encontrada.</div>`;
    }

    window._gtAplicar = () => aplicar();
    const statusTabs = ['todos','A fazer','Em andamento','Bloqueada','Concluída'];

    el.innerHTML = `
      <div class="dash-toolbar task-view-toolbar tarefas-toolbar-spaced">
        <div class="dash-toolbar-row">
          <div class="task-toolbar-main">
            <input type="search" class="search-dash search-tarefa" placeholder="Buscar tarefa..." oninput="window._gtBusca=this.value;window._gtAplicar()">
            <div class="segmented">
              <button class="segmented-btn ativo" id="gt-origem-todos" onclick="window._gtFiltroOrigem='todos';window._gtAplicar();document.getElementById('gt-origem-todos').classList.add('ativo');document.getElementById('gt-origem-meus').classList.remove('ativo');document.getElementById('gt-origem-comp').classList.remove('ativo')">Todas${tarefas.length ? `<span class="seg-count">${tarefas.length}</span>` : ''}</button>
              <button class="segmented-btn" id="gt-origem-meus" onclick="window._gtFiltroOrigem='meus';window._gtAplicar();document.getElementById('gt-origem-meus').classList.add('ativo');document.getElementById('gt-origem-todos').classList.remove('ativo');document.getElementById('gt-origem-comp').classList.remove('ativo')">Minhas${minhas ? `<span class="seg-count">${minhas}</span>` : ''}</button>
              <button class="segmented-btn" id="gt-origem-comp" onclick="window._gtFiltroOrigem='compartilhadas';window._gtAplicar();document.getElementById('gt-origem-comp').classList.add('ativo');document.getElementById('gt-origem-todos').classList.remove('ativo');document.getElementById('gt-origem-meus').classList.remove('ativo')">Compartilhadas${compartilhadas ? `<span class="seg-count">${compartilhadas}</span>` : ''}</button>
            </div>
          </div>
          <div class="task-toolbar-actions">
            <button class="btn btn-sm task-mobile-filter-btn" onclick="window._gtFiltersOpen=!window._gtFiltersOpen;window._gtAplicar()">Filtros</button>
            <div class="task-view-kpi">${tarefas.length} tarefa${tarefas.length!==1?'s':''}</div>
          </div>
        </div>
        <div class="dash-toolbar-row task-mobile-secondary ${window._gtFiltersOpen ? 'is-open' : ''}">
          <div class="task-toolbar-summary">
            ${projetosFiltro.length > 1 ? `<select class="select-control" onchange="window._gtFiltroProjeto=this.value;window._gtAplicar()">
              <option value="">Todos os projetos</option>
              ${projetosFiltro.map(p=>`<option value="${p.id}">${esc(p.nome)}</option>`).join('')}
            </select>` : ""}
            ${responsaveis.length > 1 ? `<select class="select-control" onchange="window._gtFiltroResp=this.value;window._gtAplicar()">
              <option value="">Todos os responsáveis</option>
              ${responsaveis.map(r=>`<option value="${r.id}">${esc(r.nome)}</option>`).join('')}
            </select>` : ''}
            <select class="select-control" onchange="window._gtFiltroPrior=this.value;window._gtAplicar()">
              <option value="todos">Toda prioridade</option>
              ${['Alta','Média','Baixa'].map(s=>`<option value="${s}">${s}</option>`).join('')}
            </select>
            ${statusTabs.map(s => `<button class="filter-btn ${s==='todos'?'ativo':''}" id="gt-status-${s.replace(/\s+/g,'-')}" onclick="window._gtFiltroStatus='${esc(s)}';window._gtAplicar();document.querySelectorAll('[id^=\\'gt-status-\\']').forEach(el=>el.classList.remove('ativo'));document.getElementById('gt-status-${s.replace(/\s+/g,'-')}').classList.add('ativo')">${s==='todos'?'Todos':s}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="task-view-surface">
        <div class="task-table-shell">
          <div id="gt-tbody" class="ops-row-stack"></div>
        </div>
      </div>`;

    window._gtFiltroProjeto = '';
    window._gtFiltroStatus = 'todos';
    window._gtFiltroPrior = 'todos';
    window._gtFiltroResp = '';
    window._gtFiltroOrigem = 'todos';
    window._gtBusca = '';
    window._gtFiltersOpen = false;
    aplicar();
  } catch (e) { el.innerHTML = `<div class="error-block">${esc(e.message)}</div>`; }
}

export async function renderGrupoAbaMapa(el) {
  if (!GRUPO_ATUAL?.id) return;
  el.innerHTML = `<div class="skeleton-block" aria-live="polite" aria-busy="true">
    <div class="skeleton-line w-45"></div>
    <div class="skeleton-line w-100"></div>
    <div class="skeleton-line w-100"></div>
  </div>`;
  try {
    const tarefas = await carregarTarefasGrupo();
    const pendentes = tarefas
      .filter(t => t.status !== 'Concluída' && t.status !== 'Bloqueada')
      .sort((a, b) => {
        const p = (PO[a.prioridade] ?? 1) - (PO[b.prioridade] ?? 1);
        if (p) return p;
        const d = (DO[a.complexidade] ?? 1) - (DO[b.complexidade] ?? 1);
        if (d) return d;
        const da = a.data || '9999-99-99';
        const db = b.data || '9999-99-99';
        return da.localeCompare(db);
      });

    if (!pendentes.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-text">Todas as tarefas concluídas</div></div>`;
      return;
    }

    const bloqueadas = tarefas.filter(t => t.status === 'Bloqueada');
    el.innerHTML = `
      <div class="task-view-surface">
        <div class="task-view-head">
          <div>
            <div class="task-view-eyebrow">Mapa de foco do grupo</div>
            <div class="task-view-title">${pendentes.length} prioridade${pendentes.length !== 1 ? 's' : ''} entre projetos</div>
            <div class="task-view-copy">Ordenado por prioridade, complexidade e prazo entre todos os projetos do grupo.</div>
          </div>
          <div class="task-view-kpi">${bloqueadas.length} bloqueada${bloqueadas.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="mapa-intro">Clique em um item para abrir o projeto e continuar a execução dali.</div>
        ${bloqueadas.length ? `
          <div class="task-view-surface" style="padding:12px 14px;background:rgba(231,68,68,.06);border-color:rgba(231,68,68,.2);box-shadow:none">
            <div class="task-view-eyebrow" style="color:var(--red)">Bloqueadas</div>
            <div class="task-status-strip">
              ${bloqueadas.map(t => metaPair('Bloqueada', t.nome, 'is-alert')).join('')}
            </div>
          </div>` : ''}
        <div class="mapa-list">
          ${pendentes.map((t, i) => {
            const diasT = diasRestantes(t.data || null);
            const urgt = diasT !== null && diasT <= 2 && t.status !== 'Concluída';
            return `
              <div class="mapa-item clickable ${t.foco && t.dono_id === EU?.id ? 'is-foco' : ''}"
                   onclick="abrirProjeto('${t.projeto_id}')">
                <div class="mapa-rank">${String(i + 1).padStart(2, '0')}</div>
                <div class="mapa-body">
                  <div class="mapa-nome">${esc(t.nome)}</div>
                  <div class="mapa-sub">${esc(t.projeto_nome || '')} · ${esc(t.dono_nome || 'Sem responsável')}</div>
                </div>
                <div class="mapa-tags">
                  ${metaPair('Prioridade', t.prioridade, t.prioridade === 'Alta' ? 'is-warn' : 'is-muted')}
                  ${metaPair('Complexidade', t.complexidade || t.dificuldade, 'is-muted')}
                  ${t.foco && t.dono_id === EU?.id ? metaPair('Foco', 'Meu foco', 'is-info') : ''}
                  ${urgt ? metaPair('Prazo', diasT <= 0 ? 'Vencida' : `${diasT}d`, diasT <= 0 ? 'is-alert' : 'is-warn') : ''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  } catch (e) { el.innerHTML = `<div class="error-block">${esc(e.message)}</div>`; }
}

export async function renderGrupoAbaAoVivo(el) {
  if (!GRUPO_ATUAL?.id) return;
  el.innerHTML = `<div class="skeleton-block" aria-live="polite" aria-busy="true">
    <div class="skeleton-line w-30"></div>
    <div class="skeleton-line w-100"></div>
    <div class="skeleton-line w-60"></div>
  </div>`;
  try {
    const sessoes = await carregarAoVivoGrupo();
    if (!sessoes.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-text">Nenhum cronômetro ativo no grupo agora</div><div class="empty-sub">Quando um membro iniciar um cronômetro, ele aparece aqui.</div></div>`;
      return;
    }
    el.innerHTML = renderAoVivoStream(sessoes, {
      titulo: 'Ao vivo do grupo',
      copy: 'Atividade em andamento nos projetos deste grupo.',
      mostrarProjeto: true,
      abrir: s => `abrirProjeto('${s.projeto_id}')`,
    });
  } catch (e) { el.innerHTML = `<div class="error-block">${esc(e.message)}</div>`; }
}

export function renderGrupoAbaRelatorio(el, projetos) {
  if (!projetos.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-text">Nenhum projeto no grupo</div></div>`;
    return;
  }
  const total      = projetos.length;
  const concluidos = projetos.filter(p => normalizarStatusProjeto(p.status) === 'Concluído').length;
  const arquivados = projetos.filter(p => normalizarStatusProjeto(p.status) === 'Arquivado').length;
  const totalHoras = projetos.reduce((s, p) => s + (parseFloat(p.total_horas) || 0), 0);
  const totalArea  = projetos.reduce((s, p) => s + (parseFloat(p.area_m2)    || 0), 0);
  const hoje       = new Date().toISOString().slice(0, 10);
  const atrasados  = projetos.filter(p =>
    p.prazo && p.prazo < hoje &&
    !['Concluído','Arquivado'].includes(normalizarStatusProjeto(p.status))
  ).length;

  el.innerHTML = `
    <div class="task-view-surface">
    <div class="task-view-head">
      <div>
        <div class="task-view-eyebrow">Relatório do grupo</div>
        <div class="task-view-title">${total} projeto${total !== 1 ? 's' : ''}</div>
        <div class="task-view-copy">Resumo consolidado do grupo.</div>
      </div>
      <div class="task-view-kpi">${fmtHoras(totalHoras)}</div>
    </div>
    <div class="rel-kpi-grid">
      ${[
        ['Projetos',    total,                         false],
        ['Concluídos',  `${concluidos} / ${total}`,    false],
        ['Horas totais', fmtHoras(totalHoras),         false],
        ['Área total',  totalArea ? `${totalArea.toLocaleString('pt-BR')} m²` : '—', false],
        ['Atrasados',   atrasados || '0',              atrasados > 0],
      ].map(([label, val, alerta]) => `
        <div class="rel-kpi-card ${alerta ? 'is-alert' : ''}">
          <div class="rel-kpi-label">${alerta ? '⚠ ' : ''}${label}</div>
          <div class="rel-kpi-value">${val}</div>
        </div>`).join('')}
    </div>
    ${arquivados > 0 ? `
      <div class="alert-banner" style="margin-bottom:12px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        ${arquivados} projeto${arquivados !== 1 ? 's' : ''} arquivado${arquivados !== 1 ? 's' : ''} — exibidos em modo somente leitura.
      </div>` : ''}
    </div>
    <div class="rel-stack">
      ${projetos.map(p => {
        const status  = formatarStatusProjeto(p.status);
        const isArqP  = status === 'Arquivado';
        const t  = Number(p.total_tarefas      || 0);
        const c  = Number(p.tarefas_concluidas || 0);
        const pct = t ? Math.round(c / t * 100) : 0;
        const faseProjeto = formatarFaseProjeto(p.fase);
        const progressoProjeto = formatarProgressoProjeto(t, c);
        const vencido = p.prazo && p.prazo < hoje && !['Concluído','Arquivado'].includes(status);
        const diasP   = p.prazo ? diasRestantes(p.prazo) : null;
        const barColor = isArqP ? 'var(--text-muted)' : pct === 100 ? 'var(--green)' : vencido ? 'var(--red)' : 'var(--accent)';
        return `
          <div class="mapa-item clickable ${isArqP ? 'is-muted' : ''} ${vencido ? 'is-alert' : ''}" onclick="abrirProjeto('${p.id}')">
            <div class="mapa-body">
              <div class="mapa-nome status-badge-inline">
                ${isArqP ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>` : ''}
                ${esc(p.nome)}
              </div>
              <div class="mapa-sub">
                ${esc(faseProjeto)} · ${esc(progressoProjeto)}
                ${vencido && diasP !== null ? `<span class="alert">· ${diasP < 0 ? Math.abs(diasP) + 'd atraso' : 'vence hoje'}</span>` : ''}
              </div>
              <div class="mini-progress">
                <div class="mini-progress-fill" style="width:${pct}%;background:${barColor}"></div>
              </div>
            </div>
            <div class="mapa-side-meta">
              ${tag(status)}
              <div class="mapa-side-note">${fmtHoras(parseFloat(p.total_horas||0))}</div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

export function modalNovoGrupo() {
  abrirModal(`
    <h2>Novo grupo</h2>
    <div class="form-row"><label>Nome do grupo</label><input id="m-grupo-nome" placeholder="Ex: Campus Universitário"></div>
    <div class="form-grid">
      <div class="form-row"><label>Status</label>${sel('m-grupo-status',['Ativo','Pausado','Arquivado'],'Ativo')}</div>
      <div class="form-row"><label>Descrição</label><input id="m-grupo-desc" placeholder="Opcional"></div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-criar-grupo" onclick="criarGrupo()">Criar grupo</button>
    </div>`);
}

export async function criarGrupo() {
  const nome = gv('m-grupo-nome').trim();
  if (!nome) { toast('Nome obrigatório', 'err'); return; }
  btnLoading('btn-criar-grupo', true);
  try {
    await req('POST', '/grupos', { nome, status: gv('m-grupo-status'), descricao: gv('m-grupo-desc') || null });
    fecharModal(); toast('Grupo criado'); invalidarCacheProjetos();
    if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-criar-grupo', false); }
}

export async function modalEditarGrupo(id) {
  const g = await req('GET', `/grupos/${id}`);
  const area = Number(g.area_total_m2 || 0);
  const horas = Number(g.total_horas || 0);
  const totalProjetos = Number(g.total_projetos || 0);
  const podeGerenciar = !!(g.pode_gerenciar || souDono(g.dono_id) || isAdmin());
  abrirModal(`
    <h2>Editar grupo</h2>
    <p class="modal-copy">Ajuste identidade e estado do grupo. Compartilhamento fica em uma janela separada, como no projeto.</p>
    <div class="form-row"><label>Nome do grupo</label><input id="m-grupo-nome" value="${esc(g.nome || '')}"></div>
    <div class="form-grid">
      <div class="form-row"><label>Status</label>${sel('m-grupo-status',['Ativo','Pausado','Arquivado'], g.status || 'Ativo')}</div>
      <div class="form-row"><label>Descrição curta</label><input id="m-grupo-desc" value="${esc(g.descricao || '')}" placeholder="Opcional"></div>
    </div>
    <details class="modal-block" open>
      <summary class="modal-block-summary">Resumo do grupo</summary>
      <div class="modal-block-body">
        <div class="form-grid" style="margin-top:6px">
          <div class="form-row"><label>Projetos no grupo</label><input value="${totalProjetos}" disabled></div>
          <div class="form-row"><label>Área total (m²)</label><input value="${area.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}" disabled></div>
          <div class="form-row"><label>Horas totais</label><input value="${fmtHoras(horas)}" disabled></div>
          <div class="form-row"><label>Origem dos totais</label><input value="Soma automática dos projetos do grupo" disabled></div>
        </div>
      </div>
    </details>
    <details class="modal-block">
      <summary class="modal-block-summary">Ações avançadas</summary>
      <div class="modal-block-body">
        <p class="modal-copy-tight" style="margin:4px 0 14px">Use estas ações só quando a estrutura do grupo realmente precisar mudar.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <button class="btn btn-sm" onclick="acaoGrupo('${id}','ungroup_all')">Desagrupar todos os projetos</button>
          <button class="btn btn-sm" onclick="modalMoverTodosGrupo('${id}')">Mover todos para outro grupo</button>
        </div>
      </div>
    </details>
    <div class="modal-footer">
      ${podeGerenciar ? `<button class="btn btn-danger" onclick="deletarGrupo('${id}','${esc(g.nome)}')">Excluir</button>` : ''}
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      ${podeGerenciar ? `<button class="btn btn-primary" id="btn-salvar-grupo" onclick="salvarGrupo('${id}')">Salvar</button>` : ''}
    </div>`);
}

export function compartilharGrupo(id) { modalCompartilharGrupo(id); }

export async function modalCompartilharGrupo(id) {
  if (!USUARIOS.length) setUsuarios(await req('GET', '/usuarios'));
  const g = await req('GET', `/grupos/${id}`);
  const colaboradores = g.colaboradores || [];
  const podeGerenciar = !!(g.pode_gerenciar || souDono(g.dono_id) || isAdmin());
  const souColaborador = colaboradores.some(c => c.usuario_id === EU?.id);
  const colabIds = colaboradores.map(c => c.usuario_id);
  const disponiveis = USUARIOS.filter(u => u.id !== g.dono_id && !colabIds.includes(u.id));

  const colabRows = colaboradores.map(c => `
    <div class="editor-row">
      <div class="editor-info">${avatar(c.nome)} ${esc(c.nome)} <span class="inline-user-handle">@${esc(c.usuario_login)}</span> ${tag('Herdado para os projetos', 'tag-gray', 'Quem entra no grupo recebe acesso aos projetos vinculados')}</div>
      ${podeGerenciar
        ? `<button class="editor-del" onclick="removerPermGrupo('${id}','${c.usuario_id}')" title="Remover"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>`
        : `<span class="inline-muted-sm">Acesso ativo</span>`}
    </div>`).join('') || `<div class="inline-muted-sm">Nenhum colaborador adicionado</div>`;

  abrirModal(`
    <h2>Compartilhar grupo</h2>
    <p class="modal-copy">Quem entra aqui recebe acesso herdado aos projetos já vinculados e aos próximos projetos deste grupo.</p>
    <div class="form-row"><label>Colaboradores com acesso</label><div class="editor-list">${colabRows}</div></div>
    ${podeGerenciar
      ? (disponiveis.length
        ? `<div class="form-sep"></div>
           <div class="form-row"><label>Adicionar colaborador (usuários registrados)</label>
             <div style="display:flex;gap:8px">
               <select id="m-grupo-colab" style="flex:1">${disponiveis.map(u => `<option value="${u.id}">${esc(u.nome)} (@${esc(u.usuario_login)})</option>`).join('')}</select>
               <button class="btn btn-sm btn-primary" id="btn-add-perm-grupo" onclick="adicionarPermGrupo('${id}')">Adicionar</button>
             </div>
           </div>`
        : `<div class="inline-muted-sm" style="margin-top:8px">Todos os usuários cadastrados já foram adicionados.</div>`)
      : ''}
    <div class="modal-footer">
      ${!podeGerenciar && souColaborador ? `<button class="btn btn-danger" onclick="sairGrupoCompartilhado('${id}','${esc(g.nome)}')">Sair do grupo</button>` : ''}
      <button class="btn" onclick="fecharModal()">Fechar</button>
    </div>`, { lg: true });
}

export async function salvarGrupo(id) {
  const nome = gv('m-grupo-nome').trim();
  if (!nome) { toast('Nome obrigatório', 'err'); return; }
  btnLoading('btn-salvar-grupo', true);
  try {
    await req('PUT', `/grupos/${id}`, { nome, status: gv('m-grupo-status'), descricao: gv('m-grupo-desc') || null });
    fecharModal(); toast('Grupo atualizado'); invalidarCacheProjetos();
    if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-salvar-grupo', false); }
}

export async function adicionarPermGrupo(grupoId) {
  const usuario_id = gv('m-grupo-colab');
  if (!usuario_id) return;
  btnLoading('btn-add-perm-grupo', true);
  try {
    await req('POST', `/grupos/${grupoId}/permissoes`, { usuario_id });
    invalidarCacheProjetos();
    toast('Colaborador adicionado ao grupo');
    fecharModal();
    if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
    modalCompartilharGrupo(grupoId);
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-add-perm-grupo', false); }
}

export async function removerPermGrupo(grupoId, usuarioId) {
  try {
    await req('DELETE', `/grupos/${grupoId}/permissoes/${usuarioId}`);
    invalidarCacheProjetos();
    toast('Colaborador removido do grupo');
    fecharModal();
    if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
    modalCompartilharGrupo(grupoId);
  } catch (e) { toast(e.message, 'err'); }
}

export async function sairGrupoCompartilhado(grupoId, nomeGrupo) {
  confirmar(`Sair do grupo "${nomeGrupo}"? Você perderá os acessos herdados deste grupo.`, async () => {
    fecharModal();
    let cancelado = false;
    const t = setTimeout(async () => {
      if (cancelado) return;
      try {
        await req('DELETE', `/grupos/${grupoId}/sair`);
        toast('Você saiu do grupo');
        invalidarCacheProjetos();
        if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
      } catch (e) { toast(e.message, 'err'); }
    }, 4200);
    toastUndo('Saída do grupo agendada', () => {
      cancelado = true;
      clearTimeout(t);
      toast('Saída cancelada');
    }, 4200);
  }, { titulo: 'Sair do grupo', btnTexto: 'Sair do grupo', danger: true });
}

export async function sairProjetoCompartilhado(projetoId, nomeProjeto) {
  confirmar(`Sair do projeto "${nomeProjeto}"? Você perderá acesso ao projeto e às tarefas vinculadas a ele.`, async () => {
    fecharModal();
    let cancelado = false;
    const t = setTimeout(async () => {
      if (cancelado) return;
      try {
        await req('DELETE', `/projetos/${projetoId}/sair`);
        toast('Você saiu do projeto');
        invalidarCacheProjetos();
        if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
      } catch (e) { toast(e.message, 'err'); }
    }, 4200);
    toastUndo('Saída do projeto agendada', () => {
      cancelado = true;
      clearTimeout(t);
      toast('Saída cancelada');
    }, 4200);
  }, { titulo: 'Sair do projeto', btnTexto: 'Sair do projeto', danger: true });
}

export async function acaoGrupo(grupoId, action, destino = null) {
  try {
    await req('PATCH', `/grupos/${grupoId}`, { action, destino_grupo_id: destino });
    toast('Ação aplicada no grupo');
    invalidarCacheProjetos();
    if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
  } catch (e) { toast(e.message, 'err'); }
}

export function modalMoverTodosGrupo(grupoId) {
  const opts = _gruposDash.filter(g => g.id !== grupoId && (g.status || 'Ativo') !== 'Arquivado');
  if (!opts.length) { toast('Crie outro grupo para mover os projetos', 'err'); return; }
  abrirModal(`
    <h2>Mover projetos do grupo</h2>
    <div class="form-row"><label>Destino</label>
      <select id="m-grupo-destino">${opts.map(g => `<option value="${g.id}">${esc(g.nome)}</option>`).join('')}</select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal();modalEditarGrupo('${grupoId}')">Cancelar</button>
      <button class="btn btn-primary" onclick="fecharModal();acaoGrupo('${grupoId}','move_all_to',gv('m-grupo-destino'))">Mover</button>
    </div>`);
}

export function deletarGrupo(id, nome) {
  confirmar(`Excluir o grupo "${nome}"? Os projetos dentro dele não serão excluídos, apenas desagrupados.`, async () => {
    try {
      await req('DELETE', `/grupos/${id}`);
      toast('Grupo excluído');
      invalidarCacheProjetos();
      if (window.navigateToRoute) await window.navigateToRoute('groups', {}, { invalidateProjects: true });
    }
    catch (e) { toast(e.message, 'err'); }
  }, { titulo: 'Excluir grupo', btnTexto: 'Excluir', danger: true });
}
