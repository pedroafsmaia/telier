// ── PROJECT ──
import {
  EU, PROJETO, TAREFAS, TIMERS, _gruposDash,
  setProjeto, setTarefas, setTarefasView, setVistaAtual,
} from './state.js';
import { req } from './api.js';
import { invalidarCacheProjetos } from './api.js';
import { toast, abrirModal, fecharModal, confirmar, btnLoading, setBreadcrumb, setShellView, slideContent } from './ui.js';
import {
  esc, gv, sel, avatar, tag, prazoFmt, diasRestantes, fmtHoras,
  isAdmin, podeEditar, souDono, projetoConcluido, normalizarStatusProjeto,
  normalizarColaboradoresTarefas, PT, FT,
} from './utils.js';
import {
  renderAbaTarefas, renderMapa, renderRelatorio, renderDecisoes,
  renderAoVivoStream, restaurarEstadoTarefasProjeto,
} from './tasks.js';

const FASES = ['Estudo preliminar','Anteprojeto','Projeto básico','Projeto executivo','Em obra'];
const STATUS_PROJ = ['A fazer','Em andamento','Em revisão','Pausado','Concluído','Arquivado'];
const PRIORS = ['Alta','Média','Baixa'];

function projectTabKey(id) {
  return `telier_project_tab_${id}`;
}

function projectTaskViewKey(id) {
  return `telier_project_task_view_${id}`;
}

export async function abrirProjeto(id, opts = {}) {
  if (!opts.fromRoute) {
    return window.goProjeto ? window.goProjeto(id) : null;
  }
  window.scrollTo(0, 0);
  const c = document.getElementById('content');
  c.style.opacity = '0.4';
  c.style.pointerEvents = 'none';
  try {
    const [projeto, tarefas, decisoes, resumoHoras] = await Promise.all([
      req('GET', `/projetos/${id}`),
      req('GET', `/projetos/${id}/tarefas`),
      req('GET', `/projetos/${id}/decisoes`),
      req('GET', `/projetos/${id}/horas-por-usuario`).catch(() => []),
    ]);
    setShellView(projeto.grupo_id ? 'groups' : 'projects');
    setProjeto(projeto);
    setTarefas(normalizarColaboradoresTarefas(tarefas));
    document.title = projeto.nome + ' · Telier';
    c.style.opacity = '';
    c.style.pointerEvents = '';
    restaurarEstadoTarefasProjeto(id);
    const viewSalva = localStorage.getItem(projectTaskViewKey(id)) || 'lista';
    setTarefasView(viewSalva === 'kanban' ? 'kanban' : 'lista');
    const abaSalvaRaw = localStorage.getItem(projectTabKey(id)) || 'tarefas';
    const abaSalva = ['tarefas', 'mapa', 'relatorio', 'aovivo'].includes(abaSalvaRaw) ? abaSalvaRaw : 'tarefas';
    slideContent('right');
    renderProjeto(projeto, TAREFAS, decisoes, abaSalva, resumoHoras);
    setVistaAtual('projeto');
  } catch (e) {
    c.style.opacity = '';
    c.style.pointerEvents = '';
    c.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
  }
}

export function voltarDash() {
  slideContent('left');
  const saved = localStorage.getItem('telier_last_dashboard_hash') || '#/hoje';
  if (window.navigateToRoute) {
    if (saved === '#/projetos') return window.navigateToRoute('projects', {}, { invalidateProjects: true });
    return window.navigateToRoute('today', {}, { invalidateProjects: true });
  }
  invalidarCacheProjetos();
  import('./dashboard.js').then(({ renderDash }) => renderDash({ routeKind: 'today' }));
}

