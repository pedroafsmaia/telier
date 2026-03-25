export async function listSessoesPorTarefaComIntervalos(env, { tarefaId, filtroUsuario }) {
  const sessoes = await env.DB.prepare(`
    SELECT st.*, tu.nome as usuario_nome,
      ROUND((
        CASE WHEN st.fim IS NULL
          THEN (julianday('now') - julianday(st.inicio)) * 24
          ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
        END
        -
        COALESCE((
          SELECT SUM(
            CASE WHEN i.fim IS NULL THEN 0
            ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
            END
          ) FROM intervalos i WHERE i.sessao_id = st.id
        ), 0)
      ), 4) as horas_liquidas
    FROM sessoes_tempo st
    LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE st.tarefa_id = ? AND (? IS NULL OR st.usuario_id = ?)
    ORDER BY st.usuario_id, st.inicio DESC
  `).bind(tarefaId, filtroUsuario, filtroUsuario).all();

  const base = sessoes.results || [];
  if (!base.length) return [];

  const intervalosQ = await env.DB.prepare(`
    SELECT i.*
    FROM intervalos i
    JOIN sessoes_tempo st ON st.id = i.sessao_id
    WHERE st.tarefa_id = ? AND (? IS NULL OR st.usuario_id = ?)
    ORDER BY i.sessao_id, i.inicio ASC
  `).bind(tarefaId, filtroUsuario, filtroUsuario).all();

  const intervalosPorSessao = new Map();
  for (const it of (intervalosQ.results || [])) {
    if (!intervalosPorSessao.has(it.sessao_id)) intervalosPorSessao.set(it.sessao_id, []);
    intervalosPorSessao.get(it.sessao_id).push(it);
  }

  return base.map((sessao) => ({ ...sessao, intervalos: intervalosPorSessao.get(sessao.id) || [] }));
}

export async function getSessaoTempoPorId(env, { sessaoId }) {
  return await env.DB.prepare('SELECT usuario_id FROM sessoes_tempo WHERE id = ?').bind(sessaoId).first();
}

export async function criarSessaoTempo(env, { sessaoId, tarefaId, usuarioId, inicio }) {
  await env.DB.prepare(
    'INSERT INTO sessoes_tempo (id, tarefa_id, usuario_id, inicio) VALUES (?, ?, ?, ?)'
  ).bind(sessaoId, tarefaId, usuarioId, inicio).run();
}

export async function atualizarSessaoTempo(env, { sessaoId, inicio, fim }) {
  await env.DB.prepare('UPDATE sessoes_tempo SET inicio=?, fim=? WHERE id=?')
    .bind(inicio, fim || null, sessaoId).run();
}

export async function excluirSessaoTempo(env, { sessaoId }) {
  await env.DB.prepare('DELETE FROM sessoes_tempo WHERE id = ?').bind(sessaoId).run();
}

export async function pararSessaoTempo(env, { sessaoId, fim }) {
  await env.DB.prepare('UPDATE sessoes_tempo SET fim=? WHERE id=?').bind(fim, sessaoId).run();
}

export async function listResumoTempoPorTarefa(env, { tarefaId }) {
  const resumo = await env.DB.prepare(`
    SELECT st.usuario_id, tu.nome as usuario_nome,
      ROUND(SUM(
        (CASE WHEN st.fim IS NULL
          THEN (julianday('now') - julianday(st.inicio)) * 24
          ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
        END)
        -
        COALESCE((
          SELECT SUM(
            CASE WHEN i.fim IS NULL THEN 0
            ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
            END
          ) FROM intervalos i WHERE i.sessao_id = st.id
        ), 0)
      ), 2) as horas_liquidas
    FROM sessoes_tempo st
    LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE st.tarefa_id = ?
    GROUP BY st.usuario_id, tu.nome
    ORDER BY horas_liquidas DESC
  `).bind(tarefaId).all();
  return resumo.results;
}

export async function listTempoAtivo(env, { adminScope, usuarioId }) {
  const ativas = await env.DB.prepare(`
    SELECT st.id, st.tarefa_id, st.inicio,
      t.nome as tarefa_nome, p.nome as projeto_nome, p.id as projeto_id,
      tu.nome as usuario_nome, tu.login as usuario_login, st.usuario_id
    FROM sessoes_tempo st
    JOIN tarefas t ON t.id = st.tarefa_id
    JOIN projetos p ON p.id = t.projeto_id
    JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE (? = 1 OR st.usuario_id = ?) AND st.fim IS NULL
    ORDER BY st.inicio ASC
  `).bind(adminScope, usuarioId).all();
  return ativas.results;
}

