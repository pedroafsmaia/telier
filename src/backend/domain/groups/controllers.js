import { ok, fail } from '../../http/responses.js';
import { readJsonBody, getPagination } from '../../http/request.js';
import { uid } from '../../utils/format.js';
import { clampStr } from '../../utils/validation.js';
import { requireAuth, isAdmin } from '../auth/session.js';
import { syncProjetosDoGrupo } from './permissions.js';

function criarNotificacaoCompartilhamento(env, { usuarioId, tipo, escopo, entidadeId, titulo, mensagem, atorId }) {
  const nid = 'ntf_' + uid();
  return env.DB.prepare(
    'INSERT INTO notificacoes (id, usuario_id, tipo, escopo, entidade_id, titulo, mensagem, ator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(nid, usuarioId, tipo, escopo, entidadeId || null, titulo, mensagem || null, atorId || null).run().catch(console.error);
}

export async function handleGetGrupos(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const asMember = url.searchParams.get('as_member') === '1';
  const adminAll = isAdmin(u) && !asMember;
  const grupoFiltro = (url.searchParams.get('grupo_id') || '').trim();
  const { pageSize, offset } = getPagination(url, 200, 500);
  
  let baseGrupos;
  let totalRows = 0;

  const filterSql = adminAll 
    ? `(? = '' OR g.id = ?)` 
    : `(g.dono_id = ? OR EXISTS (SELECT 1 FROM projetos p WHERE p.grupo_id = g.id AND (p.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?))) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = g.id AND pg.usuario_id = ?)) AND (? = '' OR g.id = ?)`;

  const binds = adminAll 
    ? [grupoFiltro, grupoFiltro] 
    : [u.uid, u.uid, u.uid, u.uid, grupoFiltro, grupoFiltro];

  const totalQ = await env.DB.prepare(`SELECT COUNT(*) as total FROM grupos_projetos g WHERE ${filterSql}`).bind(...binds).first();
  totalRows = totalQ?.total || 0;

  // Busca os dados base paginados (Tabela principal limpa, super rápido)
  baseGrupos = await env.DB.prepare(`
    SELECT g.*, pu.nome as dono_nome 
    FROM grupos_projetos g LEFT JOIN usuarios pu ON pu.id = g.dono_id 
    WHERE ${filterSql} ORDER BY g.ordem ASC, g.nome ASC LIMIT ? OFFSET ?
  `).bind(...binds, pageSize, offset).all();

  const results = baseGrupos.results || [];
  if (results.length === 0) return ok([], 200, { 'X-Total-Count': '0' });

  // Array IN
  const groupIds = results.map(g => g.id);
  const placeHolders = groupIds.map(() => '?').join(',');

  // Agora as agregações só analisam os IDs que já passaram pela paginação
  const apFilter = adminAll 
    ? 'p.grupo_id IN (' + placeHolders + ')' 
    : 'p.grupo_id IN (' + placeHolders + ') AND (p.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?))';
  
  const apBinds = adminAll ? groupIds : [...groupIds, u.uid, u.uid, u.uid];

  const aggQ = await env.DB.prepare(`
    SELECT p.grupo_id, 
      COUNT(DISTINCT p.id) as total_projetos, 
      SUM(COALESCE(p.area_m2, 0)) as area_total_m2, 
      SUM(CASE WHEN p.status = 'Concluído' THEN 1 ELSE 0 END) as projetos_concluidos, 
      SUM(CASE WHEN p.prazo IS NOT NULL AND date(p.prazo) < date('now') AND p.status NOT IN ('Concluído','Arquivado') THEN 1 ELSE 0 END) as projetos_atrasados
    FROM projetos p WHERE ${apFilter} GROUP BY p.grupo_id
  `).bind(...apBinds).all();

  const hrsQ = await env.DB.prepare(`
    SELECT p.grupo_id,
      ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) as total_horas,
      COUNT(DISTINCT CASE WHEN st.fim IS NULL THEN p.id ELSE NULL END) as projetos_ativos
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id 
    WHERE ${apFilter} GROUP BY p.grupo_id
  `).bind(...apBinds).all();

  const metricsByGroup = {};
  for (const r of aggQ.results || []) metricsByGroup[r.grupo_id] = { ...r };
  for (const r of hrsQ.results || []) {
    metricsByGroup[r.grupo_id] = { ...(metricsByGroup[r.grupo_id] || {}), total_horas: r.total_horas, projetos_ativos: r.projetos_ativos };
  }

  const finalRows = results.map(g => ({
    ...g,
    total_projetos: metricsByGroup[g.id]?.total_projetos || 0,
    area_total_m2: ROUND(metricsByGroup[g.id]?.area_total_m2 || 0),
    projetos_concluidos: metricsByGroup[g.id]?.projetos_concluidos || 0,
    projetos_atrasados: metricsByGroup[g.id]?.projetos_atrasados || 0,
    total_horas: metricsByGroup[g.id]?.total_horas || 0,
    projetos_ativos: metricsByGroup[g.id]?.projetos_ativos || 0
  }));

  function ROUND(num) { return Math.round(num * 100) / 100; }

  return ok(finalRows, 200, { 'Cache-Control': 'private, max-age=30', 'X-Total-Count': String(totalRows) });
}

export async function handlePostGrupos(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const status = clampStr(_body.status, 80, 'status');
  const descricao = clampStr(_body.descricao, 4000, 'descricao');
  if (!nome?.trim()) return fail('Nome obrigatório');
  
  const id = 'grp_' + uid();
  const ordemRow = await env.DB.prepare('SELECT COALESCE(MAX(ordem), 0) as max_ordem FROM grupos_projetos').first();
  const ordem = (ordemRow?.max_ordem || 0) + 1;
  await env.DB.prepare('INSERT INTO grupos_projetos (id, nome, dono_id, ordem, status, descricao) VALUES (?, ?, ?, ?, ?, ?)').bind(id, nome.trim(), u.uid, ordem, status || 'Ativo', descricao || null).run();
  return ok({ id, nome: nome.trim(), ordem, status: status || 'Ativo', descricao: descricao || null });
}

export async function handleGetGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const grupo = await env.DB.prepare('SELECT * FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return fail('Grupo não encontrado', 404);
  const podeGerenciar = grupo.dono_id === u.uid || isAdmin(u);

  const podeVer = isAdmin(u) || grupo.dono_id === u.uid || !!(await env.DB.prepare(
    `SELECT 1 FROM projetos p WHERE p.grupo_id = ? AND (p.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)) LIMIT 1`
  ).bind(grupoId, u.uid, u.uid, u.uid).first());
  if (!podeVer) return fail('Sem permissão', 403);

  const resumo = await env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM projetos p2 WHERE p2.grupo_id = ? AND (? = 1 OR p2.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp2 WHERE pp2.projeto_id = p2.id AND pp2.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg2 WHERE pg2.grupo_id = p2.grupo_id AND pg2.usuario_id = ?))) as total_projetos,
      (SELECT ROUND(COALESCE(SUM(COALESCE(p2.area_m2, 0)), 0), 2) FROM projetos p2 WHERE p2.grupo_id = ? AND (? = 1 OR p2.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp2 WHERE pp2.projeto_id = p2.id AND pp2.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg2 WHERE pg2.grupo_id = p2.grupo_id AND pg2.usuario_id = ?))) as area_total_m2,
      (SELECT ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p3 ON p3.id = t.projeto_id WHERE p3.grupo_id = ? AND (? = 1 OR p3.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp3 WHERE pp3.projeto_id = p3.id AND pp3.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg3 WHERE pg3.grupo_id = p3.grupo_id AND pg3.usuario_id = ?))) as total_horas,
      (SELECT COUNT(*) FROM projetos p4 WHERE p4.grupo_id = ? AND p4.status = 'Concluído' AND (? = 1 OR p4.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp4 WHERE pp4.projeto_id = p4.id AND pp4.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg4 WHERE pg4.grupo_id = p4.grupo_id AND pg4.usuario_id = ?))) as projetos_concluidos,
      (SELECT COUNT(*) FROM projetos p5 WHERE p5.grupo_id = ? AND p5.prazo IS NOT NULL AND date(p5.prazo) < date('now') AND p5.status NOT IN ('Concluído','Arquivado') AND (? = 1 OR p5.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp5 WHERE pp5.projeto_id = p5.id AND pp5.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg5 WHERE pg5.grupo_id = p5.grupo_id AND pg5.usuario_id = ?))) as projetos_atrasados,
      (SELECT COUNT(DISTINCT p6.id) FROM sessoes_tempo st6 JOIN tarefas t6 ON t6.id = st6.tarefa_id JOIN projetos p6 ON p6.id = t6.projeto_id WHERE p6.grupo_id = ? AND st6.fim IS NULL AND (? = 1 OR p6.dono_id = ? OR EXISTS (SELECT 1 FROM permissoes_projeto pp6 WHERE pp6.projeto_id = p6.id AND pp6.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg6 WHERE pg6.grupo_id = p6.grupo_id AND pg6.usuario_id = ?))) as projetos_ativos`
  ).bind(
    grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
    grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
    grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
    grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
    grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid,
    grupoId, isAdmin(u) ? 1 : 0, u.uid, u.uid, u.uid
  ).first();

  const permissoes = await env.DB.prepare('SELECT pg.usuario_id, u.nome, u.login as usuario_login FROM permissoes_grupo pg JOIN usuarios u ON u.id = pg.usuario_id WHERE pg.grupo_id = ? ORDER BY u.nome').bind(grupoId).all();
  return ok({ ...grupo, ...resumo, pode_gerenciar: podeGerenciar, colaboradores: permissoes.results });
}

export async function handlePutGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const grupo = await env.DB.prepare('SELECT dono_id FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return fail('Grupo não encontrado', 404);
  const podeGerenciar = grupo.dono_id === u.uid || isAdmin(u);
  if (!podeGerenciar) return fail('Sem permissão', 403);
  
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const status = clampStr(_body.status, 80, 'status');
  const descricao = clampStr(_body.descricao, 4000, 'descricao');
  if (!nome?.trim()) return fail('Nome obrigatório');
  await env.DB.prepare('UPDATE grupos_projetos SET nome = ?, status = ?, descricao = ? WHERE id = ?').bind(nome.trim(), status || 'Ativo', descricao || null, grupoId).run();
  return ok({ ok: true });
}

export async function handlePatchGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const grupo = await env.DB.prepare('SELECT dono_id FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return fail('Grupo não encontrado', 404);
  if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);

  const body = await readJsonBody(request);
  if (typeof body.ordem === 'number') {
    await env.DB.prepare('UPDATE grupos_projetos SET ordem = ? WHERE id = ?').bind(body.ordem, grupoId).run();
  }
  if (body.action === 'ungroup_all') {
    await syncProjetosDoGrupo(env, grupoId, null);
    await env.DB.prepare('UPDATE projetos SET grupo_id = NULL WHERE grupo_id = ?').bind(grupoId).run();
  }
  if (body.action === 'move_all_to') {
    const destino = body.destino_grupo_id || null;
    await syncProjetosDoGrupo(env, grupoId, destino);
    await env.DB.prepare('UPDATE projetos SET grupo_id = ? WHERE grupo_id = ?').bind(destino, grupoId).run();
  }
  return ok({ ok: true });
}

export async function handleDeleteGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const grupo = await env.DB.prepare('SELECT dono_id FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return fail('Grupo não encontrado', 404);
  if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);

  await syncProjetosDoGrupo(env, grupoId, null);
  await env.DB.prepare('UPDATE projetos SET grupo_id = NULL WHERE grupo_id = ?').bind(grupoId).run();
  await env.DB.prepare('DELETE FROM grupos_projetos WHERE id = ?').bind(grupoId).run();
  return ok({ ok: true });
}

export async function handlePostPermissoesGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const grupo = await env.DB.prepare('SELECT dono_id, nome FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return fail('Grupo não encontrado', 404);
  if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  const _body = await readJsonBody(request);
  const usuario_id = _body.usuario_id;
  if (!usuario_id) return fail('Usuário obrigatório');
  
  await env.DB.prepare('INSERT OR REPLACE INTO permissoes_grupo (grupo_id, usuario_id) VALUES (?, ?)').bind(grupoId, usuario_id).run();
  await env.DB.prepare('DELETE FROM recusas_projeto WHERE usuario_id = ? AND projeto_id IN (SELECT id FROM projetos WHERE grupo_id = ?)').bind(usuario_id, grupoId).run();
  await env.DB.prepare(`INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, origem) SELECT p.id, ?, 'grupo' FROM projetos p WHERE p.grupo_id = ? AND p.dono_id <> ?`).bind(usuario_id, grupoId, grupo.dono_id).run();
  
  await criarNotificacaoCompartilhamento(env, {
    usuarioId: usuario_id, tipo: 'compartilhamento_recebido', escopo: 'grupo',
    entidadeId: grupoId, titulo: 'Grupo compartilhado com você',
    mensagem: `Você recebeu acesso ao grupo "${grupo.nome}".`, atorId: u.uid,
  });
  return ok({ ok: true });
}

export async function handleDeleteSairGrupo(request, env, grupoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const grupo = await env.DB.prepare('SELECT dono_id FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return fail('Grupo não encontrado', 404);
  if (grupo.dono_id === u.uid) return fail('O dono não pode sair do próprio grupo', 400);

  const rm = await env.DB.prepare('DELETE FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?').bind(grupoId, u.uid).run();
  await env.DB.prepare(`DELETE FROM permissoes_projeto WHERE usuario_id = ? AND origem = 'grupo' AND projeto_id IN (SELECT id FROM projetos WHERE grupo_id = ?)`).bind(u.uid, grupoId).run();
  if (!(rm.meta?.changes > 0)) return fail('Você não participa deste grupo', 400);
  return ok({ ok: true });
}

export async function handleDeletePermissaoGrupoUsuario(request, env, grupoId, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const grupo = await env.DB.prepare('SELECT dono_id FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
  if (!grupo) return fail('Grupo não encontrado', 404);
  if (grupo.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  await env.DB.prepare('DELETE FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?').bind(grupoId, usuarioId).run();
  await env.DB.prepare(`DELETE FROM permissoes_projeto WHERE usuario_id = ? AND projeto_id IN (SELECT p.id FROM projetos p WHERE p.grupo_id = ?) AND origem = 'grupo'`).bind(usuarioId, grupoId).run();
  return ok({ ok: true });
}
