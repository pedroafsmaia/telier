// ── ADMIN ──
import {
  USUARIOS, ADMIN_TEMPO_FILTRO,
  setUsuarios, setAdminTempoFiltro,
} from './state.js';
import { req } from './api.js';
import { toast, abrirModal, fecharModal, btnLoading, setBreadcrumb, setShellView } from './ui.js';
import { esc, gv, avatar, tag, fmtHoras, isAdmin, csvEsc, tempoDesde } from './utils.js';

export async function abrirCentralAdmin(aba = 'agora') {
  if (!isAdmin()) {
    toast('Disponível apenas no perfil admin', 'err');
    return;
  }
  const { setProjeto } = await import('./state.js');
  setProjeto(null);
  setShellView('admin');
  document.title = 'Central Admin · Telier';
  setBreadcrumb([
    { label: 'Admin', onClick: 'abrirCentralAdmin()' },
    { label: 'Central' },
  ]);

  const c = document.getElementById('content');
  c.innerHTML = `
    <div class="admin-wrap admin-shell">
      <div class="admin-head admin-shell-head">
        <div class="section-kicker">Administração</div>
        <div class="admin-title">Central admin</div>
        <div class="admin-note">Gestão de usuários, projetos, tarefas e tempo.</div>
      </div>
      <div class="admin-tabs admin-tabs-rail">
        <button class="admin-tab ${aba==='agora'?'ativo':''}" onclick="abrirCentralAdmin('agora')">Agora</button>
        <button class="admin-tab ${aba==='usuarios'?'ativo':''}" onclick="abrirCentralAdmin('usuarios')">Usuários</button>
        <button class="admin-tab ${aba==='projetos'?'ativo':''}" onclick="abrirCentralAdmin('projetos')">Projetos</button>
        <button class="admin-tab ${aba==='tempo'?'ativo':''}" onclick="abrirCentralAdmin('tempo')">Tempo</button>
        <button class="admin-tab ${aba==='grupos'?'ativo':''}" onclick="abrirCentralAdmin('grupos')">Grupos</button>
      </div>
      <div id="admin-body" class="admin-body"><div class="loading"><div class="spinner"></div> Carregando painel admin...</div></div>
    </div>`;

  const body = document.getElementById('admin-body');
  try {
    if (aba === 'agora') {
      const ativas = await req('GET', '/admin/agora');
      const kpi = `
        <div class="admin-grid">
          <div class="admin-kpi"><div class="admin-kpi-label">Cronômetros Ativos</div><div class="admin-kpi-val">${ativas.length}</div></div>
          <div class="admin-kpi"><div class="admin-kpi-label">Usuários Ativos Agora</div><div class="admin-kpi-val">${new Set(ativas.map(a=>a.usuario_id)).size}</div></div>
        </div>`;
      const rows = ativas.map(a => `
        <tr>
          <td>${avatar(a.usuario_nome,'avatar-sm')} ${esc(a.usuario_nome)}</td>
          <td>${esc(a.projeto_nome)}</td>
          <td>${esc(a.tarefa_nome)}</td>
          <td>${tag(a.tarefa_status)}</td>
          <td class="mono">${tempoDesde(a.inicio)}</td>
          <td><button class="btn btn-sm" onclick="abrirProjeto('${a.projeto_id}')">Abrir</button></td>
        </tr>`).join('');
      body.innerHTML = `
        <div class="section-shell admin-section">
          <div class="section-head">
            <div>
              <div class="section-kicker">Monitoramento</div>
              <div class="section-title">Atividade em curso</div>
            </div>
          </div>
          ${kpi}
        </div>
        <div class="admin-table-wrap admin-section admin-section-spaced">
          <table>
            <thead><tr><th>Usuário</th><th>Projeto</th><th>Tarefa</th><th>Status</th><th>Tempo ativo</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="6" class="table-empty">Sem atividade no momento.</td></tr>`}</tbody>
          </table>
        </div>
        <div class="admin-cards admin-section">
          ${ativas.map(a => `
            <div class="admin-card">
              <div class="admin-card-title">${avatar(a.usuario_nome,'avatar-sm')} ${esc(a.usuario_nome)}</div>
              <div class="admin-card-meta">
                <span>${esc(a.tarefa_nome)}</span>
                <span>${esc(a.projeto_nome)}</span>
                <span class="mono">${tempoDesde(a.inicio)}</span>
              </div>
            </div>`).join('')}
        </div>
        <div id="timeline-hoje-wrap" class="admin-section admin-timeline-wrap"></div>`;
      renderTimelineHoje(document.getElementById('timeline-hoje-wrap'));
      return;
    }

    if (aba === 'usuarios') {
      const usuarios = await req('GET', '/admin/usuarios');
      const rows = usuarios.map(u => `
        <tr>
          <td>${avatar(u.nome,'avatar-sm')} ${esc(u.nome)} <span class="inline-user-handle">@${esc(u.usuario_login)}</span></td>
          <td>${tag(u.papel === 'admin' ? 'Admin' : 'Membro', u.papel === 'admin' ? 'tag-purple' : 'tag-gray')}</td>
          <td class="mono">${(parseInt(u.projetos_como_dono)||0) + (parseInt(u.projetos_como_editor)||0)}</td>
          <td class="mono">${parseInt(u.tarefas_em_andamento)||0}</td>
          <td class="mono">${fmtHoras(Number(u.horas_totais||0))}</td>
          <td><button class="btn btn-sm" onclick="abrirUsuarioAdmin('${u.id}')">Detalhes</button></td>
        </tr>`).join('');
      body.innerHTML = `
        <div class="section-shell admin-section">
          <div class="section-head">
            <div>
              <div class="section-kicker">Usuários</div>
              <div class="section-title">Base de acesso</div>
            </div>
          </div>
        </div>
        <div class="admin-table-wrap admin-section">
          <table>
            <thead><tr><th>Usuário</th><th>Papel</th><th>Projetos no dashboard</th><th>Em andamento</th><th>Horas totais</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="6" class="table-empty">Nenhum usuário.</td></tr>`}</tbody>
          </table>
        </div>
        <div class="admin-cards admin-section">
          ${usuarios.map(u => `
            <div class="admin-card">
              <div class="admin-card-title">${avatar(u.nome,'avatar-sm')} ${esc(u.nome)} ${tag(u.papel === 'admin' ? 'Admin' : 'Membro', u.papel === 'admin' ? 'tag-purple' : 'tag-gray')}</div>
              <div class="admin-card-meta">
                <span>${(parseInt(u.projetos_como_dono)||0)+(parseInt(u.projetos_como_editor)||0)} projetos</span>
                <span>${parseInt(u.tarefas_em_andamento)||0} em andamento</span>
                <span class="mono">${fmtHoras(Number(u.horas_totais||0))}</span>
              </div>
            </div>`).join('')}
        </div>`;
      return;
    }

    if (aba === 'projetos') {
      const projetos = await req('GET', '/admin/projetos');
      const rows = projetos.map(p => {
        const total = parseInt(p.total_tarefas) || 0;
        const concl = parseInt(p.tarefas_concluidas) || 0;
        const pct = total ? Math.round((concl / total) * 100) : 0;
        return `
          <tr>
            <td>${esc(p.nome)}</td>
            <td>${esc(p.dono_nome||'—')}</td>
            <td>${tag(p.status)}</td>
            <td class="mono">${concl}/${total} (${pct}%)</td>
            <td class="mono">${fmtHoras(Number(p.horas_totais||0))}</td>
            <td><button class="btn btn-sm" onclick="abrirProjeto('${p.id}')">Abrir</button></td>
          </tr>`;
      }).join('');
      body.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Projeto</th><th>Origem</th><th>Status</th><th>Progresso</th><th>Horas</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="6" class="table-empty">Nenhum projeto.</td></tr>`}</tbody>
          </table>
        </div>`;
      return;
    }

    if (aba === 'tempo') {
      const usuarios = await req('GET', '/admin/usuarios');
      const q = new URLSearchParams();
      if (ADMIN_TEMPO_FILTRO.de) q.set('de', ADMIN_TEMPO_FILTRO.de);
      if (ADMIN_TEMPO_FILTRO.ate) q.set('ate', ADMIN_TEMPO_FILTRO.ate);
      if (ADMIN_TEMPO_FILTRO.usuario_id) q.set('usuario_id', ADMIN_TEMPO_FILTRO.usuario_id);
      const linhas = await req('GET', `/admin/tempo${q.toString() ? `?${q.toString()}` : ''}`);
      const total = linhas.reduce((s, l) => s + (parseFloat(l.horas_liquidas)||0), 0);
      const rows = linhas.map(l => `
        <tr>
          <td>${esc(l.usuario_nome)}</td>
          <td>${esc(l.projeto_nome)}</td>
          <td>${esc(l.tarefa_nome)}</td>
          <td class="mono">${fmtHoras(Number(l.horas_liquidas||0))}</td>
        </tr>`).join('');
      body.innerHTML = `
        <div class="section-shell admin-section">
          <div class="section-head">
            <div>
              <div class="section-kicker">Tempo</div>
              <div class="section-title">Registros líquidos</div>
            </div>
          </div>
        </div>
        <div class="admin-tools admin-section">
          <div class="tool-field">
            <label>Usuário</label>
            <select id="adm-usuario">
              <option value="">Todos</option>
              ${usuarios.map(u => `<option value="${u.id}" ${ADMIN_TEMPO_FILTRO.usuario_id === u.id ? 'selected' : ''}>${esc(u.nome)} (@${esc(u.usuario_login)})</option>`).join('')}
            </select>
          </div>
          <div class="tool-field">
            <label>De</label>
            <input type="date" id="adm-de" value="${esc(ADMIN_TEMPO_FILTRO.de)}">
          </div>
          <div class="tool-field">
            <label>Até</label>
            <input type="date" id="adm-ate" value="${esc(ADMIN_TEMPO_FILTRO.ate)}">
          </div>
          <button class="btn btn-sm" onclick="aplicarFiltroTempoAdmin()">Aplicar</button>
          <button class="btn btn-sm" onclick="limparFiltroTempoAdmin()">Limpar</button>
          <button class="btn btn-sm btn-primary" onclick="exportarTempoAdminCSV()">Exportar CSV</button>
        </div>
        <div class="admin-grid admin-section admin-section-blockend">
          <div class="admin-kpi"><div class="admin-kpi-label">Horas líquidas registradas</div><div class="admin-kpi-val">${fmtHoras(total)}</div></div>
          <div class="admin-kpi"><div class="admin-kpi-label">Itens de tempo</div><div class="admin-kpi-val">${linhas.length}</div></div>
        </div>
        <div class="admin-table-wrap admin-section">
          <table>
            <thead><tr><th>Usuário</th><th>Projeto</th><th>Tarefa</th><th>Horas</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="4" class="table-empty">Nenhum registro de tempo.</td></tr>`}</tbody>
          </table>
        </div>
        <div class="admin-cards admin-section">
          ${linhas.map(l => `
            <div class="admin-card">
              <div class="admin-card-title">${esc(l.projeto_nome)} · ${esc(l.tarefa_nome)}</div>
              <div class="admin-card-meta">
                <span>${esc(l.usuario_nome)}</span>
                <span class="mono">${fmtHoras(Number(l.horas_liquidas||0))}</span>
              </div>
            </div>`).join('')}
        </div>`;
      return;
    }

    if (aba === 'grupos') {
      const q = new URLSearchParams();
      if (ADMIN_TEMPO_FILTRO.de) q.set('de', ADMIN_TEMPO_FILTRO.de);
      if (ADMIN_TEMPO_FILTRO.ate) q.set('ate', ADMIN_TEMPO_FILTRO.ate);
      const dados = await req('GET', `/admin/horas-por-grupo${q.toString() ? '?' + q.toString() : ''}`);
      const totalGeral = dados.reduce((s, d) => s + parseFloat(d.horas_liquidas || 0), 0);
      const maxHoras = Math.max(...dados.map(d => parseFloat(d.horas_liquidas || 0)), 1);
      const rows = dados.map(d => {
        const h = parseFloat(d.horas_liquidas || 0);
        const pct = Math.round((h / maxHoras) * 100);
        return `<tr>
          <td>${esc(d.grupo_nome)}</td>
          <td class="mono">${fmtHoras(h)}</td>
          <td class="admin-bar-cell">
            <div class="admin-bar-track">
              <div class="admin-bar-fill" style="width:${pct}%"></div>
            </div>
          </td>
        </tr>`;
      }).join('');
      body.innerHTML = `
        <div class="admin-tools admin-section-blockend">
          <div class="tool-field"><label>De</label><input type="date" id="adm-de" value="${esc(ADMIN_TEMPO_FILTRO.de)}"></div>
          <div class="tool-field"><label>Até</label><input type="date" id="adm-ate" value="${esc(ADMIN_TEMPO_FILTRO.ate)}"></div>
          <button class="btn btn-sm" onclick="aplicarFiltroTempoAdmin();abrirCentralAdmin('grupos')">Aplicar</button>
          <button class="btn btn-sm" onclick="limparFiltroTempoAdmin();abrirCentralAdmin('grupos')">Limpar</button>
        </div>
        <div class="admin-grid admin-section-blockend">
          <div class="admin-kpi">
            <div class="admin-kpi-label">Total geral</div>
            <div class="admin-kpi-val">${fmtHoras(totalGeral)}</div>
          </div>
          <div class="admin-kpi">
            <div class="admin-kpi-label">Grupos com registro</div>
            <div class="admin-kpi-val">${dados.length}</div>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Grupo</th><th>Horas líquidas</th><th>Proporção</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="table-empty">Sem registros no período.</td></tr>'}</tbody>
          </table>
        </div>`;
      return;
    }

  } catch (e) {
    body.innerHTML = `<div class="text-danger admin-feedback">${esc(e.message)}</div>`;
  }
}

export async function renderTimelineHoje(el) {
  if (!el) return;
  el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const rows = await req('GET', '/admin/timeline-hoje');
    if (!el.isConnected) return;
    if (!rows.length) {
      el.innerHTML = `<div style="color:var(--text-muted);padding:16px">Sem sessões registradas hoje.</div>`;
      return;
    }
    const START = 480, RANGE = 720;
    const byUser = {};
    rows.forEach(r => {
      (byUser[r.usuario_id] = byUser[r.usuario_id] || { nome: r.usuario_nome, sessions: [] })
        .sessions.push(r);
    });
    const rowsHtml = Object.values(byUser).map(u => {
      const blocks = u.sessions.map(s => {
        const startMin = new Date(s.inicio.replace(' ', 'T') + 'Z').getHours() * 60
                        + new Date(s.inicio.replace(' ', 'T') + 'Z').getMinutes();
        const endMin   = s.fim
          ? new Date(s.fim.replace(' ', 'T') + 'Z').getHours() * 60
            + new Date(s.fim.replace(' ', 'T') + 'Z').getMinutes()
          : (new Date().getHours() * 60 + new Date().getMinutes());
        const left  = Math.max(0, Math.min(100, (startMin - START) / RANGE * 100));
        const width = Math.max(0.5, Math.min(100 - left, (endMin - startMin) / RANGE * 100));
        return `<div class="tl-block" style="left:${left}%;width:${width}%;
          background:${s.fim ? 'var(--accent)' : 'var(--green)'};opacity:.8"
          title="${esc(s.tarefa_nome)}"></div>`;
      }).join('');
      const totalH = (u.sessions.reduce((sum, s) => {
        const dur = s.fim
          ? (new Date(s.fim.replace(' ','T') + 'Z') - new Date(s.inicio.replace(' ','T') + 'Z')) / 3600000
          : (Date.now() - new Date(s.inicio.replace(' ','T') + 'Z')) / 3600000;
        return sum + dur;
      }, 0)).toFixed(1);
      return `<div class="tl-row">
        <div class="tl-name">${esc(u.nome)}</div>
        <div class="tl-track">${blocks}</div>
        <div class="tl-hours">${fmtHoras(parseFloat(totalH))}</div>
      </div>`;
    }).join('');
    const axis = ['08h','10h','12h','14h','16h','18h','20h']
      .map(h => `<span>${h}</span>`).join('');
    el.innerHTML = `
      <div class="timeline-wrap">${rowsHtml}</div>
      <div class="tl-axis">${axis}</div>`;
  } catch (err) {
    if (!el?.isConnected) return;
    el.innerHTML = `<div class="error-block">${esc(err.message)}</div>`;
  }
}

export async function exportarTempoAdminCSV() {
  try {
    const q = new URLSearchParams();
    if (ADMIN_TEMPO_FILTRO.de) q.set('de', ADMIN_TEMPO_FILTRO.de);
    if (ADMIN_TEMPO_FILTRO.ate) q.set('ate', ADMIN_TEMPO_FILTRO.ate);
    if (ADMIN_TEMPO_FILTRO.usuario_id) q.set('usuario_id', ADMIN_TEMPO_FILTRO.usuario_id);
    const linhas = await req('GET', `/admin/tempo${q.toString() ? `?${q.toString()}` : ''}`);
    const header = ['usuario_nome', 'projeto_nome', 'tarefa_nome', 'horas_liquidas'];
    const out = [header.join(';')];
    linhas.forEach(l => {
      out.push([
        csvEsc(l.usuario_nome),
        csvEsc(l.projeto_nome),
        csvEsc(l.tarefa_nome),
        csvEsc(Number(l.horas_liquidas || 0).toFixed(2)),
      ].join(';'));
    });
    const blob = new Blob([out.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const deTag = ADMIN_TEMPO_FILTRO.de || 'inicio';
    const ateTag = ADMIN_TEMPO_FILTRO.ate || 'hoje';
    a.href = url;
    a.download = `telier_tempo_${deTag}_${ateTag}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('CSV exportado');
  } catch (e) {
    toast(e.message, 'err');
  }
}

