import { ok, fail } from '../../http/responses.js';
import { readJsonBody } from '../../http/request.js';
import { uid } from '../../utils/format.js';
import { clampStr } from '../../utils/validation.js';
import { requireAuth, isAdmin } from '../auth/session.js';

export async function handleGetTemplatesTarefa(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const templates = await env.DB.prepare(`
    SELECT tt.id, tt.nome, tt.status, tt.prioridade, tt.dificuldade, tt.descricao, tt.criado_por, tu.nome as criado_por_nome, tt.criado_em, tt.atualizado_em
    FROM templates_tarefa tt LEFT JOIN usuarios tu ON tu.id = tt.criado_por WHERE tt.ativo = 1 ORDER BY tt.nome ASC
  `).all();
  return ok(templates.results);
}

export async function handlePostTemplatesTarefa(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Somente admin pode criar templates', 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const status = clampStr(_body.status, 80, 'status');
  const prioridade = clampStr(_body.prioridade, 80, 'prioridade');
  const dificuldade = clampStr(_body.dificuldade, 80, 'dificuldade');
  const descricao = clampStr(_body.descricao, 4000, 'descricao');
  if (!nome?.trim()) return fail('Nome obrigatório');
  
  const id = 'tpl_' + uid();
  await env.DB.prepare(
    'INSERT INTO templates_tarefa (id, nome, status, prioridade, dificuldade, descricao, criado_por) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, nome.trim(), status || 'A fazer', prioridade || 'Média', dificuldade || 'Moderada', descricao?.trim() || null, u.uid).run();
  return ok({ id });
}

export async function handlePutTemplateTarefa(request, env, templateId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Somente admin pode editar templates', 403);
  const _body = await readJsonBody(request);
  const nome = clampStr(_body.nome, 200, 'nome');
  const status = clampStr(_body.status, 80, 'status');
  const prioridade = clampStr(_body.prioridade, 80, 'prioridade');
  const dificuldade = clampStr(_body.dificuldade, 80, 'dificuldade');
  const descricao = clampStr(_body.descricao, 4000, 'descricao');
  if (!nome?.trim()) return fail('Nome obrigatório');
  
  const t = await env.DB.prepare('SELECT id FROM templates_tarefa WHERE id = ? AND ativo = 1').bind(templateId).first();
  if (!t) return fail('Template não encontrado', 404);
  await env.DB.prepare(
    'UPDATE templates_tarefa SET nome=?, status=?, prioridade=?, dificuldade=?, descricao=?, atualizado_em=datetime("now") WHERE id=?'
  ).bind(nome.trim(), status || 'A fazer', prioridade || 'Média', dificuldade || 'Moderada', descricao?.trim() || null, templateId).run();
  return ok({ ok: true });
}

export async function handleDeleteTemplateTarefa(request, env, templateId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!isAdmin(u)) return fail('Somente admin pode remover templates', 403);
  await env.DB.prepare('UPDATE templates_tarefa SET ativo = 0, atualizado_em = datetime("now") WHERE id = ?').bind(templateId).run();
  return ok({ ok: true });
}
