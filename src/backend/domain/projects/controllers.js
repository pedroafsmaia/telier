import { ok, fail } from '../../http/responses.js';
import { readJsonBody, getPagination } from '../../http/request.js';
import { uid } from '../../utils/format.js';
import { clampStr, validateDate, validatePositiveNumber } from '../../utils/validation.js';
import { requireAuth, isAdmin } from '../auth/session.js';
import {
  STATUS_PROJ_VALIDOS_SET,
  normalizarStatusProjeto,
  podeEditarProjeto,
  podeVerProjeto,
  validarVinculoGrupo,
  syncProjetoPermissoesGrupo
} from './permissions.js';

function criarNotificacaoCompartilhamento(env, { usuarioId, tipo, escopo, entidadeId, titulo, mensagem, atorId }) {
  const nid = 'ntf_' + uid();
  return env.DB.prepare(
    'INSERT INTO notificacoes (id, usuario_id, tipo, escopo, entidade_id, titulo, mensagem, ator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(nid, usuarioId, tipo, escopo, entidadeId || null, titulo, mensagem || null, atorId || null).run().catch(console.error);
}

export async function handleGetProjetos(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const statusFiltroRaw = url.searchParams.get('status') || null;
  const statusFiltro = statusFiltroRaw ? normalizarStatusProjeto(statusFiltroRaw) : null;
  const grupoFiltro = (url.searchParams.get('grupo_id') || '').trim();
  if (statusFiltro && !STATUS_PROJ_VALIDOS_SET.has(statusFiltro)) return fail('Status de projeto inválido', 400);
  const asMember = url.searchParams.get('as_member') === '1';
  const adminScope = (isAdmin(u) && !asMember) ? 1 : 0;
  const { pageSize, offset } = getPagination(url, 200, 500);

  const filterSql = `(? = 1 OR p.dono_id = ? OR (NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?) AND (EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?) OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)))) AND (? IS NULL OR p.status = ?) AND (? = '' OR p.grupo_id = ?)`;
  const binds = [adminScope, u.uid, u.uid, u.uid, u.uid, statusFiltro, statusFiltro, grupoFiltro, grupoFiltro];

  const totalQ = await env.DB.prepare(`SELECT COUNT(*) as total FROM projetos p WHERE ${filterSql}`).bind(...binds).first();
  const totalRows = totalQ?.total || 0;
  
  const baseProjetos = await env.DB.prepare(`
    SELECT p.*,
      pu.nome as dono_nome,
      p.grupo_id, g.nome as grupo_nome,
      CASE
        WHEN p.dono_id <> ?
          AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
          AND (EXISTS (SELECT 1 FROM permissoes_projeto pp0 WHERE pp0.projeto_id = p.id AND pp0.usuario_id = ?)
            OR EXISTS (SELECT 1 FROM permissoes_grupo pg0 WHERE pg0.grupo_id = p.grupo_id AND pg0.usuario_id = ?))
        THEN 1 ELSE 0
      END as compartilhado_comigo,
      CASE
        WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
          AND EXISTS (SELECT 1 FROM permissoes_grupo pg0 WHERE pg0.grupo_id = p.grupo_id AND pg0.usuario_id = ?)
        THEN 'grupo'
        WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
          AND EXISTS (SELECT 1 FROM permissoes_projeto pp0 WHERE pp0.projeto_id = p.id AND pp0.usuario_id = ?)
        THEN 'manual'
        ELSE NULL
      END as origem_compartilhamento
    FROM projetos p
    LEFT JOIN usuarios pu ON pu.id = p.dono_id
    LEFT JOIN grupos_projetos g ON g.id = p.grupo_id
    WHERE ${filterSql}
    ORDER BY CASE p.status WHEN 'A fazer' THEN 0 WHEN 'Em andamento' THEN 1 WHEN 'Em revisão' THEN 2 WHEN 'Pausado' THEN 3 WHEN 'Concluído' THEN 4 WHEN 'Concluída' THEN 4 ELSE 5 END,
      CASE p.prioridade WHEN 'Alta' THEN 0 WHEN 'Média' THEN 1 ELSE 2 END,
      p.prazo ASC NULLS LAST, p.atualizado_em DESC
    LIMIT ? OFFSET ?
  `).bind(u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, ...binds, pageSize, offset).all();

  const results = baseProjetos.results || [];
  if (results.length === 0) return ok([], 200, { 'X-Total-Count': String(totalRows) });

  const pIds = results.map(p => p.id);
  const ph = pIds.map(() => '?').join(',');

  const aggQ = await env.DB.prepare(`
    SELECT projeto_id,
      COUNT(id) as total_tarefas,
      SUM(CASE WHEN status = 'Concluída' THEN 1 ELSE 0 END) as tarefas_concluidas
    FROM tarefas WHERE projeto_id IN (${ph}) GROUP BY projeto_id
  `).bind(...pIds).all();

  const hrsQ = await env.DB.prepare(`
    SELECT tt.projeto_id,
      ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) as total_horas
    FROM sessoes_tempo st JOIN tarefas tt ON tt.id = st.tarefa_id 
    WHERE tt.projeto_id IN (${ph}) GROUP BY tt.projeto_id
  `).bind(...pIds).all();

  const focoQ = await env.DB.prepare(`
    SELECT projeto_id, nome as minha_tarefa_foco 
    FROM tarefas WHERE projeto_id IN (${ph}) AND foco = 1 AND dono_id = ?
  `).bind(...pIds, u.uid).all();

  const metrics = {};
  for (const r of aggQ.results || []) metrics[r.projeto_id] = { ...r };
  for (const r of hrsQ.results || []) {
    metrics[r.projeto_id] = { ...(metrics[r.projeto_id] || {}), total_horas: r.total_horas };
  }
  for (const r of focoQ.results || []) {
    metrics[r.projeto_id] = { ...(metrics[r.projeto_id] || {}), minha_tarefa_foco: r.minha_tarefa_foco };
  }

  const finalRows = results.map(p => ({
    ...p,
    total_tarefas: metrics[p.id]?.total_tarefas || 0,
    tarefas_concluidas: metrics[p.id]?.tarefas_concluidas || 0,
    total_horas: metrics[p.id]?.total_horas || 0,
    minha_tarefa_foco: metrics[p.id]?.minha_tarefa_foco || null
  }));

  return ok(finalRows, 200, { 'X-Total-Count': String(totalRows) });
}

export async function handlePostProjetos(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const fase = clampStr(_body.fase, 80, 'fase');
  const status = clampStr(_body.status, 80, 'status');
  const prioridade = clampStr(_body.prioridade, 80, 'prioridade');
  const prazo = validateDate(_body.prazo, 'prazo');
  const area_m2 = validatePositiveNumber(_body.area_m2, 'area_m2');
  const grupo_id = _body.grupo_id;
  
  if (grupo_id) {
    const val = await validarVinculoGrupo(env, grupo_id, u.uid, u.papel);
    if (!val.ok) return fail(val.erro, val.status);
  }
  if (!nome?.trim()) return fail('Nome obrigatório');
  
  const statusProjeto = normalizarStatusProjeto(status || 'A fazer');
  if (!STATUS_PROJ_VALIDOS_SET.has(statusProjeto)) return fail('Status de projeto inválido', 400);
  const id = 'prj_' + uid();
  
  await env.DB.prepare(
    'INSERT INTO projetos (id, nome, fase, status, prioridade, prazo, area_m2, dono_id, grupo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, nome.trim(), fase || 'Estudo preliminar', statusProjeto, prioridade || 'Média', prazo || null, area_m2 || null, u.uid, grupo_id || null).run();
  
  if (grupo_id) {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, origem) SELECT ?, pg.usuario_id, "grupo" FROM permissoes_grupo pg WHERE pg.grupo_id = ? AND pg.usuario_id <> ?'
    ).bind(id, grupo_id, u.uid).run();
  }
  return ok({ id });
}

