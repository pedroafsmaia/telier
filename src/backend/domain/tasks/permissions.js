import { podeEditarProjeto } from '../projects/permissions.js';

export async function podeEditarTarefa(env, tarefaId, usuarioId, papel) {
  if (papel === 'admin') return true;
  const t = await env.DB.prepare('SELECT dono_id, projeto_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!t) return false;
  if (t.dono_id === usuarioId) return true;
  const colab = await env.DB.prepare('SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?').bind(tarefaId, usuarioId).first();
  if (colab) return true;
  return await podeEditarProjeto(env, t.projeto_id, usuarioId, papel);
}

export async function podeVerTarefa(env, tarefaId, usuarioId, papel) {
  return await podeEditarTarefa(env, tarefaId, usuarioId, papel);
}

export async function podeVerTempoTarefa(env, tarefaId, usuarioId, papel) {
  return await podeVerTarefa(env, tarefaId, usuarioId, papel);
}

export async function podeCronometrar(env, tarefaId, usuarioId, papel) {
  if (papel === 'admin') return true;
  const t = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!t) return false;
  if (t.dono_id === usuarioId) return true;
  const colab = await env.DB.prepare('SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?').bind(tarefaId, usuarioId).first();
  return !!colab;
}
