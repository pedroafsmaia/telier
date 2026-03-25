export function parseTarefaUpsertInput(body, { clampStr, validateDate }) {
  const nome = clampStr(body?.nome, 200, 'nome');
  const status = clampStr(body?.status, 80, 'status');
  const prioridade = clampStr(body?.prioridade, 80, 'prioridade');
  const complexidade = clampStr(body?.complexidade, 80, 'dificuldade');
  const dificuldade = clampStr(body?.dificuldade, 80, 'dificuldade');
  const data = validateDate(body?.data, 'prazo');
  const descricao = clampStr(body?.descricao, 4000, 'descricao');

  return { nome, status, prioridade, complexidade, dificuldade, data, descricao };
}

export function getComplexidadeNormalizada({ complexidade, dificuldade, fallback = 'Moderada' }) {
  return complexidade || dificuldade || fallback;
}

export function parseColaboradorInput(body) {
  return {
    usuario_id: body?.usuario_id,
  };
}
