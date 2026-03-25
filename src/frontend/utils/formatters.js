(function attachUtilsInfra(global) {
  const root = global.TelierFrontend = global.TelierFrontend || {};
  root.utils = root.utils || {};

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
  }

  function iniciais(nome) {
    return (nome || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function avatarCor(nome) {
    const cores = ['#7c6af7', '#4a9eff', '#3ecf8e', '#f5c542', '#f0834a', '#f25b5b'];
    let h = 0;
    for (const c of nome || '') h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return cores[Math.abs(h) % cores.length];
  }

  function prazoFmt(prazo, curto = false) {
    if (!prazo) return null;
    const d = new Date(prazo + 'T00:00:00');
    if (curto) return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function diasRestantes(prazo) {
    if (!prazo) return null;
    return Math.ceil((new Date(prazo + 'T00:00:00') - new Date()) / 86400000);
  }

  root.utils.formatters = { esc, iniciais, avatarCor, prazoFmt, diasRestantes };
})(window);
