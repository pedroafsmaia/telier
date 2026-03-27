# Plano de Evolução do Telier — v2

## Visão geral

Três camadas: **Pré-lançamento** (bloqueante), **Pós-lançamento** (evolução), **Investigação** (só com dados de uso).

---

## PRÉ-LANÇAMENTO

### Fase 0 — Correções críticas de infraestrutura

#### 0.1 Endpoint unificado GET /api/tarefas/minhas
Criar no backend um endpoint que retorne todas as tarefas do usuário logado (dono ou colaborador), com JOINs para nome do projeto, nome do grupo e status do projeto. Uma query substitui o N+1 atual.

O frontend passa a chamar esse endpoint em `renderTarefasHome` em vez de `carregarTarefasUsuarioAtivas()`.

**Arquivos afetados:**
- `src/backend/domain/tasks/controllers.js` (novo handler)
- `src/worker.js` (nova rota)
- `src/modules/tasks.js` (substituir carregarTarefasUsuarioAtivas)

#### 0.2 Tratamento de erros visíveis
Substituir todo `catch(() => [])` e `catch(() => null)` por feedback ao usuário. Padrão: se um bloco de dados não carrega, mostrar "Não foi possível carregar [nome]. Recarregue a página." no lugar do bloco.

**Arquivos afetados:**
- `src/modules/tasks.js` (renderTarefasHome, carregarTarefasUsuarioAtivas)
- `src/modules/dashboard.js` (renderDash)
- `src/modules/groups.js` (renderGroupsHome, abrirGrupo)
- `src/modules/timer.js` (carregarTimersAtivos)
- `src/modules/notifications.js` (carregarNotificacoes, carregarColegasAtivos)

#### 0.3 Eliminar duplicação Tarefas vs. Dashboard
Remover o bloco renderPainelHoje (prioridade do dia + retomadas) da tela #/projetos. A tela #/projetos passa a exibir: painel Ao Vivo (topo) + lista de projetos.

O código duplicado de cálculo de prioridade/retomadas fica apenas em tasks.js.

**Arquivos afetados:**
- `src/modules/dashboard.js` (remover renderPainelHoje da renderização, simplificar renderDash)

#### 0.4 Feedback imediato ao abrir tarefa da home
Quando o usuário clica em uma tarefa na home, abrir imediatamente um modal com skeleton e o nome da tarefa (já disponível do endpoint /tarefas/minhas). Carregar o projeto em background. Quando TAREFAS estiver populado, substituir skeleton pelos campos de edição.

**Arquivos afetados:**
- `src/modules/tasks.js` (abrirTarefaContexto, modalEditarTarefa)

---

### Fase 1 — Simplificação da home de tarefas

#### 1.1 Dois blocos na home
**Bloco 1 — Ação imediata:** tarefa ativa (cronômetro rodando) ou tarefa em foco, com botão direto de iniciar/parar. No cabeçalho: total de horas do dia compacto ("Hoje: 4.2h").

**Bloco 2 — Lista filtrada:** campo de busca visível; filtros de escopo/projeto/status colapsados por padrão (botão "Filtros" expande).

Remover do corpo principal: grid de 4 métricas (sessões, tarefas, ativas, em andamento). Manter apenas o total líquido.

**Arquivos afetados:**
- `src/modules/tasks.js` (renderTarefasHome — reescrever overviewHtml e filtersHtml)
- `src/styles.css` (novos estilos para layout compacto)

#### 1.2 Retomadas como seção secundária
O bloco "Continuar de onde parou" fica abaixo da lista, colapsável, rotulado como "Tarefas recentes".

**Arquivos afetados:**
- `src/modules/tasks.js` (renderTarefasHome — mover retomadas para depois da lista)
- `src/styles.css` (estilo colapsável)

#### 1.3 Cronômetro ativo inconfundível
Quando há cronômetro ativo, o Bloco 1 deve ter: borda lateral accent, dot pulsante, tempo correndo em tempo real, botão "Encerrar sessão" em vermelho.

**Arquivos afetados:**
- `src/modules/tasks.js` (bloco de prioridade do dia)
- `src/styles.css` (animação dot, borda accent)

---

### Fase 2 — Tela de projetos para coordenação

#### 2.1 Ao Vivo no topo
Mover renderAoVivoStream para o topo de #/projetos com scope admin (todas as sessões ativas de todos os usuários). Se não houver sessões, mostrar "Nenhuma sessão ativa no momento".

**Arquivos afetados:**
- `src/modules/dashboard.js` (renderDash — adicionar bloco Ao Vivo antes da lista)

#### 2.2 Lista de projetos simplificada
Cada projeto: nome, grupo, fase, status, progresso (X/Y tarefas), prazo. Sem painel "hoje". Filtros: busca + status (manter os existentes).

**Arquivos afetados:**
- `src/modules/dashboard.js` (renderProjetosDash, renderCardsDash — simplificar)

---

## PÓS-LANÇAMENTO

### Fase 3 — Dívida técnica do frontend (semana 1–2)

#### 3.1 Quebrar tasks.js
Dividir em: tasks-home.js, tasks-project.js, tasks-modals.js, tasks-actions.js.
Atualizar imports em app.js e demais módulos.

#### 3.2 Componentes em components.js
Extrair: renderTimerActions, renderTaskOpsList, renderColabsStack, metaPair, avatar, tag, renderAoVivoStream.

#### 3.3 Inline styles para CSS
Mover todas as atribuições style="..." dos módulos JS para classes CSS nomeadas.

#### 3.4 Event delegation
Implementar listener único no #content para: data-action="abrir-tarefa", data-action="iniciar-cronometro", data-action="parar-cronometro".

---

### Fase 4 — Refinamento por fluxos reais (semana 3–4)

Baseado em observação de uso real:
- 4.1 Mapear os 5 fluxos mais frequentes
- 4.2 Decidir simplificação de Grupos com dados
- 4.3 Decidir sobre retomadas com dados
- 4.4 Decidir sobre detalhes de tarefa (localStorage → banco ou remover)

### Fase 5 — Acessibilidade e ergonomia (contínuo)

- Labels e aria-label nos fluxos críticos
- Alvos de toque 44x44px em mobile
- Contraste de text-muted
- Navegação por teclado (Tab/Enter/Espaço)
- Estados vazios instrutivos

### Fase 6 — Robustez técnica (contínuo)

- Testes de integração no backend
- Retry básico (1 tentativa antes de erro)
- Revisar cache de projetos (TTL de 10s é inútil)

---

## INVESTIGAÇÃO (só com dados de uso)

- Persistência local do cronômetro (offline) — só se houver relato de perda de dados
- Timestamp do servidor vs. cliente — só se houver inconsistências de horário
- Rota independente #/tarefas/:id — só se o skeleton no modal não for suficiente
