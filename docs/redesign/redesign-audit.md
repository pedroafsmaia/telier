# Telier v2 — Redesign Audit (Fase 0)

> Referências obrigatórias lidas antes desta fase: `AGENTS.md` e `docs/redesign/masterplan.md`.
> Escopo: preparação estrutural, inventário técnico e mapeamento de riscos **sem redesign visual** e **sem alteração de comportamento**.

## 1) Objetivo da Fase 0

Consolidar um diagnóstico técnico acionável da base atual (frontend + backend), registrando:

- inventário de telas
- inventário de fluxos
- mapa de endpoints
- módulos implícitos extraíveis
- inconsistências de nomenclatura
- riscos e trade-offs para refatoração incremental

---

## 2) Inventário de telas (frontend atual)

A UI atual está concentrada em `src/index.html` (HTML + CSS + JS na mesma unidade).

### 2.1 Telas principais de navegação

1. **Login / Setup / Cadastro público**
   - login
   - setup inicial de admin
   - cadastro público
   - troca obrigatória de senha

2. **Dashboard (Hoje + Projetos/Grupos)**
   - início do dia (foco, pendências, cronômetro, última sessão)
   - filtros de origem/status
   - grid de projetos (com e sem grupo)
   - operações de grupo (abrir, compartilhar, ordenar, mover projetos)

3. **Projeto (workspace)**
   - visão geral
   - tarefas (lista + kanban)
   - mapa de foco
   - ao vivo
   - relatório
   - decisões

4. **Grupo (workspace de grupo)**
   - projetos
   - tarefas consolidadas
   - mapa
   - ao vivo
   - relatório

5. **Central Admin**
   - agora
   - timeline de hoje
   - usuários
   - projetos
   - tempo
   - horas por grupo
   - detalhe de usuário admin

6. **Notificações e utilitários transversais**
   - painel de notificações
   - presence dock
   - timer dock
   - modais de CRUD/compartilhamento/permissões

### 2.2 Observação estrutural

Não há separação formal entre “rotas de tela”, “componentes”, “estado” e “serviços de API”: tudo está no mesmo arquivo e no mesmo escopo global.

### 2.3 Evidências concretas no frontend (amostra)

- `req(...)` centralizado no mesmo arquivo da UI (`src/index.html`), sem camada separada de serviço.
- `renderDash(...)` concentra composição da home operacional.
- `abrirProjeto(...)` e `renderGrupoAbaTarefas(...)` coexistem com autenticação/modais/timer no mesmo escopo global.
- `abrirCentralAdmin(...)` e `renderSessoesTarefa(...)` convivem no mesmo runtime global, reforçando mistura de contextos admin + operação + tempo.

---

## 3) Inventário de fluxos principais

## 3.1 Fluxos de autenticação e sessão

- setup inicial (`/auth/setup`)
- login/logout (`/auth/login`, `/auth/logout`)
- sessão atual (`/auth/me`)
- cadastro público (`/auth/register`)
- troca de senha (`/auth/trocar-senha`)
- reset admin de senha de usuário (`/usuarios/:id/senha`)

## 3.2 Fluxos operacionais de trabalho

- listar projetos/grupos com filtros
- abrir projeto e carregar tarefas/decisões/horas
- criar/editar/excluir projeto
- criar/editar/excluir tarefa
- duplicar tarefa
- marcar foco em tarefa
- registrar/editar/parar sessão de tempo
- registrar/editar/remover intervalos
- consultar relatórios por projeto e por tarefa

## 3.3 Fluxos colaborativos

- compartilhar grupo/projeto/tarefa
- remover colaboração
- usuário sair de grupo/projeto/tarefa compartilhado
- notificações de compartilhamento

## 3.4 Fluxos administrativos

- alternar visão admin x membro
- listar usuários/projetos/tempo (admin)
- alterar papel de usuário
- criar usuários por admin
- painéis “agora”, “timeline hoje” e “horas por grupo”

---

## 4) Módulos implícitos extraíveis (sem alterar comportamento)

## 4.1 Frontend — módulos implícitos

1. **App Shell / Navegação**
   - estado de tela atual
   - topbar, tema, overlays

2. **Auth**
   - login/setup/register/troca de senha

3. **Dashboard Hoje/Projetos**
   - filtros, KPIs, cards, agrupamento, drag/drop

4. **Workspace de Projeto**
   - abas, dados agregados, ações de projeto

5. **Workspace de Grupo**
   - visão agregada multi-projeto

6. **Tarefas**
   - lista/kanban, CRUD, foco, colaboradores

7. **Tempo**
   - timer dock, sessões, intervalos, resumos

8. **Admin**
   - central admin e subabas

9. **Notificações/Presença**
   - painel, polling, badge, presença

10. **Infra compartilhada**
   - cliente HTTP (`req`)
   - utilitários de formatação/escape/ids
   - store global e cache local

## 4.2 Backend — módulos implícitos

1. **HTTP Core**
   - CORS, resposta padrão, parsing, erro

