# Prompt para Claude Code — Redesign do Telier

## Preparação (fazer antes de colar o prompt)

No terminal do VS Code, dentro da pasta do projeto, crie a pasta de referência e copie os arquivos:

```bash
mkdir -p docs/redesign
```

Depois copie para dentro de `docs/redesign/`:
- O arquivo `telier-design-system.md` (design system consolidado)
- O `DESIGN.md` que veio no zip do Stitch (pasta `telier_drafting_system/`)
- 3 arquivos `code.html` do zip do Stitch como referência visual, renomeando:
  - `telier_dashboard/code.html` → `docs/redesign/ref-dashboard.html`
  - `telier_resid_ncia_silva_details/code.html` → `docs/redesign/ref-projeto-kanban.html`
  - `telier_entrar/code.html` → `docs/redesign/ref-login.html`
- Código do AI Studio como referência de componentes (copiar pasta inteira para `docs/studio-ref/`). Os mais úteis são:
  - `docs/studio-ref/src/index.css` — variáveis de cor do design system
  - `docs/studio-ref/src/components/Sidebar.tsx` — estrutura da sidebar
  - `docs/studio-ref/src/components/TopBar.tsx` — estrutura da topbar
  - `docs/studio-ref/src/pages/Dashboard.tsx` — estrutura de KPIs e cards
  - `docs/studio-ref/src/pages/Login.tsx` — layout da tela de login

Esses arquivos NÃO vão para produção — são só referência para o Claude Code saber como o resultado deve ficar. O código do AI Studio é React+TypeScript+Tailwind, mas o Telier continua em HTML+CSS+JS puro. Use apenas como referência visual e de estrutura de componentes.

---

## Fase 1 — Refatoração Estrutural

Cole isso no Claude Code:

```
Leia o arquivo src/index.html deste projeto. Ele tem 5.700 linhas contendo TODO o CSS, HTML e JavaScript de uma SPA. Leia também docs/context.md para entender o projeto.

Sua tarefa é separar este arquivo em múltiplos arquivos SEM mudar nenhuma funcionalidade ou visual. O sistema deve se comportar identicamente antes e depois.

RESTRIÇÃO: O frontend é servido como arquivos estáticos pelo Cloudflare Pages a partir da pasta src/. Tudo deve ficar dentro de src/.

PASSO 1: Extraia todo o conteúdo entre <style> e </style> para src/styles.css. No index.html, substitua por <link rel="stylesheet" href="styles.css">.

PASSO 2: Extraia todo o conteúdo do <script> para módulos ES na seguinte estrutura:

src/app.js — entry point
src/modules/state.js — variáveis globais (TOKEN, EU, PROJETO, TAREFAS, FILTROS, TIMERS, etc.)
src/modules/api.js — req(), fetchProjetos(), invalidarCacheProjetos()
src/modules/utils.js — esc(), avatar(), tag(), prazoFmt(), fmtDuracao(), normalizarStatusProjeto(), etc.
src/modules/ui.js — toast(), abrirModal(), confirmar(), fecharModal(), btnLoading(), setBreadcrumb()
src/modules/auth.js — fazerLogin(), fazerLogout(), fazerSetup(), modalCadastroPublico(), toggleSenha*()
src/modules/dashboard.js — renderDash(), renderProjetosDash(), renderCardsDash(), renderInicioDia(), filtros, drag de projetos
src/modules/project.js — abrirProjeto(), renderProjeto(), mudarAba(), modalNovoProjeto(), modalEditarProjeto(), modalPermissoes(), renderDecisoes()
src/modules/tasks.js — renderAbaTarefas(), renderKanban(), renderLista(), renderMapa(), renderRelatorio(), modalNovaTarefa(), modalEditarTarefa()
src/modules/timer.js — TIMERS, iniciarCronometro(), pararCronometro(), renderTimerDock(), renderSessoesTarefa()
src/modules/groups.js — abrirGrupo(), renderGrupo(), modalNovoGrupo(), modalEditarGrupo(), modalCompartilharGrupo(), drag de grupos
src/modules/admin.js — abrirCentralAdmin(), abrirUsuarioAdmin(), renderTimelineHoje(), exportarTempoAdminCSV(), modalNovoColega()
src/modules/notifications.js — carregarNotificacoes(), renderPainelNotificacoes(), renderPresenceDock(), iniciarStatusPoll()
src/modules/shortcuts.js — listeners de teclado (Enter, N, P, G, /)

REGRAS CRÍTICAS:

1. Use import/export de ES modules. No index.html: <script type="module" src="app.js"></script>

2. Variáveis de estado em state.js com funções setter para modificação cross-module:
   export let TOKEN = localStorage.getItem('ea_token');
   export function setToken(v) { TOKEN = v; }

3. MUITAS funções são chamadas via onclick="funcao()" no HTML gerado por innerHTML. Essas PRECISAM estar em window. No app.js, após importar tudo, faça:
   Object.assign(window, { fazerLogin, fazerLogout, renderDash, abrirProjeto, ... });
   Para encontrar quais funções precisam: busque todos os onclick=", onchange=", oninput=", ondragstart=", ondragend=", ondragover=", ondrop=" nas strings de template JavaScript.

4. state.js NÃO importa de nenhum outro módulo (evita circular dependency).

5. NÃO altere nenhuma lógica, nenhum HTML gerado, nenhum CSS.

6. Comece por state.js e utils.js (sem dependências), depois api.js, ui.js, e suba a árvore. Deixe app.js por último.

Faça um arquivo de cada vez, confirmando que os imports estão corretos.
```

