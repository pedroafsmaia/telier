import { ok, fail } from '../../http/responses.js';
import { getPagination } from '../../http/request.js';
import { requireAuth, isAdmin } from '../auth/session.js';

export async function handleGetStatus(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);

  const [colegas, notifs] = await env.DB.batch([
    env.DB.prepare(`
      SELECT st.usuario_id, tu.nome as usuario_nome, t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id, st.inicio
      FROM sessoes_tempo st JOIN usuarios tu ON tu.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
      WHERE st.fim IS NULL AND st.usuario_id != ? ORDER BY st.inicio ASC
    `).bind(u.uid),
    env.DB.prepare('SELECT COUNT(*) as nao_lidas FROM notificacoes WHERE usuario_id = ? AND lida_em IS NULL').bind(u.uid),
  ]);

  return ok({ colegas_ativos: colegas.results, notifs_nao_lidas: notifs.results[0]?.nao_lidas || 0 }, 200, { 'Cache-Control': 'public, max-age=10' });
}

export async function handleGetAdminAgora(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);
  
  const ativas = await env.DB.prepare(`
    SELECT st.id, st.inicio, st.usuario_id, tu.nome as usuario_nome, tu.login as usuario_login, t.id as tarefa_id, t.nome as tarefa_nome, t.status as tarefa_status, p.id as projeto_id, p.nome as projeto_nome
    FROM sessoes_tempo st JOIN usuarios tu ON tu.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
    WHERE st.fim IS NULL ORDER BY st.inicio ASC
  `).all();
  return ok(ativas.results);
}

export async function handleGetAdminTimelineHoje(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);
  
  const rows = await env.DB.prepare(`
    SELECT st.usuario_id, u.nome as usuario_nome, st.inicio, st.fim, t.nome as tarefa_nome
    FROM sessoes_tempo st JOIN usuarios u ON u.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id
    WHERE DATE(st.inicio) = DATE('now') ORDER BY st.usuario_id, st.inicio
  `).all();
  return ok(rows.results);
}

