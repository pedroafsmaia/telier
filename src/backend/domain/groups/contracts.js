export function parseGrupoInput(body, { clampStr }) {
  return {
    nome: clampStr(body?.nome, 200, 'nome'),
    status: clampStr(body?.status, 80, 'status'),
    descricao: clampStr(body?.descricao, 4000, 'descricao'),
  };
}
