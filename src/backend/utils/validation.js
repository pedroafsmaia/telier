export function clampStr(value, max, fieldName) {
  if (value === undefined || value === null) return value;
  const s = String(value);
  if (s.length > max) throw Object.assign(
    new Error(`Campo "${fieldName}" excede o limite de ${max} caracteres`),
    { status: 400 }
  );
  return s;
}

export function validateDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw Object.assign(new Error(`Campo "${fieldName}" deve ser uma data válida (YYYY-MM-DD)`), { status: 400 });
  }
  return s;
}

export function validatePositiveNumber(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`Campo "${fieldName}" deve ser um número positivo`), { status: 400 });
  }
  return n;
}

export function parseDatetimeStr(str, fieldName, obrigatorio = false) {
  if (!str && obrigatorio) throw Object.assign(new Error(`Campo "${fieldName}" é obrigatório`), { status: 400 });
  if (!str) return null;
  let s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    throw Object.assign(new Error(`Campo "${fieldName}" não é uma data/hora válida`), { status: 400 });
  }
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function validarJanela(inicioStr, fimStr, contexto) {
  if (!inicioStr || !fimStr) return;
  if (fimStr < inicioStr) {
    throw Object.assign(new Error(`Data de fim não pode ser anterior ao início (${contexto})`), { status: 400 });
  }
}

export function validarContencao(inicioStr, fimStr, paiInicioStr, paiFimStr) {
  if (inicioStr < paiInicioStr) {
    throw Object.assign(new Error(`Início não pode ser anterior ao início da sessão pai`), { status: 400 });
  }
  if (paiFimStr) {
    if (!fimStr) {
      throw Object.assign(new Error(`Não é possível conter evento em aberto em uma sessão já encerrada`), { status: 400 });
    }
    if (fimStr > paiFimStr) {
      throw Object.assign(new Error(`Fim não pode ultrapassar o encerramento da sessão pai`), { status: 400 });
    }
  }
}
