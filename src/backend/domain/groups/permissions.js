import { syncProjetoPermissoesGrupo } from '../projects/permissions.js';

export async function syncProjetosDoGrupo(env, grupoId, novoGrupoId = undefined) {
  const projetos = await env.DB.prepare('SELECT id, dono_id FROM projetos WHERE grupo_id = ?').bind(grupoId).all();
  for (const projeto of projetos.results) {
    await syncProjetoPermissoesGrupo(env, projeto.id, novoGrupoId, projeto.dono_id);
  }
}
