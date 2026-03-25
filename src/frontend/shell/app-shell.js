(function attachAppShell(global) {
  const root = global.TelierFrontend = global.TelierFrontend || {};
  root.shell = root.shell || {};

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function fmtHours(minutes) {
    const mins = Number(minutes || 0);
    if (!Number.isFinite(mins) || mins <= 0) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m ? ` ${m}m` : ''}`;
  }

  function fmtDateLabel(dateStr) {
    if (!dateStr) return 'Sem prazo';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (!Number.isFinite(dt.getTime())) return 'Sem prazo';
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function normalizeHojeSnapshot(raw) {
    const src = raw || {};
    return {
      activeTask: src.activeTask || null,
      activeTimer: src.activeTimer || null,
      resume: Array.isArray(src.resume) ? src.resume.slice(0, 4) : [],
      dueSoon: Array.isArray(src.dueSoon) ? src.dueSoon.slice(0, 5) : [],
      pendencias: Array.isArray(src.pendencias) ? src.pendencias.slice(0, 5) : [],
      activeProjects: Array.isArray(src.activeProjects) ? src.activeProjects.slice(0, 6) : [],
      source: src.source || 'bridge',
    };
  }

  function normalizeProjetosSnapshot(list = []) {
    return Array.isArray(list) ? list.map((p) => ({
      id: p.id || '',
      nome: p.nome || 'Projeto',
      campus: p.campus || '—',
      unidade: p.unidade || '—',
      fase: p.fase || '—',
      status: p.status || '—',
      prazo: p.prazo || null,
      responsavel: p.responsavel || '—',
      responsavelId: p.responsavelId || null,
      progresso: Number.isFinite(Number(p.progresso)) ? Number(p.progresso) : null,
      risco: p.risco || 'Baixo',
    })) : [];
  }

  function normalizeProjetoTarefasSnapshot(raw = {}) {
    const src = raw || {};
    const itens = Array.isArray(src.itens) ? src.itens : [];
    return {
      parcial: !!src.parcial,
      itens: itens.map((t) => ({
        id: t.id || '',
        nome: t.nome || 'Tarefa',
        responsavel: t.responsavel || '—',
        colaboradores: Array.isArray(t.colaboradores) ? t.colaboradores.slice(0, 3) : [],
        status: t.status || '—',
        prazo: t.prazo || null,
        complexidade: t.complexidade || null,
        prioridade: t.prioridade || null,
        tempoMinutos: Number.isFinite(Number(t.tempoMinutos)) ? Number(t.tempoMinutos) : null,
      })),
    };
  }

  function normalizeTarefaSnapshot(raw = {}) {
    const src = raw || {};
    return {
      id: src.id || '',
      nome: src.nome || 'Tarefa',
      status: src.status || '—',
      prazo: src.prazo || null,
      responsavel: src.responsavel || '—',
      colaboradores: Array.isArray(src.colaboradores) ? src.colaboradores.slice(0, 8) : [],
      complexidade: src.complexidade || null,
      prioridade: src.prioridade || null,
      tempoMinutos: Number.isFinite(Number(src.tempoMinutos)) ? Number(src.tempoMinutos) : null,
      projeto: src.projeto && typeof src.projeto === 'object'
        ? { id: src.projeto.id || '', nome: src.projeto.nome || 'Projeto' }
        : { id: '', nome: 'Projeto' },
      parcial: !!src.parcial,
      source: src.source || 'bridge',
    };
  }

  const TASK_STATUS_OPTIONS = ['A fazer', 'Em andamento', 'Bloqueada', 'Concluída'];

  function renderProjetoTasksSection(projeto, components, statusMutations = {}) {
    const { panel, emptyState, button } = components;
    const tarefas = Array.isArray(projeto?.tarefas?.itens) ? projeto.tarefas.itens : [];
    if (!tarefas.length) {
      return panel({
        title: 'Tarefas (subárea nativa v2)',
        body: [
          emptyState({
            title: 'Sem tarefas visíveis nesta leitura inicial',
            description: 'Use o fluxo atual para criação/edição enquanto a subárea nativa evolui com segurança.',
          }),
          '<div style="height:10px"></div>',
          button({ label: 'Abrir tarefas no fluxo atual', attrs: { 'data-v2-action': 'open-current-project', 'data-v2-project-id': projeto?.id || '' } }),
        ].join(''),
      });
    }
    const rows = tarefas.map((t) => {
      const taskMutation = statusMutations[t.id] || {};
      const erroStatus = taskMutation.error ? `<div class="v2-shell-note" style="color:var(--danger,#b42318)">Falha ao atualizar status.</div>` : '';
      return `
      <tr>
        <td>
          <strong>${esc(t.nome)}</strong>
          <div class="v2-shell-note">ID: ${esc(t.id || '—')}</div>
        </td>
        <td>${esc(t.responsavel || '—')}</td>
        <td>${t.colaboradores.length ? esc(t.colaboradores.join(', ')) : '—'}</td>
        <td><span class="v2-status-chip">${esc(t.status || '—')}</span></td>
        <td>${esc(fmtDateLabel(t.prazo))}</td>
        <td>${esc(t.complexidade || t.prioridade || '—')}</td>
        <td>${t.tempoMinutos == null ? '—' : esc(fmtHours(t.tempoMinutos))}</td>
        <td>
          <div class="v2-controls" style="gap:6px;justify-content:flex-start">
            <select class="v2-input" data-v2-task-status="${esc(t.id)}" ${taskMutation.loading ? 'disabled' : ''}>
              ${TASK_STATUS_OPTIONS.map((status) => `<option value="${esc(status)}" ${status === t.status ? 'selected' : ''}>${esc(status)}</option>`).join('')}
            </select>
            <button class="v2-link-btn" data-v2-action="open-task-native" data-v2-task-id="${esc(t.id)}" data-v2-task-project-id="${esc(projeto?.id || '')}">Abrir tarefa</button>
            <button class="v2-link-btn" data-v2-action="open-task-legacy" data-v2-task-id="${esc(t.id)}">Abrir no fluxo atual</button>
          </div>
          ${taskMutation.loading ? '<div class="v2-shell-note">Atualizando status...</div>' : erroStatus}
        </td>
      </tr>
    `;
    }).join('');
    const avisoParcial = projeto?.tarefas?.parcial
      ? '<div class="v2-shell-note">Dados complementares parciais (colaboradores/tempo).</div><div style="height:8px"></div>'
      : '';
    return panel({
      title: 'Tarefas (subárea nativa v2)',
      body: [
        '<div class="v2-shell-note">Primeira listagem operacional com dados reais; ações avançadas continuam no fluxo atual nesta fase.</div>',
        '<div style="height:8px"></div>',
        avisoParcial,
        `<div class="v2-table-wrap"><table class="v2-table"><thead><tr><th>Tarefa</th><th>Responsável</th><th>Colaboradores</th><th>Status</th><th>Prazo</th><th>Complex./Priorid.</th><th>Tempo</th><th>Ação</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      ].join(''),
    });
  }

  function renderProjetosTable(projetos = []) {
    if (!projetos.length) {
      return `<div class="v2-empty"><strong>Sem projetos para os filtros atuais</strong><p>Ajuste filtros ou use o fluxo atual para operações avançadas.</p></div>`;
    }
    const rows = projetos.map((p) => `
      <tr>
        <td>
          <button class="v2-link-btn" data-v2-action="open-project" data-v2-project-id="${esc(p.id)}" ${p.id ? '' : 'disabled'}>${esc(p.nome)}</button>
          <span class="v2-meta-line">${esc(p.unidade !== '—' ? p.unidade : p.campus)} · abre no fluxo atual</span>
        </td>
        <td>${esc(p.campus)}</td>
        <td>${esc(p.unidade)}</td>
        <td>${esc(p.fase)}</td>
        <td><span class="v2-status-chip">${esc(p.status)}</span></td>
        <td>${esc(fmtDateLabel(p.prazo))}</td>
        <td>${esc(p.responsavel)}</td>
        <td>${p.progresso == null ? '—' : `${p.progresso}%`}</td>
        <td><span class="v2-status-chip">${esc(p.risco)}</span></td>
      </tr>
    `).join('');
    return `<div class="v2-table-wrap"><table class="v2-table"><thead><tr><th>Projeto</th><th>Campus</th><th>Unidade</th><th>Fase</th><th>Status</th><th>Prazo</th><th>Responsável</th><th>Progresso</th><th>Risco</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderProjetoNative(projeto, components) {
    const { panel, emptyState, button } = components;
    if (!projeto) {
      return emptyState({
        title: 'Projeto não carregado',
        description: 'Selecione um projeto na listagem para abrir o destino nativo desta fase.',
      });
    }
    return `
      <div class="v2-project-layout">
        <section class="v2-panel">
          <h3 class="v2-panel-title">${esc(projeto.nome)}</h3>
          <div class="v2-shell-note">${esc((projeto.unidade || 'Sem unidade') + (projeto.campus ? ` · ${projeto.campus}` : ''))}</div>
          <div style="height:12px"></div>
          <div class="v2-table-wrap">
            <table class="v2-table" style="min-width:unset">
              <tbody>
                <tr><th>Fase</th><td>${esc(projeto.fase || '—')}</td><th>Status</th><td>${esc(projeto.status || '—')}</td></tr>
                <tr><th>Prazo</th><td>${esc(fmtDateLabel(projeto.prazo))}</td><th>Responsável</th><td>${esc(projeto.responsavel || '—')}</td></tr>
                <tr><th>Progresso</th><td>${projeto.progresso == null ? '—' : `${projeto.progresso}%`}</td><th>Risco</th><td>${esc(projeto.risco || 'Sem sinal forte')}</td></tr>
              </tbody>
            </table>
          </div>
          <div style="height:12px"></div>
          ${panel({
    title: 'Resumo operacional',
    body: `<ul class="v2-placeholder-list">
              <li><span>Horas resumidas</span><span>${projeto.horasResumo == null ? '—' : `${Number(projeto.horasResumo).toFixed(1)}h`}</span></li>
              <li><span>Atividade registrada</span><span>${projeto.resumoAtividade ? 'Disponível' : 'Parcial (segura)'}</span></li>
              <li><span>Confiabilidade do resumo</span><span>${projeto.dadosParciais ? 'Parcial' : 'Completa'}</span></li>
            </ul>`,
  })}
          <div style="height:12px"></div>
          ${renderProjetoTasksSection(projeto, components, projeto.statusMutations || {})}
        </section>
        <aside class="v2-panel">
          <h3 class="v2-panel-title">Próximas ações</h3>
          <div class="v2-shell-note">Alguns fluxos ainda seguem pela interface atual nesta fase.</div>
          <div style="height:10px"></div>
          <div class="v2-controls">
            ${button({ label: 'Abrir projeto no fluxo atual', attrs: { 'data-v2-action': 'open-current-project', 'data-v2-project-id': projeto.id } })}
            ${button({ label: 'Voltar para listagem', attrs: { 'data-v2-action': 'go-projetos' } })}
          </div>
          <div style="height:10px"></div>
          ${emptyState({
    title: 'Fluxos avançados ainda no legado',
    description: 'CRUD completo de tarefas, edição profunda e operação de tempo detalhada seguem na interface atual nesta fase.',
  })}
        </aside>
      </div>
    `;
  }

  function renderTarefaReadFirst(tarefaState, components) {
    const { panel, emptyState, button } = components;
    const tarefa = tarefaState?.data || null;
    if (!tarefa) {
      return panel({
        title: 'Tarefa',
        body: emptyState({
          title: 'Tarefa não carregada',
          description: 'Abra uma tarefa na tabela do projeto para usar o destino nativo read-first desta fase.',
        }),
      });
    }
    const colaboradores = tarefa.colaboradores.length
      ? tarefa.colaboradores.join(', ')
      : '—';
    return `
      <div class="v2-project-layout">
        <section class="v2-panel">
          <h3 class="v2-panel-title">${esc(tarefa.nome)}</h3>
          <div class="v2-shell-note">Projeto: ${esc(tarefa.projeto?.nome || 'Projeto')}</div>
          <div style="height:12px"></div>
          <div class="v2-table-wrap">
            <table class="v2-table" style="min-width:unset">
              <tbody>
                <tr><th>Status</th><td><span class="v2-status-chip">${esc(tarefa.status || '—')}</span></td><th>Prazo</th><td>${esc(fmtDateLabel(tarefa.prazo))}</td></tr>
                <tr><th>Responsável</th><td>${esc(tarefa.responsavel || '—')}</td><th>Colaboradores</th><td>${esc(colaboradores)}</td></tr>
                <tr><th>Complexidade/Prioridade</th><td>${esc(tarefa.complexidade || tarefa.prioridade || '—')}</td><th>Resumo de tempo</th><td>${tarefa.tempoMinutos == null ? '—' : esc(fmtHours(tarefa.tempoMinutos))}</td></tr>
              </tbody>
            </table>
          </div>
          <div style="height:10px"></div>
          ${tarefa.parcial ? '<div class="v2-shell-note">Leitura parcial: colaboradores/tempo podem estar incompletos nesta fase.</div>' : '<div class="v2-shell-note">Leitura operacional consolidada para abertura nativa inicial de tarefa.</div>'}
        </section>
        <aside class="v2-panel">
          <h3 class="v2-panel-title">Ações disponíveis</h3>
          <div class="v2-shell-note">Fluxos avançados de edição e operação completa permanecem no fluxo atual.</div>
          <div style="height:10px"></div>
          <div class="v2-controls">
            ${button({ label: 'Abrir no fluxo atual', attrs: { 'data-v2-action': 'open-task-legacy', 'data-v2-task-id': tarefa.id } })}
            ${button({ label: 'Abrir projeto (v2)', attrs: { 'data-v2-action': 'open-project', 'data-v2-project-id': tarefa.projeto?.id || '' }, disabled: !tarefa.projeto?.id })}
            ${button({ label: 'Voltar para projeto', attrs: { 'data-v2-action': 'go-projeto' } })}
          </div>
          <div style="height:10px"></div>
          ${emptyState({
            title: 'Escopo read-first',
            description: 'Edição completa, foco avançado, colaboradores avançados e tempo detalhado seguem fora do escopo nesta etapa.',
          })}
        </aside>
      </div>
    `;
  }

  function renderHojeOperationalPanels(data, components) {
    const { panel, emptyState, button } = components;
    const snapshot = normalizeHojeSnapshot(data);
    const canOpenActiveTask = !!snapshot?.activeTask?.projeto_id;
    const canOpenActiveProject = !!snapshot?.activeTask?.projeto_id;
    const canStartTimer = !!snapshot?.activeTask?.id && !snapshot?.activeTimer?.sessao_id;
    const canStopTimer = !!snapshot?.activeTimer?.sessao_id;

    const activeTaskBody = snapshot.activeTask
      ? `<ul class="v2-placeholder-list">
          <li><span>${esc(snapshot.activeTask.nome || 'Tarefa ativa')}</span><span class="v2-status-chip">${esc(snapshot.activeTask.status || 'Em execução')}</span></li>
          <li><span>Projeto</span><span>${esc(snapshot.activeTask.projeto_nome || '—')}</span></li>
          <li><span>Tempo em execução</span><span>${esc(snapshot.activeTimer?.label || fmtHours(snapshot.activeTimer?.minutos || 0))}</span></li>
        </ul>
        <div class="v2-controls" style="margin-top:10px">
          ${button({ label: 'Abrir tarefa (fluxo atual)', attrs: { 'data-v2-action': 'open-active-task' }, disabled: !canOpenActiveTask })}
          ${button({ label: 'Abrir projeto (fluxo atual)', attrs: { 'data-v2-action': 'open-active-project' }, disabled: !canOpenActiveProject })}
          ${snapshot.activeTimer?.sessao_id
    ? button({ label: 'Parar cronômetro', attrs: { 'data-v2-action': 'stop-active-timer' }, disabled: !canStopTimer })
    : button({ label: 'Iniciar/retomar cronômetro', attrs: { 'data-v2-action': 'start-active-timer' }, disabled: !canStartTimer })}
        </div>`
      : emptyState({
        title: 'Nenhum cronômetro ativo agora',
        description: 'Inicie pela operação legada enquanto a ação principal do v2 é expandida com segurança.',
      });

    const resumeBody = snapshot.resume.length
      ? `<ul class="v2-placeholder-list">${snapshot.resume.map((item, index) => `<li><span>${esc(item.titulo || 'Retomada')}</span><span>${esc(item.meta || '')}</span><button class="v2-btn" data-v2-action="open-resume-item" data-v2-resume-index="${index}" ${item?.projeto_id ? '' : 'disabled'}>Abrir (fluxo atual)</button></li>`).join('')}</ul>`
      : emptyState({
        title: 'Sem retomadas recentes',
        description: 'Assim que houver histórico recente, esta seção exibirá os atalhos de continuidade.',
      });

    const dueBody = snapshot.dueSoon.length
      ? `<ul class="v2-placeholder-list">${snapshot.dueSoon.map((item) => `<li><span>${esc(item.nome || 'Projeto')}</span><span>${fmtDateLabel(item.prazo)}</span></li>`).join('')}</ul>`
      : emptyState({ title: 'Sem prazos próximos', description: 'Nenhum prazo crítico nos próximos dias com os dados disponíveis.' });

    const pendenciasBody = snapshot.pendencias.length
      ? `<ul class="v2-placeholder-list">${snapshot.pendencias.map((item) => `<li><span>${esc(item.nome || 'Pendência')}</span><span class="v2-status-chip">${esc(item.tipo || 'Atenção')}</span></li>`).join('')}</ul>`
      : emptyState({ title: 'Sem bloqueios detectados', description: 'A lista de bloqueios usa integração parcial nesta fase e será aprofundada nas próximas telas.' });

    const projectsBody = snapshot.activeProjects.length
      ? `<ul class="v2-placeholder-list">${snapshot.activeProjects.map((item) => `<li><span>${esc(item.nome || 'Projeto')}</span><span>${esc(item.status || 'Ativo')}</span></li>`).join('')}</ul>`
      : emptyState({ title: 'Sem projetos em andamento', description: 'Quando houver projetos ativos, a visão operacional aparecerá aqui.' });

    return [
      panel({ title: 'Tarefa ativa e cronômetro', body: activeTaskBody }),
      panel({ title: 'Retomada de contexto', body: resumeBody }),
      panel({ title: 'Prazos próximos', body: dueBody }),
      panel({ title: 'Pendências e bloqueios', body: pendenciasBody }),
      panel({
        title: 'Projetos em andamento',
        body: [projectsBody, '<div style="height:10px"></div>', button({ label: 'Abrir operação atual (legado)', attrs: { 'data-v2-action': 'open-legacy' } })].join(''),
      }),
    ].join('');
  }

  function createSectionRegistry(components) {
    const { panel, emptyState, tabs, searchField, filterBar, input, select, button } = components;

    function sampleRows(rows) {
      return `<ul class="v2-placeholder-list">${rows.map((row) => `<li><span>${row.label}</span><span class="v2-status-chip">${row.status}</span></li>`).join('')}</ul>`;
    }

    return {
      hoje: ({ hojeState }) => panel({
        title: 'Hoje',
        body: [
          tabs({ active: 'operacao', items: [{ id: 'operacao', label: 'Operação diária' }, { id: 'foco', label: 'Foco assistivo (transitório)' }] }),
          '<div class="v2-shell-note">Tela operacional real da v2 com integração gradual de baixo risco.</div>',
          filterBar({
            content: [
              searchField({ placeholder: 'Buscar referência operacional', attrs: { disabled: true, 'aria-label': 'Busca em preparo para fase seguinte' } }),
              select({ options: [{ value: 'hoje', label: 'Visão de hoje' }, { value: '7d', label: 'Próximos 7 dias' }], disabled: true }),
              button({ label: hojeState.loading ? 'Atualizando...' : 'Atualizar visão', attrs: { 'data-v2-action': 'refresh-hoje' }, disabled: !!hojeState.loading }),
            ].join(''),
          }),
          '<div style="height:10px"></div>',
          hojeState.error
            ? emptyState({ title: 'Não foi possível carregar todos os dados de Hoje', description: 'A integração é parcial nesta fase. Use a operação legada como contingência enquanto os módulos são migrados.' })
            : renderHojeOperationalPanels(hojeState.data, components),
        ].join(''),
      }),
      projetos: ({ projetosState }) => panel({
        title: 'Projetos',
        body: [
          filterBar({
            content: [
              searchField({ placeholder: 'Buscar projeto', value: projetosState.search || '', attrs: { 'data-v2-proj': 'search' } }),
              select({ options: [{ value: 'todos', label: 'Todos os status' }, ...(projetosState.statusOptions || []).map((s) => ({ value: s, label: s }))], selected: projetosState.status, attrs: { 'data-v2-proj': 'status' } }),
              select({ options: [{ value: 'todos', label: 'Todas as unidades/campi' }, ...(projetosState.unidadeOptions || []).map((u) => ({ value: u, label: u }))], selected: projetosState.unidade, attrs: { 'data-v2-proj': 'unidade' } }),
              select({ options: [{ value: 'todos', label: 'Todos os responsáveis' }, ...(projetosState.responsavelOptions || []).map((r) => ({ value: r.id, label: r.nome }))], selected: projetosState.responsavelId, attrs: { 'data-v2-proj': 'responsavel' } }),
              button({ label: projetosState.loading ? 'Atualizando...' : 'Atualizar', attrs: { 'data-v2-action': 'refresh-projetos' }, disabled: !!projetosState.loading }),
              button({ label: 'Limpar filtros', attrs: { 'data-v2-action': 'clear-proj-filters' } }),
            ].join(''),
          }),
          '<div style="height:10px"></div>',
          projetosState.error
            ? emptyState({ title: 'Não foi possível carregar a listagem de projetos', description: 'A operação atual continua disponível como contingência para manter continuidade.' })
            : renderProjetosTable(projetosState.filtered),
          '<div style="height:10px"></div>',
          button({ label: 'Abrir gestão atual de projetos (fluxo atual)', attrs: { 'data-v2-action': 'open-legacy' } }),
        ].join(''),
      }),
      projeto: ({ projetoState }) => panel({
        title: 'Projeto',
        body: projetoState.loading
          ? '<div class="v2-boot"><div class="spinner"></div><span>Carregando projeto...</span></div>'
          : (projetoState.error
            ? emptyState({
              title: 'Não foi possível carregar o destino nativo do projeto',
              description: 'Use o botão abaixo para abrir no fluxo atual enquanto o workspace v2 é migrado.',
            }) + `<div style="height:10px"></div>${button({ label: 'Abrir no fluxo atual', attrs: { 'data-v2-action': 'open-current-project', 'data-v2-project-id': projetoState.id || '' } })}`
            : renderProjetoNative(projetoState.data, components)),
      }),
      tarefa: ({ tarefaState }) => panel({
        title: 'Tarefa',
        body: tarefaState.loading
          ? '<div class="v2-boot"><div class="spinner"></div><span>Carregando tarefa...</span></div>'
          : (tarefaState.error
            ? emptyState({
              title: 'Não foi possível carregar a leitura nativa da tarefa',
              description: 'Use o fluxo atual como contingência enquanto a área de tarefa v2 é expandida.',
            }) + `<div style="height:10px"></div>${button({ label: 'Abrir no fluxo atual', attrs: { 'data-v2-action': 'open-task-legacy', 'data-v2-task-id': tarefaState.id || '' } })}`
            : renderTarefaReadFirst(tarefaState, components)),
      }),
      tempo: () => panel({
        title: 'Tempo',
        body: [
          filterBar({ content: [input({ placeholder: 'Data inicial', type: 'date' }), input({ placeholder: 'Data final', type: 'date' }), select({ options: [{ value: 'todos', label: 'Equipe inteira' }, { value: 'meus', label: 'Meus registros' }] }), button({ label: 'Aplicar' })].join('') }),
          '<div style="height:10px"></div>',
          sampleRows([{ label: 'Sessões ativas agora', status: '02' }, { label: 'Horas líquidas hoje', status: '13h40' }, { label: 'Pendências de apontamento', status: '03' }]),
          '<div style="height:10px"></div>',
          emptyState({ title: 'Tempo analítico preservado no backend', description: 'A interface desta área será evoluída sem alterar os contratos e cálculos já estabilizados.' }),
        ].join(''),
      }),
      pessoas: () => panel({
        title: 'Pessoas',
        body: [
          sampleRows([{ label: 'Equipe Projetos — 7 pessoas com carga ativa', status: 'Estável' }, { label: 'Equipe Apoio — 2 pendências bloqueadas', status: 'Atenção' }]),
          '<div style="height:10px"></div>',
          emptyState({ title: 'Placeholder de Pessoas', description: 'A camada visual foi preparada com componentes reutilizáveis para reduzir risco de regressão nas próximas telas.' }),
        ].join(''),
      }),
      administracao: () => panel({
        title: 'Administração',
        body: [
          '<div class="v2-shell-note">Administração permanece separada da operação conforme diretriz de produto.</div>',
          '<div style="height:10px"></div>',
          emptyState({ title: 'Admin separado da operação', description: 'A separação estrutural foi reforçada no shell. A tela operacional legada continua disponível.' }),
          '<div style="height:10px"></div>',
          button({ label: 'Abrir central admin atual', onClick: "if (typeof abrirCentralAdmin === 'function') abrirCentralAdmin()" }),
        ].join(''),
      }),
    };
  }

  function initAppShell(config) {
    const theme = root.theme?.tokens;
    const components = root.components?.base;
    if (!theme || !components) return;

    theme.applyThemeTokens();
    const host = document.getElementById('v2-shell-root');
    if (!host) return;

    const sections = createSectionRegistry(components);
    const nav = [
      { id: 'hoje', label: 'Hoje' },
      { id: 'projetos', label: 'Projetos' },
      { id: 'tempo', label: 'Tempo' },
      { id: 'pessoas', label: 'Pessoas' },
      { id: 'administracao', label: 'Administração' },
    ];

    const state = {
      active: 'hoje',
      hoje: { loading: false, error: '', data: null },
      hojeReqToken: 0,
      projetos: {
        loading: false,
        error: '',
        reqToken: 0,
        all: [],
        filtered: [],
        search: '',
        status: 'todos',
        unidade: 'todos',
        responsavelId: 'todos',
        statusOptions: [],
        unidadeOptions: [],
        responsavelOptions: [],
      },
      projeto: { id: '', loading: false, error: '', data: null, reqToken: 0, statusMutations: {} },
      tarefa: { id: '', projectId: '', loading: false, error: '', data: null, reqToken: 0 },
    };

    function applyProjectFilters() {
      const p = state.projetos;
      const q = p.search.trim().toLowerCase();
      p.filtered = p.all.filter((item) => {
        if (q && !`${item.nome} ${item.unidade || ''} ${item.campus || ''}`.toLowerCase().includes(q)) return false;
        if (p.status !== 'todos' && item.status !== p.status) return false;
        if (p.unidade !== 'todos' && (item.unidade || item.campus || '—') !== p.unidade) return false;
        if (p.responsavelId !== 'todos' && item.responsavelId !== p.responsavelId) return false;
        return true;
      });
    }

    async function loadProjetos() {
      if (state.projetos.loading) return;
      const bridge = global.TelierV2Bridge;
      if (!bridge?.getProjetosSnapshot) {
        state.projetos.error = 'bridge_unavailable';
        return;
      }
      const reqToken = ++state.projetos.reqToken;
      state.projetos.loading = true;
      state.projetos.error = '';
      render();
      try {
        const loaded = normalizeProjetosSnapshot(await bridge.getProjetosSnapshot());
        if (reqToken !== state.projetos.reqToken) return;
        state.projetos.all = loaded;
        state.projetos.statusOptions = [...new Set(state.projetos.all.map((i) => i.status).filter(Boolean))];
        state.projetos.unidadeOptions = [...new Set(state.projetos.all.map((i) => i.unidade !== '—' ? i.unidade : i.campus).filter(Boolean))];
        state.projetos.responsavelOptions = [...new Map(state.projetos.all.map((i) => [i.responsavelId, { id: i.responsavelId, nome: i.responsavel || '—' }])).values()].filter((r) => r.id);
        if (state.projetos.status !== 'todos' && !state.projetos.statusOptions.includes(state.projetos.status)) state.projetos.status = 'todos';
        if (state.projetos.unidade !== 'todos' && !state.projetos.unidadeOptions.includes(state.projetos.unidade)) state.projetos.unidade = 'todos';
        if (state.projetos.responsavelId !== 'todos' && !state.projetos.responsavelOptions.some((r) => r.id === state.projetos.responsavelId)) state.projetos.responsavelId = 'todos';
        applyProjectFilters();
      } catch {
        if (reqToken !== state.projetos.reqToken) return;
        state.projetos.error = 'load_failed';
      } finally {
        if (reqToken !== state.projetos.reqToken) return;
        state.projetos.loading = false;
        render();
      }
    }

    async function loadProjeto(id) {
      if (!id || state.projeto.loading) return;
      const bridge = global.TelierV2Bridge;
      if (!bridge?.getProjetoSnapshot) {
        state.projeto.error = 'bridge_unavailable';
        return;
      }
      const reqToken = ++state.projeto.reqToken;
      state.projeto.id = id;
      state.projeto.loading = true;
      state.projeto.error = '';
      render();
      try {
        const [projetoRes, tarefasRes] = await Promise.allSettled([
          bridge.getProjetoSnapshot(id),
          bridge.getProjetoTarefasSnapshot?.(id),
        ]);
        const data = projetoRes.status === 'fulfilled' ? projetoRes.value : null;
        if (reqToken !== state.projeto.reqToken) return;
        const tarefasData = tarefasRes.status === 'fulfilled'
          ? normalizeProjetoTarefasSnapshot(tarefasRes.value)
          : { itens: [], parcial: true };
        state.projeto.data = data ? { ...data, tarefas: tarefasData, statusMutations: state.projeto.statusMutations } : null;
        if (!state.projeto.data) state.projeto.error = 'not_found';
      } catch {
        if (reqToken !== state.projeto.reqToken) return;
        state.projeto.error = 'load_failed';
      } finally {
        if (reqToken !== state.projeto.reqToken) return;
        state.projeto.loading = false;
        render();
      }
    }

    async function reloadProjetoTarefas() {
      const bridge = global.TelierV2Bridge;
      const projetoId = state.projeto.id;
      if (!projetoId || !bridge?.getProjetoTarefasSnapshot) return;
      const raw = await bridge.getProjetoTarefasSnapshot(projetoId);
      if (!state.projeto.data) return;
      state.projeto.data = {
        ...state.projeto.data,
        tarefas: normalizeProjetoTarefasSnapshot(raw),
        statusMutations: state.projeto.statusMutations,
      };
      render();
    }

    async function loadTarefa(tarefaId, projectContext = {}) {
      if (!tarefaId) return;
      const bridge = global.TelierV2Bridge;
      if (!bridge?.getTarefaSnapshot) {
        state.tarefa.error = 'bridge_unavailable';
        return;
      }
      const reqToken = ++state.tarefa.reqToken;
      state.tarefa.id = tarefaId;
      state.tarefa.projectId = projectContext?.id || state.projeto.id || '';
      state.tarefa.loading = true;
      state.tarefa.error = '';
      state.tarefa.data = null;
      render();
      try {
        const tarefa = await bridge.getTarefaSnapshot(tarefaId, {
          projetoId: projectContext?.id || state.projeto.id || '',
          projetoNome: projectContext?.nome || state.projeto.data?.nome || 'Projeto',
        });
        if (reqToken !== state.tarefa.reqToken) return;
        state.tarefa.data = tarefa ? normalizeTarefaSnapshot(tarefa) : null;
        if (!state.tarefa.data) state.tarefa.error = 'not_found';
      } catch {
        if (reqToken !== state.tarefa.reqToken) return;
        state.tarefa.error = 'load_failed';
      } finally {
        if (reqToken !== state.tarefa.reqToken) return;
        state.tarefa.loading = false;
        render();
      }
    }

    async function loadHoje() {
      if (state.hoje.loading) return;
      const bridge = global.TelierV2Bridge;
      if (!bridge?.getHojeSnapshot) {
        state.hoje.error = 'bridge_unavailable';
        return;
      }
      const reqToken = ++state.hojeReqToken;
      state.hoje.loading = true;
      state.hoje.error = '';
      render();
      try {
        const snapshot = await bridge.getHojeSnapshot();
        if (reqToken !== state.hojeReqToken) return;
        state.hoje.data = normalizeHojeSnapshot(snapshot);
      } catch {
        if (reqToken !== state.hojeReqToken) return;
        state.hoje.error = 'load_failed';
      } finally {
        if (reqToken !== state.hojeReqToken) return;
        state.hoje.loading = false;
        render();
      }
    }

    async function runAction(action, element) {
      const bridge = global.TelierV2Bridge;
      const snapshot = state.hoje.data || {};
      let result = { ok: false, refresh: false };
      try {
        if (action === 'open-legacy') {
          global.abrirOperacaoLegada?.();
          return;
        }
        if (!bridge?.actions) return;
        if (action === 'open-active-task') result = await bridge.actions.abrirTarefaAtiva(snapshot);
        if (action === 'open-active-project') result = await bridge.actions.abrirProjetoNoLegado(snapshot?.activeTask?.projeto_id);
        if (action === 'start-active-timer') result = await bridge.actions.iniciarOuRetomarCronometro(snapshot);
        if (action === 'stop-active-timer') result = await bridge.actions.pararCronometroAtivo(snapshot);
        if (action === 'open-project') {
          const projetoId = element?.getAttribute('data-v2-project-id');
          state.active = 'projeto';
          loadProjeto(projetoId);
          return;
        }
        if (action === 'open-task-native') {
          const tarefaId = element?.getAttribute('data-v2-task-id');
          const projetoId = element?.getAttribute('data-v2-task-project-id') || state.projeto.id;
          state.active = 'tarefa';
          loadTarefa(tarefaId, { id: projetoId, nome: state.projeto.data?.nome || 'Projeto' });
          return;
        }
        if (action === 'open-current-project') result = await bridge.actions.abrirProjetoNoLegado(element?.getAttribute('data-v2-project-id') || state.projeto.id);
        if (action === 'update-task-status') {
          const tarefaId = element?.getAttribute('data-v2-task-status');
          const novoStatus = element?.value || '';
          if (!tarefaId || !novoStatus) return;
          const tarefaAtual = state.projeto.data?.tarefas?.itens?.find((t) => t.id === tarefaId) || null;
          const statusAnterior = tarefaAtual?.status || '';
          state.projeto.statusMutations[tarefaId] = { loading: true, error: '', previousStatus: statusAnterior };
          render();
          try {
            result = await bridge.actions.atualizarStatusTarefa?.({ tarefaId, status: novoStatus });
            if (!result?.ok) throw new Error('status_failed');
            state.projeto.statusMutations[tarefaId] = { loading: false, error: '' };
            await reloadProjetoTarefas();
          } catch {
            if (element && statusAnterior) element.value = statusAnterior;
            state.projeto.statusMutations[tarefaId] = { loading: false, error: 'status_failed', previousStatus: statusAnterior };
            render();
          }
          return;
        }
        if (action === 'open-task-legacy') {
          const tarefaId = element?.getAttribute('data-v2-task-id') || state.tarefa.id;
          result = await bridge.actions.abrirTarefaNoLegado?.({
            tarefaId,
            projetoId: state.tarefa.projectId || state.tarefa.data?.projeto?.id || state.projeto.id,
          });
        }
        if (action === 'go-projeto') {
          const targetProjectId = state.tarefa.projectId || state.tarefa.data?.projeto?.id || state.projeto.id;
          state.active = 'projeto';
          if (targetProjectId && (!state.projeto.data || state.projeto.id !== targetProjectId)) {
            loadProjeto(targetProjectId);
          } else {
            render();
          }
          return;
        }
        if (action === 'go-projetos') {
          state.active = 'projetos';
          render();
          return;
        }
        if (action === 'clear-proj-filters') {
          state.projetos.search = '';
          state.projetos.status = 'todos';
          state.projetos.unidade = 'todos';
          state.projetos.responsavelId = 'todos';
          applyProjectFilters();
          result = { ok: true, refresh: false };
        }
        if (action === 'open-resume-item') {
          const idx = Number(element?.getAttribute('data-v2-resume-index') || -1);
          const item = Array.isArray(snapshot.resume) ? snapshot.resume[idx] : null;
          if (item) result = await bridge.actions.abrirRetomada(item);
        }
      } finally {
        if (result?.refresh) loadHoje();
      }
    }

    function render() {
      const sectionFactory = sections[state.active] || sections.hoje;
      const sectionHtml = typeof sectionFactory === 'function'
        ? sectionFactory({ hojeState: state.hoje, projetosState: state.projetos, projetoState: state.projeto, tarefaState: state.tarefa })
        : sectionFactory;
      host.innerHTML = `
        <div class="v2-shell">
          <aside class="v2-sidebar">
            <div class="v2-brand">Telier</div>
            <div class="v2-shell-note">v2 visual/estrutural · fase 1</div>
            <nav class="v2-nav">
              ${nav.map((item) => `<button class="v2-nav-btn ${item.id === state.active ? 'is-active' : ''}" data-nav="${item.id}">${item.label}</button>`).join('')}
            </nav>
          </aside>
          <main class="v2-main">
            <header class="v2-header">
              <div>
                <div class="v2-title">${nav.find((n) => n.id === state.active)?.label || 'Hoje'}</div>
                <div class="v2-subtitle">Shell estrutural da v2 (fase 1) com contingência reversível para o legado</div>
              </div>
              <div class="v2-controls">
                ${components.button({ label: 'Voltar ao legado', onClick: 'abrirOperacaoLegada()' })}
                ${components.button({ label: 'Sair', onClick: 'fazerLogout()' })}
              </div>
            </header>
            <div class="v2-grid">${sectionHtml}</div>
          </main>
        </div>
      `;

      host.querySelectorAll('[data-nav]').forEach((btn) => btn.addEventListener('click', () => navigate(btn.getAttribute('data-nav'))));
      host.querySelectorAll('[data-v2-action="refresh-hoje"]').forEach((btn) => btn.addEventListener('click', () => loadHoje()));
      host.querySelectorAll('[data-v2-action="refresh-projetos"]').forEach((btn) => btn.addEventListener('click', () => loadProjetos()));

      host.querySelectorAll('[data-v2-proj="search"]').forEach((el) => el.addEventListener('input', () => { state.projetos.search = el.value || ''; applyProjectFilters(); render(); }));
      host.querySelectorAll('[data-v2-proj="status"]').forEach((el) => el.addEventListener('change', () => { state.projetos.status = el.value || 'todos'; applyProjectFilters(); render(); }));
      host.querySelectorAll('[data-v2-proj="unidade"]').forEach((el) => el.addEventListener('change', () => { state.projetos.unidade = el.value || 'todos'; applyProjectFilters(); render(); }));
      host.querySelectorAll('[data-v2-proj="responsavel"]').forEach((el) => el.addEventListener('change', () => { state.projetos.responsavelId = el.value || 'todos'; applyProjectFilters(); render(); }));
      host.querySelectorAll('[data-v2-task-status]').forEach((el) => {
        el.addEventListener('change', () => runAction('update-task-status', el));
      });

      host.querySelectorAll('[data-v2-action]').forEach((btn) => {
        if (['refresh-hoje', 'refresh-projetos'].includes(btn.getAttribute('data-v2-action'))) return;
        btn.addEventListener('click', () => runAction(btn.getAttribute('data-v2-action'), btn));
      });
    }

    function navigate(sectionId) {
      state.active = sectionId;
      render();
      if (sectionId === 'hoje' && !state.hoje.data && !state.hoje.loading) loadHoje();
      if (sectionId === 'projetos' && !state.projetos.all.length && !state.projetos.loading) loadProjetos();
    }

    root.shell.appShell = { navigate, render, loadHoje, loadProjetos };
    render();
    loadHoje();

    if (config?.onReady) config.onReady();
  }

  root.shell.appShell = root.shell.appShell || { initAppShell };
  root.shell.appShell.initAppShell = initAppShell;
})(window);