2. **Auth & Sessão**
   - login, hash, sessão, troca de senha

3. **Usuários & Papéis**
   - CRUD operacional de usuários

4. **Grupos & Permissões de grupo**

5. **Projetos & Permissões de projeto**

6. **Tarefas & Colaboradores**

7. **Tempo & Intervalos**

8. **Relatórios**
   - admin e por projeto/tarefa

9. **Notificações**

10. **Infra D1 / queries compartilhadas**

---

## 5) Mapa de endpoints (estado atual)

## 5.1 Auth e sessão

- `POST /auth/setup`
- `GET /auth/needs-setup`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/trocar-senha`

## 5.2 Usuários / papéis

- `GET /usuarios`
- `POST /usuarios`
- `PUT /usuarios/:id/senha`
- `PUT /usuarios/:id/papel`
- `GET /status`

## 5.3 Admin

- `GET /admin/agora`
- `GET /admin/timeline-hoje`
- `GET /admin/usuarios`
- `GET /admin/usuarios/:id`
- `GET /admin/projetos`
- `GET /admin/tempo`
- `GET /admin/horas-por-grupo`

## 5.4 Notificações

- `GET /notificacoes`
- `PUT /notificacoes/lidas`
- `PUT /notificacoes/:id/lida`
- `POST /notificacoes/gerar-automaticas`

## 5.5 Grupos

- `GET /grupos`
- `POST /grupos`
- `GET /grupos/:id`
- `PUT /grupos/:id`
- `PATCH /grupos/:id`
- `DELETE /grupos/:id`
- `POST /grupos/:id/permissoes`
- `DELETE /grupos/:id/permissoes/:usuarioId`
- `DELETE /grupos/:id/sair`

## 5.6 Projetos

- `GET /projetos`
- `POST /projetos`
- `GET /projetos/:id`
- `PUT /projetos/:id`
- `PATCH /projetos/:id`
- `DELETE /projetos/:id`
- `POST /projetos/:id/permissoes`
- `DELETE /projetos/:id/permissoes/:usuarioId`
- `DELETE /projetos/:id/sair`

## 5.7 Tarefas / Decisões / Templates

- `GET /projetos/:id/tarefas`
- `POST /projetos/:id/tarefas`
- `GET /tarefas/:id`
- `PUT /tarefas/:id`
- `PATCH /tarefas/:id`
- `DELETE /tarefas/:id`
- `POST /tarefas/:id/duplicar`
- `PUT /tarefas/:id/foco`
- `DELETE /tarefas/:id/foco`
- `GET /tarefas/:id/colaboradores`
- `POST /tarefas/:id/colaboradores`
- `DELETE /tarefas/:id/colaboradores/:usuarioId`
- `DELETE /tarefas/:id/sair`
- `GET /projetos/:id/decisoes`
- `POST /projetos/:id/decisoes`
- `PUT /decisoes/:id`
- `DELETE /decisoes/:id`
- `GET /templates-tarefa`
- `POST /templates-tarefa`
- `PUT /templates-tarefa/:id`
- `DELETE /templates-tarefa/:id`

## 5.8 Tempo / Relatórios

- `GET /tempo/ativas`
- `GET /tempo/colegas-ativos`
- `GET /tempo/ultima-sessao`
- `GET /tempo/resumo-hoje`
- `GET /tarefas/:id/tempo`
- `POST /tarefas/:id/tempo`
- `PUT /tempo/:id`
- `DELETE /tempo/:id`
- `PUT /tempo/:id/parar`
- `POST /tempo/:id/intervalos`
- `PUT /intervalos/:id`
- `DELETE /intervalos/:id`
- `GET /tarefas/:id/tempo/resumo`
- `GET /projetos/:id/relatorio`
- `GET /projetos/:id/horas-por-usuario`

---

## 6) Inconsistências de nomenclatura (naming)

1. **`dificuldade` vs `complexidade`**
   - banco usa `dificuldade`
   - frontend e payloads alternam `complexidade` e `dificuldade`

2. **`login` (schema) vs `usuario_login` (API/frontend)**
   - mesmo conceito com nomes diferentes entre camadas

3. **Mistura semântica de status/fase entre módulos**
   - projeto, grupo e tarefa usam estados com convenções diferentes sem namespace

4. **Idiomas/mistos e semânticas próximas**
   - `sessoes` (auth) vs `sessoes_tempo` (timer) coexistem com “sessão” em sentidos diferentes

5. **Endpoint referenciado no frontend e não mapeado no backend**
   - frontend chama `GET /auth/foco-global` com fallback silencioso
   - rota não aparece no worker atual (evidência de dívida técnica de contrato)

6. **Pluralização e padrão de recursos não uniforme**
   - recursos majoritariamente no plural, mas com exceções de semântica e de escopo

### 6.1 Inconsistência crítica: `/auth/foco-global`

#### Evidência atual

- O frontend chama `GET /auth/foco-global` durante `renderDash`, com `catch(() => null)` silencioso.
- No backend (`src/worker.js`), há rotas para `/auth/setup`, `/auth/needs-setup`, `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me` e `/auth/trocar-senha`, mas não há branch para `/auth/foco-global`.

#### Risco

- O fallback silencioso mascara quebra de contrato e pode esconder regressão funcional nas próximas extrações.

#### Tratativa recomendada (sem mudar runtime na Fase 0)

- Manter o registro explícito desta divergência no plano de PRs.
- Resolver cedo (PR de contratos/API), definindo se:
  1) a rota será implementada oficialmente, ou
  2) a chamada do frontend será removida com migração controlada.

---

## 7) Problemas de arquitetura identificados

1. **Monólito frontend** (`src/index.html`)
   - estrutura, estilo, estado, renderização e handlers misturados

2. **Monólito backend** (`src/worker.js`)
   - roteamento, autorização, domínio e queries sem fronteiras claras

3. **Alto acoplamento UI ↔ API**
   - contratos implícitos e pouca camada intermediária de normalização

4. **Estado global amplo no frontend**
   - risco alto de regressão por efeitos colaterais

5. **Baixa separação por domínio**
   - auth/projetos/tarefas/tempo/admin compartilham blocos extensos

6. **Ausência de estrutura explícita para evolução multiunidade**
   - domínio ainda centrado em projeto/grupo/tarefa sem campus/unidade formalizados

---

## 8) Riscos para a refatoração (Fases seguintes)

1. **Regressão funcional por acoplamento implícito**
   - handlers e renders compartilham variáveis globais sensíveis

2. **Quebra de contrato API/UI por nomenclatura divergente**
   - especialmente em payloads de tarefa, usuários e permissões

3. **Mudanças amplas em arquivo único**
   - aumenta conflito de merge e dificulta rollback cirúrgico

4. **Migração de domínio campus/unidade sem estratégia progressiva**
   - risco de espalhar workaround sem padrão único

5. **Ordem de extração incorreta**
   - mover UI antes de estabilizar contrato de API pode gerar retrabalho

---

## 9) Preparação para domínio `campus` e `unidade` (sem impacto de UI)

Nesta Fase 0, a preparação proposta é apenas estrutural/documental:

1. Reservar módulo de domínio organizacional (`src/backend/domain/organizacao/`).
2. Definir vocabulário-alvo:
   - `campus`: unidade geográfica/institucional maior.
   - `unidade`: entidade operacional vinculada a um campus (faculdade, hospital, clínica etc.).
3. Planejar futura associação (fases posteriores):
   - projeto → unidade
   - unidade → campus
4. Não alterar schema nem endpoints nesta fase para preservar comportamento.

---

## 10) Trade-offs adotados na Fase 0

1. **Sem extração de código executável ainda**
   - decisão: priorizar mapeamento + estrutura de destino.
   - trade-off: baixa redução de complexidade imediata, alta segurança operacional.

2. **Sem alteração de contrato de API agora**
   - decisão: registrar inconsistências primeiro.
   - trade-off: dívida de naming permanece temporariamente.

3. **Preparação de diretórios “vazios + README”**
   - decisão: criar trilha de modularização sem tocar runtime.
   - trade-off: ganho é organizacional agora; benefício técnico vem nos próximos PRs.

---

## 11) Checklist de saída da Fase 0

- [x] Inventário técnico frontend/backend consolidado
- [x] Fluxos principais documentados
- [x] Endpoints mapeados
- [x] Inconsistências de naming registradas
- [x] Riscos e trade-offs documentados
- [x] Estrutura inicial para modularização criada
- [x] Preparação estrutural inicial para campus/unidade documentada

---

## 12) Verificação de escopo desta fase (anti-regressão)

Para manter a Fase 0 segura e reversível, o patch ficou restrito a:

1. **Documentação técnica** (`docs/redesign/redesign-audit.md`, READMEs de estrutura).
2. **Diretórios de preparação** com placeholders (`.gitkeep`) para modularização.
3. **Sem alteração em arquivos executáveis de runtime** (`src/index.html`, `src/worker.js`, `db/schema.sql` não foram modificados).

Decisão de naming nesta fase:

- **não introduzir novos nomes de domínio no runtime** além da documentação de preparação (`campus`/`unidade`), para evitar conflito prematuro com o masterplan.

---

## 13) Registro formal de dívida técnica (backend tempo em relatórios de projeto)

Mesmo após extrações incrementais de tarefas/tempo para `src/backend/`, as rotas abaixo ainda mantêm SQL de tempo e cálculo de horas líquidas diretamente em `src/worker.js`:

1. `GET /projetos/:id/relatorio`
2. `GET /projetos/:id/horas-por-usuario`

Classificação:

- dívida técnica **registrada formalmente** (não ajuste informal);
- extração recomendada no **próximo PR técnico de backend**;
- se houver bloqueio objetivo de escopo, mover para o **penúltimo PR técnico de backend** com rastreabilidade explícita.
