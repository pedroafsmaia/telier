// ── DASHBOARD ──
import {
  EU, PROJETO, ADMIN_MODE, FILTRO_STATUS, BUSCA_DASH, _projsDash, _ativasDash, _gruposDash,
  FILTRO_GRUPO_DASH, FILTRO_ORIGEM_DASH,
  VISTA_ATUAL, _prazoNotifShown,
  DASH_FILTERS_KEY, DASH_STATUS_OPCOES, STARTDAY_COLLAPSE_KEY,
  setProjeto, setFiltroStatus, setBuscaDash, setProjsDash, setAtivasDash, setGruposDash,
  setFiltroGrupoDash, setFiltroOrigemDash, setVistaAtual,
} from './state.js';
import { req, fetchProjetos, invalidarCacheProjetos } from './api.js';
import { toast, toastUndo, setBreadcrumb, slideContent } from './ui.js';
import { carregarTarefasUsuarioAtivas, renderTaskOperationalSurface } from './tasks.js';
import {
  esc, gv, sel, avatar, tag, prazoFmt, diasRestantes, fmtHoras, fmtDuracao,
  isAdmin, isAdminRole, souDono, projetoConcluido, normalizarStatusProjeto,
  grupoProgressToneClass, grupoStatusToneClass, projetoArquivadoNoDash,
  formatarFaseProjeto, formatarStatusProjeto, formatarPrioridadeProjeto,
  formatarPrazoProjeto, formatarAreaProjeto, formatarProgressoProjeto,
} from './utils.js';

export function carregarFiltrosDash() {
  try {
    const raw = localStorage.getItem(DASH_FILTERS_KEY);
    if (!raw) return;
    const f = JSON.parse(raw);
    if (typeof f?.busca === 'string') setBuscaDash(f.busca.slice(0, 120));
    if (typeof f?.grupo === 'string' && f.grupo) setFiltroGrupoDash(f.grupo);
    if (typeof f?.origem === 'string' && ['todos', 'meus', 'compartilhados'].includes(f.origem)) setFiltroOrigemDash(f.origem);
    if (typeof f?.status === 'string' && DASH_STATUS_OPCOES.has(f.status)) setFiltroStatus(f.status);
  } catch {}
}

export function salvarFiltrosDash() {
  try {
    localStorage.setItem(DASH_FILTERS_KEY, JSON.stringify({
      busca: BUSCA_DASH,
      grupo: FILTRO_GRUPO_DASH,
      origem: FILTRO_ORIGEM_DASH,
      status: FILTRO_STATUS,
    }));
  } catch {}
}

export function renderInicioDia(projetos, ativas, ultimaSessao = null, focoGlobal = null, resumoHoje = null) {
  return renderPainelHoje(projetos, ativas, [], [], ultimaSessao, focoGlobal, resumoHoje);
}

