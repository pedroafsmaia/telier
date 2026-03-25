export function parseProjetoInput(body, { clampStr, validateDate, validatePositiveNumber }) {
  return {
    nome: clampStr(body?.nome, 200, 'nome'),
    fase: clampStr(body?.fase, 80, 'fase'),
    status: clampStr(body?.status, 80, 'status'),
    prioridade: clampStr(body?.prioridade, 80, 'prioridade'),
    prazo: validateDate(body?.prazo, 'prazo'),
    area_m2: validatePositiveNumber(body?.area_m2, 'area_m2'),
  };
}
