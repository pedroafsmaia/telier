export const STATUS_PROJ_VALIDOS = ['A fazer', 'Em andamento', 'Em revisão', 'Pausado', 'Concluído', 'Arquivado'];
export const STATUS_PROJ_VALIDOS_SET = new Set(STATUS_PROJ_VALIDOS);

export function normalizarStatusProjeto(status) {
  if (!status) return status;
  const s = String(status).trim();
  if (s === 'Concluída') return 'Concluído';
  if (s === 'Aguardando aprovação') return 'Em revisão';
  return s;
}

export async function podeEditarProjeto(env, projetoId, usuarioId, papel) {
  if (papel === 'admin') return true;
  const [proj, recusado, perm] = await env.DB.batch([
    env.DB.prepare('SELECT dono_id, grupo_id FROM projetos WHERE id = ?').bind(projetoId),
    env.DB.prepare('SELECT 1 as ok FROM recusas_projeto WHERE projeto_id = ? AND usuario_id = ?').bind(projetoId, usuarioId),
    env.DB.prepare('SELECT 1 as ok FROM permissoes_projeto WHERE projeto_id = ? AND usuario_id = ?').bind(projetoId, usuarioId),
  ]);
  const projRow = proj.results[0];
  if (!projRow) return false;
  if (projRow.dono_id === usuarioId) return true;
  if (recusado.results[0]) return false;
  if (perm.results[0]) return true;

  if (projRow.grupo_id) {
    const gperm = await env.DB.prepare('SELECT 1 FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?').bind(projRow.grupo_id, usuarioId).first();
    if (gperm) return true;
  }
  return false;
}

export async function podeVerProjeto(env, projetoId, usuarioId, papel) {
  return await podeEditarProjeto(env, projetoId, usuarioId, papel);
}

export async function validarVinculoGrupo(env, grupoId, usuarioId, papel) {
  if (!grupoId) return { ok: true };
  const grp = await env.DB.prepare('SELECT dono_id FROM grupos_projetos WHERE id = ?').bind(grupoId).first();
  if (!grp) return { ok: false, status: 404, erro: 'Grupo não encontrado' };
  if (papel === 'admin' || grp.dono_id === usuarioId) return { ok: true };
  const p = await env.DB.prepare('SELECT 1 FROM permissoes_grupo WHERE grupo_id = ? AND usuario_id = ?').bind(grupoId, usuarioId).first();
  if (!p) return { ok: false, status: 403, erro: 'Sem permissão para vincular projeto a este grupo' };
  return { ok: true };
}

export async function syncProjetoPermissoesGrupo(env, projetoId, grupoId, donoId = null) {
  if (!projetoId) return;
  let ownerId = donoId;
  if (!ownerId) {
    const projeto = await env.DB.prepare('SELECT dono_id FROM projetos WHERE id = ?').bind(projetoId).first();
    ownerId = projeto?.dono_id || null;
  }
  if (!grupoId) {
    await env.DB.prepare('DELETE FROM permissoes_projeto WHERE projeto_id = ? AND origem = "grupo"').bind(projetoId).run();
    return;
  }
  await env.DB.prepare(`
    INSERT OR IGNORE INTO permissoes_projeto (projeto_id, usuario_id, nivel, origem)
    SELECT ?, pg.usuario_id, 'editor', 'grupo'
    FROM permissoes_grupo pg
    WHERE pg.grupo_id = ? AND (? IS NULL OR pg.usuario_id <> ?)
      AND NOT EXISTS (
        SELECT 1 FROM recusas_projeto rp WHERE rp.projeto_id = ? AND rp.usuario_id = pg.usuario_id
      )
  `).bind(projetoId, grupoId, ownerId, ownerId, projetoId).run();
  await env.DB.prepare(`
    DELETE FROM permissoes_projeto WHERE projeto_id = ? AND origem = 'grupo'
      AND usuario_id NOT IN (SELECT pg.usuario_id FROM permissoes_grupo pg WHERE pg.grupo_id = ?)
  `).bind(projetoId, grupoId).run();
}
