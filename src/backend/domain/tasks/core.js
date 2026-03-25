export async function podeEditarTarefa(env, { tarefaId, usuarioId, papel, podeEditarProjeto }) {
  if (papel === 'admin') return true;
  const tarefa = await env.DB.prepare('SELECT dono_id, projeto_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!tarefa) return false;
  if (tarefa.dono_id === usuarioId) return true;

  const colab = await env.DB.prepare(
    'SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
  ).bind(tarefaId, usuarioId).first();
  if (colab) return true;

  return await podeEditarProjeto(env, tarefa.projeto_id, usuarioId, papel);
}

export async function podeCronometrarTarefa(env, { tarefaId, usuarioId, papel }) {
  if (papel === 'admin') return true;
  const tarefa = await env.DB.prepare('SELECT dono_id FROM tarefas WHERE id = ?').bind(tarefaId).first();
  if (!tarefa) return false;
  if (tarefa.dono_id === usuarioId) return true;

  const colab = await env.DB.prepare(
    'SELECT 1 FROM colaboradores_tarefa WHERE tarefa_id = ? AND usuario_id = ?'
  ).bind(tarefaId, usuarioId).first();
  return !!colab;
}

export function podeGerenciarFocoTarefa({ tarefaDonoId, usuarioId, admin }) {
  return admin || tarefaDonoId === usuarioId;
}

export function podeGerenciarColaboradorTarefa({ tarefaDonoId, usuarioId, admin }) {
  return admin || tarefaDonoId === usuarioId;
}

export function mensagemCompartilhamentoTarefa({ tarefaNome, projetoNome }) {
  return `Você foi adicionado à tarefa "${tarefaNome}"${projetoNome ? ` no projeto "${projetoNome}"` : ''}.`;
}
