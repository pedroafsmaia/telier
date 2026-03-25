export async function listTarefasPorProjeto(env, { projetoId, usuarioId }) {
  const tarefas = await env.DB.prepare(
    `SELECT t.*, t.dificuldade AS complexidade, tu.nome as dono_nome,
     CASE WHEN t.dono_id = ? THEN 1 ELSE 0 END as minha_tarefa
     FROM tarefas t LEFT JOIN usuarios tu ON tu.id = t.dono_id
     WHERE t.projeto_id = ?
     ORDER BY t.foco DESC,
       CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END,
       t.criado_em ASC`
  ).bind(usuarioId, projetoId).all();
  return tarefas.results || [];
}

export async function listSnapshotTarefasProjetoV2(env, { projetoId, usuarioId }) {
  const snapshot = await env.DB.prepare(
    `WITH colabs_base AS (
      SELECT DISTINCT
        ct.tarefa_id,
        ct.usuario_id,
        COALESCE(u.nome, u.login) AS colaborador_nome
      FROM colaboradores_tarefa ct
      JOIN tarefas t ON t.id = ct.tarefa_id
      LEFT JOIN usuarios u ON u.id = ct.usuario_id
      WHERE t.projeto_id = ?
    ),
    colabs AS (
      SELECT tarefa_id,
        GROUP_CONCAT(usuario_id, ',') AS colaboradores_ids_raw,
        GROUP_CONCAT(colaborador_nome, '||') AS colaboradores_nomes_raw
      FROM (
        SELECT tarefa_id, usuario_id, colaborador_nome
        FROM colabs_base
        ORDER BY tarefa_id, colaborador_nome, usuario_id
      )
      GROUP BY tarefa_id
    ),
    tempo AS (
      SELECT st.tarefa_id,
        ROUND(SUM(
          (
            CASE WHEN st.fim IS NULL
              THEN (julianday('now') - julianday(st.inicio)) * 24
              ELSE (julianday(st.fim) - julianday(st.inicio)) * 24
            END
          ) - COALESCE((
            SELECT SUM(
              CASE WHEN i.fim IS NULL THEN 0
              ELSE (julianday(i.fim) - julianday(i.inicio)) * 24
              END
            ) FROM intervalos i WHERE i.sessao_id = st.id
          ), 0)
        ) * 60, 0) AS tempo_minutos
      FROM sessoes_tempo st
      JOIN tarefas t ON t.id = st.tarefa_id
      WHERE t.projeto_id = ?
      GROUP BY st.tarefa_id
    )
    SELECT
      t.id, t.nome, t.status, t.prioridade, t.data,
      t.dificuldade AS complexidade, t.dificuldade,
      t.dono_id, tu.nome AS dono_nome,
      CASE WHEN t.dono_id = ? THEN 1 ELSE 0 END AS minha_tarefa,
      COALESCE(colabs.colaboradores_ids_raw, '') AS colaboradores_ids_raw,
      COALESCE(colabs.colaboradores_nomes_raw, '') AS colaboradores_nomes_raw,
      COALESCE(tempo.tempo_minutos, 0) AS tempo_minutos
    FROM tarefas t
    LEFT JOIN usuarios tu ON tu.id = t.dono_id
    LEFT JOIN colabs ON colabs.tarefa_id = t.id
    LEFT JOIN tempo ON tempo.tarefa_id = t.id
    WHERE t.projeto_id = ?
    ORDER BY t.foco DESC,
      CASE t.status WHEN 'Em andamento' THEN 0 WHEN 'A fazer' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END,
      t.criado_em ASC`
  ).bind(projetoId, projetoId, usuarioId, projetoId).all();
  return snapshot.results || [];
}

export async function getTemplateTarefaAtivo(env, { templateId }) {
  return await env.DB.prepare(
    `SELECT id, nome, status, prioridade, dificuldade, descricao
     FROM templates_tarefa
     WHERE id = ? AND ativo = 1`
  ).bind(templateId).first();
}