**Após concluir a Fase 1:** Teste tudo. Login, dashboard, abrir projeto, criar tarefa, iniciar/parar cronômetro, admin, notificações, tema claro/escuro, mobile. Se algo quebrou, corrija antes de avançar.

---

## Fase 2 — Aplicar Novo Design System

Cole isso no Claude Code:

```
Leia os arquivos docs/redesign/telier-design-system.md e docs/redesign/DESIGN.md. Eles descrevem o novo design system do Telier. Leia também os arquivos ref-dashboard.html, ref-projeto-kanban.html e ref-login.html em docs/redesign/ — são HTMLs de referência visual gerados pelo Google Stitch mostrando como o resultado deve ficar.

Agora aplique este design system no src/styles.css. A API (worker.js) e o banco de dados NÃO mudam. A linguagem continua HTML+CSS+JS puro.

CONCEITO: "The Architectural Monolith" — sóbrio, preciso, sem decoração. Zero glassmorphism, zero gradientes, zero sombras decorativas. Profundidade por mudança tonal + bordas 1px.

PASSO 1 — SUBSTITUIR VARIÁVEIS CSS

Substitua TODAS as variáveis no :root do tema escuro por:

--ff-sans: 'Inter', sans-serif;
--ff-mono: 'DM Mono', monospace;
--fs-xs: 0.6875rem; --fs-sm: 0.75rem; --fs-base: 0.8125rem; --fs-md: 0.875rem; --fs-lg: 1rem; --fs-xl: 1.25rem; --fs-2xl: 1.5rem;
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px;
--r-sm: 4px; --r: 6px; --r-lg: 8px; --r-xl: 12px; --r-full: 999px;
--bg: #0e0e0e; --bg-low: #131313; --bg-card: #191a1a; --bg-elevated: #1f2020; --bg-hover: #252626;
--border: #2A2A2A; --border-strong: #484848;
--text: #e7e5e4; --text-secondary: #acabaa; --text-muted: #767575;
--accent: #0055FF; --accent-hover: #0044cc; --accent-fg: #ffffff;
--green: #22c55e; --yellow: #FACC15; --red: #EF4444; --red-soft: #ec7c8a; --gray: #767575; --purple: #a78bfa;
--lh-tight: 1.3; --lh-base: 1.6;

Tema claro [data-theme="light"]:
--bg: #f5f5f7; --bg-low: #ebebee; --bg-card: #ffffff; --bg-elevated: #ffffff; --bg-hover: #f0f0f3;
--border: #e0e0e3; --border-strong: #c8c8ce;
--text: #111114; --text-secondary: #5a5a6a; --text-muted: #9494a4;
--accent: #0050e0; --accent-hover: #003dc0;
--green: #1a9e6a; --yellow: #b8860b; --red: #d63c3c; --red-soft: #e07070; --gray: #9494a4; --purple: #8b5cf6;

PASSO 2 — MAPEAR VARIÁVEIS ANTIGAS

Buscar e substituir no CSS inteiro:
var(--bg2) → var(--bg-low) ou var(--bg-card) conforme contexto
var(--bg3) → var(--bg-card) ou var(--bg-hover)
var(--bg4) → var(--bg-hover)
var(--bg5) → var(--bg-hover)
var(--border2) → var(--border-strong)
var(--border3) → var(--border-strong)
var(--text2) → var(--text-secondary)
var(--text3) → var(--text-muted)
var(--glass-bg*) → var(--bg-card) ou var(--bg-elevated) (background sólido, sem glass)
var(--glass-border*) → var(--border) ou var(--border-strong)
var(--glass-shadow*) → remover (sem sombra)
var(--glass-blur) → remover (sem blur)
var(--glass-highlight) → remover
var(--blue) → var(--accent)
var(--sky) → var(--accent)
var(--cyan) → var(--accent)
var(--orange) → var(--yellow)
var(--shadow) e var(--shadow2) → remover

Após mapear tudo, remover as variáveis antigas do :root.

PASSO 3 — REMOVER EFEITOS DECORATIVOS

1. backdrop-filter e -webkit-backdrop-filter: REMOVER de TUDO exceto .topbar. Onde tinha, usar background sólido.

2. background-image com gradientes no body: remover completamente. Ficar apenas background-color: var(--bg).

3. background-image em #page-login, #page-setup: remover gradientes. Apenas background: var(--bg).

4. linear-gradient em .btn, .btn-primary, .modal, .dash-toolbar, .startday-wrap, .startday-card, .grupo-card, .proj-hero, .task-view-surface, .notif-panel, .notif-item, .topbar, .share-hint, .filter-btn, .segmented, .search-dash: substituir TUDO por backgrounds sólidos usando as variáveis --bg-*.

5. box-shadow: remover de botões, cards, startday, toolbars, inputs. Manter APENAS em .timer-card (widget flutuante), menus dropdown e .modal (sombra sutil se necessário).

6. inset box-shadow: remover de TUDO.

7. color-mix(): remover todas as instâncias, substituir por cores sólidas.

PASSO 4 — BORDER-RADIUS

Valores 16px, 18px → var(--r-xl) que agora é 12px
Valores 12px, 14px → var(--r-lg) que agora é 8px
Valores 8px, 10px → var(--r) que agora é 6px
calc(var(--r3) + 2px) → var(--r-xl)
Manter 999px/50% em pills, badges, avatares.

PASSO 5 — TIPOGRAFIA

1. No link do Google Fonts em index.html, remover weight 300 e garantir que tem 700:
   Inter:wght@400;500;600;700

2. font-weight: 300 → substituir por 600 ou 700 (títulos → 700).

3. :where(.dash-title,.admin-title) → font-weight: 700 (era 300).

4. label (form): remover text-transform: uppercase e letter-spacing. Usar font-weight: 500.

5. Manter uppercase+tracking APENAS em: th, .dash-section-title h3, .auth-wordmark, .rel-group-title, .sessoes-title, .task-details-header, .modal-section-title, .task-view-eyebrow.

PASSO 6 — ANIMAÇÕES

1. @keyframes popIn: mudar scale(.9) para scale(.97).
2. Onde popIn usa cubic-bezier(.34,1.56,.64,1): trocar para ease-out, duração 150ms.
3. .proj-card:hover: remover transform: translateY(-3px) e box-shadow: var(--shadow2). Manter apenas mudança de border-color e background.

PASSO 7 — LAYOUT

.content → adicionar max-width: 1200px; margin: 0 auto;

PASSO 8 — VERIFICAÇÃO

Confirme que no CSS final:
- Zero backdrop-filter (exceto .topbar)
- Zero linear-gradient/radial-gradient
- Zero box-shadow decorativa (exceto timer e modal)
- Zero font-weight: 300
- Zero cubic-bezier com valor > 1.0
- Nenhum border-radius > 12px em containers
- .content tem max-width 1200px
- Ambos os temas (claro/escuro) estão definidos

Faça as mudanças incrementalmente, seção por seção do CSS.
```

---

## Resumo do que acontece

| O que | Muda? |
|-------|-------|
| src/index.html | Sim — fica só com HTML |
| src/styles.css | Criado — CSS extraído + redesign |
| src/app.js | Criado — entry point JS |
| src/modules/*.js | Criados — 12 módulos JS |
| src/worker.js | NÃO |
| Banco D1 | NÃO |
| wrangler.toml | NÃO |
| Linguagem/framework | NÃO — continua HTML+CSS+JS puro |
| Deploy | NÃO — Cloudflare Pages serve src/ como antes |
