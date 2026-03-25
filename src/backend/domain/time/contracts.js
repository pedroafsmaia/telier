export function parseSessaoTempoCreateInput(body) {
  return {
    inicio: body?.inicio || null,
  };
}

export function parseSessaoTempoUpdateInput(body) {
  return {
    inicio: body?.inicio,
    fim: body?.fim || null,
  };
}

export function parseSessaoTempoStopInput(body) {
  return {
    fim: body?.fim || null,
  };
}