export function renderPainelHoje(projetos, ativas, sessoesRecentes = [], tarefasOperacao = [], ultimaSessao = null, focoGlobal = null, resumoHoje = null) {
  const ativo = ativas[0] || null;
  const tarefaFoco = tarefasOperacao.find(t => t.foco) || null;
  const tarefaUrgente = tarefasOperacao
    .filter(t => {
      const dias = diasRestantes(t.data || null);
      return dias !== null && dias <= 1 && t.status !== 'Concluída';
    })
    .sort((a, b) => (a.data || '9999-12-31').localeCompare(b.data || '9999-12-31'))[0] || null;

  const prioridade = ativo
    ? {
        titulo: ativo.tarefa_nome || 'Tarefa ativa',
        projeto: ativo.projeto_nome || 'Projeto não informado',
        status: 'Em andamento',
        prazo: prazoFmt((tarefasOperacao.find(t => t.id === ativo.tarefa_id)?.data) || null, true),
        tarefaId: ativo.tarefa_id,
        projetoId: ativo.projeto_id,
      }
    : (focoGlobal?.tarefa_id && focoGlobal?.projeto_id)
      ? {
          titulo: focoGlobal.tarefa_nome || 'Tarefa em foco',
          projeto: focoGlobal.projeto_nome || 'Projeto não informado',
          status: 'Em foco',
          prazo: prazoFmt((tarefasOperacao.find(t => t.id === focoGlobal.tarefa_id)?.data) || null, true),
          tarefaId: focoGlobal.tarefa_id,
          projetoId: focoGlobal.projeto_id,
        }
      : tarefaFoco
        ? {
            titulo: tarefaFoco.nome,
            projeto: tarefaFoco.projeto_nome,
            status: tarefaFoco.status || 'Em foco',
            prazo: prazoFmt(tarefaFoco.data || null, true),
            tarefaId: tarefaFoco.id,
            projetoId: tarefaFoco.projeto_id,
          }
        : tarefaUrgente
          ? {
              titulo: tarefaUrgente.nome,
              projeto: tarefaUrgente.projeto_nome,
              status: tarefaUrgente.status || 'A fazer',
              prazo: prazoFmt(tarefaUrgente.data || null, true),
              tarefaId: tarefaUrgente.id,
              projetoId: tarefaUrgente.projeto_id,
            }
          : null;

  const retomadaMap = new Map();
  const registrarRetomada = (item) => {
    if (!item?.tarefaId || retomadaMap.has(item.tarefaId)) return;
    retomadaMap.set(item.tarefaId, item);
  };

  (sessoesRecentes || []).forEach((s) => registrarRetomada({
    tarefaId: s.tarefa_id,
    projetoId: s.projeto_id,
    titulo: s.tarefa_nome,
    projeto: s.projeto_nome,
    tempo: fmtHoras(parseFloat(s.horas_liquidas ?? s.horas ?? 0)),
  }));

  (tarefasOperacao || [])
    .filter(t => t.status === 'Em andamento' || t.foco)
    .forEach((t) => registrarRetomada({
      tarefaId: t.id,
      projetoId: t.projeto_id,
      titulo: t.nome,
      projeto: t.projeto_nome,
      tempo: t.sessao_ativa_id ? 'Em curso' : (t.data ? `Prazo ${prazoFmt(t.data, true)}` : 'Sem tempo recente'),
    }));

  const retomadas = Array.from(retomadaMap.values()).slice(0, 5);
  const horasHoje = parseFloat(resumoHoje?.horas_hoje || 0);

  const tarefasHoje = (tarefasOperacao || []).slice(0, 8);

  return renderTaskOperationalSurface({
    mode: 'today',
    kicker: 'Hoje',
    title: 'Painel diário',
    description: 'Comece pela prioridade do dia e retome o que ficou em andamento.',
    overviewHtml: `
      <div class="today-layout">
        <div class="today-layout__main">
          <section class="today-block">
            <div class="task-view-eyebrow">Prioridade do dia</div>
            ${prioridade ? `
              <div class="today-priority__title">${esc(prioridade.titulo)}</div>
              <div class="today-priority__project">Projeto: ${esc(prioridade.projeto || 'Não informado')}</div>
              <div class="today-priority__meta">
                <div class="meta-pair"><span class="meta-pair-label">Status</span><span class="meta-pair-value">${esc(prioridade.status || 'A fazer')}</span></div>
                <div class="meta-pair"><span class="meta-pair-label">Prazo</span><span class="meta-pair-value mono">${esc(prioridade.prazo || 'Sem prazo')}</span></div>
                <div class="meta-pair"><span class="meta-pair-label">Sessão</span><span class="meta-pair-value">${ativo ? 'Cronômetro em andamento' : 'Sem sessão ativa'}</span></div>
              </div>
              <div class="today-priority__actions">
                ${ativo
                  ? `<button class="btn btn-primary" onclick="abrirTarefaContexto('${prioridade.tarefaId}','${prioridade.projetoId}')">Abrir tarefa</button>`
                  : `<button class="btn btn-primary" onclick="iniciarCronometro('${prioridade.tarefaId}','${esc(prioridade.titulo)}')">Iniciar cronômetro</button>`}
                ${ativo ? '' : `<button class="btn" onclick="abrirTarefaContexto('${prioridade.tarefaId}','${prioridade.projetoId}')">Abrir tarefa</button>`}
              </div>`
              : `<div class="today-empty">Nenhuma tarefa em foco. Escolha uma para começar o dia.</div>`}
          </section>

          <section class="today-block">
            <div class="task-view-eyebrow">Continuar de onde parou</div>
            ${retomadas.length
              ? `<div class="today-resume-list">${retomadas.map(item => `
                <button class="today-resume-row" onclick="abrirTarefaContexto('${item.tarefaId}','${item.projetoId}')">
                  <span class="today-resume-row__main">
                    <span class="today-resume-row__title">${esc(item.titulo)}</span>
                    <span class="today-resume-row__project">${esc(item.projeto)}</span>
                  </span>
                  <span class="today-resume-row__time mono">${esc(item.tempo || '—')}</span>
                </button>`).join('')}</div>`
              : `<div class="today-empty">Sem histórico recente para retomar agora.</div>`}
          </section>
        </div>
        <aside class="today-layout__side">
          <section class="today-block">
            <div class="task-view-eyebrow">Hoje até agora</div>
            <div class="today-total-hours mono">${horasHoje.toFixed(1)}h</div>
            <div class="today-summary-grid">
              <div class="today-summary-item"><span class="today-summary-label">Sessões</span><strong>${resumoHoje?.sessoes || 0}</strong></div>
              <div class="today-summary-item"><span class="today-summary-label">Tarefas</span><strong>${resumoHoje?.tarefas || 0}</strong></div>
              <div class="today-summary-item"><span class="today-summary-label">Ativas</span><strong>${ativas.length}</strong></div>
              <div class="today-summary-item"><span class="today-summary-label">Em andamento</span><strong>${(tarefasOperacao || []).filter(t => t.status === 'Em andamento' || t.sessao_ativa_id).length}</strong></div>
            </div>
          </section>
        </aside>
      </div>`,
    listEyebrow: 'Tarefas',
    listTitle: 'Fila operacional do dia',
    listCopy: 'Decida, inicie o cronômetro e siga o fluxo sem trocar de página.',
    listKpi: `${tarefasHoje.length} tarefa${tarefasHoje.length === 1 ? '' : 's'} na visão resumida`,
    tarefas: tarefasHoje,
    emptyMessage: 'Sem tarefas operacionais disponíveis para hoje.',
  });
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

export function renderDashLoadingState() {
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

export function renderDashEmptyState(vazioTexto, opts = {}) {
  const titulo = opts.titulo || 'Sem projetos por aqui';
  const mostrarGuia = !!opts.mostrarGuia;
  return `<div class="empty-state"><div class="empty-icon" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 18h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 18V9.5h4V18M13 18V6h4v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 7.5l2-2 2 2M14 4l2-2 2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="empty-text">${titulo}</div><div class="empty-sub">${vazioTexto}</div>${mostrarGuia ? `<div class="empty-guide"><div class="empty-guide-item">1. Crie um projeto.</div><div class="empty-guide-item">2. Abra o projeto e adicione a primeira tarefa.</div><div class="empty-guide-item">3. Defina prioridade e prazo para organizar o fluxo.</div><div class="empty-cta"><button class="btn btn-sm btn-primary" onclick="modalNovoProjeto()">+ Criar primeiro projeto</button></div></div>` : ''}</div>`;
}

async function carregarDadosDashboard() {
  const params = new URLSearchParams();
  if (FILTRO_STATUS !== 'todos') params.set('status', FILTRO_STATUS);
  if (isAdminRole() && ADMIN_MODE === 'normal') params.set('as_member', '1');
  const [projetos, ativas, grupos, ultimaSessao, resumoHoje, focoGlobal, sessoesRecentes, tarefasOperacao, tarefasTransversais] = await Promise.all([
    fetchProjetos(params),
    req('GET', `/tempo/ativas${isAdminRole() && ADMIN_MODE === 'normal' ? '?as_member=1' : ''}`).catch(() => []),
    req('GET', `/grupos${isAdminRole() && ADMIN_MODE === 'normal' ? '?as_member=1' : ''}`).catch(() => []),
    req('GET', '/tempo/ultima-sessao').catch(() => null),
    req('GET', '/tempo/resumo-hoje').catch(() => null),
    req('GET', '/auth/foco-global').catch(() => null),
    req('GET', '/tempo/sessoes-recentes?limit=6').catch(() => []),
    req('GET', '/tarefas/operacao-hoje').catch(() => []),
    carregarTarefasUsuarioAtivas().catch(() => ({ tarefas: [] })),
  ]);
  const mapaTarefas = new Map();
  (tarefasOperacao || []).forEach(t => mapaTarefas.set(String(t.id || t.tarefa_id), t));
  (tarefasTransversais?.tarefas || []).forEach(t => {
    const key = String(t.id || t.tarefa_id);
    if (!mapaTarefas.has(key)) mapaTarefas.set(key, t);
  });
  const tarefasOperacaoMescladas = Array.from(mapaTarefas.values());
  return { projetos, ativas, grupos, ultimaSessao, resumoHoje, focoGlobal, sessoesRecentes, tarefasOperacao: tarefasOperacaoMescladas };
}

function notificarPrazos(projetos) {
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
}

function getResumoProjetos(projetos, grupos) {
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
  return { projetosVisiveisBase, gruposVisiveisBase, compartilhados, emAndamento, meus, filtros, statusCountMap };
}

function renderTodayHome(dados) {
  const {
    projetos, ativas, sessoesRecentes, tarefasOperacao, ultimaSessao, focoGlobal, resumoHoje,
  } = dados;
  return renderPainelHoje(projetos, ativas, sessoesRecentes, tarefasOperacao, ultimaSessao, focoGlobal, resumoHoje);
}


function renderProjectsHome(resumo) {
  const {
    projetosVisiveisBase, gruposVisiveisBase, compartilhados, emAndamento, meus, filtros, statusCountMap,
  } = resumo;
  return `
    <div class="dash-header dash-header-spaced dash-head-grid">
      <div class="dash-head-main">
        <div class="section-kicker">Base estrutural</div>
        <div class="dash-title">Projetos</div>
        <div class="dash-sub dash-sub-tight">Visão de projetos por grupo. Para execução diária, use Tarefas.</div>
      </div>
      <div class="dash-actions">
        <button class="btn" onclick="goTasks()">Tarefas</button>
        <button class="btn" onclick="modalNovoGrupo()">Novo grupo</button>
        <button class="btn btn-primary" onclick="modalNovoProjeto()">Novo projeto</button>
      </div>
    </div>
    <div class="dash-metrics-strip">
      <div class="dash-metric"><span class="dash-metric-label">Base visível</span><span class="dash-metric-value">${projetosVisiveisBase.length}</span></div>
      <div class="dash-metric"><span class="dash-metric-label">Em operação</span><span class="dash-metric-value">${emAndamento}</span></div>
      <div class="dash-metric"><span class="dash-metric-label">Compartilhados</span><span class="dash-metric-value">${compartilhados.length}</span></div>
    </div>
    ${compartilhados.length ? `<div class="share-hint share-hint-inline"><strong>${compartilhados.length}</strong> projeto${compartilhados.length===1?'':'s'} compartilhado${compartilhados.length===1?'':'s'} com você no momento.</div>` : ''}
    <div class="dash-toolbar dash-toolbar-studio">
      <div class="dash-toolbar-row dash-toolbar-primary dash-toolbar-primary-unified">
        <div class="dash-toolbar-searchblock">
          <div class="dash-toolbar-label">Consulta</div>
          <input type="search" class="search-dash" id="busca-dash" placeholder="Buscar projeto ou código" value="${esc(BUSCA_DASH)}" oninput="filtrarProjetosBusca(this.value)">
        </div>
        <div class="dash-toolbar-field">
          <div class="dash-toolbar-label">Grupo</div>
          <select class="resp-filter select-control flex-shrink-0" onchange="filtrarGrupoDash(this.value)">
            <option value="todos" ${FILTRO_GRUPO_DASH==='todos'?'selected':''}>Todos os grupos</option>
            <option value="sem" ${FILTRO_GRUPO_DASH==='sem'?'selected':''}>Sem grupo</option>
            ${gruposVisiveisBase.map(g => `<option value="${g.id}" ${FILTRO_GRUPO_DASH===g.id?'selected':''}>${esc(g.nome)}</option>`).join('')}
          </select>
        </div>
        <div class="dash-toolbar-switches">
          <div class="dash-toolbar-label">Acesso</div>
          <div class="segmented">
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH==='todos'?'ativo':''}" data-origem="todos" onclick="filtrarOrigemDash('todos')">Todos${projetosVisiveisBase.length > 0 ? `<span class="seg-count">${projetosVisiveisBase.length}</span>` : ''}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH==='meus'?'ativo':''}" data-origem="meus" onclick="filtrarOrigemDash('meus')">Meus${meus > 0 ? `<span class="seg-count">${meus}</span>` : ''}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH==='compartilhados'?'ativo':''}" data-origem="compartilhados" onclick="filtrarOrigemDash('compartilhados')">Compartilhados${compartilhados.length > 0 ? `<span class="seg-count">${compartilhados.length}</span>` : ''}</button>
          </div>
        </div>
      </div>
      <div class="dash-toolbar-row dash-toolbar-secondary">
        <div class="dash-toolbar-field dash-toolbar-statusfield">
          <div class="dash-toolbar-label">Status</div>
          <div class="dash-status-grid">
            ${filtros.map(f => { const label = { 'todos':'Todos' }[f] || f; const cnt = statusCountMap[f] || 0; return `<button class="filter-btn ${FILTRO_STATUS===f?'ativo':''}" onclick="setFiltro('${esc(f)}')">${label}${cnt > 0 ? `<span class="seg-count">${cnt}</span>` : ''}</button>`; }).join('')}
          </div>
        </div>
      </div>
    </div>
    <div id="cards-grid-dash" class="dash-results">${renderProjetosDash(projetosVisiveisBase, gruposVisiveisBase)}</div>`;
}

export async function renderDash(opts = {}) {
  window.scrollTo(0, 0);
  setProjeto(null);
  const routeKind = opts.routeKind || (window.getCurrentAppRoute?.().name === 'projects' ? 'projects' : 'today');
  document.title = routeKind === 'projects' ? 'Projetos · Telier' : 'Tarefas · Telier';
  setBreadcrumb(routeKind === 'projects' ? [{ label: 'Projetos' }] : [{ label: 'Tarefas' }]);
  const c = document.getElementById('content');
  c.innerHTML = renderDashLoadingState();
  try {
    const dados = await carregarDadosDashboard();
    const { projetos, ativas, grupos } = dados;
    setProjsDash(projetos);
    setAtivasDash(ativas);
    setGruposDash(grupos);
    notificarPrazos(projetos);

    if (routeKind === 'today') {
      const slideHoje = VISTA_ATUAL === 'projeto';
      setVistaAtual('dash');
      c.innerHTML = renderTodayHome(dados);
      if (slideHoje) slideContent('left');
      return;
    }
    const html = renderProjectsHome(getResumoProjetos(projetos, grupos));
    const slide = VISTA_ATUAL === 'projeto';
    setVistaAtual('dash');
    c.innerHTML = html;
    if (slide) slideContent('left');
  } catch (e) {
    c.innerHTML = `<div class="error-block">${esc(e.message)}<div class="muted-detail"><button class="btn btn-sm" onclick="renderDash()">Tentar novamente</button></div></div>`;
  }
}

export function renderProjetosDash(projetos, grupos) {
  const busca = BUSCA_DASH.toLowerCase().trim();
  let lista = busca ? projetos.filter(p => p.nome.toLowerCase().includes(busca)) : projetos;
  if (FILTRO_ORIGEM_DASH === 'meus') lista = lista.filter(p => Number(p.compartilhado_comigo) !== 1);
  else if (FILTRO_ORIGEM_DASH === 'compartilhados') lista = lista.filter(p => Number(p.compartilhado_comigo) === 1);
  if (FILTRO_GRUPO_DASH === 'sem') lista = lista.filter(p => !p.grupo_id);
  else if (FILTRO_GRUPO_DASH !== 'todos') {
    const filtered = lista.filter(p => String(p.grupo_id) === String(FILTRO_GRUPO_DASH));
    if (filtered.length === 0 && lista.length > 0) { setFiltroGrupoDash('todos'); salvarFiltrosDash(); }
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
      <div class="grupo-content-shell"><div class="cards-grid">${renderCardsDash(compartilhados)}</div></div>
    </div>`;
    listaAgrupada = lista.filter(p => Number(p.compartilhado_comigo) !== 1);
    if (listaAgrupada.length) {
      html += `<div class="dash-section-title"><h3>Meus projetos (organizados por grupo)</h3><span class="dash-section-note">Projetos sob sua propriedade ou gestão direta</span></div>`;
    }
  }

  const temGrupos = (grupos || []).length > 0;

  for (const grupo of (grupos || [])) {
    const gprojetos = listaAgrupada.filter(p => String(p.grupo_id) === String(grupo.id));
    const col = isCollapsed(grupo.id);
    const kpis = calcGrupoKpis(gprojetos);
    const areaGrupo = kpis.area;
    const horasGrupo = kpis.horas;
    const concluidos = kpis.concluidos;
    const atrasados = kpis.atrasados;
    const ativos = kpis.ativos;
    const pctConcl = gprojetos.length ? Math.round((concluidos / gprojetos.length) * 100) : 0;
    const grupoStatus = grupo.status || 'Ativo';
    const grupoArquivado = grupoStatus === 'Arquivado';
    const progressColor = pctConcl === 100 ? 'var(--green)' : 'var(--accent)';
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
              ${areaGrupo > 0 ? `<div class="grupo-prop"><span class="grupo-prop-val">${areaGrupo.toLocaleString('pt-BR',{maximumFractionDigits:0})} m²</span><span class="grupo-prop-lbl">Área</span></div>` : ''}
              ${horasGrupo > 0 ? `<div class="grupo-prop"><span class="grupo-prop-val">${fmtHoras(horasGrupo)}</span><span class="grupo-prop-lbl">Horas</span></div>` : ''}
              <div class="grupo-prop">
                <span class="grupo-prop-val ${grupoProgressToneClass(pctConcl, atrasados)}">${pctConcl}%</span>
                <span class="grupo-prop-lbl">${atrasados ? `⚠ ${atrasados}d atr.` : 'Progresso'}</span>
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
              ? `<div class="grupo-content-shell"><div class="cards-grid">${renderCardsDash(gprojetos)}</div></div>`
              : `<div class="grupo-empty-zone with-action"><span class="grupo-drop-hint">Arraste projetos aqui</span><button class="btn btn-sm" onclick="event.stopPropagation();modalNovoProjeto('${grupo.id}')">+ Criar projeto neste grupo</button></div>`}
          </div>`}
        </div>
      </div>`;
  }

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
          ? `<div class="grupo-content-shell"><div class="cards-grid">${renderCardsDash(semGrupo)}</div></div>`
          : `<div class="grupo-empty-zone"><span class="grupo-drop-hint">Arraste projetos aqui para desagrupar</span></div>`}
      </div>`;
    } else {
      html += `<div class="grupo-content-shell"><div class="cards-grid">${renderCardsDash(semGrupo)}</div></div>`;
    }
  }

  return html || renderDashEmptyState('Crie um projeto para começar a organizar tarefas e prazo.', { mostrarGuia: false });
}