export function aplicarFiltroTempoAdmin() {
  ADMIN_TEMPO_FILTRO.usuario_id = gv('adm-usuario') || '';
  ADMIN_TEMPO_FILTRO.de = gv('adm-de') || '';
  ADMIN_TEMPO_FILTRO.ate = gv('adm-ate') || '';
  abrirCentralAdmin('tempo');
}

export function limparFiltroTempoAdmin() {
  setAdminTempoFiltro({ de: '', ate: '', usuario_id: '' });
  abrirCentralAdmin('tempo');
}

export async function abrirUsuarioAdmin(usuarioId) {
  try {
    const d = await req('GET', `/admin/usuarios/${usuarioId}`);
    const projList = d.projetos_dashboard.map(p => `<div class="tag tag-gray inline-tag-wrap">${esc(p.nome)} · ${esc(p.papel_no_projeto)}</div>`).join('') || '<div class="inline-muted-sm">Sem projetos no dashboard.</div>';
    const tarefas = d.tarefas.slice(0, 12).map(t => `<tr><td>${esc(t.projeto_nome)}</td><td>${esc(t.nome)}</td><td>${tag(t.status)}</td><td>${esc(t.papel_na_tarefa)}</td></tr>`).join('');
    const tempoTop = d.tempo_por_tarefa.slice(0, 8).map(t => `<tr><td>${esc(t.projeto_nome)}</td><td>${esc(t.tarefa_nome)}</td><td class="mono">${fmtHoras(Number(t.horas_liquidas||0))}</td></tr>`).join('');
    abrirModal(`
      <h2>Usuário: ${esc(d.usuario.nome)}</h2>
      <div class="inline-muted-sm" style="margin-bottom:12px">@${esc(d.usuario.usuario_login)} · ${esc(d.usuario.papel)}</div>
      <div class="form-row"><label>Projetos no dashboard</label><div style="display:flex;flex-wrap:wrap">${projList}</div></div>
      <div class="form-row"><label>Tarefas (até 12)</label>
        <div class="table-wrap"><table><thead><tr><th>Projeto</th><th>Tarefa</th><th>Status</th><th>Papel</th></tr></thead><tbody>${tarefas || '<tr><td colspan="4" class="table-empty-sm">Sem tarefas.</td></tr>'}</tbody></table></div>
      </div>
      <div class="form-row"><label>Tempo por tarefa (top 8)</label>
        <div class="table-wrap"><table><thead><tr><th>Projeto</th><th>Tarefa</th><th>Horas</th></tr></thead><tbody>${tempoTop || '<tr><td colspan="3" class="table-empty-sm">Sem registros.</td></tr>'}</tbody></table></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="modalResetSenhaUsuario('${d.usuario.id}','${esc(d.usuario.nome)}')">Redefinir senha</button>
        <button class="btn" onclick="fecharModal()">Fechar</button>
      </div>
    `, { lg: true });
  } catch (e) {
    toast(e.message, 'err');
  }
}

