import { ok, fail } from '../../http/responses.js';
import { readJsonBody } from '../../http/request.js';
import { uid } from '../../utils/format.js';
import { clampStr, validateDate } from '../../utils/validation.js';
import { requireAuth, isAdmin } from '../auth/session.js';
import { podeEditarProjeto, podeVerProjeto } from '../projects/permissions.js';
import { podeEditarTarefa, podeVerTarefa, podeCronometrar } from './permissions.js';

function criarNotificacaoCompartilhamento(env, { usuarioId, tipo, escopo, entidadeId, titulo, mensagem, atorId }) {
  const nid = 'ntf_' + uid();
  return env.DB.prepare(
    'INSERT INTO notificacoes (id, usuario_id, tipo, escopo, entidade_id, titulo, mensagem, ator_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(nid, usuarioId, tipo, escopo, entidadeId || null, titulo, mensagem || null, atorId || null).run().catch(console.error);
}

export async function handleGetTarefasProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeVerProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
  const tarefas = await env.DB.prepare(`
    SELECT t.*, t.dificuldade AS complexidade, tu.nome as dono_nome, tu.login as dono_login,
      (SELECT GROUP_CONCAT(ct.usuario_id) FROM colaboradores_tarefa ct WHERE ct.tarefa_id = t.id) as colaboradores_ids,
      (SELECT GROUP_CONCAT(u.nome) FROM colaboradores_tarefa ct JOIN usuarios u ON u.id = ct.usuario_id WHERE ct.tarefa_id = t.id) as colaboradores_nomes,
      CASE WHEN t.dono_id = ? THEN 1 ELSE 0 END as minha_tarefa
    FROM tarefas t LEFT JOIN usuarios tu ON tu.id = t.dono_id
    WHERE t.projeto_id = ?
    ORDER BY t.foco DESC, CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END, t.criado_em ASC
  `).bind(u.uid, projetoId).all();
  return ok(tarefas.results);
}

export async function handlePostTarefasProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
  
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const status = clampStr(_body.status, 80, 'status');
  const prioridade = clampStr(_body.prioridade, 80, 'prioridade');
  const complexidade = clampStr(_body.complexidade, 80, 'dificuldade');
  const dificuldade = clampStr(_body.dificuldade, 80, 'dificuldade');
  const data = validateDate(_body.data, 'prazo');
  const descricao = clampStr(_body.descricao, 4000, 'descricao');
  const observacaoEspera = clampStr(_body.observacao_espera, 4000, 'observacao_espera');
  const template_id = _body.template_id;
  
  let template = null;
  if (template_id) {
    template = await env.DB.prepare('SELECT id, nome, status, prioridade, dificuldade, descricao FROM templates_tarefa WHERE id = ? AND ativo = 1').bind(template_id).first();
    if (!template) return fail('Template não encontrado', 404);
  }
  
  const nomeFinal = (nome || template?.nome || '').trim();
  if (!nomeFinal) return fail('Nome obrigatório');
  const complexidadeVal = complexidade || dificuldade || template?.dificuldade || 'Moderada';
  const id = 'tsk_' + uid();
  
  await env.DB.prepare(
    'INSERT INTO tarefas (id, projeto_id, nome, status, prioridade, dificuldade, data, dono_id, descricao, observacao_espera) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, projetoId, nomeFinal, status || template?.status || 'A fazer', prioridade || template?.prioridade || 'Média',
    complexidadeVal, data || null, u.uid, descricao?.trim() || template?.descricao || null, observacaoEspera?.trim() || null
  ).run();
  return ok({ id });
}

export async function handlePutTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
  
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const status = clampStr(_body.status, 80, 'status');
  const prioridade = clampStr(_body.prioridade, 80, 'prioridade');
  const complexidadeVal = clampStr(_body.complexidade || _body.dificuldade, 80, 'dificuldade') || 'Moderada';
  const data = validateDate(_body.data, 'prazo');
  const descricao = clampStr(_body.descricao, 4000, 'descricao');
  const observacaoEspera = clampStr(_body.observacao_espera, 4000, 'observacao_espera');
  const projetoId = clampStr(_body.projeto_id, 80, 'projeto_id');
  
  if (!nome?.trim()) return fail('Nome obrigatório');
  if (projetoId && !await podeEditarProjeto(env, projetoId, u.uid, u.papel)) {
    return fail('Sem permissão no projeto de destino', 403);
  }
  await env.DB.prepare(
    'UPDATE tarefas SET projeto_id=COALESCE(?, projeto_id), nome=?, status=?, prioridade=?, dificuldade=?, data=?, descricao=?, observacao_espera=?, atualizado_em=datetime("now") WHERE id=?'
  ).bind(projetoId || null, nome.trim(), status, prioridade, complexidadeVal, data || null, descricao?.trim() || null, observacaoEspera?.trim() || null, tarefaId).run();
  
  return ok({ ok: true });
}

