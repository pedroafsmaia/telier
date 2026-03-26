import { ok, fail } from '../../http/responses.js';
import { requireAuth } from '../auth/session.js';
import { podeVerTempoTarefa } from '../tasks/permissions.js';

export async function handleGetTempoResumo(request, env, tarefaId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  if (!await podeVerTempoTarefa(env, tarefaId, u.uid, u.papel)) return fail('Sem permissão', 403);
  const resumo = await env.DB.prepare(`
    SELECT st.usuario_id, tu.nome as usuario_nome,
      ROUND(SUM(
        (CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END)
        - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)
      ), 2) as horas_liquidas
    FROM sessoes_tempo st LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE st.tarefa_id = ? GROUP BY st.usuario_id, tu.nome ORDER BY horas_liquidas DESC
  `).bind(tarefaId).all();
  return ok(resumo.results);
}

export async function handleGetTempoColegasAtivos(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const colegas = await env.DB.prepare(`
    SELECT st.id, st.inicio, st.usuario_id, tu.nome as usuario_nome, t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id
    FROM sessoes_tempo st JOIN usuarios tu ON tu.id = st.usuario_id JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
    WHERE st.fim IS NULL AND st.usuario_id != ? ORDER BY st.inicio ASC
  `).bind(u.uid).all();
  return ok(colegas.results);
}

export async function handleGetTempoUltimaSessao(request, env) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const row = await env.DB.prepare(`
    SELECT st.tarefa_id, t.nome as tarefa_nome, p.id as projeto_id, p.nome as projeto_nome, st.fim,
           ROUND((julianday(st.fim) - julianday(st.inicio)) * 24, 2) as horas
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
    WHERE st.usuario_id = ? AND st.fim IS NOT NULL ORDER BY st.fim DESC LIMIT 1
  `).bind(u.uid).first();
  return ok(row || null);
}

export async function handleGetTempoSessoesRecentes(request, env, url) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '6', 10) || 6, 1), 12);
  const rows = await env.DB.prepare(`
    SELECT st.id, st.tarefa_id, t.nome as tarefa_nome, p.id as projeto_id, p.nome as projeto_nome, st.inicio, st.fim,
           ROUND((julianday(st.fim) - julianday(st.inicio)) * 24 - COALESCE((SELECT SUM((julianday(i.fim) - julianday(i.inicio)) * 24) FROM intervalos i WHERE i.sessao_id = st.id AND i.fim IS NOT NULL), 0), 2) as horas_liquidas
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN projetos p ON p.id = t.projeto_id
    WHERE st.usuario_id = ? AND st.fim IS NOT NULL ORDER BY st.fim DESC LIMIT ?
  `).bind(u.uid, limit).all();
  return ok(rows.results || []);
}
