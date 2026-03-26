import { ok, fail } from '../../http/responses.js';
import { requireAuth, isAdmin } from '../auth/session.js';
import { podeEditarProjeto } from './permissions.js';

export async function handleGetProjetoRelatorio(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const proj = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
  if (!proj) return fail('Não encontrado', 404);
  if (!isAdmin(u) && !(await podeEditarProjeto(env, projetoId, u.uid, u.papel))) return fail('Sem permissão', 403);

  const rows = await env.DB.prepare(`
    SELECT st.tarefa_id, tu.nome as usuario_nome,
      ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim)  - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) as horas_liquidas
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE t.projeto_id = ? GROUP BY st.tarefa_id, st.usuario_id, tu.nome HAVING horas_liquidas > 0 ORDER BY st.tarefa_id, horas_liquidas DESC
  `).bind(projetoId).all();

  const byTarefa = {};
  for (const row of rows.results) {
    (byTarefa[row.tarefa_id] = byTarefa[row.tarefa_id] || []).push(row);
  }
  return ok(byTarefa);
}

export async function handleGetProjetoHorasPorUsuario(request, env, projetoId) {
  const [u, e] = await requireAuth(request, env);
  if (e) return fail('Não autorizado', 401);
  const proj = await env.DB.prepare('SELECT id, dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
  if (!proj) return fail('Não encontrado', 404);

  if (!isAdmin(u) && proj.dono_id !== u.uid) {
    const permissao = await env.DB.prepare('SELECT 1 as ok FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ? LIMIT 1').bind(projetoId, u.uid).first();
    if (!permissao) return fail('Sem permissão', 403);
  }

  const resumo = await env.DB.prepare(`
    SELECT tu.nome as usuario_nome,
      ROUND(SUM((CASE WHEN st.fim IS NULL THEN (julianday('now') - julianday(st.inicio)) * 24 ELSE (julianday(st.fim) - julianday(st.inicio)) * 24 END) - COALESCE((SELECT SUM(CASE WHEN i.fim IS NULL THEN 0 ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END) FROM intervalos i WHERE i.sessao_id = st.id), 0)), 2) as horas
    FROM sessoes_tempo st JOIN tarefas t ON t.id = st.tarefa_id LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE t.projeto_id = ? GROUP BY st.usuario_id, tu.nome HAVING horas > 0 ORDER BY horas DESC
  `).bind(projetoId).all();
  return ok(resumo.results);
}
