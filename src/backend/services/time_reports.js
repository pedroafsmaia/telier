export function agruparRelatorioProjetoPorTarefa(rows) {
  const byTarefa = {};
  for (const row of (rows || [])) {
    (byTarefa[row.tarefa_id] = byTarefa[row.tarefa_id] || []).push(row);
  }
  return byTarefa;
}
