// ── UTILS ──
import {
  EU, ADMIN_MODE, PROJETO,
  TAREFAS, FILTRO_ORIGEM_TAREFAS, BUSCA_TAREFA, FILTRO_RESP_TAR, FILTRO_STATUS_TAREFA,
  TIMERS,
} from './state.js';

export function isAdminRole() { return EU?.papel === 'admin'; }
export function isAdmin() { return isAdminRole() && ADMIN_MODE === 'admin'; }
export function souDono(donoId) { return EU?.id === donoId || isAdmin(); }
export function podeEditar(proj) {
  if (!proj) return false;
  if (!isAdmin()) {
    const statusProj = normalizarStatusProjeto(proj.status);
    const statusGrupo = proj.grupo_status || null;
    if (statusProj === 'Arquivado') return false;
    if (statusGrupo === 'Arquivado') return false;
  }
  if (souDono(proj.dono_id)) return true;
  return (proj.editores || []).some(e => e.usuario_id === EU?.id);
}

export function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
export function iniciais(nome) { return (nome||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
export function avatarCor(nome) {
  const cores = ['#7c6af7','#4a9eff','#3ecf8e','#f5c542','#f0834a','#f25b5b'];
  let h = 0; for (const c of nome||'') h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return cores[Math.abs(h) % cores.length];
}
export function avatar(nome, size = '') {
  const cor = avatarCor(nome);
  return `<div class="avatar ${size}" style="background:${cor}20;color:${cor}">${iniciais(nome)}</div>`;
}
export function prazoFmt(prazo, curto = false) {
  if (!prazo) return null;
  const d = new Date(prazo + 'T00:00:00');
  if (curto) return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}
export function diasRestantes(prazo) {
  if (!prazo) return null;
  return Math.ceil((new Date(prazo + 'T00:00:00') - new Date()) / 86400000);
}

// TAGS
export const ST = { 'Arquivado':'tag-gray', 'Em andamento':'tag-blue','Concluída':'tag-green','Concluído':'tag-green','Bloqueada':'tag-red','A fazer':'tag-gray','Em revisão':'tag-yellow','Pausado':'tag-gray' };
export const PT = { 'Alta':'tag-orange','Média':'tag-yellow','Baixa':'tag-green' };
export const DT = { 'Simples':'tag-green','Moderada':'tag-yellow','Complexa':'tag-orange' };
export const FT = { 'Estudo preliminar':'tag-purple','Anteprojeto':'tag-blue','Projeto básico':'tag-sky','Projeto executivo':'tag-cyan','Em obra':'tag-green' };
export const PO = { 'Alta':0,'Média':1,'Baixa':2 };
export const DO = { 'Complexa':0,'Moderada':1,'Simples':2 };

export function tag(t, cls, lbl) { return `<span class="tag ${cls||ST[t]||'tag-gray'}"${lbl?' title="'+esc(lbl)+'"':''}>${esc(t)}</span>`; }
export function normalizarStatusProjeto(status) {
  if (status === 'Concluída') return 'Concluído';
  if (status === 'Aguardando aprovação') return 'Em revisão'; // backward compat
  return status;
}
export function projetoConcluido(status) {
  const s = normalizarStatusProjeto(status);
  return s === 'Concluído';
}

export function fmtDuracao(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  return h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function fmtHoras(horas) {
  const totalMin = Math.round((horas || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

export function fmtDatetime(iso) {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDatetimeInput(iso) {
  if (!iso) return '';
  return (iso.replace(' ', 'T') + 'Z').replace('Z','').slice(0,16);
}

export function agora() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function csvEsc(v) {
  const s = String(v ?? '');
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function tempoDesde(inicio) {
  if (!inicio) return '—';
  const seg = Math.max(0, Math.floor((Date.now() - new Date(inicio.replace(' ', 'T') + 'Z').getTime()) / 1000));
  return fmtDuracao(seg);
}

export function tarefaCompartilhadaComigo(t) {
  if (!t || !EU?.id) return false;
  return t.dono_id !== EU.id && (t.colaboradores_ids || []).includes(EU.id);
}

export function filtrarColecaoTarefas(tarefas, opts = {}) {
  let lista = [...(tarefas || [])];
  const origem = opts.origem ?? FILTRO_ORIGEM_TAREFAS;
  const busca = typeof opts.busca === 'string' ? opts.busca : BUSCA_TAREFA;
  const responsavel = opts.responsavel ?? FILTRO_RESP_TAR;
  const status = opts.status ?? FILTRO_STATUS_TAREFA;

  if (origem === 'meus') lista = lista.filter(t => t.dono_id === EU?.id);
  else if (origem === 'compartilhadas') lista = lista.filter(t => tarefaCompartilhadaComigo(t));
  if (responsavel) lista = lista.filter(t => t.dono_id === responsavel);
  if (status && status !== 'todos') lista = lista.filter(t => t.status === status);
  if (busca) lista = lista.filter(t => (t.nome || '').toLowerCase().includes(busca.toLowerCase()));
  return lista;
}

export function normalizarColaboradoresTarefas(tarefas) {
  return (tarefas || []).map(t => ({
    ...t,
    colaboradores_ids: t.colaboradores_ids_raw
      ? t.colaboradores_ids_raw.split(',').filter(Boolean)
      : [],
    colaboradores_nomes: t.colaboradores_nomes_raw
      ? t.colaboradores_nomes_raw.split('||').filter(Boolean)
      : [],
  }));
}

export function grupoProgressToneClass(pctConcl, atrasados) {
  if (pctConcl === 100) return 'is-done';
  if (atrasados) return 'is-alert';
  return '';
}

export function grupoStatusToneClass(status) {
  if (status === 'Pausado') return 'is-paused';
  if (status === 'Arquivado') return 'is-muted';
  if (status === 'Concluído') return 'is-done';
  return '';
}

export function projetoArquivadoNoDash(proj) {
  if (!proj) return false;
  return normalizarStatusProjeto(proj.status) === 'Arquivado' || (proj.grupo_status || '') === 'Arquivado';
}

export function detalhesTaskKey(tarefaId) {
  return `telier_tarefa_detalhes_${tarefaId}`;
}

export function listarDetalhesTarefa(tarefaId) {
  try {
    const raw = localStorage.getItem(detalhesTaskKey(tarefaId));
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
      if (typeof item === 'string') return { text: item.trim(), done: false };
      if (item && typeof item.text === 'string') return { text: item.text.trim(), done: !!item.done };
      return null;
    }).filter(item => item && item.text);
  } catch {
    return [];
  }
}

export function salvarDetalhesTarefa(tarefaId, itens) {
  localStorage.setItem(detalhesTaskKey(tarefaId), JSON.stringify(itens));
}

export function sel(id, opts, val) {
  return `<select id="${id}">${opts.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
}
export function gv(id) { return document.getElementById(id)?.value || ''; }
