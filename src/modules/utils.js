// ── UTILITY FUNCTIONS ──
// Pure functions without side effects or state dependencies

export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function iniciais(nome) {
  return (nome || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export function avatarCor(nome) {
  const cores = ['#5b8af5', '#a78bfa', '#f5c542', '#f0834a', '#3ecf8e', '#2dd4c8'];
  let hash = 0;
  for (let i = 0; i < (nome || '').length; i++) {
    hash = ((hash << 5) - hash) + (nome || '').charCodeAt(i);
    hash = hash & hash;
  }
  return cores[Math.abs(hash) % cores.length];
}

export function avatar(nome, size = '') {
  const iniciais_ = iniciais(nome);
  const cor = avatarCor(nome);
  const classes = `avatar ${size ? `avatar-${size}` : ''}`;
  return `<div class="${classes}" style="background:${cor};color:#fff">${esc(iniciais_)}</div>`;
}

export function prazoFmt(prazo, curto = false) {
  if (!prazo) return '';
  const d = new Date(prazo);
  if (curto) return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: curto ? undefined : 'numeric' });
}

export function diasRestantes(prazo) {
  if (!prazo) return null;
  const hoje = new Date();
  const d = new Date(prazo);
  hoje.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d - hoje) / (1000 * 60 * 60 * 24));
}

export function tag(t, cls, lbl) {
  const ST = {
    'Arquivado': 'tag-gray',
    'Em andamento': 'tag-blue',
    'A fazer': 'tag-yellow',
    'Em revisão': 'tag-orange',
    'Pausado': 'tag-yellow',
    'Concluído': 'tag-green',
    'Concluída': 'tag-green',
    'Bloqueada': 'tag-red',
    'Alta': 'tag-orange',
    'Média': 'tag-yellow',
    'Baixa': 'tag-green',
    'Simples': 'tag-green',
    'Moderada': 'tag-yellow',
    'Complexa': 'tag-orange',
  };
  const tagClass = cls || ST[t] || 'tag-gray';
  const titleAttr = lbl ? ` title="${esc(lbl)}"` : '';
  return `<span class="tag ${tagClass}"${titleAttr}>${esc(t)}</span>`;
}

export function normalizarStatusProjeto(status) {
  const map = { 'Concluída': 'Concluído' };
  return map[status] || status;
}

export function projetoConcluido(status) {
  return status === 'Concluído' || status === 'Concluída' || status === 'Arquivado';
}

export function fmtDuracao(segundos) {
  if (!segundos || segundos < 0) return '0h';
  const horas = Math.floor(segundos / 3600);
  const mins = Math.floor((segundos % 3600) / 60);
  if (horas === 0) return `${mins}m`;
  return mins === 0 ? `${horas}h` : `${horas}h ${mins}m`;
}

export function fmtHoras(horas) {
  if (!horas || horas < 0) return '0h';
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function eyeIconSvg(isVisible, size = 16, stroke = 1.6) {
  if (isVisible) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}"><path d="M12 5C5.6 5 1.8 10 1.2 12c.6 2 4.4 7 10.8 7s10.2-5 10.8-7c-.6-2-4.4-7-10.8-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}"><path d="M3 3l18 18M8 8a4 4 0 0 0 5.3 5.3M21 9s-3-5-9-5-9 5-9 5"/></svg>`;
}

export function debounce(fn, ms = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