export async function handleGetProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeVerProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
  const [projetoRes, permsRes, horasRes] = await env.DB.batch([
    env.DB.prepare(
      `SELECT p.*, pu.nome as dono_nome,
        CASE WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
            AND (EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
              OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?))
          THEN 1 ELSE 0
        END as compartilhado_comigo,
        CASE WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
            AND EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)
          THEN 'grupo'
          WHEN p.dono_id <> ? AND NOT EXISTS (SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = p.id AND rp.usuario_id = ?)
            AND EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
          THEN 'manual' ELSE NULL
        END as origem_compartilhamento
       FROM projetos p LEFT JOIN usuarios pu ON pu.id = p.dono_id WHERE p.id = ?`
    ).bind(u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, u.uid, projetoId),
    env.DB.prepare('SELECT pp.usuario_id, pp.origem, u.nome, u.login as usuario_login FROM permissoes_projeto pp JOIN usuarios u ON u.id = pp.usuario_id WHERE pp.projeto_id = ? ORDER BY u.nome').bind(projetoId),
    env.DB.prepare(`SELECT ROUND(COALESCE(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 0), 2) as total_horas FROM sessoes_tempo st INNER JOIN tarefas t ON t.id = st.tarefa_id WHERE t.projeto_id = ?`).bind(projetoId),
  ]);
  const projeto = projetoRes.results[0];
  if (!projeto) return fail('Projeto não encontrado', 404);
  const podeEditar = await podeEditarProjeto(env, projetoId, u.uid, u.papel);
  return ok({ ...projeto, editores: permsRes.results, pode_editar: podeEditar, total_horas: horasRes.results[0]?.total_horas ?? 0 });
}