export async function createTarefa(env, payload) {
  const {
    id,
    projetoId,
    nome,
    status,
    prioridade,
    dificuldade,
    data,
    donoId,
    descricao,
  } = payload;

  await env.DB.prepare(
    `INSERT INTO tarefas (
      id, projeto_id, nome, status, prioridade, dificuldade, data, dono_id,
      descricao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    projetoId,
    nome,
    status,
    prioridade,
    dificuldade,
    data || null,
    donoId,
    descricao || null
  ).run();
}

export async function updateTarefa(env, payload) {
  const {
    tarefaId,
    nome,
    status,
    prioridade,
    dificuldade,
    data,
    descricao,
  } = payload;

  await env.DB.prepare(
    `UPDATE tarefas
     SET nome=?, status=?, prioridade=?, dificuldade=?, data=?,
         descricao=?,
         atualizado_em=datetime('now')
     WHERE id=?`
  ).bind(
    nome,
    status,
    prioridade,
    dificuldade,
    data || null,
    descricao || null,
    tarefaId
  ).run();
}

export async function deleteTarefa(env, { tarefaId }) {
  await env.DB.prepare('DELETE FROM tarefas WHERE id = ?').bind(tarefaId).run();
}

export async function patchStatusTarefa(env, { tarefaId, status }) {
  await env.DB.prepare(
    'UPDATE tarefas SET status=?, atualizado_em=datetime("now") WHERE id=?'
  ).bind(status, tarefaId).run();
}

export async function getTarefaParaDuplicar(env, { tarefaId }) {
  return await env.DB.prepare(`
    SELECT projeto_id, nome, status, prioridade, dificuldade, data,
      descricao
    FROM tarefas
    WHERE id = ?
  `).bind(tarefaId).first();
}

export async function getTarefaBase(env, { tarefaId }) {
  return await env.DB.prepare('SELECT projeto_id, dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
}

export async function getTarefaDono(env, { tarefaId }) {
  return await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
}

export async function setFocoExclusivoTarefa(env, { projetoId, donoId, tarefaId }) {
  await env.DB.batch([
    env.DB.prepare('UPDATE tarefas SET foco = 0 WHERE projeto_id = ? AND dono_id = ?').bind(projetoId, donoId),
    env.DB.prepare('UPDATE tarefas SET foco = 1 WHERE id = ?').bind(tarefaId),
  ]);
}

export async function clearFocoTarefa(env, { tarefaId }) {
  await env.DB.prepare('UPDATE tarefas SET foco = 0 WHERE id = ?').bind(tarefaId).run();
}

export async function listColaboradoresTarefa(env, { tarefaId }) {
  const colabs = await env.DB.prepare(
    'SELECT u.id, u.nome, u.login as usuario_login FROM colaboradores_tarefa ct JOIN usuarios u ON u.id = ct.usuario_id WHERE ct.tarefa_id = ?'
  ).bind(tarefaId).all();
  return colabs.results || [];
}

export async function getTarefaComProjetoParaColab(env, { tarefaId }) {
  return await env.DB.prepare(
    `SELECT t.dono_id, t.nome as tarefa_nome, p.nome as projeto_nome
     FROM tarefas t
     LEFT JOIN projetos p ON p.id = t.projeto_id
     WHERE t.id = ?`
  ).bind(tarefaId).first();
}

export async function addColaboradorTarefa(env, { tarefaId, usuarioId }) {
  await env.DB.prepare(
    'INSERT OR IGNORE INTO colaboradores_tarefa (tarefa_id, usuario_id) VALUES (?, ?)'
  ).bind(tarefaId, usuarioId).run();
}

export async function removeColaboradorTarefa(env, { tarefaId, usuarioId }) {
  return await env.DB.prepare(
    'DELETE FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
  ).bind(tarefaId, usuarioId).run();
}