export function renderCardsDash(projetos) {
  return projetos.map(p => {
    const statusProjeto = formatarStatusProjeto(p.status);
    const total = parseInt(p.total_tarefas) || 0;
    const conc = parseInt(p.tarefas_concluidas) || 0;
    const pct = total ? Math.round(conc / total * 100) : 0;
    const dias = diasRestantes(p.prazo);
    const urgente = dias !== null && dias <= 7 && !projetoConcluido(statusProjeto);
    const timerAtivo = _ativasDash && _ativasDash.some(a => a.projeto_id === p.id);
    const compartilhado = Number(p.compartilhado_comigo) === 1;
    const origem = p.origem_compartilhamento === 'grupo' ? 'via grupo' : p.origem_compartilhamento === 'manual' ? 'direto' : '';
    const podeCompartilhar = souDono(p.dono_id);
    const faseTxt = formatarFaseProjeto(p.fase);
    const prioridadeTxt = formatarPrioridadeProjeto(p.prioridade);
    const prazoTxt = formatarPrazoProjeto(p.prazo);
    const areaTxt = formatarAreaProjeto(p.area_m2);
    const tarefasResumoTxt = total ? `${conc}/${total}` : 'Sem tarefas';
    const progressoResumoTxt = formatarProgressoProjeto(total, conc);
    const statusTone = statusProjeto === 'Concluído'
      ? 'ok'
      : statusProjeto === 'Em andamento'
        ? 'info'
        : statusProjeto === 'Arquivado'
          ? 'muted'
          : 'warn';
    const prazoTone = urgente ? 'warn' : (p.prazo ? 'base' : 'muted');
    const contextoBase = p.grupo_nome ? `Grupo · ${p.grupo_nome}` : 'Sem grupo';
    const compartilhamentoTxt = compartilhado
      ? `${contextoBase} · Compartilhado${origem ? ` ${origem}` : ''}`
      : contextoBase;
    return `
      <div class="proj-card ${compartilhado ? 'shared' : ''}" data-status="${esc(statusProjeto)}"
        draggable="true"
        ondragstart="dragProjeto(event,'${p.id}')"
        ondragend="dragProjetoEnd(event)"
        onclick="if(!_dragJustEnded)abrirProjeto('${p.id}')">
        <div class="proj-card-header">
          <div class="proj-card-head-main">
            <div class="proj-card-nome">${esc(p.nome)}</div>
            <div class="proj-card-context">${esc(compartilhamentoTxt)}</div>
          </div>
          ${souDono(p.dono_id) ? `<button class="btn btn-ghost btn-icon btn-sm proj-card-edit" onclick="event.stopPropagation();modalEditarProjeto('${p.id}')" title="Editar"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>` : ''}
        </div>
        <div class="project-meta-grid card-meta">
          <div class="project-meta-field">
            <span class="project-meta-label card-meta-label">Fase</span>
            <span class="project-meta-value">${esc(faseTxt)}</span>
          </div>
          <div class="project-meta-field project-meta-field-${statusTone}">
            <span class="project-meta-label card-meta-label">Status</span>
            <span class="project-meta-value">${esc(statusProjeto)}</span>
          </div>
          <div class="project-meta-field">
            <span class="project-meta-label card-meta-label">Prioridade</span>
            <span class="project-meta-value">${esc(prioridadeTxt)}</span>
          </div>
          <div class="project-meta-field project-meta-field-${prazoTone}">
            <span class="project-meta-label card-meta-label">Prazo</span>
            <span class="project-meta-value mono">${esc(prazoTxt)}</span>
          </div>
          <div class="project-meta-field">
            <span class="project-meta-label card-meta-label">Área</span>
            <span class="project-meta-value mono">${esc(areaTxt)}</span>
          </div>
          <div class="project-meta-field">
            <span class="project-meta-label card-meta-label">Tarefas</span>
            <span class="project-meta-value mono">${esc(tarefasResumoTxt)}</span>
          </div>
          ${timerAtivo ? `<div class="project-meta-field project-meta-field-live">
            <span class="project-meta-label card-meta-label">Atividade</span>
            <span class="project-meta-value"><span class="status-dot-live">●</span> Em progresso</span>
          </div>` : ''}
        </div>
        ${total ? `
        <div class="proj-card-progress">
          <div class="proj-progress-nums">${esc(progressoResumoTxt)} concluídas</div>
          <div class="proj-progress-bar"><div class="proj-progress-fill ${pct===100?'done':'partial'}" style="width:${pct}%"></div></div>
        </div>` : ''}
        <div class="proj-card-footer">
          <div class="proj-card-dono"><span class="proj-card-dono-label">Responsável</span>${avatar(p.dono_nome,'avatar-sm')} <span>${esc(p.dono_nome||'—')}</span></div>
          ${urgente ? `<div class="proj-urgente ${dias <= 0 ? 'overdue' : 'warning'}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 3.5l9 15.5H3l9-15.5z" stroke="currentColor" stroke-width="1.9"/><path d="M12 9v5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="16.7" r="1" fill="currentColor"/></svg>${dias <= 0 ? 'vencido' : dias + 'd'}</div>` : ''}
        </div>
        <div class="proj-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-primary btn-sm" onclick="abrirProjeto('${p.id}')">Abrir</button>
          ${podeCompartilhar ? `<button class="btn btn-ghost btn-sm" onclick="modalPermissoes('${p.id}')">Compartilhar</button>` : ''}
          ${compartilhado ? `<button class="btn btn-sm" onclick="sairProjetoCompartilhado('${p.id}','${esc(p.nome)}')">Sair</button>` : ''}
        </div>
        ${compartilhado ? `<div class="inline-detail-row">Compartilhado por ${esc(p.dono_nome || 'alguém')}</div>` : ''}
      </div>`;
  }).join('');
}

let _buscaDashTick;
export function filtrarProjetosBusca(v) {
  clearTimeout(_buscaDashTick);
  _buscaDashTick = setTimeout(() => {
    setBuscaDash(v);
    salvarFiltrosDash();
    const grid = document.getElementById('cards-grid-dash');
    if (grid) grid.innerHTML = renderProjetosDash(_projsDash, _gruposDash);
  }, 180);
}

export function filtrarGrupoDash(v) {
  setFiltroGrupoDash(v || 'todos');
  salvarFiltrosDash();
  const grid = document.getElementById('cards-grid-dash');
  if (grid) grid.innerHTML = renderProjetosDash(_projsDash, _gruposDash);
}

export function filtrarOrigemDash(v) {
  setFiltroOrigemDash(v || 'todos');
  salvarFiltrosDash();
  document.querySelectorAll('.segmented-btn[data-origem]').forEach(btn => {
    btn.classList.toggle('ativo', btn.dataset.origem === FILTRO_ORIGEM_DASH);
  });
  const grid = document.getElementById('cards-grid-dash');
  if (grid) grid.innerHTML = renderProjetosDash(_projsDash, _gruposDash);
}

export function setFiltro(f) {
  setFiltroStatus(f);
  salvarFiltrosDash();
  renderDash();
}

// ── DRAG & DROP ──
let _dragProjetoId = null;
let _dragJustEnded = false;
let _dragGrupoId = null;
let _dragPreviewEl = null;

export function getDragJustEnded() { return _dragJustEnded; }

function limparDragPreview() {
  if (_dragPreviewEl?.parentNode) _dragPreviewEl.parentNode.removeChild(_dragPreviewEl);
  _dragPreviewEl = null;
}

function criarDragPreview(el, e) {
  limparDragPreview();
  if (!el || !e?.dataTransfer) return;
  const clone = el.cloneNode(true);
  clone.classList.remove('dragging');
  clone.classList.add('drag-preview');
  clone.style.width = `${el.offsetWidth}px`;
  clone.style.opacity = '1';
  clone.style.transform = 'none';
  clone.style.filter = 'none';
  document.body.appendChild(clone);
  _dragPreviewEl = clone;
  try { e.dataTransfer.setDragImage(clone, 28, 20); } catch {}
}

export function dragProjeto(e, projetoId) {
  e.stopPropagation();
  _dragProjetoId = projetoId;
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', projetoId); } catch {}
  const card = e.target.closest('.proj-card');
  criarDragPreview(card, e);
  setTimeout(() => card?.classList.add('dragging'), 0);
}

export function dragProjetoEnd(e) {
  _dragJustEnded = true;
  setTimeout(() => { _dragJustEnded = false; }, 80);
  _dragProjetoId = null;
  limparDragPreview();
  document.querySelectorAll('.proj-card.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.grupo-section.drag-over').forEach(el => el.classList.remove('drag-over'));
}

export function dragGrupo(e, grupoId) {
  e.stopPropagation();
  _dragGrupoId = grupoId;
  e.dataTransfer.effectAllowed = 'move';
  try { e.dataTransfer.setData('text/plain', grupoId); } catch {}
  setTimeout(() => e.target.closest('.grupo-section')?.classList.add('dragging'), 0);
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
  if (_dragGrupoId && _dragGrupoId !== grupoId) {
    try {
      const idxAlvo = _gruposDash.findIndex(g => g.id === grupoId);
      const idxOrig = _gruposDash.findIndex(g => g.id === _dragGrupoId);
      if (idxAlvo >= 0 && idxOrig >= 0) {
        const nova = [..._gruposDash];
        const [movido] = nova.splice(idxOrig, 1);
        nova.splice(idxAlvo, 0, movido);
        setGruposDash(nova);
        await Promise.all(_gruposDash.map((g, i) => req('PATCH', `/grupos/${g.id}`, { ordem: i + 1 })));
        const grid2 = document.getElementById('cards-grid-dash');
        if (grid2) grid2.innerHTML = renderProjetosDash(_projsDash, _gruposDash);
        toast('Ordem dos grupos atualizada');
      }
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      _dragGrupoId = null;
    }
    return;
  }

  const projetoId = _dragProjetoId;
  if (!projetoId) return;
  const proj = _projsDash.find(p => p.id === projetoId);
  if (!proj) return;
  const grupoAtual = proj.grupo_id || null;
  const grupoAlvo = grupoId || null;
  if (grupoAtual === grupoAlvo) return;
  try {
    await req('PATCH', `/projetos/${projetoId}`, { grupo_id: grupoAlvo });
    invalidarCacheProjetos();
    setProjsDash(_projsDash.map(p => p.id === projetoId ? { ...p, grupo_id: grupoAlvo } : p));
    if (FILTRO_GRUPO_DASH === grupoAtual && grupoAlvo !== grupoAtual) {
      setFiltroGrupoDash('todos');
      salvarFiltrosDash();
    }
    const grid = document.getElementById('cards-grid-dash');
    if (grid) grid.innerHTML = renderProjetosDash(_projsDash, _gruposDash);
    const nomeGrupo = grupoAlvo ? (_gruposDash.find(g => g.id === grupoAlvo)?.nome || 'grupo') : null;
    const grupoAnterior = grupoAtual;
    const grupoNovo = grupoAlvo;
    toastUndo(nomeGrupo ? `Movido para "${nomeGrupo}"` : 'Removido do grupo', async () => {
      try {
        await req('PATCH', `/projetos/${projetoId}`, { grupo_id: grupoAnterior });
        setProjsDash(_projsDash.map(p => p.id === projetoId ? { ...p, grupo_id: grupoAnterior } : p));
        const gridUndo = document.getElementById('cards-grid-dash');
        if (gridUndo) gridUndo.innerHTML = renderProjetosDash(_projsDash, _gruposDash);
        const nomeAnterior = grupoAnterior ? (_gruposDash.find(g => g.id === grupoAnterior)?.nome || 'grupo') : 'sem grupo';
        toast(`Movimento desfeito (${nomeAnterior})`);
      } catch (e) {
        setProjsDash(_projsDash.map(p => p.id === projetoId ? { ...p, grupo_id: grupoNovo } : p));
        toast(e.message || 'Não foi possível desfazer', 'err');
      }
    }, 5500);
  } catch (err) { toast(err.message, 'err'); }
  finally { _dragProjetoId = null; }
}

export function toggleGrupo(id) {
  const collapsed = JSON.parse(localStorage.getItem('telier_grupos_collapsed') || '[]');
  const idx = collapsed.indexOf(id);
  if (idx >= 0) collapsed.splice(idx, 1); else collapsed.push(id);
  localStorage.setItem('telier_grupos_collapsed', JSON.stringify(collapsed));
  const grid = document.getElementById('cards-grid-dash');
  if (grid) grid.innerHTML = renderProjetosDash(_projsDash, _gruposDash);
}