export async function listColegasComTempoAtivo(env, { usuarioId }) {
  const colegas = await env.DB.prepare(`
    SELECT st.id, st.inicio, st.usuario_id,
      tu.nome as usuario_nome,
      t.nome as tarefa_nome,
      p.nome as projeto_nome,
      p.id as projeto_id
    FROM sessoes_tempo st
    JOIN usuarios tu ON tu.id = st.usuario_id
    JOIN tarefas t ON t.id = st.tarefa_id
    JOIN projetos p ON p.id = t.projeto_id
    WHERE st.fim IS NULL AND st.usuario_id != ?
    ORDER BY st.inicio ASC
  `).bind(usuarioId).all();
  return colegas.results;
}

export async function getUltimaSessaoConcluida(env, { usuarioId }) {
  return await env.DB.prepare(`
    SELECT st.tarefa_id, t.nome as tarefa_nome,
           p.id as projeto_id, p.nome as projeto_nome,
           st.fim,
           ROUND((julianday(st.fim) - julianday(st.inicio)) * 24, 2) as horas
    FROM sessoes_tempo st
    JOIN tarefas t ON t.id = st.tarefa_id
    JOIN projetos p ON p.id = t.projeto_id
    WHERE st.usuario_id = ? AND st.fim IS NOT NULL
    ORDER BY st.fim DESC LIMIT 1
  `).bind(usuarioId).first();
}

export async function getResumoTempoHoje(env, { usuarioId }) {
  return await env.DB.prepare(`
    SELECT
      COUNT(DISTINCT st.id) as sessoes,
      COUNT(DISTINCT st.tarefa_id) as tarefas,
      ROUND(SUM(
        (CASE WHEN st.fim IS NULL
          THEN (julianday('now') - julianday(st.inicio)) * 24
          ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
        END)
        - COALESCE((
            SELECT SUM((julianday(i.fim) - julianday(i.inicio)) * 24)
            FROM intervalos i
            WHERE i.sessao_id = st.id AND i.fim IS NOT NULL
          ), 0)
      ), 2) as horas_hoje,
      SUM(CASE WHEN st.fim IS NULL THEN 1 ELSE 0 END) as timers_ativos
    FROM sessoes_tempo st
    WHERE st.usuario_id = ?
      AND DATE(st.inicio) = DATE('now')
  `).bind(usuarioId).first();
}

export async function listRelatorioProjetoTempoRows(env, { projetoId }) {
  const rows = await env.DB.prepare(`
    SELECT st.tarefa_id, tu.nome as usuario_nome,
      ROUND(SUM(
        (CASE WHEN st.fim IS NULL
          THEN (julianday('now') - julianday(st.inicio)) * 24
          ELSE (julianday(st.fim)  - julianday(st.inicio)) * 24 END)
        - COALESCE((
            SELECT SUM(CASE WHEN i.fim IS NULL THEN 0
              ELSE (julianday(i.fim) - julianday(i.inicio)) * 24 END)
            FROM intervalos i WHERE i.sessao_id = st.id
          ), 0)
      ), 2) as horas_liquidas
    FROM sessoes_tempo st
    JOIN tarefas t ON t.id = st.tarefa_id
    JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE t.projeto_id = ?
    GROUP BY st.tarefa_id, st.usuario_id, tu.nome
    HAVING horas_liquidas > 0
    ORDER BY st.tarefa_id, horas_liquidas DESC
  `).bind(projetoId).all();
  return rows.results || [];
}

export async function listHorasPorUsuarioNoProjeto(env, { projetoId }) {
  const resumo = await env.DB.prepare(`
    SELECT tu.nome as usuario_nome,
      ROUND(SUM(
        (CASE WHEN st.fim IS NULL
          THEN (julianday('now') - julianday(st.inicio)) * 24
          ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
        END)
        - COALESCE((
          SELECT SUM(CASE WHEN i.fim IS NULL THEN 0
            ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
          END) FROM intervalos i WHERE i.sessao_id = st.id
        ), 0)
      ), 2) as horas
    FROM sessoes_tempo st
    JOIN tarefas t ON t.id = st.tarefa_id
    LEFT JOIN usuarios tu ON tu.id = st.usuario_id
    WHERE t.projeto_id = ?
    GROUP BY st.usuario_id, tu.nome
    HAVING horas > 0
    ORDER BY horas DESC
  `).bind(projetoId).all();
  return resumo.results || [];
}
