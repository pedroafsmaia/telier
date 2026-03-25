(function attachApiInfra(global) {
  const root = global.TelierFrontend = global.TelierFrontend || {};
  root.services = root.services || {};

  function normalizeContractNode(node) {
    if (!node || typeof node !== 'object') return node;
    const out = { ...node };
    if (out.usuario_login !== undefined && out.login === undefined) out.login = out.usuario_login;
    if (out.login !== undefined && out.usuario_login === undefined) out.usuario_login = out.login;
    if (out.complexidade !== undefined && out.dificuldade === undefined) out.dificuldade = out.complexidade;
    if (out.dificuldade !== undefined && out.complexidade === undefined) out.complexidade = out.dificuldade;
    return out;
  }

  function normalizeContractData(data) {
    if (Array.isArray(data)) return data.map(normalizeContractData);
    if (!data || typeof data !== 'object') return data;
    const normalized = normalizeContractNode(data);
    for (const k of Object.keys(normalized)) normalized[k] = normalizeContractData(normalized[k]);
    return normalized;
  }

  function createApiClient(config) {
    const getApiBase = config.getApiBase;
    const getToken = config.getToken;
    const getTimeoutMs = config.getTimeoutMs;

    return async function req(method, path, body) {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), getTimeoutMs());
      let r;
      try {
        const token = getToken();
        r = await fetch(getApiBase() + path, {
          method,
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
      } catch (e) {
        if (e?.name === 'AbortError') {
          throw new Error('Tempo limite atingido ao conectar ao servidor.');
        }
        throw new Error('Falha de conexão com o servidor.');
      } finally {
        clearTimeout(timeoutId);
      }

      let d = null;
      try { d = await r.json(); } catch { d = null; }
      if (!r.ok) throw new Error(d?.error || `Erro na requisição (${r.status})`);
      return normalizeContractData(d);
    };
  }

  root.services.api = {
    createApiClient,
    normalizeContractNode,
    normalizeContractData,
  };
})(window);
