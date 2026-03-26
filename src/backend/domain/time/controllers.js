import { ok, fail } from '../../http/responses.js';
import { readJsonBody } from '../../http/request.js';
import { uid } from '../../utils/format.js';
import { clampStr, parseDatetimeStr, validarJanela, validarContencao } from '../../utils/validation.js';
import { requireAuth, isAdmin } from '../auth/session.js';
import { podeVerTempoTarefa, podeCronometrar } from '../tasks/permissions.js';

export async function handleGetTempoTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeVerTempoTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
  
  const filtroUsuario = isAdmin(u) ? null : u.uid;
  const sessoes = await env.DB.prepare(`
    SELECT st.*, tu.nome as usuario_nome,
      ROUND((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END -
        COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)
      ), 4) as horas_liquidas
    FROM sessoes_tempo st
    LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE st.tarefa_id = ? AND (? IS NULL OR st.usuario_id = ?)
    ORDER BY st.usuario_id, st.inicio DESC
  `).bind(tarefaId, filtroUsuario, filtroUsuario).all();

  if (!(sessoes.results || []).length) return ok([]);
  
  const intervalosQ = await env.DB.prepare(`
    SELECT i.* FROM intervalos i
    JOIN sessoes_tempo st ON st.id = i.sessao_id
    WHERE st.tarefa_id = ? AND (? IS NULL OR st.usuario_id = ?)
    ORDER BY i.sessao_id, i.inicio ASC
  `).bind(tarefaId, filtroUsuario, filtroUsuario).all();
  
  const intervalosPorSessao = new Map();
  for (const it of (intervalosQ.results || [])) {
    if (!intervalosPorSessao.has(it.sessao_id)) intervalosPorSessao.set(it.sessao_id, []);
    intervalosPorSessao.get(it.sessao_id).push(it);
  }
  return ok(sessoes.results.map(s => ({ ...s, intervalos: intervalosPorSessao.get(s.id) || [] })));
}

export async function handlePostTempoTarefa(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeCronometrar(env, tarefaId, u.uid, u.papel)) {
    return fail('Sem permissão — você precisa ser dono ou colaborador desta tarefa', 403);
  }
  const ativaExistente = await env.DB.prepare(`
    SELECT st.id, st.tarefa_id, t.nome as tarefa_nome FROM sessoes_tempo st
    JOIN tarefas t ON t.id = st.tarefa_id WHERE st.usuario_id = ? AND st.fim IS NULL LIMIT 1
  `).bind(u.uid).first();
  if (ativaExistente) return fail(`Já existe uma sessão ativa (${ativaExistente.tarefa_nome || 'tarefa em andamento'}). Encerre a sessão atual para iniciar outra.`, 409);
  
  const _body = await readJsonBody(request);
  const id = 'ste_' + uid();
  const inicioStr = parseDatetimeStr(_body.inicio, 'inicio') || new Date().toISOString().slice(0, 19).replace('T', ' ');
  await env.DB.prepare('INSERT INTO sessoes_tempo (id, tarefa_id, usuario_id, inicio) VALUES (?, ?, ?, ?)').bind(id, tarefaId, u.uid, inicioStr).run();
  return ok({ id, inicio: inicioStr });
}

export async function handlePutTempo(request, env, sessaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const s = await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
  if (!s) return fail('Sessão não encontrada', 404);
  if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);

  const _body = await readJsonBody(request);
  const inicio = parseDatetimeStr(_body.inicio, 'inicio', true);
  const fim = parseDatetimeStr(_body.fim, 'fim');
  validarJanela(inicio, fim, 'sessão');

  if (!fim) {
    const ativaExistente = await env.DB.prepare('SELECT id FROM sessoes_tempo WHERE usuario_id = ? AND fim IS NULL AND id <> ?').bind(s.usuario_id, sessaoId).first();
    if (ativaExistente) return fail('Já existe outra sessão ativa para este usuário', 409);
  }

  await env.DB.prepare('UPDATE sessoes_tempo SET inicio=?, fim=? WHERE id=?').bind(inicio, fim || null, sessaoId).run();
  return ok({ ok: true });
}

export async function handleDeleteTempo(request, env, sessaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const s = await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
  if (!s) return fail('Sessão não encontrada', 404);
  if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  await env.DB.prepare('DELETE FROM sessoes_tempo WHERE id = ?').bind(sessaoId).run();
  return ok({ ok: true });
}

export async function handlePutTempoParar(request, env, sessaoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const s = await env.DB.prepare('SELECT usuario_id, inicio FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
  if (!s) return fail('Sessão não encontrada', 404);
  if (s.usuario_id !== u.uid && !isAdmin(u)) return fail('Sem permissão', 403);
  
  const _body = await readJsonBody(request);
  const fimStr = parseDatetimeStr(_body.fim, 'fim') || new Date().toISOString().slice(0, 19).replace('T', ' ');
  validarJanela(s.inicio, fimStr, 'encerramento da sessão');

  await env.DB.prepare('UPDATE sessoes_tempo SET fim=? WHERE id=?').bind(fimStr, sessaoId).run();
  return ok({ ok: true, fim: fimStr });
}

export async function handleGetTempoResumoHoje(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);

  const row = await env.DB.prepare(`
    SELECT COUNT(DISTINCT st.id) as sessoes, COUNT(DISTINCT st.tarefa_id) as tarefas,
      ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM((julianday(i.fim) - julianday(i.inicio)) * 24) FROM intervalos i WHERE i.sessao_id = st.id AND i.fim IS NOT NULL), 0)), 2) as horas_hoje,
      SUM(CASE WHEN st.fim IS NULL THEN 1 ELSE 0 END) as timers_ativos
    FROM sessoes_tempo st WHERE st.usuario_id = ? AND DATE(st.inicio) = DATE('now')
  `).bind(u.uid).first();
  return ok(row || { sessoes: 0, tarefas: 0, horas_hoje: 0, timers_ativos: 0 });
}

export async function handleGetTempoAtivas(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const asMember = url.searchParams.get('as_member') === '1';
  const adminScope = (isAdmin(u) && !asMember) ? 1 : 0;
  
  const ativas = await env.DB.prepare(`
    SELECT st.id, st.tarefa_id, st.inicio, t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id, tu.nome as usuario_nome, tu.login as usuario_login, st.usuario_id
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE (? = 1 OR st.usuario_id = ?) AND st.fim IS NULL ORDER BY st.inicio ASC
  `).bind(adminScope, u.uid).all();
  return ok(ativas.results);
}