export function modalNovoColega() {
  if (!isAdmin()) {
    toast('Disponível apenas no perfil admin', 'err');
    return;
  }
  if (!USUARIOS.length) {
    toast('Carregando usuários...');
  }
  req('GET', '/usuarios').then(lista => {
    setUsuarios(lista);
    const candidatos = USUARIOS.filter(u => u.papel !== 'admin');
    if (!candidatos.length) {
      abrirModal(`
        <h2>Cadastrar admin</h2>
        <p class="modal-copy-tight">Todos os usuários registrados já possuem cargo de admin.</p>
        <div class="modal-footer"><button class="btn" onclick="fecharModal()">Fechar</button></div>`);
      return;
    }

    abrirModal(`
      <h2>Cadastrar admin</h2>
      <p class="modal-copy">Selecione um usuário já registrado para atribuir cargo de admin.</p>
      <div class="form-row"><label>Usuário registrado</label>
        <select id="m-admin" style="width:100%">${candidatos.map(u => `<option value="${u.id}">${esc(u.nome)} (@${esc(u.usuario_login)})</option>`).join('')}</select>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" id="btn-prom-admin" onclick="promoverAdmin()">Atribuir admin</button>
      </div>`);
  }).catch(e => toast(e.message, 'err'));
}

export async function promoverAdmin() {
  const uid = gv('m-admin');
  if (!uid) return;
  btnLoading('btn-prom-admin', true);
  try {
    await req('PUT', `/usuarios/${uid}/papel`, { papel: 'admin' });
    setUsuarios([]);
    fecharModal();
    toast('Cargo de admin atribuído com sucesso');
  } catch (e) {
    toast(e.message, 'err');
    btnLoading('btn-prom-admin', false);
  }
}

