import { ok, fail } from '../../http/responses.js';
import { readJsonBody } from '../../http/request.js';
import { uid } from '../../utils/format.js';
import { clampStr, parseDatetimeStr, validarJanela, validarContencao } from '../../utils/validation.js';
import { requireAuth, isAdmin } from '../auth/session.js';

export async function handlePostIntervalos(request, env, sessaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const s = await env.DB.prepare('SELECT usuario_id, inicio, fim FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
  if (!s) return fail('Sessão não encontrada', 404);
  if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  
  const _body = await readJsonBody(request);
  const tipo = clampStr(_body.tipo, 100, 'tipo');
  if (!tipo?.trim()) return fail('Tipo obrigatório');

  const inicioStr = parseDatetimeStr(_body.inicio, 'inicio') || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const fimStr = parseDatetimeStr(_body.fim, 'fim');
  validarJanela(inicioStr, fimStr, 'intervalo');
  validarContencao(inicioStr, fimStr, s.inicio, s.fim);

  const id = 'int_' + uid();
  await env.DB.prepare(
    'INSERT INTO intervalos (id, sessao_id, tipo, inicio, fim) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, sessaoId, tipo.trim(), inicioStr, fimStr || null).run();
  return ok({ id, tipo, inicio: inicioStr, fim: fimStr || null });
}

export async function handleGetIntervalos(request, env, intervaloId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const iv = await env.DB.prepare('SELECT i.*, st.usuario_id FROM intervalos i JOIN sessoes_tempo st ON st.id = i.sessao_id WHERE i.id = ?').bind(intervaloId).first();
  if (!iv) return fail('Intervalo não encontrado', 404);
  if (iv.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  return ok(iv);
}

export async function handlePutIntervalos(request, env, intervaloId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const iv = await env.DB.prepare('SELECT i.*, st.usuario_id FROM intervalos i JOIN sessoes_tempo st ON st.id = i.sessao_id WHERE i.id = ?').bind(intervaloId).first();
  if (!iv) return fail('Intervalo não encontrado', 404);
  if (iv.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  
  const _body = await readJsonBody(request);
  const tipo = clampStr(_body.tipo, 100, 'tipo');
  if (!tipo?.trim()) return fail('Tipo obrigatório');

  const inicioStr = parseDatetimeStr(_body.inicio, 'inicio', true);
  const fimStr = parseDatetimeStr(_body.fim, 'fim');
  validarJanela(inicioStr, fimStr, 'intervalo');
  
  const sess = await env.DB.prepare('SELECT inicio, fim FROM sessoes_tempo WHERE id = ?').bind(iv.sessao_id).first();
  validarContencao(inicioStr, fimStr, sess.inicio, sess.fim);

  await env.DB.prepare('UPDATE intervalos SET tipo=?, inicio=?, fim=? WHERE id=?').bind(tipo.trim(), inicioStr, fimStr || null, intervaloId).run();
  return ok({ ok: true });
}

export async function handleDeleteIntervalos(request, env, intervaloId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const iv = await env.DB.prepare('SELECT i.*, st.usuario_id FROM intervalos i JOIN sessoes_tempo st ON st.id = i.sessao_id WHERE i.id = ?').bind(intervaloId).first();
  if (!iv) return fail('Intervalo não encontrado', 404);
  if (iv.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  
  await env.DB.prepare('DELETE FROM intervalos WHERE id = ?').bind(intervaloId).run();
  return ok({ ok: true });
}
