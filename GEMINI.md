# GEMINI.md — Telier: Contexto persistente para agentes

## O que é o Telier

Sistema web interno para escritório universitário de arquitetura (UNIUBE).
Combina gestão de projetos/tarefas com time tracking (cronômetro obrigatório).
Equipe: 9–15 pessoas. Projetos simultâneos: 4–10. Pré-lançamento.
Stack: Cloudflare Worker + D1 (SQLite). Frontend: vanilla JS, SPA com hash routing.

## Arquitetura do projeto

```
src/
  worker.js          → Entry point do backend (roteamento HTTP)
  index.html         → Shell da SPA (login, setup, app)
  styles.css         → CSS único (3900+ linhas)
  app.js             → Entry point do frontend (router, init, exports para window)
  modules/
    state.js         → 65+ variáveis globais com setters
    api.js           → req() fetch wrapper + cache de projetos
    ui.js            → toast, modal, breadcrumb, tema
    tasks.js         → 1735 linhas: home de tarefas, abas de projeto, kanban, lista, mapa, relatório, modais
    dashboard.js     → 786 linhas: tela de projetos, painel hoje, cards
    groups.js        → 829 linhas: tela de grupos, abas internas
    project.js       → 340 linhas: tela de projeto individual
    timer.js         → 501 linhas: cronômetro, dock, sessões, intervalos, detalhes localStorage
    admin.js         → 484 linhas: painel admin
    auth.js          → 259 linhas: login, setup, cadastro, troca de senha
    notifications.js → 304 linhas: notificações, presença
    utils.js         → 265 linhas: helpers, formatação, permissões
    shortcuts.js     → 55 linhas: atalhos de teclado
  backend/
    domain/          → Controllers por domínio (auth, tasks, time, projects, groups, admin)
    http/            → request.js, responses.js
    schema/          → migrations.js
    utils/           → validation.js, format.js
db/
  schema.sql         → Schema D1 com todas as tabelas e índices
docs/
  redesign/          → Referências visuais do redesign (Stitch)
  context.md         → Contexto técnico
  deploy.md          → Instruções de deploy
```

## Hierarquia de dados

Grupos (campus/instituição) → Projetos (com fase, status, prazo) → Tarefas (com status, prioridade, dono) → Sessões de tempo (início/fim) → Intervalos (pausas)

IDs com prefixo: usr_, prj_, tsk_, ste_, grp_, dec_, int_, tpl_, ntf_

## Padrões do código atual (respeitar)

- Frontend usa template literals (strings HTML) + innerHTML. NÃO migrar para framework.
- Handlers expõem funções em window via Object.assign no app.js.
- Backend usa pattern matching manual no worker.js (if/match por rota).
- Modais são strings HTML passadas para abrirModal() em ui.js.
- Estado global em state.js com setters individuais.
- CSS usa variáveis custom (--bg, --text, --accent, etc.) com tema dark/light.

## Regras obrigatórias

1. NÃO criar features novas que não estejam no plano.
2. NÃO migrar para React, Vue ou qualquer framework.
3. NÃO alterar o schema do banco sem instrução explícita.
4. NÃO remover funcionalidades existentes sem instrução explícita.
5. Preservar toda a gramática visual existente (sidebar, topbar, tema dark/light).
6. Manter retrocompatibilidade com dados existentes no D1.
7. Testar localmente quando possível (wrangler dev ou equivalente).
8. Fazer commits atômicos: um commit por tarefa lógica, com mensagem descritiva.

## Plano de execução ativo

O arquivo `docs/PLANO.md` contém o plano completo de evolução.
Cada prompt vai referenciar uma fase e tarefa específica desse plano.
Sempre ler `docs/PLANO.md` antes de executar qualquer tarefa.

## Formato de resposta

Após cada tarefa:
- Resumo do que foi alterado
- Arquivos modificados (lista)
- Decisões técnicas tomadas
- O que testar manualmente
- Pendências (se houver)