export function renderProjeto(proj, tarefas, decisoes, abaAtiva, resumoHoras = []) {
  const statusProjeto = normalizarStatusProjeto(proj.status);
  const isArquivado = !isAdmin() && (
    normalizarStatusProjeto(proj.status) === 'Arquivado' ||
    (proj.grupo_status || null) === 'Arquivado'
  );
  const total = tarefas.length;
  const conc = tarefas.filter(t => t.status === 'Concluída').length;
  const focoMinha = tarefas.find(t => t.foco && t.dono_id === EU?.id);
  const focoSessaoAtiva = focoMinha
    ? Object.entries(TIMERS).find(([, t]) => t.tarefaId === focoMinha.id)
    : null;
  const focoBtnHtml = focoMinha && !isArquivado
    ? (focoSessaoAtiva
        ? `<button class="btn btn-sm btn-danger"
             onclick="pararCronometro('${focoSessaoAtiva[0]}')">■ Parar</button>`
        : `<button class="btn btn-sm btn-primary"
             onclick="iniciarCronometro('${focoMinha.id}','${esc(focoMinha.nome)}')">▶ Iniciar</button>`)
    : '';
  const dias = diasRestantes(proj.prazo);
  const urgente = dias !== null && dias <= 7 && !projetoConcluido(statusProjeto);
  const canEdit = podeEditar(proj);
  const compartilhado = Number(proj.compartilhado_comigo) === 1;
  const canOperateTasks = !isArquivado && canEdit;
  const sessaoAtivaProjeto = Object.entries(TIMERS).find(([, timer]) => String(timer.projeto_id) === String(proj.id));
  const tempoProjetoAtivo = sessaoAtivaProjeto?.[1] || null;
  const focoTexto = focoMinha
    ? esc(focoMinha.nome)
    : 'Nenhuma tarefa em foco';
  const timerTexto = tempoProjetoAtivo
    ? `${esc(tempoProjetoAtivo.tarefa_nome)} em curso`
    : 'Nenhum cronômetro ativo';

  setBreadcrumb([
    ...(proj.grupo_nome && proj.grupo_id
      ? [{ label: 'Grupos', onClick: 'renderGroupsHome()' }, { label: proj.grupo_nome, onClick: `abrirGrupo('${proj.grupo_id}')` }]
      : [{ label: 'Projetos', onClick: 'voltarDash()' }]),
    { label: proj.nome },
  ]);

  const c = document.getElementById('content');
  c.innerHTML = `
    <button class="btn-back" onclick="${proj.grupo_id ? `abrirGrupo('${proj.grupo_id}')` : 'voltarDash()'}">← Voltar para ${proj.grupo_id ? 'grupo' : 'projetos'}</button>
    <section class="detail-shell"><div class="proj-hero detail-hero" data-status="${esc(statusProjeto)}">
      <div class="proj-hero-top">
        <div class="proj-hero-left">
          <div class="section-kicker">Projeto</div>
          <div class="proj-nome">${esc(proj.nome)}</div>
          <div class="proj-dono">${avatar(proj.dono_nome,'avatar-sm')} <span>${esc(proj.dono_nome||'—')}</span>${proj.grupo_nome ? `<span class="proj-context-chip">${esc(proj.grupo_nome)}</span>` : ''}</div>
        </div>
        <div class="proj-hero-actions">
          ${canEdit ? `<button class="btn btn-sm" onclick="modalEditarProjeto('${proj.id}')">Editar</button>` : ''}
          ${souDono(proj.dono_id) ? `<button class="btn btn-sm" onclick="modalPermissoes('${proj.id}')">Adicionar colaborador</button>` : ''}
          ${compartilhado ? `<button class="btn btn-sm" onclick="sairProjetoCompartilhado('${proj.id}','${esc(proj.nome)}')">Sair do projeto</button>` : ''}
          ${proj.total_horas > 0 ? `<button class="btn btn-sm" onclick="exportarTempoProjetoCSV('${proj.id}')">↓ CSV</button>` : ''}
        </div>
      </div>
      <div class="proj-meta proj-meta-compact">
        <div class="proj-meta-item"><span class="proj-meta-label">Status</span>${tag(statusProjeto)}</div>
        ${proj.prazo ? `<div class="proj-meta-item"><span class="proj-meta-label">Prazo</span><span class="tag ${urgente?'tag-red':'tag-gray'} mono">${prazoFmt(proj.prazo, true)}</span></div>` : ''}
        <div class="proj-meta-item"><span class="proj-meta-label">Execução</span><span class="tag tag-gray mono">${conc}/${total}</span></div>
      </div>
      <div class="project-ops-band">
        <div class="project-ops-card project-ops-card-actions">
          <span class="project-ops-label">Ação rápida</span>
          <strong class="project-ops-main">Entrar em execução</strong>
          <span class="project-ops-sub">Abra a lista com contexto preservado e retome a próxima tarefa sem reconfigurar a tela.</span>
          <div class="project-ops-buttons">
            <button class="btn btn-sm btn-primary" onclick="mudarAba('tarefas')">Ir para tarefas</button>
            ${canOperateTasks ? `<button class="btn btn-sm" onclick="modalNovaTarefa('${proj.id}')">Nova tarefa</button>` : ''}
            ${tempoProjetoAtivo ? `<button class="btn btn-sm" onclick="expandirSessoes('${tempoProjetoAtivo.tarefaId}')">Ver tempo</button>` : ''}
          </div>
        </div>
        <div class="project-ops-card">
          <span class="project-ops-label">Foco atual</span>
          <strong class="project-ops-main">${focoTexto}</strong>
          <span class="project-ops-sub">${focoMinha ? 'Tarefa prioritária para retomada imediata.' : 'Marque uma tarefa com ★ para orientar a operação.'}</span>
          ${focoBtnHtml ? `<div class="project-ops-buttons">${focoBtnHtml}</div>` : ''}
        </div>
        <div class="project-ops-card">
          <span class="project-ops-label">Tempo</span>
          <strong class="project-ops-main">${timerTexto}</strong>
          <span class="project-ops-sub">${proj.total_horas > 0 ? `${parseFloat(proj.total_horas).toFixed(1)}h acumuladas no projeto.` : 'Sem horas registradas ainda.'}</span>
        </div>
      </div>
      <details class="proj-hero-details-wrap">
        <summary class="proj-hero-details-toggle">Detalhes do projeto</summary>
        <div class="proj-hero-details">
          <div class="proj-meta">
            ${compartilhado ? `<div class="proj-meta-item"><span class="proj-meta-label">Acesso</span><span class="tag tag-cyan">Compartilhado ${proj.origem_compartilhamento==='grupo'?'via grupo':'direto'}</span></div>` : ''}
            <div class="proj-meta-item"><span class="proj-meta-label">Fase</span>${tag(proj.fase, FT[proj.fase])}</div>
            <div class="proj-meta-item"><span class="proj-meta-label">Prioridade</span>${tag(proj.prioridade, PT[proj.prioridade])}</div>
            ${proj.area_m2 ? `<div class="proj-meta-item"><span class="proj-meta-label">Área</span><span class="tag tag-gray mono">${proj.area_m2.toLocaleString('pt-BR')} m²</span></div>` : ''}
          </div>
          ${resumoHoras?.length > 1 ? `
            <div class="proj-horas-dist">
              ${resumoHoras.map(r =>
                `<span class="proj-horas-dist-item">${avatar(r.usuario_nome,'avatar-sm')} ${esc(r.usuario_nome)}: <strong>${r.horas}h</strong></span>`
              ).join('')}
            </div>` : ''}
        </div>
      </details>
    </div></section>
    ${isArquivado ? `
      <div class="alert-banner block-gap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        Projeto arquivado — somente leitura. Edições, novas tarefas e cronômetro estão desabilitados.
      </div>` : ''}
    <div class="abas detail-nav">
      <button class="aba ${(abaAtiva==='tarefas'||abaAtiva==='lista'||abaAtiva==='kanban')?'ativa':''}" data-aba="tarefas" onclick="mudarAba('tarefas')">Tarefas</button>
      <button class="aba ${abaAtiva==='mapa'?'ativa':''}" data-aba="mapa" onclick="mudarAba('mapa')">Mapa de Foco</button>
      <button class="aba ${abaAtiva==='relatorio'?'ativa':''}" data-aba="relatorio" onclick="mudarAba('relatorio')">Relat&oacute;rio</button>
      <button class="aba ${abaAtiva==='aovivo'?'ativa':''}" data-aba="aovivo" onclick="mudarAba('aovivo')">Ao vivo</button>
    </div>
    <div id="aba"></div>
    <div id="decisoes-sec"></div>`;

  renderAba(abaAtiva, tarefas);
  renderDecisoes(proj.id, decisoes, canEdit);
}