export function modalNovoColega_legacy() {
  abrirModal(`
    <h2>Cadastrar usuário</h2>
    <p class="modal-copy">Cria um usuário global do sistema. Depois, adicione esse usuário em cada projeto pelo botão "Adicionar colega".</p>
    <div class="form-row"><label>Nome completo</label><input id="m-nome" placeholder="Ex: Ana Souza"></div>
    <div class="form-row"><label>Usuário</label><input type="text" id="m-email" placeholder="ex: ana_souza" autocomplete="off"></div>
    <div class="form-row"><label>Senha</label><input type="password" id="m-senha" placeholder="Defina a senha inicial"></div>
    <div class="modal-footer">
      <button class="btn" onclick="fecharModal()">Cancelar</button>
      <button class="btn btn-primary" id="btn-criar-col" onclick="criarColega()">Cadastrar admin</button>
    </div>`);
}

export async function criarColega() {
  const nome = gv('m-nome').trim();
  const usuario_login_novo = gv('m-email').trim();
  const senha = gv('m-senha');
  if (!nome||!usuario_login_novo||!senha) { toast('Preencha todos os campos', 'err'); return; }
  btnLoading('btn-criar-col', true);
  try {
    await req('POST', '/usuarios', { nome, usuario_login: usuario_login_novo, senha, papel: 'membro' });
    setUsuarios([]);
    fecharModal(); toast('Usuário cadastrado com sucesso');
  } catch (e) { toast(e.message, 'err'); btnLoading('btn-criar-col', false); }
}
