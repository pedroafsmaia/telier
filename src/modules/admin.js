// ── ADMIN MODULE ──

import { req } from './api.js';
import { toast, fecharModal } from './ui.js';
import { esc, fmtHoras } from './utils.js';

async function renderAbaUsuarios() {
  const usuarios = await req('GET', '/admin/usuarios').catch(() => req('GET', '/usuarios'));
  return `<div><div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary" onclick="modalNovoColega()">+ Cadastrar colega</button></div><div class="sessoes-list">${usuarios.map(u => `<div class="sessao-item" style="display:flex;justify-content:space-between;gap:12px"><div><strong>${esc(u.nome)}</strong><div class="muted-detail">@${esc(u.usuario_login || '')} · ${esc(u.papel || 'membro')}</div><div class="muted-detail">Projetos: ${u.projetos_como_dono ?? '-'} · Tarefas: ${u.tarefas_como_dono ?? '-'}</div></div><div style="display:flex;align-items:center;gap:8px">${u.horas_totais != null ? `<span class="tag tag-gray">${fmtHoras(Number(u.horas_totais))}</span>` : ''}<button class="btn btn-sm" onclick="abrirUsuarioAdmin('${u.id}')">Detalhes</button></div></div>`).join('')}</div></div>`;
}

async function renderAbaTempo() {
  const ativas = await req('GET', '/admin/agora').catch(() => []);
  return ativas.length
    ? `<div class="sessoes-list">${ativas.map(a => `<div class="sessao-item"><strong>${esc(a.usuario_nome)}</strong> · ${esc(a.projeto_nome)} / ${esc(a.tarefa_nome)}<div class="muted-detail">Início: ${esc(a.inicio)}</div></div>`).join('')}</div>`
    : '<div class="empty-small">Nenhuma sessão ativa no momento</div>';
}

export async function abrirCentralAdmin(aba = 'usuarios') {
  try {
    const content = aba === 'tempo' ? await renderAbaTempo() : await renderAbaUsuarios();
    document.getElementById('content').innerHTML = `<div class="admin-panel"><h1>Central de Administração</h1><div class="admin-nav"><button class="admin-nav-btn ${aba === 'usuarios' ? 'ativo' : ''}" onclick="abrirCentralAdmin('usuarios')">Usuários</button><button class="admin-nav-btn ${aba === 'tempo' ? 'ativo' : ''}" onclick="abrirCentralAdmin('tempo')">Tempo em andamento</button></div><div id="admin-content">${content}</div></div>`;
  } catch (e) {
    toast(e.message, 'erro');
  }
}

export async function abrirUsuarioAdmin(usuarioId) {
  try {
    const data = await req('GET', `/admin/usuarios/${usuarioId}`);
    const html = `<div><h3>${esc(data.usuario.nome)}</h3><div class="muted-detail">@${esc(data.usuario.usuario_login)} · ${esc(data.usuario.papel)}</div><h4 style="margin-top:12px">Projetos</h4><ul>${(data.projetos_dashboard || []).map(p => `<li>${esc(p.nome)} (${esc(p.status)})</li>`).join('') || '<li>Nenhum</li>'}</ul><h4>Tarefas</h4><ul>${(data.tarefas || []).slice(0, 10).map(t => `<li>${esc(t.nome)} · ${esc(t.projeto_nome)}</li>`).join('') || '<li>Nenhuma</li>'}</ul></div>`;
    window.abrirModal?.(html, { titulo: 'Detalhes do usuário' });
  } catch (e) {
    toast(e.message, 'erro');
  }
}

export async function exportarTempoAdminCSV() {
  try {
    const rows = await req('GET', '/admin/tempo');
    const header = ['usuario', 'projeto', 'tarefa', 'inicio', 'fim', 'horas_liquidas'];
    const csv = [header.join(',')].concat(rows.map(r => [r.usuario_nome, r.projeto_nome, r.tarefa_nome, r.inicio, r.fim || '', r.horas_liquidas || ''].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'admin-tempo.csv';
    a.click();
  } catch (e) {
    toast(e.message, 'erro');
  }
}

export async function modalNovoColega() {
  const html = `<form id="form-novo-colega" class="form-grid"><input name="nome" placeholder="Nome" required><input name="usuario_login" placeholder="Login" required><input name="senha" type="password" minlength="8" placeholder="Senha inicial" required><select name="papel"><option value="membro">membro</option><option value="admin">admin</option></select><button class="btn btn-primary" type="submit">Cadastrar</button></form>`;
  const overlay = window.abrirModal?.(html, { titulo: 'Cadastrar Colega' });
  overlay?.querySelector('#form-novo-colega')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await req('POST', '/usuarios', Object.fromEntries(new FormData(e.currentTarget).entries()));
      fecharModal();
      toast('Colega cadastrado', 'ok');
      abrirCentralAdmin('usuarios');
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}

if (typeof window !== 'undefined') {
  window.abrirCentralAdmin = abrirCentralAdmin;
  window.abrirUsuarioAdmin = abrirUsuarioAdmin;
  window.exportarTempoAdminCSV = exportarTempoAdminCSV;
  window.modalNovoColega = modalNovoColega;
}