export async function handleGetAdminUsuarios(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);
  const { pageSize, offset } = getPagination(url, 120, 400);

  const usuarios = await env.DB.prepare(`
    SELECT u.id, u.nome, u.login as usuario_login, u.papel, COALESCE(u.deve_trocar_senha, 0) as deve_trocar_senha,
      (SELECT COUNT(*) FROM projetos p WHERE p.dono_id = u.id) as projetos_como_dono,
      (SELECT COUNT(*) FROM permissoes_projeto pp WHERE pp.usuario_id = u.id) as projetos_como_editor,
      (SELECT COUNT(*) FROM tarefas t WHERE t.dono_id = u.id) as tarefas_como_dono,
      (SELECT COUNT(*) FROM tarefas t WHERE t.dono_id = u.id AND t.status = 'Em andamento') as tarefas_em_andamento,
      COALESCE((SELECT ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) FROM sessoes_tempo st WHERE st.usuario_id = u.id), 0) as horas_totais
    FROM usuarios u ORDER BY u.nome LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all();

  return ok(usuarios.results);
}

export async function handleGetAdminUsuario(request, env, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);

  const usuario = await env.DB.prepare('SELECT id, nome, login as usuario_login, papel, COALESCE(deve_trocar_senha, 0) as deve_trocar_senha FROM usuarios WHERE id = ?').bind(usuarioId).first();
  if (!usuario) return fail('Usuário não encontrado', 404);

  const projetosDashboard = await env.DB.prepare(`SELECT p.id, p.nome, p.status, p.prioridade, 'dono' as papel_no_projeto FROM projetos p WHERE p.dono_id = ? UNION ALL SELECT p.id, p.nome, p.status, p.prioridade, 'editor' as papel_no_projeto FROM projetos p JOIN permissoes_projeto pp ON pp.projeto_id = p.id WHERE pp.usuario_id = ? AND p.dono_id <> ? ORDER BY nome`).bind(usuarioId, usuarioId, usuarioId).all();
  
  const tarefas = await env.DB.prepare(`SELECT DISTINCT t.id, t.nome, t.status, t.prioridade, t.dificuldade, t.dificuldade AS complexidade, p.id as projeto_id, p.nome as projeto_nome, CASE WHEN t.dono_id = ? THEN 'dono' ELSE 'colaborador' END as papel_na_tarefa FROM tarefas t JOIN projetos p ON p.id = t.projeto_id LEFT JOIN colaboradores_tarefa ct ON ct.tarefa_id = t.id AND ct.usuario_id = ? WHERE t.dono_id = ? OR ct.usuario_id = ? ORDER BY CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END, t.atualizado_em DESC`).bind(usuarioId, usuarioId, usuarioId, usuarioId).all();

  const tempoPorTarefa = await env.DB.prepare(`SELECT t.id as tarefa_id, t.nome as tarefa_nome, p.id as projeto_id, p.nome as projeto_nome, ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) as horas_liquidas FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id WHERE st.usuario_id = ? GROUP BY t.id, t.nome, p.id, p.nome ORDER BY horas_liquidas DESC`).bind(usuarioId).all();

  const ativas = await env.DB.prepare(`SELECT st.id, st.inicio, t.id as tarefa_id, t.nome as tarefa_nome, p.id as projeto_id, p.nome as projeto_nome FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id WHERE st.usuario_id = ? AND st.fim IS NULL ORDER BY st.inicio ASC`).bind(usuarioId).all();

  return ok({ usuario, projetos_dashboard: projetosDashboard.results, tarefas: tarefas.results, tempo_por_tarefa: tempoPorTarefa.results, ativas: ativas.results });
}

export async function handleGetAdminProjetos(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);
  const { pageSize, offset } = getPagination(url, 150, 500);

  const baseP = await env.DB.prepare(`
    SELECT p.id, p.nome, p.fase, p.status, p.prioridade, p.prazo, pu.nome as dono_nome
    FROM projetos p LEFT JOIN usuarios pu ON pu.id = p.dono_id 
    ORDER BY p.atualizado_em DESC LIMIT ? OFFSET ?
  `).bind(pageSize, offset).all();

  const results = baseP.results || [];
  if (results.length === 0) return ok([]);

  const pIds = results.map(r => r.id);
  const ph = pIds.map(() => '?').join(',');

  const [tQ, hQ] = await env.DB.batch([
    env.DB.prepare(`SELECT projeto_id, COUNT(DISTINCT id) as total_tarefas, SUM(CASE WHEN status = 'Concluída' THEN 1 ELSE 0 END) as tarefas_concluidas FROM tarefas WHERE projeto_id IN (${ph}) GROUP BY projeto_id`).bind(...pIds),
    env.DB.prepare(`SELECT t.projeto_id, ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) as horas_totais FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id WHERE t.projeto_id IN (${ph}) GROUP BY t.projeto_id`).bind(...pIds)
  ]);

  const mapT = {}; for (const r of tQ.results) mapT[r.projeto_id] = r;
  const mapH = {}; for (const r of hQ.results) mapH[r.projeto_id] = r.horas_totais;

  const finalRows = results.map(p => ({
    ...p,
    total_tarefas: mapT[p.id]?.total_tarefas || 0,
    tarefas_concluidas: mapT[p.id]?.tarefas_concluidas || 0,
    horas_totais: mapH[p.id] || 0
  }));

  return ok(finalRows);
}

export async function handleGetAdminTempo(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);
  const { pageSize, offset } = getPagination(url, 250, 1000);
  const de = url.searchParams.get('de') || null;
  const ate = url.searchParams.get('ate') || null;
  const usuarioId = url.searchParams.get('usuario_id') || null;

  const linhas = await env.DB.prepare(`SELECT tu.id as usuario_id, tu.nome as usuario_nome, p.id as projeto_id, p.nome as projeto_nome, t.id as tarefa_id, t.nome as tarefa_nome, ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) as horas_liquidas FROM sessoes_tempo st JOIN usuarios tu ON tu.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id WHERE (? IS NULL OR tu.id = ?) AND (? IS NULL OR date(st.inicio) >= date(?)) AND (? IS NULL OR date(st.inicio) <= date(?)) GROUP BY tu.id, tu.nome, p.id, p.nome, t.id, t.nome ORDER BY horas_liquidas DESC LIMIT ? OFFSET ?`).bind(usuarioId, usuarioId, de, de, ate, ate, pageSize, offset).all();
  return ok(linhas.results);
}

export async function handleGetAdminHorasPorGrupo(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Sem permissão', 403);
  const de = url.searchParams.get('de') || null;
  const ate = url.searchParams.get('ate') || null;

  const rows = await env.DB.prepare(`SELECT COALESCE(g.nome, 'Sem grupo') as grupo_nome, COALESCE(g.id, 'sem_grupo') as grupo_id, ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM((julianday(i.fim) - julianday(i.inicio)) * 24) FROM intervalos i WHERE i.sessao_id = st.id AND i.fim IS NOT NULL), 0)), 2) as horas_liquidas FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id LEFT JOIN grupos_projetos g ON g.id = p.grupo_id WHERE (? IS NULL OR DATE(st.inicio) >= DATE(?)) AND (? IS NULL OR DATE(st.inicio) <= DATE(?)) GROUP BY COALESCE(g.id, 'sem_grupo'), COALESCE(g.nome, 'Sem grupo') ORDER BY horas_liquidas DESC`).bind(de, de, ate, ate).all();
  return ok(rows.results);
}
