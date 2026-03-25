(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/modules/state.js
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
  function setProjeto(p) {
    PROJETO = p;
  }
  function setGrupoAtual(g) {
    GRUPO_ATUAL = g;
  }
  function setVistaAtual(v) {
    VISTA_ATUAL = v;
  }
  function setTarefas(t) {
    TAREFAS = t;
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
  function setFiltroConcluidas(e) {
    LISTA_CONCLUIDAS_EXPANDIDA = e;
  }
  function setListaSort(s) {
    LISTA_SORT = s;
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
  var API, TOKEN, EU, PROJETO, GRUPO_ATUAL, VISTA_ATUAL, TAREFAS, ADMIN_MODE_KEY, ADMIN_MODE, FILTRO_STATUS, FILTRO_ORIGEM_DASH, FILTRO_GRUPO_DASH, BUSCA_DASH, _projsDash, _ativasDash, _gruposDash, LISTA_SORT, LISTA_CONCLUIDAS_EXPANDIDA, _prazoNotifShown, STARTDAY_COLLAPSE_KEY, REQ_TIMEOUT_MS, PROJ_CACHE_KEY, PROJ_CACHE_TTL;
  var init_state = __esm({
    "src/modules/state.js"() {
      API = "https://telier-api.pedroafsmaia.workers.dev";
      TOKEN = localStorage.getItem("ea_token");
      EU = JSON.parse(localStorage.getItem("ea_user") || "null");
      PROJETO = null;
      GRUPO_ATUAL = null;
      VISTA_ATUAL = "dash";
      TAREFAS = [];
      ADMIN_MODE_KEY = "ea_admin_mode";
      ADMIN_MODE = localStorage.getItem(ADMIN_MODE_KEY) || "admin";
      FILTRO_STATUS = "todos";
      FILTRO_ORIGEM_DASH = "todos";
      FILTRO_GRUPO_DASH = "todos";
      BUSCA_DASH = "";
      _projsDash = [];
      _ativasDash = [];
      _gruposDash = [];
      LISTA_SORT = { col: null, dir: "asc" };
      LISTA_CONCLUIDAS_EXPANDIDA = false;
      _prazoNotifShown = /* @__PURE__ */ new Set();
      STARTDAY_COLLAPSE_KEY = "telier_startday_collapsed";
      REQ_TIMEOUT_MS = 15e3;
      PROJ_CACHE_KEY = "telier_proj_cache";
      PROJ_CACHE_TTL = 1e4;
    }
  });

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
        const erroTexto = await res.text();
        let erroMsg = erroTexto || `HTTP ${res.status}`;
        try {
          const erroJson = JSON.parse(erroTexto);
          erroMsg = erroJson.error || erroJson.message || erroMsg;
        } catch {
        }
        throw new Error(erroMsg);
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
  function invalidarCacheProjetos() {
    try {
      sessionStorage.removeItem(PROJ_CACHE_KEY);
    } catch {
    }
  }
  var endpoints;
  var init_api = __esm({
    "src/modules/api.js"() {
      init_state();
      endpoints = {
        // Auth
        login: (usuario, senha) => req("POST", "/auth/login", { usuario_login: usuario, senha }),
        logout: () => req("POST", "/auth/logout"),
        register: (nome, usuario_login, senha) => req("POST", "/auth/register", { nome, usuario_login, senha }),
        setup: (nome, usuario_login, senha) => req("POST", "/auth/setup", { nome, usuario_login, senha }),
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
        resetUserPassword: (id, novaSenha) => req("PUT", `/usuarios/${id}/senha`, { nova_senha: novaSenha })
      };
    }
  });

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
  function alternarTema() {
    const html = document.documentElement;
    const tema = html.getAttribute("data-theme") || "dark";
    const novoTema = tema === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", novoTema);
    localStorage.setItem("ea_tema", novoTema);
  }
  function alternarPerfilAdmin() {
    const { ADMIN_MODE: ADMIN_MODE2, setAdminMode } = window;
    if (typeof ADMIN_MODE2 !== "undefined" && typeof setAdminMode === "function") {
      const novoMode = ADMIN_MODE2 === "admin" ? "normal" : "admin";
      setAdminMode(novoMode);
      toast(`Modo: ${novoMode === "admin" ? "Administrador" : "Membro"}`, "ok");
      window.renderDash?.();
    }
  }
  function mostrar(pagina) {
    if (pagina === "setup") {
      document.getElementById("page-login")?.classList.add("hidden");
      document.getElementById("page-setup")?.classList.remove("hidden");
      document.getElementById("page-app")?.classList.add("hidden");
    } else if (pagina === "app") {
      document.getElementById("page-login")?.classList.add("hidden");
      document.getElementById("page-setup")?.classList.add("hidden");
      document.getElementById("page-app")?.classList.remove("hidden");
    } else {
      document.getElementById("page-login")?.classList.remove("hidden");
      document.getElementById("page-setup")?.classList.add("hidden");
      document.getElementById("page-app")?.classList.add("hidden");
    }
  }
  var init_ui = __esm({
    "src/modules/ui.js"() {
    }
  });

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
  var init_utils = __esm({
    "src/modules/utils.js"() {
    }
  });

  // src/modules/notifications.js
  var notifications_exports = {};
  __export(notifications_exports, {
    abrirNotificacoes: () => abrirNotificacoes,
    carregarNotificacoes: () => carregarNotificacoes,
    carregarStatus: () => carregarStatus,
    fecharPainelNotificacoes: () => fecharPainelNotificacoes,
    iniciarPollNotificacoes: () => iniciarPollNotificacoes,
    iniciarStatusPoll: () => iniciarStatusPoll,
    marcarNotifLida: () => marcarNotifLida,
    marcarTodasNotifLidas: () => marcarTodasNotifLidas,
    pararPollNotificacoes: () => pararPollNotificacoes,
    renderPainelNotificacoes: () => renderPainelNotificacoes
  });
  async function carregarNotificacoes(silencioso = true) {
    if (!TOKEN) {
      if (!silencioso) console.warn("Cannot load notifications: no authentication token");
      return [];
    }
    try {
      const notifs = await req("GET", "/notificacoes");
      return notifs;
    } catch (e) {
      if (e.message?.includes("401") || e.status === 401) {
        console.error("Notifications 401 error - user may be unauthorized:", e);
      } else if (!silencioso) {
        toast(e.message, "erro");
      }
      return [];
    }
  }
  function iniciarPollNotificacoes(intervalo = 1e4) {
    if (!TOKEN) {
      console.warn("Cannot start notifications polling: no authentication token");
      return;
    }
    if (_pollNotifTimer) clearInterval(_pollNotifTimer);
    console.log("Starting notifications polling...");
    _pollNotifTimer = setInterval(() => carregarNotificacoes(true), intervalo);
  }
  function pararPollNotificacoes() {
    if (_pollNotifTimer) clearInterval(_pollNotifTimer);
  }
  async function marcarNotifLida(id, abrirLink = null) {
    try {
      await req("PUT", `/notificacoes/${id}/lida`, {});
      if (abrirLink) window.location.href = abrirLink;
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function marcarTodasNotifLidas() {
    try {
      await req("PUT", "/notificacoes/lidas", {});
      toast("Notifica\xE7\xF5es marcadas como lidas", "ok");
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  function renderPainelNotificacoes() {
    const panel = document.getElementById("notif-panel");
    if (!panel) return;
    panel.innerHTML = '<div style="padding: 16px; color: var(--text3); text-align: center;">Nenhuma notifica\xE7\xE3o</div>';
  }
  function abrirNotificacoes() {
    const panel = document.getElementById("notif-panel");
    const overlay = document.getElementById("notif-overlay");
    if (panel) panel.setAttribute("aria-hidden", "false");
    if (overlay) overlay.classList.remove("hidden");
  }
  function fecharPainelNotificacoes() {
    const panel = document.getElementById("notif-panel");
    const overlay = document.getElementById("notif-overlay");
    if (panel) panel.setAttribute("aria-hidden", "true");
    if (overlay) overlay.classList.add("hidden");
  }
  async function carregarStatus() {
    return null;
  }
  function iniciarStatusPoll() {
  }
  var _pollNotifTimer;
  var init_notifications = __esm({
    "src/modules/notifications.js"() {
      init_api();
      init_state();
      init_ui();
      init_utils();
      _pollNotifTimer = null;
      if (typeof window !== "undefined") {
        window.carregarNotificacoes = carregarNotificacoes;
        window.iniciarPollNotificacoes = iniciarPollNotificacoes;
        window.marcarNotifLida = marcarNotifLida;
        window.marcarTodasNotifLidas = marcarTodasNotifLidas;
        window.abrirNotificacoes = abrirNotificacoes;
        window.fecharPainelNotificacoes = fecharPainelNotificacoes;
        window.renderPainelNotificacoes = renderPainelNotificacoes;
      }
    }
  });

  // src/app.js
  init_state();
  init_api();

  // src/modules/auth.js
  init_api();
  init_state();
  init_ui();
  async function init() {
    const renderTimeout = setTimeout(() => {
      if (TOKEN) {
        console.warn("Auth API timeout - showing app despite unverified token");
        mostrarApp();
        return true;
      } else {
        console.warn("Auth API timeout - showing login");
        mostrarLogin();
        return false;
      }
    }, 3e4);
    try {
      if (TOKEN) {
        try {
          const user = await endpoints.me();
          clearTimeout(renderTimeout);
          setEU(user);
          mostrarApp();
          return true;
        } catch (erro) {
          clearTimeout(renderTimeout);
          console.error("Auth error:", erro);
          clearAuth();
          mostrarLogin();
          return false;
        }
      } else {
        try {
          const { needs_setup } = await endpoints.needsSetup();
          clearTimeout(renderTimeout);
          if (needs_setup) {
            mostrarSetup();
          } else {
            mostrarLogin();
          }
          return false;
        } catch (erro) {
          clearTimeout(renderTimeout);
          console.error("Setup check error:", erro);
          mostrarLogin();
          return false;
        }
      }
    } catch (erro) {
      clearTimeout(renderTimeout);
      console.error("Auth init error:", erro);
      mostrarLogin();
      return false;
    }
  }
  async function fazerLogin() {
    const usuario = document.getElementById("l-login")?.value;
    const senha = document.getElementById("l-senha")?.value;
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
        const { iniciarPollNotificacoes: iniciarPollNotificacoes2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
        iniciarPollNotificacoes2?.();
      }
    } catch (erro) {
      toast(`Erro ao fazer login: ${erro.message}`, "erro");
    } finally {
      document.getElementById("btn-login")?.classList.remove("btn-loading");
      document.getElementById("btn-login").disabled = false;
    }
  }
  async function fazerSetup(forceChange = false) {
    const nome = document.getElementById("s-nome")?.value;
    const senha = document.getElementById("s-senha")?.value;
    const confirma = document.getElementById("s-confirma")?.value;
    if (forceChange) {
      if (!senha || !confirma) {
        toast("Preencha os campos de senha", "erro");
        return;
      }
    } else {
      const login = document.getElementById("s-login")?.value;
      if (!nome || !login || !senha || !confirma) {
        toast("Preencha todos os campos", "erro");
        return;
      }
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
        const login = document.getElementById("s-login")?.value;
        const { token, usuario: user } = await endpoints.setup(nome, login, senha);
        setToken(token);
        setEU(user);
        toast("Conta criada com sucesso", "ok");
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
    const { pararPollNotificacoes: pararPollNotificacoes2 } = await Promise.resolve().then(() => (init_notifications(), notifications_exports));
    pararPollNotificacoes2?.();
    clearAuth();
    mostrarLogin();
    toast("Logout realizado", "ok");
  }
  async function modalCadastroPublico() {
    const html = `
    <form style="display: flex; flex-direction: column; gap: 12px;">
      <input type="text" id="cadastro-nome" placeholder="Nome completo" class="input-control" />
      <input type="text" id="cadastro-login" placeholder="Nome de usu\xE1rio (ex: joao_silva)" class="input-control" autocomplete="username" />
      <input type="password" id="cadastro-senha" placeholder="Senha" class="input-control" autocomplete="new-password" />
      <input type="password" id="cadastro-confirma" placeholder="Confirmar senha" class="input-control" autocomplete="new-password" />
      <button type="button" class="btn btn-primary" onclick="fazerCadastroPublico()" id="btn-cadastro">
        Cadastrar
      </button>
    </form>
  `;
    window.abrirModal?.(html, { titulo: "Criar minha conta" });
  }
  async function fazerCadastroPublico() {
    const nome = document.getElementById("cadastro-nome")?.value;
    const usuario_login = document.getElementById("cadastro-login")?.value;
    const senha = document.getElementById("cadastro-senha")?.value;
    const confirma = document.getElementById("cadastro-confirma")?.value;
    if (!nome || !usuario_login || !senha || !confirma) {
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
      const btnCadastro = document.getElementById("btn-cadastro");
      btnCadastro.classList.add("btn-loading");
      btnCadastro.disabled = true;
      await endpoints.register(nome, usuario_login, senha);
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

  // src/app.js
  init_ui();
  init_utils();

  // src/modules/dashboard.js
  init_api();
  init_state();
  init_ui();
  init_utils();
  function isAdminRole2() {
    return EU?.papel === "admin";
  }
  function isAdmin2() {
    return isAdminRole2() && ADMIN_MODE === "admin";
  }
  var DASH_FILTERS_KEY = "telier_dash_filters_v1";
  function goHome() {
    renderDash();
  }
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
  var _debouncedFiltro = debounce((v) => {
    setBuscaDash(v);
    salvarFiltrosDash();
    renderDash();
  }, 200);
  function filtrarProjetosBusca(v) {
    _debouncedFiltro(v);
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
    const collapsed = localStorage.getItem(STARTDAY_COLLAPSE_KEY) !== "0";
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
      const temFoco = p.minha_tarefa_foco_id && p.minha_tarefa_foco;
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
          ${temFoco ? `<div class="proj-foco-hint">\u2B50 ${esc(p.minha_tarefa_foco)}</div>` : ""}
        </div>
        <div class="proj-card-footer">
          <div class="proj-meta">
            ${prazoFmt(p.prazo) ? `<span class="proj-meta-item${urgente ? " urgent" : ""}">\u{1F4C5} ${prazoFmt(p.prazo)}</span>` : ""}
            ${p.area_m2 ? `<span class="proj-meta-item">\u{1F4D0} ${Math.round(p.area_m2)} m\xB2</span>` : ""}
          </div>
          <div class="proj-card-actions">
            <div class="proj-status">${tag(statusProjeto)}</div>
            ${temFoco ? `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); iniciarCronometro('${p.minha_tarefa_foco_id}', '${esc(p.minha_tarefa_foco)}')">\u23F1\uFE0F Iniciar</button>` : ""}
          </div>
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

  // src/modules/project.js
  init_api();
  init_state();
  init_ui();
  init_utils();

  // src/modules/tasks.js
  init_api();
  init_state();
  init_ui();
  init_utils();
  var STATUS_ORDEM = ["A fazer", "Em andamento", "Em revis\xE3o", "Conclu\xEDdo"];
  var PRIORIDADE_ORDEM = ["Alta", "M\xE9dia", "Baixa"];
  var prazoDe = (t) => t.prazo || t.data || "";
  function renderKanban(tarefas, container) {
    if (!container) return;
    const grouped = {};
    STATUS_ORDEM.forEach((s) => grouped[s] = tarefas.filter((t) => t.status === s));
    const projetoIds = new Set((tarefas || []).map((t) => t.projeto_id).filter(Boolean));
    const canCreate = !!PROJETO?.id && projetoIds.size <= 1 && (projetoIds.size === 0 || projetoIds.has(PROJETO.id));
    container.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px">${canCreate ? `<button class="btn btn-sm btn-primary" onclick="modalNovaTarefa('${PROJETO?.id || ""}')">+ Nova tarefa</button>` : ""}</div>
    <div class="kanban-board">
      ${STATUS_ORDEM.map((status) => `<div class="kanban-col"><div class="kanban-header"><h3>${status}</h3><span class="kanban-count">${grouped[status].length}</span></div><div class="kanban-items">${grouped[status].map((t) => `<div class="kanban-card" onclick="abrirTarefa('${t.id}')"><div class="card-title">${esc(t.nome)}</div><div class="card-meta">${t.prioridade ? `<span>${tag(t.prioridade)}</span>` : ""}${prazoDe(t) ? `<span class="card-prazo">\u{1F4C5} ${esc(prazoDe(t))}</span>` : ""}</div></div>`).join("")}</div></div>`).join("")}
    </div>`;
  }
  function renderLista(tarefas, container) {
    if (!container) return;
    const base = [...tarefas];
    const projetoIds = new Set((tarefas || []).map((t) => t.projeto_id).filter(Boolean));
    const canCreate = !!PROJETO?.id && projetoIds.size <= 1 && (projetoIds.size === 0 || projetoIds.has(PROJETO.id));
    if (LISTA_SORT.col) {
      base.sort((a, b) => {
        const dir = LISTA_SORT.dir === "asc" ? 1 : -1;
        if (LISTA_SORT.col === "nome") return a.nome.localeCompare(b.nome) * dir;
        if (LISTA_SORT.col === "prioridade") return (PRIORIDADE_ORDEM.indexOf(a.prioridade) - PRIORIDADE_ORDEM.indexOf(b.prioridade) || 0) * dir;
        if (LISTA_SORT.col === "prazo") return (new Date(prazoDe(a) || "2999-01-01") - new Date(prazoDe(b) || "2999-01-01")) * dir;
        return 0;
      });
    }
    const concluidas = base.filter((t) => t.status === "Conclu\xEDdo");
    const ativas = base.filter((t) => t.status !== "Conclu\xEDdo");
    container.innerHTML = `
    <div class="lista-view">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">${canCreate ? `<button class="btn btn-sm btn-primary" onclick="modalNovaTarefa('${PROJETO?.id || ""}')">+ Nova tarefa</button>` : ""}</div>
      ${ativas.length ? `<div class="lista-section"><div class="lista-header"><h3>Ativas</h3><span class="lista-count">${ativas.length}</span></div><table class="lista-table"><thead><tr><th onclick="ordenarLista('nome')">Tarefa</th><th onclick="ordenarLista('prioridade')">Prioridade</th><th onclick="ordenarLista('prazo')">Prazo</th><th>Status</th></tr></thead><tbody>${ativas.map((t) => `<tr onclick="abrirTarefa('${t.id}')"><td><strong>${esc(t.nome)}</strong></td><td>${t.prioridade ? tag(t.prioridade) : "-"}</td><td>${esc(prazoDe(t) || "-")}</td><td>${tag(t.status)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${concluidas.length ? `<div class="lista-section"><button class="lista-section-toggle" onclick="toggleListaConcluidas()">${LISTA_CONCLUIDAS_EXPANDIDA ? "\u25BC" : "\u25B6"} Conclu\xEDdas (${concluidas.length})</button>${LISTA_CONCLUIDAS_EXPANDIDA ? `<table class="lista-table is-concluded"><tbody>${concluidas.map((t) => `<tr onclick="abrirTarefa('${t.id}')"><td><del>${esc(t.nome)}</del></td><td>${esc(prazoDe(t) || "-")}</td></tr>`).join("")}</tbody></table>` : ""}</div>` : ""}
    </div>`;
  }
  function renderMapa(tarefas, container) {
    if (!container) return;
    const comPrazo = tarefas.filter((t) => prazoDe(t) && t.status !== "Conclu\xEDdo").sort((a, b) => new Date(prazoDe(a)) - new Date(prazoDe(b)));
    if (!comPrazo.length) {
      container.innerHTML = '<div class="empty-small">Nenhuma tarefa com prazo</div>';
      return;
    }
    container.innerHTML = `<div class="mapa-timeline">${comPrazo.map((t) => {
      const dias = Math.ceil((new Date(prazoDe(t)) - /* @__PURE__ */ new Date()) / 864e5);
      return `<div class="mapa-item ${dias <= 7 && dias > 0 ? "urgente" : ""}" onclick="abrirTarefa('${t.id}')"><div class="mapa-dot"></div><div class="mapa-content"><div class="mapa-title">${esc(t.nome)}</div><div class="mapa-date">${esc(prazoDe(t))}</div></div></div>`;
    }).join("")}</div>`;
  }
  async function renderRelatorio(tarefas, container) {
    if (!container) return;
    const stats = {
      total: tarefas.length,
      concluidas: tarefas.filter((t) => t.status === "Conclu\xEDdo").length,
      ativas: tarefas.filter((t) => t.status !== "Conclu\xEDdo").length,
      horas: tarefas.reduce((sum, t) => sum + (Number(t.total_horas) || 0), 0)
    };
    const pctConcluidas = stats.total ? Math.round(stats.concluidas / stats.total * 100) : 0;
    container.innerHTML = `<div class="relatorio-view"><div class="relatorio-cards"><div class="stat-card"><div class="stat-label">Total de tarefas</div><div class="stat-value">${stats.total}</div></div><div class="stat-card"><div class="stat-label">Conclu\xEDdas</div><div class="stat-value">${stats.concluidas}<span class="stat-pct">${pctConcluidas}%</span></div></div><div class="stat-card"><div class="stat-label">Ativas</div><div class="stat-value">${stats.ativas}</div></div><div class="stat-card"><div class="stat-label">Horas trabalhadas</div><div class="stat-value">${fmtHoras(stats.horas)}</div></div></div></div>`;
  }
  async function reloadProjetoTarefas() {
    if (!PROJETO?.id) return;
    const tarefas = await req("GET", `/projetos/${PROJETO.id}/tarefas`);
    setTarefas(tarefas);
    window.mudarAba?.(sessionStorage.getItem(`telier_proj_aba_${PROJETO.id}`) || "tarefas");
  }
  async function mudarStatus(tarefaId, novoStatus, selEl) {
    const old = selEl?.value;
    if (selEl) selEl.value = novoStatus;
    try {
      await req("PATCH", `/tarefas/${tarefaId}`, { status: novoStatus });
      await reloadProjetoTarefas();
      toast(`Status atualizado para ${novoStatus}`, "ok");
    } catch (e) {
      if (selEl) selEl.value = old;
      toast(e.message, "erro");
    }
  }
  async function toggleFoco(id, focoAtual) {
    try {
      if (focoAtual) await req("DELETE", `/tarefas/${id}/foco`);
      else await req("PUT", `/tarefas/${id}/foco`, {});
      await reloadProjetoTarefas();
      toast(focoAtual ? "Removido do foco" : "Adicionado ao foco", "ok");
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function deletarTarefa(id) {
    confirmar("Deseja deletar esta tarefa?", async () => {
      try {
        await req("DELETE", `/tarefas/${id}`, {});
        await reloadProjetoTarefas();
        toast("Tarefa deletada", "ok");
      } catch (e) {
        toast(e.message, "erro");
      }
    });
  }
  function renderColabsStack(ids = [], max = 3) {
    return ids.slice(0, max).map(() => `<span class="colab-avatar">${avatar("Colaborador", "xs")}</span>`).join("");
  }
  function ordenarLista(col) {
    const dir = LISTA_SORT.col === col && LISTA_SORT.dir === "asc" ? "desc" : "asc";
    setListaSort({ col, dir });
    window.mudarAba?.("tarefas");
  }
  function toggleListaConcluidas() {
    setFiltroConcluidas(!LISTA_CONCLUIDAS_EXPANDIDA);
    window.mudarAba?.("tarefas");
  }
  function formTaskHtml(task = {}) {
    return `<form id="form-task" class="form-grid">
    <input name="nome" placeholder="Nome" value="${esc(task.nome || "")}" required>
    <textarea name="descricao" placeholder="Descri\xE7\xE3o">${esc(task.descricao || "")}</textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <select name="status"><option ${task.status === "A fazer" ? "selected" : ""}>A fazer</option><option ${task.status === "Em andamento" ? "selected" : ""}>Em andamento</option><option ${task.status === "Em revis\xE3o" ? "selected" : ""}>Em revis\xE3o</option><option ${task.status === "Conclu\xEDdo" ? "selected" : ""}>Conclu\xEDdo</option></select>
      <select name="prioridade"><option ${task.prioridade === "Alta" ? "selected" : ""}>Alta</option><option ${task.prioridade === "M\xE9dia" ? "selected" : ""}>M\xE9dia</option><option ${task.prioridade === "Baixa" ? "selected" : ""}>Baixa</option></select>
    </div>
    <input name="data" type="date" value="${esc(prazoDe(task) || "")}">
    <button class="btn btn-primary" type="submit">Salvar</button>
  </form>`;
  }
  async function modalNovaTarefa(projetoId) {
    const overlay = window.abrirModal?.(formTaskHtml(), { titulo: "Nova Tarefa" });
    overlay?.querySelector("#form-task")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget).entries());
      await req("POST", `/projetos/${projetoId}/tarefas`, body);
      fecharModal();
      await reloadProjetoTarefas();
      toast("Tarefa criada", "ok");
    });
  }
  async function modalEditarTarefa(id) {
    const t = TAREFAS.find((x) => x.id === id);
    if (!t) return toast("Tarefa n\xE3o encontrada", "erro");
    const overlay = window.abrirModal?.(formTaskHtml(t), { titulo: "Editar Tarefa" });
    overlay?.querySelector("#form-task")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await req("PUT", `/tarefas/${id}`, Object.fromEntries(new FormData(e.currentTarget).entries()));
      fecharModal();
      await reloadProjetoTarefas();
      toast("Tarefa atualizada", "ok");
    });
  }
  async function abrirTarefa(id) {
    const t = TAREFAS.find((x) => x.id === id);
    if (!t) return toast("Tarefa n\xE3o encontrada", "erro");
    const html = `<div><h3 style="margin-bottom:8px">${esc(t.nome)}</h3><div class="muted-detail" style="margin-bottom:8px">${esc(t.descricao || "Sem descri\xE7\xE3o")}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${tag(t.status)}${tag(t.prioridade || "M\xE9dia")}</div><div style="margin-top:12px;display:flex;gap:8px"><button class="btn" onclick="modalEditarTarefa('${id}')">Editar</button><button class="btn" onclick="duplicarTarefa('${id}')">Duplicar</button><button class="btn btn-danger" onclick="deletarTarefa('${id}')">Excluir</button></div></div>`;
    window.abrirModal?.(html, { titulo: "Detalhes da tarefa" });
  }
  async function duplicarTarefa(id) {
    await req("POST", `/tarefas/${id}/duplicar`, {});
    await reloadProjetoTarefas();
    toast("Tarefa duplicada", "ok");
  }
  function dragTarefa(e, tarefaId) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("tarefa-id", tarefaId);
  }
  if (typeof window !== "undefined") {
    window.renderKanban = renderKanban;
    window.renderLista = renderLista;
    window.renderMapa = renderMapa;
    window.renderRelatorio = renderRelatorio;
    window.mudarStatus = mudarStatus;
    window.toggleFoco = toggleFoco;
    window.deletarTarefa = deletarTarefa;
    window.renderColabsStack = renderColabsStack;
    window.ordenarLista = ordenarLista;
    window.toggleListaConcluidas = toggleListaConcluidas;
    window.modalNovaTarefa = modalNovaTarefa;
    window.modalEditarTarefa = modalEditarTarefa;
    window.abrirTarefa = abrirTarefa;
    window.duplicarTarefa = duplicarTarefa;
    window.dragTarefa = dragTarefa;
  }

  // src/modules/project.js
  var _decisoesAtivas = [];
  var _projetosGrupoAtual = [];
  var _grupoTarefas = [];
  function isAdminRole3() {
    return EU?.papel === "admin";
  }
  function isAdmin3() {
    return isAdminRole3() && ADMIN_MODE === "admin";
  }
  function setBreadcrumb2(partes) {
    const el = document.getElementById("topbar-breadcrumb");
    if (!el) return;
    if (!partes.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = partes.map(
      (p, i) => `<span>${i > 0 ? " / " : ""}${typeof p === "string" ? p : `<button onclick="${p.onClick || `abrirProjeto('${p.id}')`}">${esc(p.nome)}</button>`}</span>`
    ).join("");
  }
  function slideContent2(direction) {
    const c = document.getElementById("content");
    if (!c) return;
    c.style.animation = `slideContent${direction === "left" ? "In" : "Out"} .3s ease-out forwards`;
  }
  async function abrirProjeto(id) {
    window.scrollTo(0, 0);
    const c = document.getElementById("content");
    c.innerHTML = '<div class="empty-small">Carregando projeto...</div>';
    try {
      const [projeto, tarefas, decisoes, resumoHoras] = await Promise.all([
        req("GET", `/projetos/${id}`),
        req("GET", `/projetos/${id}/tarefas`),
        req("GET", `/projetos/${id}/decisoes`).catch(() => []),
        req("GET", `/projetos/${id}/horas-por-usuario`).catch(() => [])
      ]);
      const abaSalva = sessionStorage.getItem(`telier_proj_aba_${id}`) || "tarefas";
      slideContent2("right");
      renderProjeto(projeto, tarefas, decisoes, abaSalva, resumoHoras);
      setProjeto(projeto);
      setTarefas(tarefas);
      setVistaAtual("projeto");
    } catch (e) {
      c.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
    }
  }
  function voltarDash() {
    slideContent2("left");
    invalidarCacheProjetos();
    renderDash();
  }
  async function abrirGrupo(id) {
    window.scrollTo(0, 0);
    const c = document.getElementById("content");
    c.innerHTML = '<div class="empty-small">Carregando grupo...</div>';
    try {
      const [grupo, projetos] = await Promise.all([
        req("GET", `/grupos/${id}`),
        req("GET", `/projetos`)
      ]);
      const projetosDoGrupo = projetos.filter((p) => p.grupo_id === id);
      const abaSalva = sessionStorage.getItem(`telier_grupo_aba_${id}`) || "projetos";
      slideContent2("right");
      await renderGrupo(grupo, projetosDoGrupo, abaSalva);
      setGrupoAtual(grupo);
      setVistaAtual("grupo");
    } catch (e) {
      c.innerHTML = `<div class="error-block">${esc(e.message)}</div>`;
    }
  }
  function renderProjeto(proj, tarefas, decisoes, abaAtiva) {
    setProjeto(proj);
    setTarefas(tarefas);
    _decisoesAtivas = decisoes || [];
    const statusProj = normalizarStatusProjeto(proj.status);
    const isArq = statusProj === "Arquivado";
    const podeEditar = !isArq && (proj.pode_editar || isAdmin3());
    setBreadcrumb2([
      { id: null, nome: "Projetos", onClick: "voltarDash()" },
      { id: proj.id, nome: proj.nome }
    ]);
    document.getElementById("content").innerHTML = `
    <button class="btn-back" onclick="voltarDash()">\u2190 Voltar para projetos</button>
    <div class="proj-hero" data-status="${esc(proj.status || "A fazer")}">
      <div class="proj-hero-top">
        <div class="proj-hero-left">
          <div class="proj-nome ${isArq ? "is-muted" : ""}">${esc(proj.nome)}</div>
          ${proj.descricao ? `<div class="proj-dono muted-detail">${esc(proj.descricao)}</div>` : ""}
        </div>
        <div class="proj-hero-actions">
          ${podeEditar ? `<button class="btn btn-sm" onclick="modalEditarProjeto('${proj.id}')">Editar projeto</button>` : ""}
          <button class="btn btn-sm" onclick="modalPermissoes('${proj.id}')">Compartilhar</button>
        </div>
      </div>
      <div class="proj-meta">
        <div class="proj-meta-item"><span class="proj-meta-label">Status</span>${tag(proj.status || "A fazer")}</div>
        ${proj.prazo ? `<div class="proj-meta-item"><span class="proj-meta-label">Prazo</span><span class="tag tag-gray">${proj.prazo}</span></div>` : ""}
      </div>
      ${isArq ? `<div class="alert-banner">Projeto arquivado \u2014 apenas leitura.</div>` : ""}
    </div>
    <div class="abas abas-spaced">
      <button class="aba ${abaAtiva === "tarefas" ? "ativa" : ""}" data-aba="tarefas" onclick="mudarAba('tarefas')">Tarefas</button>
      <button class="aba ${abaAtiva === "kanban" ? "ativa" : ""}" data-aba="kanban" onclick="mudarAba('kanban')">Kanban</button>
      <button class="aba ${abaAtiva === "mapa" ? "ativa" : ""}" data-aba="mapa" onclick="mudarAba('mapa')">Mapa de Foco</button>
      <button class="aba ${abaAtiva === "relatorio" ? "ativa" : ""}" data-aba="relatorio" onclick="mudarAba('relatorio')">Relat\xF3rio</button>
      <button class="aba ${abaAtiva === "decisoes" ? "ativa" : ""}" data-aba="decisoes" onclick="mudarAba('decisoes')">Decis\xF5es</button>
    </div>
    <div id="aba-conteudo"></div>`;
    mudarAba(abaAtiva);
  }
  async function renderGrupo(grupo, projetos, abaAtiva = "projetos") {
    setGrupoAtual(grupo);
    _projetosGrupoAtual = projetos || [];
    _grupoTarefas = [];
    const podeGer = grupo.pode_gerenciar || isAdmin3();
    setBreadcrumb2([
      { id: null, nome: "Projetos", onClick: "voltarDash()" },
      { id: grupo.id, nome: grupo.nome, onClick: `abrirGrupo('${grupo.id}')` }
    ]);
    document.getElementById("content").innerHTML = `
    <button class="btn-back" onclick="voltarDash()">\u2190 Voltar para projetos</button>
    <div class="proj-hero" data-status="${esc(grupo.status || "Ativo")}">
      <div class="proj-hero-top">
        <div class="proj-hero-left">
          <div class="proj-nome">${esc(grupo.nome)}</div>
          ${grupo.descricao ? `<div class="proj-dono muted-detail">${esc(grupo.descricao)}</div>` : ""}
        </div>
        <div class="proj-hero-actions">
          ${podeGer ? `<button class="btn btn-sm" onclick="modalEditarGrupo('${grupo.id}')">Editar grupo</button>` : ""}
          <button class="btn btn-sm" onclick="compartilharGrupo('${grupo.id}')">Compartilhar</button>
        </div>
      </div>
    </div>
    <div class="abas abas-spaced">
      <button class="aba ${abaAtiva === "projetos" ? "ativa" : ""}" data-aba="projetos" onclick="mudarAbaGrupo('projetos')">Projetos</button>
      <button class="aba ${abaAtiva === "tarefas" ? "ativa" : ""}" data-aba="tarefas" onclick="mudarAbaGrupo('tarefas')">Tarefas</button>
      <button class="aba ${abaAtiva === "mapa" ? "ativa" : ""}" data-aba="mapa" onclick="mudarAbaGrupo('mapa')">Mapa</button>
      <button class="aba ${abaAtiva === "relatorio" ? "ativa" : ""}" data-aba="relatorio" onclick="mudarAbaGrupo('relatorio')">Relat\xF3rio</button>
      <button class="aba ${abaAtiva === "aovivo" ? "ativa" : ""}" data-aba="aovivo" onclick="mudarAbaGrupo('aovivo')">Ao vivo</button>
    </div>
    <div id="aba-grupo"></div>`;
    await renderAbaGrupo(abaAtiva, projetos);
  }
  function mudarAba(aba) {
    document.querySelectorAll(".aba").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
    sessionStorage.setItem(`telier_proj_aba_${PROJETO?.id}`, aba);
    const container = document.getElementById("aba-conteudo");
    if (!container) return;
    switch (aba) {
      case "tarefas":
        renderLista(TAREFAS, container);
        break;
      case "kanban":
        renderKanban(TAREFAS, container);
        break;
      case "mapa":
        renderMapa(TAREFAS, container);
        break;
      case "relatorio":
        renderRelatorio(TAREFAS, container, PROJETO?.id);
        break;
      case "decisoes":
        renderAbaDecisoes(container);
        break;
      default:
        container.innerHTML = "";
    }
  }
  function mudarAbaGrupo(aba) {
    document.querySelectorAll(".aba").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
    sessionStorage.setItem(`telier_grupo_aba_${GRUPO_ATUAL?.id}`, aba);
    renderAbaGrupo(aba, _projetosGrupoAtual);
  }
  async function carregarTarefasDoGrupo(projetos) {
    const listas = await Promise.all((projetos || []).map((p) => req("GET", `/projetos/${p.id}/tarefas`).catch(() => [])));
    return listas.flat().map((t) => ({ ...t, projeto_nome: projetos.find((p) => p.id === t.projeto_id)?.nome || "" }));
  }
  function renderAbaDecisoes(container) {
    if (!_decisoesAtivas.length) {
      container.innerHTML = '<div class="empty-small">Nenhuma decis\xE3o registrada</div>';
      return;
    }
    container.innerHTML = `<div class="decisoes-list">${_decisoesAtivas.map((d) => `<div class="decisao-item"><div class="decisao-titulo">${esc(d.titulo || d.texto || d.descricao || "\u2014")}</div></div>`).join("")}</div>`;
  }
  async function renderAbaGrupo(aba, projetos) {
    const el = document.getElementById("aba-grupo");
    if (!el) return;
    if (aba === "projetos") {
      if (!projetos?.length) {
        el.innerHTML = '<div class="empty-small">Nenhum projeto neste grupo</div>';
        return;
      }
      el.innerHTML = `<div class="cards-grid">${projetos.map((p) => `<div class="proj-card" onclick="abrirProjeto('${p.id}')"><div class="proj-title">${esc(p.nome)}</div><div class="proj-status">${tag(p.status || "A fazer")}</div></div>`).join("")}</div>`;
      return;
    }
    if (!_grupoTarefas.length && ["tarefas", "mapa", "relatorio"].includes(aba)) {
      el.innerHTML = '<div class="empty-small">Carregando tarefas do grupo...</div>';
      _grupoTarefas = await carregarTarefasDoGrupo(projetos);
    }
    if (aba === "tarefas") return renderLista(_grupoTarefas, el);
    if (aba === "mapa") return renderMapa(_grupoTarefas, el);
    if (aba === "relatorio") return renderRelatorio(_grupoTarefas, el, null);
    if (aba === "aovivo") {
      const ids = new Set((projetos || []).map((p) => p.id));
      const ativas = await req("GET", "/tempo/ativas").catch(() => []);
      const filtradas = ativas.filter((a) => ids.has(a.projeto_id));
      el.innerHTML = filtradas.length ? `<div class="sessoes-list">${filtradas.map((s) => `<div class="sessao-item"><strong>${esc(s.usuario_nome || s.usuario_login || "Usu\xE1rio")}</strong> \xB7 ${esc(s.tarefa_nome)} <span class="muted-detail">(${esc(s.projeto_nome)})</span></div>`).join("")}</div>` : '<div class="empty-small">Nenhum cron\xF4metro ativo neste grupo</div>';
      return;
    }
    el.innerHTML = "";
  }
  async function modalNovoProjeto(preselectGrupoId = "") {
    const grupos = await req("GET", "/grupos").catch(() => []);
    const { abrirModal: abrirModal2 } = window;
    const html = `
    <form id="form-novo-projeto" class="form-grid">
      <input name="nome" placeholder="Nome do projeto" required>
      <textarea name="descricao" placeholder="Descri\xE7\xE3o"></textarea>
      <select name="status"><option>A fazer</option><option>Em andamento</option><option>Em revis\xE3o</option><option>Pausado</option><option>Conclu\xEDdo</option><option>Arquivado</option></select>
      <input name="prazo" type="date">
      <input name="area_m2" type="number" step="0.01" placeholder="\xC1rea (m\xB2)">
      <select name="grupo_id"><option value="">Sem grupo</option>${grupos.map((g) => `<option value="${g.id}" ${preselectGrupoId === g.id ? "selected" : ""}>${esc(g.nome)}</option>`).join("")}</select>
      <div><button class="btn btn-primary" type="submit">Criar projeto</button></div>
    </form>`;
    const overlay = abrirModal2?.(html, { titulo: "Novo Projeto" });
    overlay?.querySelector("#form-novo-projeto")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      try {
        const body = Object.fromEntries(fd.entries());
        await req("POST", "/projetos", body);
        fecharModal();
        invalidarCacheProjetos();
        await renderDash();
        toast("Projeto criado", "ok");
      } catch (err) {
        toast(err.message, "erro");
      }
    });
  }
  async function modalEditarProjeto(id) {
    const [projeto, grupos] = await Promise.all([req("GET", `/projetos/${id}`), req("GET", "/grupos").catch(() => [])]);
    const { abrirModal: abrirModal2 } = window;
    const html = `
    <form id="form-editar-projeto" class="form-grid">
      <input name="nome" value="${esc(projeto.nome || "")}" required>
      <input name="fase" value="${esc(projeto.fase || "Estudo preliminar")}" placeholder="Fase">
      <select name="status"><option ${projeto.status === "A fazer" ? "selected" : ""}>A fazer</option><option ${projeto.status === "Em andamento" ? "selected" : ""}>Em andamento</option><option ${projeto.status === "Em revis\xE3o" ? "selected" : ""}>Em revis\xE3o</option><option ${projeto.status === "Pausado" ? "selected" : ""}>Pausado</option><option ${projeto.status === "Conclu\xEDdo" ? "selected" : ""}>Conclu\xEDdo</option><option ${projeto.status === "Arquivado" ? "selected" : ""}>Arquivado</option></select>
      <select name="prioridade"><option ${projeto.prioridade === "Alta" ? "selected" : ""}>Alta</option><option ${projeto.prioridade === "M\xE9dia" ? "selected" : ""}>M\xE9dia</option><option ${projeto.prioridade === "Baixa" ? "selected" : ""}>Baixa</option></select>
      <input name="prazo" type="date" value="${esc(projeto.prazo || "")}">
      <input name="area_m2" type="number" step="0.01" value="${esc(projeto.area_m2 || "")}">
      <select name="grupo_id"><option value="">Sem grupo</option>${grupos.map((g) => `<option value="${g.id}" ${projeto.grupo_id === g.id ? "selected" : ""}>${esc(g.nome)}</option>`).join("")}</select>
      <div><button class="btn btn-primary" type="submit">Salvar</button></div>
    </form>`;
    const overlay = abrirModal2?.(html, { titulo: "Editar Projeto" });
    overlay?.querySelector("#form-editar-projeto")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget).entries());
      try {
        await req("PUT", `/projetos/${id}`, body);
        fecharModal();
        invalidarCacheProjetos();
        await abrirProjeto(id);
        toast("Projeto atualizado", "ok");
      } catch (err) {
        toast(err.message, "erro");
      }
    });
  }
  async function modalPermissoes(projetoId) {
    const [projeto, usuarios] = await Promise.all([req("GET", `/projetos/${projetoId}`), req("GET", "/usuarios")]);
    const { abrirModal: abrirModal2 } = window;
    const html = `
    <div>
      <div class="muted-detail" style="margin-bottom:8px">Dono: ${esc(projeto.dono_nome || "\u2014")}</div>
      <form id="form-add-perm" style="display:flex;gap:8px;margin-bottom:12px">
        <select name="usuario_id" style="flex:1"><option value="">Selecionar usu\xE1rio</option>${usuarios.filter((u) => u.id !== projeto.dono_id).map((u) => `<option value="${u.id}">${esc(u.nome)} (${esc(u.usuario_login)})</option>`).join("")}</select>
        <button class="btn" type="submit">Adicionar</button>
      </form>
      <div>${(projeto.editores || []).map((ed) => `<div class="sessao-item" style="display:flex;justify-content:space-between"><span>${esc(ed.nome)} <small class="muted-detail">${esc(ed.origem || "manual")}</small></span>${ed.origem === "manual" ? `<button class="btn btn-sm" onclick="removerPermissaoProjeto('${projetoId}','${ed.usuario_id}')">Remover</button>` : ""}</div>`).join("") || '<div class="empty-small">Sem editores adicionais</div>'}</div>
    </div>`;
    const overlay = abrirModal2?.(html, { titulo: "Permiss\xF5es do projeto" });
    overlay?.querySelector("#form-add-perm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const usuario_id = new FormData(e.currentTarget).get("usuario_id");
      if (!usuario_id) return;
      try {
        await req("POST", `/projetos/${projetoId}/permissoes`, { usuario_id });
        fecharModal();
        modalPermissoes(projetoId);
      } catch (err) {
        toast(err.message, "erro");
      }
    });
  }
  async function removerPermissaoProjeto(projetoId, usuarioId) {
    await req("DELETE", `/projetos/${projetoId}/permissoes/${usuarioId}`);
    toast("Permiss\xE3o removida", "ok");
    fecharModal();
    modalPermissoes(projetoId);
  }
  async function modalNovoGrupo() {
    const { abrirModal: abrirModal2 } = window;
    const html = `<form id="form-novo-grupo" class="form-grid"><input name="nome" placeholder="Nome" required><textarea name="descricao" placeholder="Descri\xE7\xE3o"></textarea><button class="btn btn-primary" type="submit">Criar grupo</button></form>`;
    const overlay = abrirModal2?.(html, { titulo: "Novo Grupo" });
    overlay?.querySelector("#form-novo-grupo")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await req("POST", "/grupos", Object.fromEntries(new FormData(e.currentTarget).entries()));
        fecharModal();
        renderDash();
        toast("Grupo criado", "ok");
      } catch (err) {
        toast(err.message, "erro");
      }
    });
  }
  async function modalEditarGrupo(id) {
    const grupo = await req("GET", `/grupos/${id}`);
    const { abrirModal: abrirModal2 } = window;
    const html = `<form id="form-editar-grupo" class="form-grid"><input name="nome" value="${esc(grupo.nome || "")}" required><textarea name="descricao">${esc(grupo.descricao || "")}</textarea><select name="status"><option ${grupo.status === "Ativo" ? "selected" : ""}>Ativo</option><option ${grupo.status === "Pausado" ? "selected" : ""}>Pausado</option><option ${grupo.status === "Arquivado" ? "selected" : ""}>Arquivado</option></select><button class="btn btn-primary" type="submit">Salvar</button></form>`;
    const overlay = abrirModal2?.(html, { titulo: "Editar Grupo" });
    overlay?.querySelector("#form-editar-grupo")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await req("PUT", `/grupos/${id}`, Object.fromEntries(new FormData(e.currentTarget).entries()));
      fecharModal();
      await abrirGrupo(id);
      toast("Grupo atualizado", "ok");
    });
  }
  async function compartilharGrupo(id) {
    const [grupo, usuarios] = await Promise.all([req("GET", `/grupos/${id}`), req("GET", "/usuarios")]);
    const { abrirModal: abrirModal2 } = window;
    const html = `
    <div>
      <form id="form-add-grupo" style="display:flex;gap:8px;margin-bottom:12px">
        <select name="usuario_id" style="flex:1"><option value="">Selecionar usu\xE1rio</option>${usuarios.filter((u) => u.id !== grupo.dono_id).map((u) => `<option value="${u.id}">${esc(u.nome)} (${esc(u.usuario_login)})</option>`).join("")}</select>
        <button class="btn" type="submit">Adicionar</button>
      </form>
      <div>${(grupo.colaboradores || []).map((c) => `<div class="sessao-item" style="display:flex;justify-content:space-between"><span>${esc(c.nome)}</span><button class="btn btn-sm" onclick="removerPermissaoGrupo('${id}','${c.usuario_id}')">Remover</button></div>`).join("") || '<div class="empty-small">Sem colaboradores</div>'}</div>
    </div>`;
    const overlay = abrirModal2?.(html, { titulo: `Compartilhar ${grupo.nome}` });
    overlay?.querySelector("#form-add-grupo")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const usuario_id = new FormData(e.currentTarget).get("usuario_id");
      if (!usuario_id) return;
      await req("POST", `/grupos/${id}/permissoes`, { usuario_id });
      fecharModal();
      compartilharGrupo(id);
    });
  }
  async function removerPermissaoGrupo(grupoId, usuarioId) {
    confirmar("Remover este colaborador do grupo?", async () => {
      await req("DELETE", `/grupos/${grupoId}/permissoes/${usuarioId}`);
      toast("Colaborador removido", "ok");
      fecharModal();
      compartilharGrupo(grupoId);
    });
  }
  if (typeof window !== "undefined") {
    window.abrirProjeto = abrirProjeto;
    window.voltarDash = voltarDash;
    window.abrirGrupo = abrirGrupo;
    window.renderProjeto = renderProjeto;
    window.renderGrupo = renderGrupo;
    window.mudarAba = mudarAba;
    window.mudarAbaGrupo = mudarAbaGrupo;
    window.modalNovoProjeto = modalNovoProjeto;
    window.modalEditarProjeto = modalEditarProjeto;
    window.modalPermissoes = modalPermissoes;
    window.modalNovoGrupo = modalNovoGrupo;
    window.modalEditarGrupo = modalEditarGrupo;
    window.compartilharGrupo = compartilharGrupo;
    window.removerPermissaoProjeto = removerPermissaoProjeto;
    window.removerPermissaoGrupo = removerPermissaoGrupo;
  }

  // src/modules/timer.js
  init_api();
  init_ui();
  init_utils();
  var _sessaoEditando = null;
  var _intervaloEditando = null;
  async function carregarTimersAtivos() {
    try {
      return await req("GET", "/tempo/ativas");
    } catch {
      return [];
    }
  }
  async function iniciarCronometro(tarefaId, tarefaNome) {
    try {
      const sessao = await req("POST", `/tarefas/${tarefaId}/tempo`, { inicio: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") });
      toast(`Cron\xF4metro iniciado: ${tarefaNome}`, "ok");
      renderTimerDock();
      return sessao;
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function pararCronometro(sessaoId) {
    try {
      await req("PUT", `/tempo/${sessaoId}/parar`, {});
      toast("Sess\xE3o finalizada", "ok");
      renderTimerDock();
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function renderTimerDock() {
    const dock = document.getElementById("timer-dock");
    if (!dock) return;
    try {
      const ativas = await req("GET", "/tempo/ativas");
      if (!ativas?.length) return dock.innerHTML = "";
      dock.innerHTML = `<div class="timer-dock-list">${ativas.map((s) => {
        const inicioMs = new Date(String(s.inicio).replace(" ", "T")).getTime();
        const decorrido = Math.floor((Date.now() - inicioMs) / 6e4);
        return `<div class="timer-dock-item"><div class="timer-dock-info"><span class="timer-dock-tarefa">${esc(s.tarefa_nome)}</span><span class="timer-dock-proj muted-detail">${esc(s.projeto_nome)} \xB7 ${decorrido}min</span></div><div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="editarSessao('${s.id}','${esc(s.inicio || "")}','${esc(s.fim || "")}')">Editar</button><button class="btn btn-sm btn-ghost" onclick="pararCronometro('${s.id}')">\u25A0 Parar</button></div></div>`;
      }).join("")}</div>`;
    } catch {
      dock.innerHTML = "";
    }
  }
  async function modalAdicionarIntervalo(sessaoId) {
    _sessaoEditando = sessaoId;
    const html = `<form id="form-add-int" class="form-grid"><input name="tipo" placeholder="Tipo (ex: Pausa)" required><input name="inicio" type="datetime-local" required><input name="fim" type="datetime-local"><button class="btn btn-primary" type="submit">Adicionar</button></form>`;
    const overlay = window.abrirModal?.(html, { titulo: "Adicionar Intervalo" });
    overlay?.querySelector("#form-add-int")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.currentTarget).entries());
      body.inicio = body.inicio?.replace("T", " ");
      body.fim = body.fim?.replace("T", " ");
      await criarIntervalo(sessaoId, body);
      fecharModal();
    });
  }
  async function criarIntervalo(sessaoId, body = null) {
    try {
      const payload = body || { tipo: "Pausa", inicio: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace("T", " ") };
      await req("POST", `/tempo/${sessaoId}/intervalos`, payload);
      toast("Intervalo criado", "ok");
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function editarSessao(sessaoId, inicio = "", fim = "") {
    _sessaoEditando = sessaoId;
    const html = `<form id="form-editar-sessao" class="form-grid"><input name="inicio" type="datetime-local" value="${String(inicio).slice(0, 16).replace(" ", "T")}"><input name="fim" type="datetime-local" value="${String(fim || "").slice(0, 16).replace(" ", "T")}"><div style="display:flex;gap:8px"><button class="btn btn-primary" type="submit">Salvar</button><button class="btn" type="button" onclick="modalAdicionarIntervalo('${sessaoId}')">+ Intervalo</button><button class="btn btn-danger" type="button" onclick="deletarSessao('${sessaoId}')">Excluir sess\xE3o</button></div></form>`;
    const overlay = window.abrirModal?.(html, { titulo: "Editar Sess\xE3o" });
    overlay?.querySelector("#form-editar-sessao")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget).entries());
      await salvarSessao(sessaoId, data);
      fecharModal();
    });
  }
  async function salvarSessao(sessaoId, data = null) {
    try {
      const form = data || Object.fromEntries(new FormData(document.getElementById("form-editar-sessao")).entries());
      await req("PUT", `/tempo/${sessaoId}`, {
        inicio: form.inicio?.replace("T", " "),
        fim: form.fim ? form.fim.replace("T", " ") : null
      });
      toast("Sess\xE3o salva", "ok");
      renderTimerDock();
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function deletarSessao(sessaoId) {
    confirmar("Excluir esta sess\xE3o?", async () => {
      await req("DELETE", `/tempo/${sessaoId}`);
      toast("Sess\xE3o exclu\xEDda", "ok");
      fecharModal();
      renderTimerDock();
    });
  }
  async function editarIntervalo(intervaloId, tipo = "", inicio = "", fim = "") {
    _intervaloEditando = intervaloId;
    const html = `<form id="form-editar-intervalo" class="form-grid"><input name="tipo" value="${esc(tipo || "Pausa")}" required><input name="inicio" type="datetime-local" value="${String(inicio).slice(0, 16).replace(" ", "T")}"><input name="fim" type="datetime-local" value="${String(fim || "").slice(0, 16).replace(" ", "T")}"><div style="display:flex;gap:8px"><button class="btn btn-primary" type="submit">Salvar</button><button class="btn btn-danger" type="button" onclick="deletarIntervalo('${intervaloId}')">Excluir</button></div></form>`;
    const overlay = window.abrirModal?.(html, { titulo: "Editar Intervalo" });
    overlay?.querySelector("#form-editar-intervalo")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await salvarIntervalo(intervaloId, Object.fromEntries(new FormData(e.currentTarget).entries()));
      fecharModal();
    });
  }
  async function salvarIntervalo(id, data = null) {
    try {
      const form = data || Object.fromEntries(new FormData(document.getElementById("form-editar-intervalo")).entries());
      await req("PUT", `/intervalos/${id}`, {
        tipo: form.tipo,
        inicio: form.inicio?.replace("T", " "),
        fim: form.fim ? form.fim.replace("T", " ") : null
      });
      toast("Intervalo salvo", "ok");
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function deletarIntervalo(id) {
    confirmar("Excluir este intervalo?", async () => {
      await req("DELETE", `/intervalos/${id}`);
      toast("Intervalo exclu\xEDdo", "ok");
      fecharModal();
    });
  }
  async function renderSessoesTarefa(tarefaId, containerEl) {
    if (!containerEl) return;
    try {
      const sessoes = await req("GET", `/tarefas/${tarefaId}/tempo`);
      if (!sessoes.length) {
        containerEl.innerHTML = '<div class="empty-small">Sem sess\xF5es de trabalho registradas</div>';
        return;
      }
      containerEl.innerHTML = `<div class="sessoes-list">${sessoes.map((s) => `<div class="sessao-item"><div class="sessao-header"><span class="sessao-data">${esc((s.inicio || "").split(" ")[0] || "")}</span><span class="sessao-duracao">${esc(s.horas_liquidas != null ? `${parseFloat(s.horas_liquidas).toFixed(2)}h` : "\u2014")}</span><button class="btn btn-sm btn-ghost" onclick="editarSessao('${s.id}','${esc(s.inicio || "")}','${esc(s.fim || "")}')">\u270E</button></div>${(s.intervalos || []).map((i) => `<div class="muted-detail">${esc(i.tipo)}: ${esc(i.inicio)} - ${esc(i.fim || "...")} <button class="btn btn-sm" onclick="editarIntervalo('${i.id}','${esc(i.tipo)}','${esc(i.inicio)}','${esc(i.fim || "")}')">Editar</button></div>`).join("")}<button class="btn btn-sm" onclick="modalAdicionarIntervalo('${s.id}')">+ Intervalo</button></div>`).join("")}</div>`;
    } catch (e) {
      containerEl.innerHTML = `<div class="error-small">${esc(e.message)}</div>`;
    }
  }
  if (typeof window !== "undefined") {
    window.iniciarCronometro = iniciarCronometro;
    window.pararCronometro = pararCronometro;
    window.carregarTimersAtivos = carregarTimersAtivos;
    window.renderTimerDock = renderTimerDock;
    window.modalAdicionarIntervalo = modalAdicionarIntervalo;
    window.criarIntervalo = criarIntervalo;
    window.editarSessao = editarSessao;
    window.salvarSessao = salvarSessao;
    window.deletarSessao = deletarSessao;
    window.editarIntervalo = editarIntervalo;
    window.salvarIntervalo = salvarIntervalo;
    window.deletarIntervalo = deletarIntervalo;
    window.renderSessoesTarefa = renderSessoesTarefa;
  }

  // src/modules/groups.js
  init_api();
  init_ui();
  var _dragProjetoId = null;
  var _dragGrupoId = null;
  function dragProjeto(e, projetoId) {
    e.stopPropagation();
    _dragProjetoId = projetoId;
    e.dataTransfer.effectAllowed = "move";
  }
  function dragProjetoEnd(e) {
    _dragProjetoId = null;
    document.querySelectorAll(".proj-card.dragging").forEach((el) => el.classList.remove("dragging"));
    document.querySelectorAll(".grupo-section.drag-over").forEach((el) => el.classList.remove("drag-over"));
  }
  function dragGrupo(e, grupoId) {
    e.stopPropagation();
    _dragGrupoId = grupoId;
    e.dataTransfer.effectAllowed = "move";
  }
  function dragGrupoEnd(e) {
    _dragGrupoId = null;
    document.querySelectorAll(".grupo-section.dragging").forEach((el) => el.classList.remove("dragging"));
  }
  function dragOver(e, grupoId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.currentTarget.classList.add("drag-over");
  }
  function dragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.classList.remove("drag-over");
    }
  }
  async function dropProjeto(e, grupoId) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (!_dragProjetoId) return;
    try {
      await req("PATCH", `/projetos/${_dragProjetoId}`, { grupo_id: grupoId || null });
      toast("Projeto movido de grupo", "ok");
      window.renderDash?.();
    } catch (err) {
      toast(err.message, "erro");
    } finally {
      _dragProjetoId = null;
    }
  }
  function toggleGrupo(grupoId) {
    const collapsed = JSON.parse(localStorage.getItem("telier_grupos_collapsed") || "[]");
    const idx = collapsed.indexOf(grupoId);
    if (idx >= 0) collapsed.splice(idx, 1);
    else collapsed.push(grupoId);
    localStorage.setItem("telier_grupos_collapsed", JSON.stringify(collapsed));
    window.renderDash?.();
  }
  if (typeof window !== "undefined") {
    window.dragProjeto = dragProjeto;
    window.dragProjetoEnd = dragProjetoEnd;
    window.dragGrupo = dragGrupo;
    window.dragGrupoEnd = dragGrupoEnd;
    window.dragOver = dragOver;
    window.dragLeave = dragLeave;
    window.dropProjeto = dropProjeto;
    window.toggleGrupo = toggleGrupo;
  }

  // src/modules/admin.js
  init_api();
  init_ui();
  init_utils();
  async function renderAbaUsuarios() {
    const usuarios = await req("GET", "/admin/usuarios").catch(() => req("GET", "/usuarios"));
    return `<div><div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary" onclick="modalNovoColega()">+ Cadastrar colega</button></div><div class="sessoes-list">${usuarios.map((u) => `<div class="sessao-item" style="display:flex;justify-content:space-between;gap:12px"><div><strong>${esc(u.nome)}</strong><div class="muted-detail">@${esc(u.usuario_login || "")} \xB7 ${esc(u.papel || "membro")}</div><div class="muted-detail">Projetos: ${u.projetos_como_dono ?? "-"} \xB7 Tarefas: ${u.tarefas_como_dono ?? "-"}</div></div><div style="display:flex;align-items:center;gap:8px">${u.horas_totais != null ? `<span class="tag tag-gray">${fmtHoras(Number(u.horas_totais))}</span>` : ""}<button class="btn btn-sm" onclick="abrirUsuarioAdmin('${u.id}')">Detalhes</button></div></div>`).join("")}</div></div>`;
  }
  async function renderAbaTempo() {
    const ativas = await req("GET", "/admin/agora").catch(() => []);
    return ativas.length ? `<div class="sessoes-list">${ativas.map((a) => `<div class="sessao-item"><strong>${esc(a.usuario_nome)}</strong> \xB7 ${esc(a.projeto_nome)} / ${esc(a.tarefa_nome)}<div class="muted-detail">In\xEDcio: ${esc(a.inicio)}</div></div>`).join("")}</div>` : '<div class="empty-small">Nenhuma sess\xE3o ativa no momento</div>';
  }
  async function abrirCentralAdmin(aba = "usuarios") {
    try {
      const content = aba === "tempo" ? await renderAbaTempo() : await renderAbaUsuarios();
      document.getElementById("content").innerHTML = `<div class="admin-panel"><h1>Central de Administra\xE7\xE3o</h1><div class="admin-nav"><button class="admin-nav-btn ${aba === "usuarios" ? "ativo" : ""}" onclick="abrirCentralAdmin('usuarios')">Usu\xE1rios</button><button class="admin-nav-btn ${aba === "tempo" ? "ativo" : ""}" onclick="abrirCentralAdmin('tempo')">Tempo em andamento</button></div><div id="admin-content">${content}</div></div>`;
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function abrirUsuarioAdmin(usuarioId) {
    try {
      const data = await req("GET", `/admin/usuarios/${usuarioId}`);
      const html = `<div><h3>${esc(data.usuario.nome)}</h3><div class="muted-detail">@${esc(data.usuario.usuario_login)} \xB7 ${esc(data.usuario.papel)}</div><h4 style="margin-top:12px">Projetos</h4><ul>${(data.projetos_dashboard || []).map((p) => `<li>${esc(p.nome)} (${esc(p.status)})</li>`).join("") || "<li>Nenhum</li>"}</ul><h4>Tarefas</h4><ul>${(data.tarefas || []).slice(0, 10).map((t) => `<li>${esc(t.nome)} \xB7 ${esc(t.projeto_nome)}</li>`).join("") || "<li>Nenhuma</li>"}</ul></div>`;
      window.abrirModal?.(html, { titulo: "Detalhes do usu\xE1rio" });
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function exportarTempoAdminCSV() {
    try {
      const rows = await req("GET", "/admin/tempo");
      const header = ["usuario", "projeto", "tarefa", "inicio", "fim", "horas_liquidas"];
      const csv = [header.join(",")].concat(rows.map((r) => [r.usuario_nome, r.projeto_nome, r.tarefa_nome, r.inicio, r.fim || "", r.horas_liquidas || ""].map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","))).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "admin-tempo.csv";
      a.click();
    } catch (e) {
      toast(e.message, "erro");
    }
  }
  async function modalNovoColega() {
    const html = `<form id="form-novo-colega" class="form-grid"><input name="nome" placeholder="Nome" required><input name="usuario_login" placeholder="Login" required><input name="senha" type="password" minlength="8" placeholder="Senha inicial" required><select name="papel"><option value="membro">membro</option><option value="admin">admin</option></select><button class="btn btn-primary" type="submit">Cadastrar</button></form>`;
    const overlay = window.abrirModal?.(html, { titulo: "Cadastrar Colega" });
    overlay?.querySelector("#form-novo-colega")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await req("POST", "/usuarios", Object.fromEntries(new FormData(e.currentTarget).entries()));
        fecharModal();
        toast("Colega cadastrado", "ok");
        abrirCentralAdmin("usuarios");
      } catch (err) {
        toast(err.message, "erro");
      }
    });
  }
  if (typeof window !== "undefined") {
    window.abrirCentralAdmin = abrirCentralAdmin;
    window.abrirUsuarioAdmin = abrirUsuarioAdmin;
    window.exportarTempoAdminCSV = exportarTempoAdminCSV;
    window.modalNovoColega = modalNovoColega;
  }

  // src/app.js
  init_notifications();

  // src/modules/shortcuts.js
  init_state();
  init_utils();
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", handleGlobalKeyDown);
  }
  function handleGlobalKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      abrirCommandPalette();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      abrirModalAtalhos();
      return;
    }
    if (e.key === "Escape") {
      fecharCommandPalette();
    }
  }
  function abrirCommandPalette() {
    if (document.querySelector(".cmd-palette-overlay.open")) {
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = "cmd-palette-overlay open";
    overlay.innerHTML = `
    <div class="cmd-palette">
      <input type="text" class="cmd-palette-input" placeholder="Buscar projetos, tarefas, a\xE7\xF5es..." autofocus>
      <div class="cmd-palette-results"></div>
    </div>
  `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector(".cmd-palette-input");
    const resultsEl = overlay.querySelector(".cmd-palette-results");
    let selectedIndex = 0;
    let items = [];
    const performSearch = debounce((query) => {
      selectedIndex = 0;
      items = [];
      if (!query.trim()) {
        renderDefaultActions(resultsEl, items);
        return;
      }
      const q = query.toLowerCase();
      if (_projsDash && Array.isArray(_projsDash)) {
        _projsDash.forEach((proj) => {
          if (proj.nome.toLowerCase().includes(q)) {
            items.push({
              type: "project",
              icon: "\u{1F4CB}",
              label: proj.nome,
              detail: "Projeto",
              action: () => {
                window.abrirProjeto(proj.id);
                fecharCommandPalette();
              }
            });
          }
        });
      }
      if (TAREFAS && Array.isArray(TAREFAS)) {
        TAREFAS.forEach((tarefa) => {
          if (tarefa.nome.toLowerCase().includes(q)) {
            items.push({
              type: "task",
              icon: "\u2713",
              label: tarefa.nome,
              detail: "Tarefa",
              action: () => {
                window.abrirTarefa?.(tarefa.id);
                fecharCommandPalette();
              }
            });
          }
        });
      }
      if ("novo".includes(q)) {
        items.push({
          type: "action",
          icon: "\u2795",
          label: "Novo projeto",
          detail: "A\xE7\xE3o",
          action: () => {
            window.modalNovoProjeto?.();
            fecharCommandPalette();
          }
        });
      }
      if ("novo".includes(q) && PROJETO) {
        items.push({
          type: "action",
          icon: "\u2795",
          label: "Nova tarefa",
          detail: "A\xE7\xE3o",
          action: () => {
            window.modalNovaTarefa?.(PROJETO.id);
            fecharCommandPalette();
          }
        });
      }
      if ("dashboard".includes(q) || "dashboard".includes(q)) {
        items.push({
          type: "action",
          icon: "\u{1F3E0}",
          label: "Ir para dashboard",
          detail: "A\xE7\xE3o",
          action: () => {
            window.goHome?.();
            fecharCommandPalette();
          }
        });
      }
      renderResults(resultsEl, items, selectedIndex);
    });
    input.addEventListener("input", (e) => {
      performSearch(e.target.value);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % Math.max(items.length, 1);
        updateSelected(resultsEl, selectedIndex);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1);
        updateSelected(resultsEl, selectedIndex);
      } else if (e.key === "Enter" && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].action?.();
      } else if (e.key === "Escape") {
        e.preventDefault();
        fecharCommandPalette();
      }
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        fecharCommandPalette();
      }
    });
    renderDefaultActions(resultsEl, items);
  }
  function renderDefaultActions(el, items) {
    items.length = 0;
    items.push({
      type: "action",
      icon: "\u2318",
      label: "Novo projeto",
      detail: "A\xE7\xE3o",
      action: () => {
        window.modalNovoProjeto?.();
        fecharCommandPalette();
      }
    });
    if (PROJETO) {
      items.push({
        type: "action",
        icon: "\u2795",
        label: "Nova tarefa",
        detail: "A\xE7\xE3o",
        action: () => {
          window.modalNovaTarefa?.(PROJETO.id);
          fecharCommandPalette();
        }
      });
    }
    items.push({
      type: "action",
      icon: "\u{1F3E0}",
      label: "Dashboard",
      detail: "A\xE7\xE3o",
      action: () => {
        window.goHome?.();
        fecharCommandPalette();
      }
    });
    items.push({
      type: "action",
      icon: "?",
      label: "Atalhos de teclado",
      detail: "Ajuda",
      action: () => {
        abrirModalAtalhos();
        fecharCommandPalette();
      }
    });
    renderResults(el, items, 0);
  }
  function renderResults(el, items, selectedIndex) {
    el.innerHTML = items.map((item, i) => `
    <div class="cmd-palette-item ${i === selectedIndex ? "selected" : ""}" data-index="${i}">
      <span class="cmd-palette-item-icon">${item.icon}</span>
      <span class="cmd-palette-item-text">${item.label}</span>
      <span class="cmd-palette-item-type">${item.detail}</span>
    </div>
  `).join("");
    el.querySelectorAll(".cmd-palette-item").forEach((elem, i) => {
      elem.addEventListener("click", () => {
        items[i]?.action?.();
      });
    });
  }
  function updateSelected(el, selectedIndex) {
    el.querySelectorAll(".cmd-palette-item").forEach((item, i) => {
      item.classList.toggle("selected", i === selectedIndex);
    });
  }
  function fecharCommandPalette() {
    const overlay = document.querySelector(".cmd-palette-overlay");
    if (overlay) {
      overlay.remove();
    }
  }
  function abrirModalAtalhos() {
    const html = `
    <div style="padding:24px;">
      <h2 style="margin:0 0 24px 0;font-size:1.4rem;font-weight:600">Atalhos de Teclado</h2>
      <div style="display:grid;gap:12px;font-size:var(--fs-090)">
        <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg3);border-radius:var(--r);padding:10px 12px">
          <span style="font-family:monospace;color:var(--text3)">Cmd/Ctrl + K</span>
          <span>Abrir command palette</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg3);border-radius:var(--r);padding:10px 12px">
          <span style="font-family:monospace;color:var(--text3)">Cmd/Ctrl + /</span>
          <span>Abrir atalhos</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px;background:var(--bg3);border-radius:var(--r);padding:10px 12px">
          <span style="font-family:monospace;color:var(--text3)">Esc</span>
          <span>Fechar modal</span>
        </div>
        <div style="margin-top:12px;padding:12px;background:var(--bg3);border-radius:var(--r);font-size:var(--fs-080);color:var(--text3)">
          <strong>Dica:</strong> Use a command palette para navegar rapidamente entre projetos e tarefas.
        </div>
      </div>
    </div>
  `;
    window.abrirModal?.(html, { titulo: "Atalhos de Teclado" });
  }
  function toggleSenhaLogin(btn) {
    const input = btn.previousElementSibling;
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btn.title = isPassword ? "Ocultar senha" : "Mostrar senha";
  }
  function toggleSenhaSetup(btn) {
    const input = btn.closest(".form-row")?.querySelector('input[type="password"]');
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    btn.title = isPassword ? "Ocultar senha" : "Mostrar senha";
  }
  function toggleSenhaCadastro(btn) {
    toggleSenhaSetup(btn);
  }
  function toggleSenhaObrigatoria(btn) {
    toggleSenhaSetup(btn);
  }
  function toggleSenhaReset(btn) {
    toggleSenhaSetup(btn);
  }
  if (typeof window !== "undefined") {
    window.setupKeyboardShortcuts = setupKeyboardShortcuts;
    window.abrirCommandPalette = abrirCommandPalette;
    window.fecharCommandPalette = fecharCommandPalette;
    window.abrirModalAtalhos = abrirModalAtalhos;
    window.toggleSenhaLogin = toggleSenhaLogin;
    window.toggleSenhaSetup = toggleSenhaSetup;
    window.toggleSenhaCadastro = toggleSenhaCadastro;
    window.toggleSenhaObrigatoria = toggleSenhaObrigatoria;
    window.toggleSenhaReset = toggleSenhaReset;
  }

  // src/app.js
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      setupKeyboardShortcuts?.();
      carregarFiltrosDash?.();
      const authSuccess = await init();
      if (authSuccess) {
        iniciarPollNotificacoes?.();
      }
    } catch (error) {
      console.error("App initialization error:", error);
    }
  });
  window.fazerLogin = fazerLogin;
  window.fazerSetup = fazerSetup;
  window.fazerLogout = fazerLogout;
  window.fazerCadastroPublico = fazerCadastroPublico;
  window.modalCadastroPublico = modalCadastroPublico;
  window.goHome = goHome;
  window.renderDash = renderDash;
  window.setFiltro = setFiltro;
  window.filtrarProjetosBusca = filtrarProjetosBusca;
  window.filtrarGrupoDash = filtrarGrupoDash;
  window.filtrarOrigemDash = filtrarOrigemDash;
  window.toggleStartday = toggleStartday;
  window.renderCardsDash = renderCardsDash;
  window.abrirProjeto = abrirProjeto;
  window.voltarDash = voltarDash;
  window.abrirGrupo = abrirGrupo;
  window.renderProjeto = renderProjeto;
  window.renderGrupo = renderGrupo;
  window.mudarAba = mudarAba;
  window.mudarAbaGrupo = mudarAbaGrupo;
  window.modalNovoProjeto = modalNovoProjeto;
  window.modalEditarProjeto = modalEditarProjeto;
  window.modalPermissoes = modalPermissoes;
  window.modalNovoGrupo = modalNovoGrupo;
  window.modalEditarGrupo = modalEditarGrupo;
  window.compartilharGrupo = compartilharGrupo;
  window.renderKanban = renderKanban;
  window.renderLista = renderLista;
  window.renderMapa = renderMapa;
  window.renderRelatorio = renderRelatorio;
  window.mudarStatus = mudarStatus;
  window.toggleFoco = toggleFoco;
  window.deletarTarefa = deletarTarefa;
  window.renderColabsStack = renderColabsStack;
  window.ordenarLista = ordenarLista;
  window.toggleListaConcluidas = toggleListaConcluidas;
  window.modalNovaTarefa = modalNovaTarefa;
  window.modalEditarTarefa = modalEditarTarefa;
  window.abrirTarefa = abrirTarefa;
  window.duplicarTarefa = duplicarTarefa;
  window.dragTarefa = dragTarefa;
  window.iniciarCronometro = iniciarCronometro;
  window.pararCronometro = pararCronometro;
  window.carregarTimersAtivos = carregarTimersAtivos;
  window.renderTimerDock = renderTimerDock;
  window.modalAdicionarIntervalo = modalAdicionarIntervalo;
  window.criarIntervalo = criarIntervalo;
  window.editarSessao = editarSessao;
  window.salvarSessao = salvarSessao;
  window.deletarSessao = deletarSessao;
  window.editarIntervalo = editarIntervalo;
  window.salvarIntervalo = salvarIntervalo;
  window.deletarIntervalo = deletarIntervalo;
  window.renderSessoesTarefa = renderSessoesTarefa;
  window.dragProjeto = dragProjeto;
  window.dragProjetoEnd = dragProjetoEnd;
  window.dragGrupo = dragGrupo;
  window.dragGrupoEnd = dragGrupoEnd;
  window.dragOver = dragOver;
  window.dragLeave = dragLeave;
  window.dropProjeto = dropProjeto;
  window.toggleGrupo = toggleGrupo;
  window.abrirCentralAdmin = abrirCentralAdmin;
  window.abrirUsuarioAdmin = abrirUsuarioAdmin;
  window.exportarTempoAdminCSV = exportarTempoAdminCSV;
  window.modalNovoColega = modalNovoColega;
  window.carregarNotificacoes = carregarNotificacoes;
  window.iniciarPollNotificacoes = iniciarPollNotificacoes;
  window.marcarNotifLida = marcarNotifLida;
  window.marcarTodasNotifLidas = marcarTodasNotifLidas;
  window.abrirNotificacoes = abrirNotificacoes;
  window.fecharPainelNotificacoes = fecharPainelNotificacoes;
  window.renderPainelNotificacoes = renderPainelNotificacoes;
  window.setupKeyboardShortcuts = setupKeyboardShortcuts;
  window.abrirCommandPalette = abrirCommandPalette;
  window.fecharCommandPalette = fecharCommandPalette;
  window.abrirModalAtalhos = abrirModalAtalhos;
  window.toggleSenhaLogin = toggleSenhaLogin;
  window.toggleSenhaSetup = toggleSenhaSetup;
  window.toggleSenhaCadastro = toggleSenhaCadastro;
  window.toggleSenhaObrigatoria = toggleSenhaObrigatoria;
  window.toggleSenhaReset = toggleSenhaReset;
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
  window.alternarTema = alternarTema;
  window.alternarPerfilAdmin = alternarPerfilAdmin;
  window.mostrar = mostrar;
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