export async function handlePatchTarefaStatus(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeCronometrar(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão — só o dono e colaboradores podem mudar o status', 403);
  
  const _body = await readJsonBody(request);
  const status = clampStr(_body.status, 80, 'status');
  if (!status) return fail('Status obrigatório');
  await env.DB.prepare('UPDATE tarefas SET status=?, atualizado_em=datetime("now") WHERE id=?').bind(status, tarefaId).run();
  return ok({ ok: true });
}

export async function handleDeleteTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
  await env.DB.prepare('DELETE FROM tarefas WHERE id = ?').bind(tarefaId).run();
  return ok({ ok: true });
}

export async function handlePostDuplicarTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeEditarTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
  
  const original = await env.DB.prepare('SELECT projeto_id, nome, status, prioridade, dificuldade, data, descricao FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!original) return fail('Tarefa não encontrada', 404);
  
  const novoId = 'tsk_' + uid();
  await env.DB.prepare(
    'INSERT INTO tarefas (id, projeto_id, nome, status, prioridade, dificuldade, data, dono_id, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    novoId, original.projeto_id, `${original.nome} (cópia)`, original.status, original.prioridade, original.dificuldade,
    original.data, u.uid, original.descricao
  ).run();
  return ok({ id: novoId });
}

export async function handlePutTarefaFoco(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const tarefa = await env.DB.prepare('SELECT projeto_id, dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!tarefa) return fail('Tarefa não encontrada', 404);
  if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Só pode marcar foco nas suas tarefas', 403);
  
  await env.DB.batch([
    env.DB.prepare('UPDATE tarefas SET foco = 0 WHERE projeto_id = ? AND dono_id = ?').bind(tarefa.projeto_id, u.uid),
    env.DB.prepare('UPDATE tarefas SET foco = 1 WHERE id = ?').bind(tarefaId),
  ]);
  return ok({ ok: true });
}

export async function handleDeleteTarefaFoco(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!tarefa) return fail('Tarefa não encontrada', 404);
  if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  await env.DB.prepare('UPDATE tarefas SET foco = 0 WHERE id = ?').bind(tarefaId).run();
  return ok({ ok: true });
}

export async function handleGetColaboradoresTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeVerTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
  const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!tarefa) return fail('Tarefa não encontrada', 404);
  
  const colabs = await env.DB.prepare('SELECT u.id, u.nome, u.login as usuario_login FROM colaboradores_tarefa ct JOIN usuarios u ON u.id = ct.usuario_id WHERE ct.tarefa_id = ?').bind(tarefaId).all();
  return ok(colabs.results);
}

export async function handlePostColaboradoresTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const tarefa = await env.DB.prepare('SELECT t.dono_id, t.nome as tarefa_nome, p.nome as projeto_nome FROM tarefas t LEFT JOIN projetos p ON p.id = t.projeto_id WHERE t.id = ?').bind(tarefaId).first();
  if (!tarefa) return fail('Tarefa não encontrada', 404);
  if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  
  const _body = await readJsonBody(request);
  const usuario_id = _body.usuario_id;
  if (usuario_id === tarefa.dono_id) return fail('Usuário já é dono da tarefa');
  
  await env.DB.prepare('INSERT OR IGNORE INTO colaboradores_tarefa (tarefa_id, usuario_id) VALUES (?, ?)').bind(tarefaId, usuario_id).run();
  await criarNotificacaoCompartilhamento(env, {
    usuarioId: usuario_id, tipo: 'compartilhamento_recebido', escopo: 'tarefa',
    entidadeId: tarefaId, titulo: 'Tarefa compartilhada com você',
    mensagem: `Você foi adicionado à tarefa "${tarefa.tarefa_nome}"${tarefa.projeto_nome ? ` no projeto "${tarefa.projeto_nome}"` : ''}.`, atorId: u.uid,
  });
  return ok({ ok: true });
}