export async function handlePutProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const fase = clampStr(_body.fase, 80, 'fase');
  const statusProjeto = normalizarStatusProjeto(clampStr(_body.status, 80, 'status'));
  const prioridade = clampStr(_body.prioridade, 80, 'prioridade');
  const prazo = validateDate(_body.prazo, 'prazo');
  const area_m2 = validatePositiveNumber(_body.area_m2, 'area_m2');
  const grupo_id = _body.grupo_id;

  if (grupo_id) {
    const val = await validarVinculoGrupo(env, grupo_id, u.uid, u.papel);
    if (!val.ok) return fail(val.erro, val.status);
  }
  if (!nome?.trim()) return fail('Nome obrigatório');
  if (!STATUS_PROJ_VALIDOS_SET.has(statusProjeto)) return fail('Status de projeto inválido', 400);

  const atual = await env.DB.prepare('SELECT dono_id, grupo_id FROM projetos WHERE id = ?').bind(projetoId).first();
  await env.DB.prepare(
    'UPDATE projetos SET nome=?, fase=?, status=?, prioridade=?, prazo=?, area_m2=?, grupo_id=?, atualizado_em=datetime("now") WHERE id=?'
  ).bind(nome.trim(), fase, statusProjeto, prioridade, prazo || null, area_m2 || null, grupo_id || null, projetoId).run();
  
  if (atual?.grupo_id !== (grupo_id || null)) {
    await syncProjetoPermissoesGrupo(env, projetoId, grupo_id || null, atual?.dono_id || null);
  }
  return ok({ ok: true });
}

export async function handlePatchProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
  const body = await readJsonBody(request);
  if ('grupo_id' in body) {
    if (body.grupo_id) {
      const val = await validarVinculoGrupo(env, body.grupo_id, u.uid, u.papel);
      if (!val.ok) return fail(val.erro, val.status);
    }
    const atual = await env.DB.prepare('SELECT grupo_id, dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
    await env.DB.prepare('UPDATE projetos SET grupo_id = ? WHERE id = ?').bind(body.grupo_id || null, projetoId).run();
    await syncProjetoPermissoesGrupo(env, projetoId, body.grupo_id || null, atual?.dono_id || null);
  }
  return ok({ ok: true });
}

export async function handleDeleteProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const proj = await env.DB.prepare('SELECT dono_id, status FROM projetos WHERE id = ?').bind(projetoId).first();
  if (!proj) return fail('Não encontrado', 404);
  if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  if (proj.status !== 'Arquivado' && !isAdmin(u)) {
    return fail('Projeto precisa estar arquivado antes de ser excluído', 400);
  }
  await env.DB.prepare('DELETE FROM projetos WHERE id = ?').bind(projetoId).run();
  return ok({ ok: true });
}

export async function handlePostPermissoesProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const proj = await env.DB.prepare('SELECT dono_id, nome FROM projetos WHERE id = ?').bind(projetoId).first();
  if (!proj) return fail('Não encontrado', 404);
  if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  
  const _body = await readJsonBody(request);
  const usuario_id = _body.usuario_id;
  if (!usuario_id) return fail('Usuário obrigatório');
  if (usuario_id === proj.dono_id) return fail('Usuário já é dono do projeto');
  
  await env.DB.prepare('DELETE FROM recusas_projeto WHERE projeto_id = ? AND usuario_id = ?').bind(projetoId, usuario_id).run();
  await env.DB.prepare('INSERT OR REPLACE INTO permissoes_projeto (projeto_id, usuario_id, nivel, origem) VALUES (?, ?, \'editor\', \'manual\')').bind(projetoId, usuario_id).run();
  await criarNotificacaoCompartilhamento(env, {
    usuarioId: usuario_id, tipo: 'compartilhamento_recebido', escopo: 'projeto',
    entidadeId: projetoId, titulo: 'Projeto compartilhado com você',
    mensagem: `Você recebeu acesso ao projeto "${proj.nome}".`, atorId: u.uid,
  });
  return ok({ ok: true });
}

export async function handleDeleteSairProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const proj = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
  if (!proj) return fail('Projeto não encontrado', 404);
  if (proj.dono_id === u.uid) return fail('O dono não pode sair do próprio projeto', 400);

  const tinhaManual = await env.DB.prepare('SELECT 1 FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?').bind(projetoId, u.uid).first();
  const tinhaGrupo = await env.DB.prepare('SELECT 1 FROM projetos p JOIN permissoes_grupo pg ON pg.grupo_id = p.grupo_id WHERE p.id = ? AND pg.usuario_id = ?').bind(projetoId, u.uid).first();
  if (!tinhaManual && !tinhaGrupo) return fail('Você não participa deste projeto', 400);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?').bind(projetoId, u.uid),
    env.DB.prepare('INSERT OR REPLACE INTO recusas_projeto (projeto_id, usuario_id) VALUES (?, ?)').bind(projetoId, u.uid),
    env.DB.prepare(`DELETE FROM colaboradores_tarefa WHERE usuario_id = ? AND tarefa_id IN (SELECT id FROM tarefas WHERE projeto_id = ?)`).bind(u.uid, projetoId),
  ]);
  return ok({ ok: true });
}

export async function handleDeletePermissaoProjetoUsuario(request, env, projetoId, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const proj = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
  if (!proj) return fail('Não encontrado', 404);
  if (proj.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  await env.DB.prepare('DELETE FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ? AND origem = "manual"').bind(projetoId, usuarioId).run();
  return ok({ ok: true });
}
