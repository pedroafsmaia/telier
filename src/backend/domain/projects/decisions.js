import { ok, fail } from '../../http/responses.js';
import { readJsonBody } from '../../http/request.js';
import { uid } from '../../utils/format.js';
import { clampStr, validateDate } from '../../utils/validation.js';
import { requireAuth } from '../auth/session.js';
import { podeEditarProjeto, podeVerProjeto } from './permissions.js';

export async function handleGetDecisoesProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeVerProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
  const decisoes = await env.DB.prepare(
    'SELECT d.*, du.nome as dono_nome FROM decisoes d LEFT JOIN usuarios du ON du.id = d.dono_id WHERE d.projeto_id = ? ORDER BY d.data DESC, d.criado_em DESC'
  ).bind(projetoId).all();
  return ok(decisoes.results);
}

export async function handlePostDecisoesProjeto(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeEditarProjeto(env, projetoId, u.uid, u.papel)) return fail('Sem permissão', 403);
  const _body = await readJsonBody(request);
  const descricao = clampStr(_body.descricao, 4000, 'descricao');
  const data = validateDate(_body.data, 'prazo');
  if (!descricao?.trim()) return fail('Descrição obrigatória');
  const id = 'dec_' + uid();
  await env.DB.prepare(
    'INSERT INTO decisoes (id, projeto_id, descricao, data, dono_id) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, projetoId, descricao.trim(), data || new Date().toISOString().slice(0, 10), u.uid).run();
  return ok({ id });
}

export async function handleDeleteDecisao(request, env, decisaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const d = await env.DB.prepare('SELECT dono_id, projeto_id FROM decisoes WHERE id = ?').bind(decisaoId).first();
  if (!d) return fail('Não encontrado', 404);
  if (d.dono_id !== u.uid && !await podeEditarProjeto(env, d.projeto_id, u.uid, u.papel)) return fail('Sem permissão', 403);
  await env.DB.prepare('DELETE FROM decisoes WHERE id = ?').bind(decisaoId).run();
  return ok({ ok: true });
}

export async function handlePutDecisao(request, env, decisaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const d = await env.DB.prepare('SELECT dono_id, projeto_id FROM decisoes WHERE id = ?').bind(decisaoId).first();
  if (!d) return fail('Não encontrado', 404);
  if (d.dono_id !== u.uid && !await podeEditarProjeto(env, d.projeto_id, u.uid, u.papel)) return fail('Sem permissão', 403);
  const _body = await readJsonBody(request);
  const descricao = clampStr(_body.descricao, 4000, 'descricao');
  const data = validateDate(_body.data, 'prazo');
  if (!descricao?.trim()) return fail('Descrição obrigatória', 400);
  await env.DB.prepare('UPDATE decisoes SET descricao = ?, data = ? WHERE id = ?').bind(descricao.trim(), data || null, decisaoId).run();
  return ok({ ok: true });
}