export async function handleDeleteSairTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!tarefa) return fail('Tarefa não encontrada', 404);
  if (tarefa.dono_id === u.uid) return fail('O dono não pode sair da própria tarefa', 400);
  
  const rm = await env.DB.prepare('DELETE FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?').bind(tarefaId, u.uid).run();
  if (!(rm.meta?.changes > 0)) return fail('Você não é colaborador desta tarefa', 400);
  return ok({ ok: true });
}

export async function handleDeleteColaboradorTarefa(request, env, tarefaId, usuarioId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!tarefa) return fail('Tarefa não encontrada', 404);
  if (tarefa.dono_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  
  await env.DB.prepare('DELETE FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?').bind(tarefaId, usuarioId).run();
  return ok({ ok: true });
}

export async function handleGetOperacaoHoje(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  
  const rows = await env.DB.prepare(`
    SELECT t.id, t.nome, t.status, t.prioridade, t.dificuldade as complexidade, t.data, t.foco,
      p.id as projeto_id, p.nome as projeto_nome, p.status as projeto_status,
      pu.nome as dono_nome, st.id as sessao_ativa_id, st.inicio as sessao_ativa_inicio
    FROM tarefas t
    JOIN projetos p ON p.id = t.projeto_id
    LEFT JOIN usuarios pu ON pu.id = t.dono_id
    LEFT JOIN sessoes_tempo st ON st.tarefa_id = t.id AND st.usuario_id = ? AND st.fim IS NULL
    WHERE (t.dono_id = ? OR EXISTS (SELECT 1 FROM colaboradores_tarefa ct WHERE ct.tarefa_id = t.id AND ct.usuario_id = ?))
      AND t.status != 'Concluída' AND COALESCE(p.status, '') != 'Arquivado'
    ORDER BY CASE WHEN st.id IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN t.foco = 1 THEN 0 ELSE 1 END,
      CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'Bloqueada' THEN 1 WHEN 'A fazer' THEN 2 ELSE 3 END,
      CASE WHEN t.data IS NULL THEN 3 WHEN DATE(t.data) < DATE('now') THEN 0 WHEN DATE(t.data) = DATE('now') THEN 1 ELSE 2 END,
      COALESCE(t.data, '9999-12-31') ASC, t.criado_em ASC
    LIMIT 12
  `).bind(u.uid, u.uid, u.uid).all();
  return ok(rows.results || []);
}

export async function handleGetMinhasTarefas(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  
  const query = `
    SELECT 
      t.id, t.nome, t.status, t.prioridade, t.dificuldade AS complexidade, t.data, t.foco, t.dono_id, t.descricao, t.observacao_espera, t.criado_em, t.atualizado_em,
      t.projeto_id, p.nome AS projeto_nome, p.status AS projeto_status,
      g.id AS grupo_id, g.nome AS grupo_nome,
      u.nome AS dono_nome, u.login AS dono_login,
      (SELECT GROUP_CONCAT(ct.usuario_id) FROM colaboradores_tarefa ct WHERE ct.tarefa_id = t.id) AS colaboradores_ids,
      (SELECT GROUP_CONCAT(uc.nome) FROM colaboradores_tarefa ct JOIN usuarios uc ON uc.id = ct.usuario_id WHERE ct.tarefa_id = t.id) AS colaboradores_nomes
    FROM tarefas t
    JOIN projetos p ON p.id = t.projeto_id
    LEFT JOIN grupos_projetos g ON g.id = p.grupo_id
    LEFT JOIN usuarios u ON u.id = t.dono_id
    WHERE (
      t.dono_id = ? 
      OR EXISTS (SELECT 1 FROM colaboradores_tarefa ct WHERE ct.tarefa_id = t.id AND ct.usuario_id = ?)
      OR EXISTS (SELECT 1 FROM permissoes_projeto pp WHERE pp.projeto_id = p.id AND pp.usuario_id = ?)
      OR EXISTS (SELECT 1 FROM permissoes_grupo pg WHERE pg.grupo_id = p.grupo_id AND pg.usuario_id = ?)
    )
    AND (p.status != 'Arquivado' OR (t.status = 'Concluída' AND t.dono_id = ?))
    ORDER BY t.foco DESC, CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END, t.criado_em ASC
  `;
  
  const rows = await env.DB.prepare(query).bind(u.uid, u.uid, u.uid, u.uid, u.uid).all();
  return ok(rows.results || []);
}