export function mudarAba(aba) {
  document.querySelectorAll('.aba').forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
  renderAba(aba, TAREFAS);
  if (PROJETO?.id) localStorage.setItem(projectTabKey(PROJETO.id), aba);
}

export function renderAba(aba, tarefas) {
  const el = document.getElementById('aba');
  if (!el) return;
  setTarefas(tarefas);
  if (aba === 'lista' || aba === 'kanban') aba = 'tarefas';
  if (aba === 'tarefas') renderAbaTarefas(el, tarefas);
  else if (aba === 'mapa') renderMapa(el, tarefas);
  else if (aba === 'relatorio') renderRelatorio(el, tarefas);
  else if (aba === 'aovivo') renderProjetoAoVivo(el);
}

export async function renderProjetoAoVivo(el) {
  if (!PROJETO?.id) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div> Verificando sess&otilde;es ativas...</div>`;
  try {
    const { carregarAoVivoProjeto } = await import('./groups.js');
    const sessoes = await carregarAoVivoProjeto(PROJETO.id);
    if (!sessoes.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-text">Nenhum cron&ocirc;metro ativo neste projeto</div><div class="empty-sub">Quando algu&eacute;m iniciar um cron&ocirc;metro em uma tarefa daqui, ele aparece nesta aba.</div></div>`;
      return;
    }
    el.innerHTML = renderAoVivoStream(sessoes, {
      titulo: 'Ao vivo do projeto',
      copy: 'Tarefas em execução dentro deste projeto.',
    });
  } catch (e) {
    el.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
  }
}

