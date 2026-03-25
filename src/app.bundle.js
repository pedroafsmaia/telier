(() => {
  // src/modules/state.js
  var API = "https://telier-api.pedroafsmaia.workers.dev";
  var TOKEN = localStorage.getItem("ea_token");
  var EU = JSON.parse(localStorage.getItem("ea_user") || "null");
  var VISTA_ATUAL = "dash";
  var ADMIN_MODE_KEY = "ea_admin_mode";
  var ADMIN_MODE = localStorage.getItem(ADMIN_MODE_KEY) || "admin";
  var FILTRO_STATUS = "todos";
  var FILTRO_ORIGEM_DASH = "todos";
  var FILTRO_GRUPO_DASH = "todos";
  var BUSCA_DASH = "";
  var _projsDash = [];
  var _ativasDash = [];
  var _gruposDash = [];
  var _prazoNotifShown = /* @__PURE__ */ new Set();
  var STARTDAY_COLLAPSE_KEY = "telier_startday_collapsed";
  var REQ_TIMEOUT_MS = 15e3;
  var PROJ_CACHE_KEY = "telier_proj_cache";
  var PROJ_CACHE_TTL = 1e4;
  function setToken(t) {
    TOKEN = t;
    localStorage.setItem("ea_token", t);
  }
  function clearToken() {
    TOKEN = null;
    localStorage.removeItem("ea_token");
  }
  function setEU(user) {
    EU = user;
    localStorage.setItem("ea_user", JSON.stringify(user));
  }
  function clearEU() {
    EU = null;
    localStorage.removeItem("ea_user");
  }
  function setVistaAtual(v) {
    VISTA_ATUAL = v;
  }
  function setFiltroStatus(f) {
    FILTRO_STATUS = f;
  }
  function setFiltroOrigemDash(f) {
    FILTRO_ORIGEM_DASH = f;
  }
  function setFiltroGrupoDash(g) {
    FILTRO_GRUPO_DASH = g;
  }
  function setBuscaDash(b) {
    BUSCA_DASH = b;
  }
  function setProjsDash(p) {
    _projsDash = p;
  }
  function setAtivasDash(a) {
    _ativasDash = a;
  }
  function setGruposDash(g) {
    _gruposDash = g;
  }

  // src/modules/api.js
  async function req(method, path, body) {
    const opts = {
      method,
      headers: { "Content-Type": "application/json" }
    };
    if (TOKEN) opts.headers.Authorization = `Bearer ${TOKEN}`;
    if (body) opts.body = JSON.stringify(body);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQ_TIMEOUT_MS);
    try {
      const res = await fetch(API + path, { ...opts, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const erro = await res.text();
        throw new Error(erro || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (erro) {
      clearTimeout(timeoutId);
      throw erro;
    }
  }
  async function fetchProjetos(params) {
    try {
      const raw = sessionStorage.getItem(PROJ_CACHE_KEY);
      if (raw) {
        const { ts, data: data2, key } = JSON.parse(raw);
        if (key === params.toString() && Date.now() - ts < PROJ_CACHE_TTL) {
          return data2;
        }
      }
    } catch {
    }
    const data = await req("GET", `/projetos?${params}`);
    try {
      sessionStorage.setItem(PROJ_CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        key: params.toString(),
        data
      }));
    } catch {
    }
    return data;
  }
  var endpoints = {
    // Auth
    login: (usuario, senha) => req("POST", "/auth/login", { usuario_login: usuario, senha }),
    logout: () => req("POST", "/auth/logout"),
    register: (nome, email, senha) => req("POST", "/auth/register", { nome, email, senha }),
    setup: (nome, senha) => req("POST", "/auth/setup", { nome, senha }),
    me: () => req("GET", "/auth/me"),
    needsSetup: () => req("GET", "/auth/needs-setup"),
    // Projects
    getProjects: (params = "") => fetchProjetos(params),
    getProject: (id) => req("GET", `/projetos/${id}`),
    createProject: (data) => req("POST", "/projetos", data),
    updateProject: (id, data) => req("PUT", `/projetos/${id}`, data),
    deleteProject: (id) => req("DELETE", `/projetos/${id}`),
    // Tasks
    createTask: (projetoId, data) => req("POST", `/projetos/${projetoId}/tarefas`, data),
    getTasks: (projetoId) => req("GET", `/projetos/${projetoId}/tarefas`),
    updateTask: (id, data) => req("PUT", `/tarefas/${id}`, data),
    patchTask: (id, data) => req("PATCH", `/tarefas/${id}`, data),
    deleteTask: (id) => req("DELETE", `/tarefas/${id}`),
    setTaskFocus: (id) => req("PUT", `/tarefas/${id}/foco`),
    clearTaskFocus: (id) => req("DELETE", `/tarefas/${id}/foco`),
    // Timer/Sessões
    getTaskSessions: (tarefaId) => req("GET", `/tarefas/${tarefaId}/tempo`),
    startTimer: (tarefaId, data) => req("POST", `/tarefas/${tarefaId}/tempo`, data),
    stopTimer: (sessaoId, data) => req("PUT", `/tempo/${sessaoId}/parar`, data),
    getActiveSessions: () => req("GET", "/tempo/ativas"),
    getLastSession: () => req("GET", "/tempo/ultima-sessao"),
    getDayResum: () => req("GET", "/tempo/resumo-hoje"),
    // Groups
    getGroups: () => req("GET", "/grupos"),
    createGroup: (data) => req("POST", "/grupos", data),
    updateGroup: (id, data) => req("PUT", `/grupos/${id}`, data),
    deleteGroup: (id) => req("DELETE", `/grupos/${id}`),
    // Notifications
    getNotifications: () => req("GET", "/notificacoes"),
    markNotifAsRead: (id) => req("PUT", `/notificacoes/${id}/lida`),
    // Admin
    getUsers: () => req("GET", "/usuarios"),
    createUser: (data) => req("POST", "/usuarios", data),
    updateUser: (id, data) => req("PUT", `/usuarios/${id}`, data),
    resetUserPassword: (id, novaSenha) => req("PUT", `/usuarios/${id}/reset-senha`, { nova_senha: novaSenha })
  };

  // src/modules/ui.js
  function toast(msg, tipo = "ok") {
    const t = document.createElement("div");
    t.className = `toast toast-${tipo}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.classList.add("visible");
    }, 10);
    setTimeout(() => {
      t.classList.remove("visible");
      setTimeout(() => t.remove(), 250);
    }, 3e3);
  }
  function toastUndo(msg, onUndo, ttl = 5e3) {
    const t = document.createElement("div");
    t.className = "toast toast-ok";
    t.innerHTML = `<span>${msg}</span><button class="btn btn-sm">Desfazer</button>`;
    t.querySelector("button").onclick = onUndo;
    document.body.appendChild(t);
    setTimeout(() => {
      t.classList.add("visible");
    }, 10);
    setTimeout(() => {
      t.classList.remove("visible");
      setTimeout(() => t.remove(), 250);
    }, ttl);
  }
  function abrirModal(html, opts = {}) {
    const { titulo = "", canClose = true, size = "" } = opts;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="modal ${size}">
      ${titulo ? `<h2>${titulo}</h2>` : ""}
      <div class="modal-content">${html}</div>
    </div>
  `;
    if (canClose) {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) fecharOverlayModal(overlay);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") fecharOverlayModal(overlay);
      });
    }
    document.body.appendChild(overlay);
    return overlay;
  }
  function fecharOverlayModal(overlay) {
    if (overlay) {
      overlay.classList.remove("visible");
      setTimeout(() => overlay.remove(), 150);
    }
  }
  function fecharModal() {
    document.querySelectorAll(".modal-overlay").forEach(fecharOverlayModal);
  }
  function confirmar(mensagem, onConfirm, opts = {}) {
    const { titulo = "Confirmar", cancelTxt = "Cancelar", okTxt = "OK" } = opts;
    const html = `
    <p>${mensagem}</p>
    <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: flex-end;">
      <button class="btn btn-ghost cancel-btn">${cancelTxt}</button>
      <button class="btn btn-primary confirm-btn">${okTxt}</button>
    </div>
  `;
    const overlay = abrirModal(html, { titulo, canClose: true });
    const confirmBtn = overlay.querySelector(".confirm-btn");
    const cancelBtn = overlay.querySelector(".cancel-btn");
    confirmBtn.addEventListener("click", () => {
      fecharOverlayModal(overlay);
      if (onConfirm) onConfirm();
    });
    cancelBtn.addEventListener("click", () => {
      fecharOverlayModal(overlay);
    });
    return overlay;
  }
  function btnLoading(id, on) {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (on) {
      btn.classList.add("btn-loading");
      btn.disabled = true;
    } else {
      btn.classList.remove("btn-loading");
      btn.disabled = false;
    }
  }
  function syncEyeButton(btn, isVisible) {
    if (!btn) return;
    const svg = isVisible ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 5C5.6 5 1.8 10 1.2 12c.6 2 4.4 7 10.8 7s10.2-5 10.8-7c-.6-2-4.4-7-10.8-7z"/><circle cx="12" cy="12" r="3"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3l18 18M8 8a4 4 0 0 0 5.3 5.3M21 9s-3-5-9-5-9 5-9 5"/></svg>';
    btn.innerHTML = svg;
  }
  function atualizarBadgeNotificacoes(total) {
    const badge = document.querySelector(".topbar-bell-dot");
    if (!badge) return;
    if (total > 0) {
      badge.textContent = total > 99 ? "99+" : total;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  // src/modules/auth.js
  async function init() {
    if (TOKEN) {
      try {
        const user = await endpoints.me();
        setEU(user);
        mostrarApp();
      } catch (erro) {
        console.error("Auth error:", erro);
        clearAuth();
        mostrarLogin();
      }
    } else {
      try {
        const { precisa_setup } = await endpoints.needsSetup();
        if (precisa_setup) {
          mostrarSetup();
        } else {
          mostrarLogin();
        }
      } catch {
        mostrarLogin();
      }
    }
  }
  async function fazerLogin() {
    const usuario = document.getElementById("login-usuario")?.value;
    const senha = document.getElementById("login-senha")?.value;
    if (!usuario || !senha) {
      toast("Preencha usu\xE1rio e senha", "erro");
      return;
    }
    try {
      const btnLogin = document.getElementById("btn-login");
      btnLogin.classList.add("btn-loading");
      btnLogin.disabled = true;
      const { token, usuario: user } = await endpoints.login(usuario, senha);
      setToken(token);
      setEU(user);
      if (user.deve_trocar_senha) {
        mostrarSetup(true);
      } else {
        mostrarApp();
      }
    } catch (erro) {
      toast(`Erro ao fazer login: ${erro.message}`, "erro");
    } finally {
      document.getElementById("btn-login")?.classList.remove("btn-loading");
      document.getElementById("btn-login").disabled = false;
    }
  }
  async function fazerSetup(forceChange = false) {
    const nome = document.getElementById("setup-nome")?.value;
    const senha = document.getElementById("setup-senha")?.value;
    const confirma = document.getElementById("setup-confirma")?.value;
    if (!nome || !senha || !confirma) {
      toast("Preencha todos os campos", "erro");
      return;
    }
    if (senha !== confirma) {
      toast("Senhas n\xE3o conferem", "erro");
      return;
    }
    if (senha.length < 6) {
      toast("Senha deve ter pelo menos 6 caracteres", "erro");
      return;
    }
    try {
      const btnSetup = document.getElementById("btn-setup");
      btnSetup.classList.add("btn-loading");
      btnSetup.disabled = true;
      if (forceChange) {
        await req("POST", "/auth/trocar-senha", { nova_senha: senha });
        setEU({ ...EU, deve_trocar_senha: 0 });
        toast("Senha alterada com sucesso", "ok");
        mostrarApp();
      } else {
        const { token, usuario: user } = await endpoints.setup(nome, senha);
        setToken(token);
        setEU(user);
        toast("Setup realizado com sucesso", "ok");
        mostrarApp();
      }
    } catch (erro) {
      toast(`Erro ao fazer setup: ${erro.message}`, "erro");
    } finally {
      document.getElementById("btn-setup")?.classList.remove("btn-loading");
      document.getElementById("btn-setup").disabled = false;
    }
  }
  async function fazerLogout() {
    try {
      await endpoints.logout();
    } catch {
    }
    clearAuth();
    mostrarLogin();
    toast("Logout realizado", "ok");
  }
  async function modalCadastroPublico() {
    const html = `
    <form style="display: flex; flex-direction: column; gap: 12px;">
      <input type="text" id="cadastro-nome" placeholder="Nome completo" class="input-control" />
      <input type="email" id="cadastro-email" placeholder="Email" class="input-control" />
      <input type="password" id="cadastro-senha" placeholder="Senha" class="input-control" />
      <input type="password" id="cadastro-confirma" placeholder="Confirmar senha" class="input-control" />
      <button type="button" class="btn btn-primary" onclick="fazerCadastroPublico()" id="btn-cadastro">
        Cadastrar
      </button>
    </form>
  `;
    console.log("Modal cadastro p\xFAblico preparado");
  }
  async function fazerCadastroPublico() {
    const nome = document.getElementById("cadastro-nome")?.value;
    const email = document.getElementById("cadastro-email")?.value;
    const senha = document.getElementById("cadastro-senha")?.value;
    const confirma = document.getElementById("cadastro-confirma")?.value;
    if (!nome || !email || !senha || !confirma) {
      toast("Preencha todos os campos", "erro");
      return;
    }
    if (senha !== confirma) {
      toast("Senhas n\xE3o conferem", "erro");
      return;
    }
    try {
      const btnCadastro = document.getElementById("btn-cadastro");
      btnCadastro.classList.add("btn-loading");
      btnCadastro.disabled = true;
      await endpoints.register(nome, email, senha);
      toast("Cadastro realizado! Fa\xE7a login para continuar.", "ok");
      document.querySelector(".modal-overlay")?.remove();
    } catch (erro) {
      toast(`Erro ao cadastrar: ${erro.message}`, "erro");
    } finally {
      document.getElementById("btn-cadastro")?.classList.remove("btn-loading");
      document.getElementById("btn-cadastro").disabled = false;
    }
  }
  function clearAuth() {
    clearToken();
    clearEU();
  }
  function isAdminRole() {
    return EU?.papel === "admin";
  }
  function isAdmin() {
    return isAdminRole();
  }
  function mostrarLogin() {
    document.getElementById("page-login")?.classList.remove("hidden");
    document.getElementById("page-setup")?.classList.add("hidden");
    document.getElementById("page-app")?.classList.add("hidden");
  }
  function mostrarSetup(forceChange = false) {
    document.getElementById("page-login")?.classList.add("hidden");
    document.getElementById("page-setup")?.classList.remove("hidden");
    document.getElementById("page-app")?.classList.add("hidden");
    if (forceChange) {
      const setupTitle = document.querySelector("#page-setup h1");
      if (setupTitle) setupTitle.textContent = "Alterar Senha";
    }
  }
  function mostrarApp() {
    document.getElementById("page-login")?.classList.add("hidden");
    document.getElementById("page-setup")?.classList.add("hidden");
    document.getElementById("page-app")?.classList.remove("hidden");
  }
  if (typeof window !== "undefined") {
    window.fazerLogin = fazerLogin;
    window.fazerSetup = fazerSetup;
    window.fazerLogout = fazerLogout;
    window.fazerCadastroPublico = fazerCadastroPublico;
    window.isAdmin = isAdmin;
  }

  // src/modules/utils.js
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function iniciais(nome) {
    return (nome || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }
  function avatarCor(nome) {
    const cores = ["#5b8af5", "#a78bfa", "#f5c542", "#f0834a", "#3ecf8e", "#2dd4c8"];
    let hash = 0;
    for (let i = 0; i < (nome || "").length; i++) {
      hash = (hash << 5) - hash + (nome || "").charCodeAt(i);
      hash = hash & hash;
    }
    return cores[Math.abs(hash) % cores.length];
  }
  function avatar(nome, size = "") {
    const iniciais_ = iniciais(nome);
    const cor = avatarCor(nome);
    const classes = `avatar ${size ? `avatar-${size}` : ""}`;
    return `<div class="${classes}" style="background:${cor};color:#fff">${esc(iniciais_)}</div>`;
  }
  function prazoFmt(prazo, curto = false) {
    if (!prazo) return "";
    const d = new Date(prazo);
    if (curto) return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: curto ? void 0 : "numeric" });
  }
  function diasRestantes(prazo) {
    if (!prazo) return null;
    const hoje = /* @__PURE__ */ new Date();
    const d = new Date(prazo);
    hoje.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d - hoje) / (1e3 * 60 * 60 * 24));
  }
  function tag(t, cls, lbl) {
    const ST = {
      "Arquivado": "tag-gray",
      "Em andamento": "tag-blue",
      "A fazer": "tag-yellow",
      "Em revis\xE3o": "tag-orange",
      "Pausado": "tag-yellow",
      "Conclu\xEDdo": "tag-green",
      "Conclu\xEDda": "tag-green",
      "Bloqueada": "tag-red",
      "Alta": "tag-orange",
      "M\xE9dia": "tag-yellow",
      "Baixa": "tag-green",
      "Simples": "tag-green",
      "Moderada": "tag-yellow",
      "Complexa": "tag-orange"
    };
    const tagClass = cls || ST[t] || "tag-gray";
    const titleAttr = lbl ? ` title="${esc(lbl)}"` : "";
    return `<span class="tag ${tagClass}"${titleAttr}>${esc(t)}</span>`;
  }
  function normalizarStatusProjeto(status) {
    const map = { "Conclu\xEDda": "Conclu\xEDdo" };
    return map[status] || status;
  }
  function projetoConcluido(status) {
    return status === "Conclu\xEDdo" || status === "Conclu\xEDda" || status === "Arquivado";
  }
  function fmtDuracao(segundos) {
    if (!segundos || segundos < 0) return "0h";
    const horas = Math.floor(segundos / 3600);
    const mins = Math.floor(segundos % 3600 / 60);
    if (horas === 0) return `${mins}m`;
    return mins === 0 ? `${horas}h` : `${horas}h ${mins}m`;
  }
  function fmtHoras(horas) {
    if (!horas || horas < 0) return "0h";
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  function eyeIconSvg(isVisible, size = 16, stroke = 1.6) {
    if (isVisible) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}"><path d="M12 5C5.6 5 1.8 10 1.2 12c.6 2 4.4 7 10.8 7s10.2-5 10.8-7c-.6-2-4.4-7-10.8-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}"><path d="M3 3l18 18M8 8a4 4 0 0 0 5.3 5.3M21 9s-3-5-9-5-9 5-9 5"/></svg>`;
  }
  function debounce(fn, ms = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // src/modules/dashboard.js
  function isAdminRole2() {
    return EU?.papel === "admin";
  }
  function isAdmin2() {
    return isAdminRole2() && ADMIN_MODE === "admin";
  }
  var DASH_FILTERS_KEY = "telier_dash_filters_v1";
  function carregarFiltrosDash() {
    try {
      const saved = localStorage.getItem(DASH_FILTERS_KEY);
      if (saved) {
        const { status, origem, grupo, busca } = JSON.parse(saved);
        if (status) setFiltroStatus(status);
        if (origem) setFiltroOrigemDash(origem);
        if (grupo !== void 0) setFiltroGrupoDash(grupo);
        if (busca) setBuscaDash(busca);
      }
    } catch {
    }
  }
  function salvarFiltrosDash() {
    try {
      localStorage.setItem(DASH_FILTERS_KEY, JSON.stringify({
        status: FILTRO_STATUS,
        origem: FILTRO_ORIGEM_DASH,
        grupo: FILTRO_GRUPO_DASH,
        busca: BUSCA_DASH
      }));
    } catch {
    }
  }
  function filtrarProjetosBusca(v) {
    setBuscaDash(v);
    salvarFiltrosDash();
    renderDash();
  }
  function filtrarGrupoDash(v) {
    setFiltroGrupoDash(v);
    salvarFiltrosDash();
    renderDash();
  }
  function filtrarOrigemDash(v) {
    setFiltroOrigemDash(v);
    salvarFiltrosDash();
    renderDash();
  }
  function setFiltro(f) {
    setFiltroStatus(f);
    salvarFiltrosDash();
    renderDash();
  }
  function renderInicioDia(projetos, ativas, ultimaSessao = null, focoGlobal = null, resumoHoje = null) {
    const collapsed = localStorage.getItem(STARTDAY_COLLAPSE_KEY) === "1";
    const btnText = collapsed ? "Expandir" : "Recolher";
    return `
    <div class="startday-wrap dash-header-spaced${collapsed ? " collapsed" : ""}" id="startday-wrap">
      <div class="startday-head">
        <h2 class="startday-title">Seu dia</h2>
        <button type="button" class="startday-toggle" onclick="toggleStartday()" title="Recolher/expandir">${btnText}</button>
      </div>
      <div class="startday-grid">
        ${focoGlobal?.projeto_id ? `<div class="startday-card">
              <h4>Seu foco agora</h4>
              <div class="startday-main">${esc(focoGlobal.tarefa_nome || "\u2014")}</div>
              <div class="startday-sub">${esc(focoGlobal.projeto_nome || "Projeto")}</div>
              <div class="startday-actions">
                <button class="btn btn-sm btn-primary" onclick="abrirProjeto('${focoGlobal.projeto_id}')">Ir para tarefa</button>
              </div>
            </div>` : ""}
        <div class="startday-card">
          <h4>\xDAltima sess\xE3o</h4>
          <div class="startday-main">
            ${ultimaSessao ? `${esc(ultimaSessao.projeto_nome)} \xB7 ${ultimaSessao.horas}h` : "Inicie seu primeiro cron\xF4metro"}
          </div>
          <div class="startday-actions">
            ${ultimaSessao ? `<button class="btn btn-sm btn-primary" onclick="abrirProjeto('${ultimaSessao.projeto_id}')">Retomar tarefa</button>` : `<button class="btn btn-sm" disabled>Retomar tarefa</button>`}
          </div>
        </div>

        ${resumoHoje && Number(resumoHoje.horas_hoje || 0) > 0 ? `
        <div class="startday-card">
          <h4>Hoje</h4>
          <div class="startday-main">${parseFloat(resumoHoje.horas_hoje).toFixed(1)}h trabalhadas</div>
          <div class="startday-sub">${resumoHoje.tarefas} tarefa${resumoHoje.tarefas !== 1 ? "s" : ""} \xB7 ${resumoHoje.sessoes} sess${resumoHoje.sessoes !== 1 ? "\xF5es" : "\xE3o"}</div>
          <div class="startday-actions">
            <button class="btn btn-sm" onclick="abrirCentralAdmin('tempo')">Ver relat\xF3rio</button>
          </div>
        </div>` : ""}
      </div>
    </div>`;
  }
  function toggleStartday() {
    const el = document.getElementById("startday-wrap");
    if (!el) return;
    el.classList.toggle("collapsed");
    const collapsed = el.classList.contains("collapsed");
    localStorage.setItem(STARTDAY_COLLAPSE_KEY, collapsed ? "1" : "0");
    const btn = el.querySelector(".startday-toggle");
    if (btn) btn.textContent = collapsed ? "Expandir" : "Recolher";
  }
  function renderDashLoadingState() {
    return `
    <div class="startday-wrap dash-header-spaced">
      <div class="startday-head">
        <div class="startday-title">Seu dia</div>
        <span class="skeleton-pill"></span>
      </div>
      <div class="startday-grid">
        ${'<div class="startday-card skeleton-card"></div>'.repeat(4)}
      </div>
    </div>
    <div class="dash-header dash-header-loading">
      <div class="dash-skeleton-line"></div>
    </div>
    <div class="dash-skeleton">${'<div class="dash-skeleton-card"></div>'.repeat(4)}</div>`;
  }
  function renderDashEmptyState(vazioTexto, opts = {}) {
    const titulo = opts.titulo || "Sem projetos por aqui";
    const mostrarGuia = !!opts.mostrarGuia;
    return `<div class="empty-state"><div class="empty-icon" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 18h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 18V9.5h4V18M13 18V6h4v12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M8 7.5l2-2 2 2M14 4l2-2 2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="empty-text">${titulo}</div><div class="empty-sub">${vazioTexto}</div>${mostrarGuia ? `<div class="empty-guide"><div class="empty-guide-item">1. Crie um projeto.</div><div class="empty-guide-item">2. Abra o projeto e adicione a primeira tarefa.</div><div class="empty-guide-item">3. Defina prioridade e prazo para organizar o fluxo.</div><div class="empty-cta"><button class="btn btn-sm btn-primary" onclick="modalNovoProjeto()">+ Criar primeiro projeto</button></div></div>` : ""}</div>`;
  }
  function projetoArquivadoNoDash(proj) {
    if (!proj) return false;
    return normalizarStatusProjeto(proj.status) === "Arquivado" || (proj.grupo_status || "") === "Arquivado";
  }
  function grupoProgressToneClass(pctConcl, atrasados) {
    if (pctConcl === 100) return "is-done";
    if (atrasados) return "is-alert";
    return "";
  }
  function grupoStatusToneClass(status) {
    if (status === "Pausado") return "is-paused";
    if (status === "Arquivado") return "is-muted";
    if (status === "Conclu\xEDdo") return "is-done";
    return "";
  }
  async function renderDash() {
    window.scrollTo(0, 0);
    document.title = "Telier";
    setBreadcrumb([]);
    const c = document.getElementById("content");
    c.innerHTML = renderDashLoadingState();
    try {
      const params = new URLSearchParams();
      if (FILTRO_STATUS !== "todos") params.set("status", FILTRO_STATUS);
      if (isAdminRole2() && ADMIN_MODE === "normal") params.set("as_member", "1");
      const [projetos, ativas, grupos, ultimaSessao, resumoHoje, focoGlobal] = await Promise.all([
        fetchProjetos(params),
        req("GET", `/tempo/ativas${isAdminRole2() && ADMIN_MODE === "normal" ? "?as_member=1" : ""}`).catch(() => []),
        req("GET", `/grupos${isAdminRole2() && ADMIN_MODE === "normal" ? "?as_member=1" : ""}`).catch(() => []),
        req("GET", "/tempo/ultima-sessao").catch(() => null),
        req("GET", "/tempo/resumo-hoje").catch(() => null),
        req("GET", "/auth/foco-global").catch(() => null)
      ]);
      setProjsDash(projetos);
      setAtivasDash(ativas);
      setGruposDash(grupos);
      projetos.forEach((p) => {
        if (_prazoNotifShown.has(p.id)) return;
        const dias = diasRestantes(p.prazo);
        if (dias !== null && dias >= 0 && dias <= 3 && !projetoConcluido(p.status) && p.dono_id === EU?.id) {
          _prazoNotifShown.add(p.id);
          const msg = dias === 0 ? `"${p.nome}" vence hoje.` : `"${p.nome}" vence em ${dias} dia${dias === 1 ? "" : "s"}.`;
          toast(`Prazo pr\xF3ximo: ${msg}`, "ok");
        }
      });
      const projetosAtivos = projetos.filter((p) => !projetoArquivadoNoDash(p));
      const projetosArquivados = projetos.filter((p) => projetoArquivadoNoDash(p));
      const projetosVisiveisBase = FILTRO_STATUS === "Arquivado" ? projetosArquivados : projetosAtivos;
      const gruposVisiveisBase = (grupos || []).filter((g) => FILTRO_STATUS === "Arquivado" ? (g.status || "Ativo") === "Arquivado" : (g.status || "Ativo") !== "Arquivado");
      const compartilhados = projetosVisiveisBase.filter((p) => Number(p.compartilhado_comigo) === 1);
      const emAndamento = projetosAtivos.filter((p) => !["Conclu\xEDdo"].includes(normalizarStatusProjeto(p.status))).length;
      const meus = projetosVisiveisBase.filter((p) => Number(p.compartilhado_comigo) !== 1).length;
      const filtros = ["todos", "Em andamento", "A fazer", "Em revis\xE3o", "Pausado", "Conclu\xEDdo", "Arquivado"];
      const statusCountMap = Object.fromEntries(filtros.map((f) => [
        f,
        f === "todos" ? projetosVisiveisBase.length : f === "Arquivado" ? projetosArquivados.length : projetosAtivos.filter((p) => normalizarStatusProjeto(p.status) === f).length
      ]));
      let html = `
      ${renderInicioDia(projetos, ativas, ultimaSessao, focoGlobal, resumoHoje)}
      <div class="dash-header dash-header-spaced">
        <div>
          <div class="dash-title">Projetos</div>
        </div>
        <div class="dash-actions">
          ${isAdmin2() ? `<button class="btn" onclick="abrirCentralAdmin()">Central admin</button>` : ""}
          ${isAdmin2() ? `<button class="btn" onclick="modalNovoColega()">Cadastrar admin</button>` : ""}
          <button class="btn" onclick="modalNovoGrupo()">+ Grupo</button>
          <button class="btn btn-primary" onclick="modalNovoProjeto()">+ Novo projeto</button>
        </div>
      </div>
      ${compartilhados.length ? `<div class="share-hint"><strong>${compartilhados.length}</strong> projeto${compartilhados.length === 1 ? "" : "s"} compartilhado${compartilhados.length === 1 ? "" : "s"} com voc\xEA no momento.</div>` : ""}
      <div class="dash-toolbar">
        <div class="dash-toolbar-row">
          <input type="search" class="search-dash" id="busca-dash" placeholder="Buscar projeto..." value="${esc(BUSCA_DASH)}" oninput="filtrarProjetosBusca(this.value)">
          <div class="segmented">
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH === "todos" ? "ativo" : ""}" data-origem="todos" onclick="filtrarOrigemDash('todos')">Todos${projetosVisiveisBase.length > 0 ? `<span class="seg-count">${projetosVisiveisBase.length}</span>` : ""}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH === "meus" ? "ativo" : ""}" data-origem="meus" onclick="filtrarOrigemDash('meus')">Meus${meus > 0 ? `<span class="seg-count">${meus}</span>` : ""}</button>
            <button class="segmented-btn ${FILTRO_ORIGEM_DASH === "compartilhados" ? "ativo" : ""}" data-origem="compartilhados" onclick="filtrarOrigemDash('compartilhados')">Compartilhados${compartilhados.length > 0 ? `<span class="seg-count">${compartilhados.length}</span>` : ""}</button>
          </div>
        </div>
        <div class="dash-toolbar-row">
          <select class="resp-filter select-control flex-shrink-0" onchange="filtrarGrupoDash(this.value)">
            <option value="todos" ${FILTRO_GRUPO_DASH === "todos" ? "selected" : ""}>Todos os grupos</option>
            <option value="sem" ${FILTRO_GRUPO_DASH === "sem" ? "selected" : ""}>Sem grupo</option>
            ${gruposVisiveisBase.map((g) => `<option value="${g.id}" ${FILTRO_GRUPO_DASH === g.id ? "selected" : ""}>${esc(g.nome)}</option>`).join("")}
          </select>
          <div class="toolbar-sep"></div>
          ${filtros.map((f) => {
        const label = { "todos": "Todos" }[f] || f;
        const cnt = statusCountMap[f] || 0;
        return `<button class="filter-btn ${FILTRO_STATUS === f ? "ativo" : ""}" onclick="setFiltro('${esc(f)}')">${label}${cnt > 0 ? `<span class="seg-count">${cnt}</span>` : ""}</button>`;
      }).join("")}
        </div>
      </div>
      <div id="cards-grid-dash">`;
      html += renderProjetosDash(projetosVisiveisBase, gruposVisiveisBase) + "</div>";
      const slide = VISTA_ATUAL === "projeto";
      setVistaAtual("dash");
      c.innerHTML = html;
      if (slide) slideContent("left");
    } catch (e) {
      c.innerHTML = `<div class="error-block">${esc(e.message)}<div class="muted-detail"><button class="btn btn-sm" onclick="renderDash()">Tentar novamente</button></div></div>`;
    }
  }
  function renderProjetosDash(projetos, grupos) {
    const busca = BUSCA_DASH.toLowerCase().trim();
    let lista = busca ? projetos.filter((p) => p.nome.toLowerCase().includes(busca)) : projetos;
    if (FILTRO_ORIGEM_DASH === "meus") lista = lista.filter((p) => Number(p.compartilhado_comigo) !== 1);
    else if (FILTRO_ORIGEM_DASH === "compartilhados") lista = lista.filter((p) => Number(p.compartilhado_comigo) === 1);
    if (FILTRO_GRUPO_DASH === "sem") lista = lista.filter((p) => !p.grupo_id);
    else if (FILTRO_GRUPO_DASH !== "todos") {
      const filtered = lista.filter((p) => String(p.grupo_id) === String(FILTRO_GRUPO_DASH));
      if (filtered.length === 0 && lista.length > 0) {
        setFiltroGrupoDash("todos");
        salvarFiltrosDash();
      } else lista = filtered;
    }
    if (!lista.length) {
      const vazioInicial = !busca && FILTRO_STATUS === "todos" && FILTRO_GRUPO_DASH === "todos" && FILTRO_ORIGEM_DASH === "todos";
      const vazioTexto = FILTRO_ORIGEM_DASH === "compartilhados" ? "Nenhum projeto compartilhado com voc\xEA no contexto atual." : busca ? "Tente outro termo de busca" : FILTRO_STATUS !== "todos" ? "Tente outro filtro" : "Comece criando seu primeiro projeto.";
      const titulo = FILTRO_ORIGEM_DASH === "compartilhados" ? "Sem compartilhamentos no momento" : "Sem projetos por aqui";
      return renderDashEmptyState(vazioTexto, { titulo, mostrarGuia: vazioInicial });
    }
    const collapsed = JSON.parse(localStorage.getItem("telier_grupos_collapsed") || "[]");
    const isCollapsed = (id) => collapsed.includes(id);
    const hoje = /* @__PURE__ */ new Date();
    hoje.setHours(0, 0, 0, 0);
    function calcGrupoKpis(items) {
      return items.reduce((acc, projeto) => {
        const status = projeto.status || "";
        const prazo = projeto.prazo ? /* @__PURE__ */ new Date(`${projeto.prazo}T00:00:00`) : null;
        if (prazo) prazo.setHours(0, 0, 0, 0);
        acc.area += Number(projeto.area_m2 || 0);
        acc.horas += Number(projeto.total_horas || 0);
        if (status === "Conclu\xEDdo") acc.concluidos += 1;
        if (status === "Em andamento" || status === "Em revis\xE3o") acc.ativos += 1;
        if (prazo && prazo < hoje && status !== "Conclu\xEDdo" && status !== "Arquivado") acc.atrasados += 1;
        return acc;
      }, { area: 0, horas: 0, concluidos: 0, atrasados: 0, ativos: 0 });
    }
    let html = "";
    const compartilhados = lista.filter((p) => Number(p.compartilhado_comigo) === 1);
    let listaAgrupada = lista;
    if (FILTRO_ORIGEM_DASH === "todos" && compartilhados.length) {
      html += `<div class="shared-spotlight">
      <div class="dash-section-title"><h3>Compartilhados comigo</h3><span class="dash-section-note">Acesso direto ou herdado por grupo</span></div>
      <div class="cards-grid">${renderCardsDash(compartilhados)}</div>
    </div>`;
      listaAgrupada = lista.filter((p) => Number(p.compartilhado_comigo) !== 1);
      if (listaAgrupada.length) {
        html += `<div class="dash-section-title"><h3>Meus projetos (organizados por grupo)</h3><span class="dash-section-note">Projetos sob sua propriedade ou gest\xE3o direta</span></div>`;
      }
    }
    const temGrupos = (grupos || []).length > 0;
    for (const grupo of grupos || []) {
      const gprojetos = listaAgrupada.filter((p) => String(p.grupo_id) === String(grupo.id));
      const col = isCollapsed(grupo.id);
      const kpis = calcGrupoKpis(gprojetos);
      const pctConcl = gprojetos.length ? Math.round(kpis.concluidos / gprojetos.length * 100) : 0;
      const grupoStatus = grupo.status || "Ativo";
      const grupoArquivado = grupoStatus === "Arquivado";
      const progressColor = pctConcl === 100 ? "var(--green)" : "var(--blue)";
      html += `
      <div class="grupo-section ${grupoArquivado ? "is-archived" : ""}" id="gs-${grupo.id}"
        draggable="true"
        ondragstart="dragGrupo(event,'${grupo.id}')"
        ondragend="dragGrupoEnd(event)"
        ondragover="dragOver(event,'${grupo.id}')"
        ondragleave="dragLeave(event)"
        ondrop="dropProjeto(event,'${grupo.id}')">
        <div class="grupo-card" data-status="${esc(grupoStatus)}">
          <div class="grupo-card-header">
            <span class="grupo-toggle ${col ? "collapsed" : ""}" onclick="toggleGrupo('${grupo.id}')" title="${col ? "Expandir" : "Recolher"}">\u25BC</span>
            <div class="grupo-title-area">
              <span class="grupo-nome">${esc(grupo.nome)}</span>
            </div>
            <div class="grupo-props">
              <div class="grupo-prop">
                <span class="grupo-prop-val">${gprojetos.length}</span>
                <span class="grupo-prop-lbl">Projetos</span>
              </div>
              ${kpis.area > 0 ? `<div class="grupo-prop"><span class="grupo-prop-val">${kpis.area.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} m\xB2</span><span class="grupo-prop-lbl">\xC1rea</span></div>` : ""}
              ${kpis.horas > 0 ? `<div class="grupo-prop"><span class="grupo-prop-val">${fmtHoras(kpis.horas)}</span><span class="grupo-prop-lbl">Horas</span></div>` : ""}
              <div class="grupo-prop">
                <span class="grupo-prop-val ${grupoProgressToneClass(pctConcl, kpis.atrasados)}">${pctConcl}%</span>
                <span class="grupo-prop-lbl">${kpis.atrasados ? `\u26A0 ${kpis.atrasados}d atr.` : "Progresso"}</span>
              </div>
              ${grupo.status && grupo.status !== "Ativo" ? `<div class="grupo-prop"><span class="grupo-prop-val ${grupoStatusToneClass(grupo.status)}">${esc(grupo.status)}</span><span class="grupo-prop-lbl">Status</span></div>` : ""}
            </div>
            <div class="grupo-actions" onclick="event.stopPropagation()">
              <button class="btn btn-primary btn-sm" onclick="abrirGrupo('${grupo.id}')">Abrir</button>
              <button class="btn btn-ghost btn-sm" onclick="compartilharGrupo('${grupo.id}')">Compartilhar</button>
              <button class="btn btn-ghost btn-icon btn-sm" onclick="modalEditarGrupo('${grupo.id}')" title="Configura\xE7\xF5es do grupo"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 9.5V11h1.5l5.5-5.5-1.5-1.5L2 9.5zM10.85 2.65a1 1 0 0 0-1.42 0l-.79.79 1.42 1.42.79-.79a1 1 0 0 0 0-1.42z" fill="currentColor"/></svg></button>
            </div>
          </div>
          ${!col && gprojetos.length > 0 ? `
          <div class="grupo-card-prog">
            <div class="grupo-card-prog-fill" style="width:${pctConcl}%;background:${progressColor}"></div>
          </div>` : ""}
          ${col ? "" : `
          <div class="grupo-card-body">
            <div class="grupo-drop-indicator tight">Solte para mover para ${esc(grupo.nome)}</div>
            ${gprojetos.length ? `<div class="grupo-content-shell"><div class="grupo-project-grid">${renderCardsDash(gprojetos)}</div></div>` : `<div class="grupo-empty-zone with-action"><span class="grupo-drop-hint">Arraste projetos aqui</span><button class="btn btn-sm" onclick="event.stopPropagation();modalNovoProjeto('${grupo.id}')">+ Criar projeto neste grupo</button></div>`}
          </div>`}
        </div>
      </div>`;
    }
    const grupoIds = new Set((grupos || []).map((g) => String(g.id)));
    const semGrupo = listaAgrupada.filter((p) => !p.grupo_id || !grupoIds.has(String(p.grupo_id)));
    if (semGrupo.length || temGrupos) {
      if (temGrupos) {
        html += `<div class="grupo-section sem-grupo"
        ondragover="dragOver(event,null)"
        ondragleave="dragLeave(event)"
        ondrop="dropProjeto(event,null)">
        <div class="grupo-sem-label">Sem grupo</div>
        <div class="grupo-drop-indicator">Solte para remover do grupo</div>
        ${semGrupo.length ? `<div class="cards-grid">${renderCardsDash(semGrupo)}</div>` : `<div class="grupo-empty-zone"><span class="grupo-drop-hint">Arraste projetos aqui para desagrupar</span></div>`}
      </div>`;
      } else {
        html += `<div class="cards-grid">${renderCardsDash(semGrupo)}</div>`;
      }
    }
    return html || renderDashEmptyState("Crie um projeto para come\xE7ar a organizar tarefas e prazo.", { mostrarGuia: false });
  }
  function renderCardsDash(projetos) {
    return projetos.map((p) => {
      const statusProjeto = normalizarStatusProjeto(p.status);
      const total = parseInt(p.total_tarefas) || 0;
      const conc = parseInt(p.tarefas_concluidas) || 0;
      const pct = total ? Math.round(conc / total * 100) : 0;
      const dias = diasRestantes(p.prazo);
      const urgente = dias !== null && dias <= 7 && !projetoConcluido(statusProjeto);
      const timerAtivo = _ativasDash && _ativasDash.some((a) => a.projeto_id === p.id);
      const compartilhado = Number(p.compartilhado_comigo) === 1;
      return `
      <div class="proj-card ${urgente ? "urgent" : ""}" draggable="true" ondragstart="dragProjeto(event,'${p.id}')" ondragend="dragProjetoEnd(event)" onclick="abrirProjeto('${p.id}')">
        <div class="proj-card-header">
          <div class="proj-card-title">
            <div class="proj-title">${esc(p.nome)}</div>
            ${compartilhado ? '<svg class="proj-shared-icon" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l4 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' : ""}
          </div>
          ${p.dono ? `<div class="proj-avatar">${avatar(p.dono, "sm")}</div>` : ""}
        </div>
        <div class="proj-card-body">
          ${p.total_tarefas ? `<div class="proj-progress"><div class="proj-prog-bar"><div class="proj-prog-fill" style="width:${pct}%"></div></div><span class="proj-prog-text">${conc}/${total}</span></div>` : ""}
        </div>
        <div class="proj-card-footer">
          <div class="proj-meta">
            ${prazoFmt(p.prazo) ? `<span class="proj-meta-item${urgente ? " urgent" : ""}">\u{1F4C5} ${prazoFmt(p.prazo)}</span>` : ""}
            ${p.area_m2 ? `<span class="proj-meta-item">\u{1F4D0} ${Math.round(p.area_m2)} m\xB2</span>` : ""}
          </div>
          <div class="proj-status">${tag(statusProjeto)}</div>
        </div>
      </div>`;
    }).join("");
  }
  function setBreadcrumb(partes) {
    const el = document.getElementById("topbar-breadcrumb");
    if (!el) return;
    if (!partes.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = partes.map(
      (p, i) => `<span>${i > 0 ? " / " : ""}${typeof p === "string" ? p : `<button onclick="abrirProjeto('${p.id}')">${esc(p.nome)}</button>`}</span>`
    ).join("");
  }
  function slideContent(direction) {
    const c = document.getElementById("content");
    if (!c) return;
    c.style.animation = `slideContent${direction === "left" ? "In" : "Out"} .3s ease-out forwards`;
  }
  if (typeof window !== "undefined") {
    window.renderDash = renderDash;
    window.setFiltro = setFiltro;
    window.filtrarProjetosBusca = filtrarProjetosBusca;
    window.filtrarGrupoDash = filtrarGrupoDash;
    window.filtrarOrigemDash = filtrarOrigemDash;
    window.toggleStartday = toggleStartday;
    window.renderCardsDash = renderCardsDash;
    window.slideContent = slideContent;
    window.setBreadcrumb = setBreadcrumb;
  }

  // src/app.js
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      carregarFiltrosDash?.();
      await init();
    } catch (error) {
      console.error("App initialization error:", error);
    }
  });
  window.fazerLogin = fazerLogin;
  window.fazerSetup = fazerSetup;
  window.fazerLogout = fazerLogout;
  window.fazerCadastroPublico = fazerCadastroPublico;
  window.modalCadastroPublico = modalCadastroPublico;
  window.renderDash = renderDash;
  window.setFiltro = setFiltro;
  window.filtrarProjetosBusca = filtrarProjetosBusca;
  window.filtrarGrupoDash = filtrarGrupoDash;
  window.filtrarOrigemDash = filtrarOrigemDash;
  window.toggleStartday = toggleStartday;
  window.renderCardsDash = renderCardsDash;
  window.toast = toast;
  window.toastUndo = toastUndo;
  window.abrirModal = abrirModal;
  window.fecharModal = fecharModal;
  window.confirmar = confirmar;
  window.fecharOverlayModal = fecharOverlayModal;
  window.btnLoading = btnLoading;
  window.syncEyeButton = syncEyeButton;
  window.atualizarBadgeNotificacoes = atualizarBadgeNotificacoes;
  window.escapeHtml = escapeHtml;
  window.esc = esc;
  window.iniciais = iniciais;
  window.avatar = avatar;
  window.prazoFmt = prazoFmt;
  window.diasRestantes = diasRestantes;
  window.tag = tag;
  window.fmtDuracao = fmtDuracao;
  window.fmtHoras = fmtHoras;
  window.eyeIconSvg = eyeIconSvg;
  window.debounce = debounce;
})();