export async function recarregarProjeto(aba) {
  if (!PROJETO) return;
  const abaAtual = aba || document.querySelector('.aba.ativa')?.dataset.aba || 'tarefas';
  const abaAtiva = ['tarefas', 'mapa', 'relatorio', 'aovivo'].includes(abaAtual) ? abaAtual : 'tarefas';
  const [proj, tarefas, decisoes, resumoHoras] = await Promise.all([
    req('GET', `/projetos/${PROJETO.id}`),
    req('GET', `/projetos/${PROJETO.id}/tarefas`),
    req('GET', `/projetos/${PROJETO.id}/decisoes`),
    req('GET', `/projetos/${PROJETO.id}/horas-por-usuario`).catch(() => []),
  ]);
  setProjeto(proj);
  setTarefas(normalizarColaboradoresTarefas(tarefas));
  renderProjeto(proj, TAREFAS, decisoes, abaAtiva, resumoHoras);
}

export function modalNovoProjeto(preselectGrupoId = '') {
  abrirModal(`
    <h2>Novo projeto</h2>
    <div class="form-row"><label>Nome do projeto</label><input id="m-nome" placeholder="Ex: Reforma Bloco B"></div>
    <div class="form-grid">
      <div class="form-row"><label>Fase</label>${sel('m-fase',FASES,'Estudo preliminar')}</div>
      <div class="form-row"><label>Status</label>${sel('m-status',STATUS_PROJ,'A fazer')}</div>
      <div class="form-row"><label>Prioridade</label>${sel('m-prior',PRIORS,'Média')}</div>
      <div class="form-row"><label>Prazo</label><input type="date" id="m-prazo"></div>
      <div class="form-row"><label>Área (m²)</label><input type="number" id="m-area" min="0" step="0.01" placeholder="Ex: 250.5"></div>
    </div>
    <div class="form-row"><label>Grupo <span style="color:var(--text-muted)">(opcional)</span></label>
      <select id="m-grupo">
        <option value="">— Sem grupo —</option>
        ${_gruposDash
          .filter(g => (g.status || 'Ativo') !== 'Arquivado')
          .map(g => `<option value="${g.id}" ${g.id===preselectGrupoId?'selected':''}>${esc(g.nome)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-criar-proj" onclick="criarProjeto()">Criar projeto</button>
    </div>`);
}

export async function criarProjeto() {
  const nome = gv('m-nome').trim();
  if (!nome) { toast('Nome obrigatório', 'err'); return; }
  btnLoading('btn-criar-proj', true);
  try {
    const areaVal = gv('m-area');
    await req('POST', '/projetos', { nome, fase: gv('m-fase'), status: gv('m-status'), prioridade: gv('m-prior'), prazo: gv('m-prazo')||null, area_m2: areaVal ? parseFloat(areaVal) : null, grupo_id: gv('m-grupo') || null });
    fecharModal(); toast('Projeto criado'); invalidarCacheProjetos();
    if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-criar-proj', false); }
}

export async function modalEditarProjeto(id) {
  const p = PROJETO?.id === id ? PROJETO : await req('GET', `/projetos/${id}`);
  abrirModal(`
    <h2>Editar projeto</h2>
    <div class="form-row"><label>Nome do projeto</label><input id="m-nome" value="${esc(p.nome)}"></div>
    <div class="form-grid">
      <div class="form-row"><label>Fase</label>${sel('m-fase',FASES,p.fase)}</div>
      <div class="form-row"><label>Status</label>${sel('m-status',STATUS_PROJ,p.status)}</div>
      <div class="form-row"><label>Prioridade</label>${sel('m-prior',PRIORS,p.prioridade)}</div>
      <div class="form-row"><label>Prazo</label><input type="date" id="m-prazo" value="${p.prazo||''}"></div>
      <div class="form-row"><label>Área (m²)</label><input type="number" id="m-area" min="0" step="0.01" value="${p.area_m2||''}" placeholder="Ex: 250.5"></div>
    </div>
    <div class="form-row"><label>Grupo <span style="color:var(--text-muted)">(opcional)</span></label>
      <select id="m-grupo">
        <option value="">— Sem grupo —</option>
        ${_gruposDash.map(g => `<option value="${g.id}" ${g.id === p.grupo_id ? 'selected' : ''}>${esc(g.nome)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-footer">
      ${souDono(p.dono_id) ? `<button class="btn btn-danger" onclick="deletarProjeto('${id}')" style="margin-right:auto">Excluir</button>` : ''}
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-salvar-proj" onclick="salvarProjeto('${id}')">Salvar</button>
    </div>`);
}

export async function salvarProjeto(id) {
  const nome = gv('m-nome').trim();
  if (!nome) { toast('Nome obrigatório', 'err'); return; }
  btnLoading('btn-salvar-proj', true);
  try {
    const areaVal2 = gv('m-area');
    await req('PUT', `/projetos/${id}`, { nome, fase: gv('m-fase'), status: gv('m-status'), prioridade: gv('m-prior'), prazo: gv('m-prazo')||null, area_m2: areaVal2 ? parseFloat(areaVal2) : null, grupo_id: gv('m-grupo') || null });
    fecharModal(); toast('Projeto atualizado');
    invalidarCacheProjetos();
    if (PROJETO?.id === id) {
      await recarregarProjeto();
    } else {
      if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
    }
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-salvar-proj', false); }
}

export async function deletarProjeto(id) {
  const proj = PROJETO?.id === id ? PROJETO : null;
  const status = proj?.status || '';
  if (status !== 'Arquivado') {
    toast('Arquive o projeto antes de excluí-lo — mude o status para "Arquivado".', 'err');
    return;
  }
  confirmar(`Excluir o projeto "${proj?.nome || ''}" e todas as suas tarefas, sessões de tempo e decisões? Esta ação é permanente.`, async () => {
    try {
      await req('DELETE', `/projetos/${id}`);
      fecharModal(); toast('Projeto excluído'); invalidarCacheProjetos();
      if (window.refreshCurrentRoute) await window.refreshCurrentRoute({ invalidateProjects: true });
    }
    catch (e) { toast(e.message, 'err'); }
  }, { titulo: 'Excluir projeto', btnTexto: 'Excluir', danger: true });
}
