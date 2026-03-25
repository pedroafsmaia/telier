# Frontend modular (fase de extração de infraestrutura)

Referências desta etapa: `AGENTS.md`, `docs/redesign/masterplan.md`, `docs/redesign/redesign-audit.md` e `docs/redesign/naming-contracts.md`.

## O que foi extraído neste PR

Extração **somente de infraestrutura de baixo risco** a partir de `src/index.html`:

1. `services/api.js`
   - `createApiClient(...)`
   - `normalizeContractNode(...)`
   - `normalizeContractData(...)`
   - responsabilidade: camada de request + normalização de contrato.

2. `utils/formatters.js`
   - `esc(...)`, `iniciais(...)`, `avatarCor(...)`, `prazoFmt(...)`, `diasRestantes(...)`
   - responsabilidade: helpers puros de formatação/string/data.

3. `state/constants.js`
   - mapeamentos estáveis (`ST`, `PT`, `DT`, `FT`, `PO`, `DO`)
   - `DASH_STATUS_OPCOES`
   - normalizadores puros de status (`normalizarStatusProjeto`, `projetoConcluido`).

## Compatibilidade com o monólito

- `src/index.html` continua como entrypoint principal.
- Os módulos extraídos são carregados por `<script src="frontend/...">` e expostos em `window.TelierFrontend`.
- O monólito consome as funções extraídas por composição, sem alteração de fluxo visual.

## O que foi mantido no monólito (e por quê)

Mantido em `src/index.html` por risco maior nesta fase:

- renderização de telas e blocos de UI;
- handlers de interação do usuário;
- fluxo de navegação e modais;
- composição dos workspaces (dashboard/projeto/grupo/admin).

Motivo: reduzir risco operacional e evitar regressão visual/comportamental enquanto a base modular ganha infraestrutura comum.

## Critérios de extração usados

1. Priorizar funções **puras** ou quase puras.
2. Priorizar código reutilizável transversal (API/utils/constants).
3. Evitar mover renderização de telas nesta etapa.
4. Garantir reversibilidade simples (troca de referências sem rewrite amplo).
5. Preservar nomes e contratos existentes para não quebrar runtime.

## Duplicação temporária

- Não há duplicação funcional intencional entre monólito e módulos extraídos para os blocos migrados.
- Onde existirem aliases de contrato (`login`/`usuario_login`, `dificuldade`/`complexidade`), a normalização segue a estratégia transitória já documentada em `docs/redesign/naming-contracts.md`.

## Verificações de segurança desta etapa

1. `src/index.html` valida em runtime se `window.TelierFrontend` foi carregado antes do uso (ordem de scripts).
2. Helpers removidos do monólito foram extraídos sem duplicação residual dos blocos migrados.
3. `normalizeContractNode`/`normalizeContractData` seguem a mesma política de alias do backend: só preenchem campo ausente.
4. `utils/formatters.js` permanece puro (sem acesso a DOM/estado global).
5. `state/constants.js` não introduz vocabulário novo de contrato (somente mapas de status/prioridade já existentes na UI).

## Próximos candidatos seguros para extração

1. utilitários de modal/confirm;
2. utilitários de notificação/polling;
3. cache/filtros do dashboard (persistência local);
4. helpers de permissões (`isAdminRole`, `isAdmin`, `souDono`, `podeEditar`) com dependências de estado explícitas.

## Fase 1 (visual/estrutural) — base de design system + shell v2

### O que foi criado nesta fase

1. `frontend/theme/tokens.js`
   - tokens de cor, tipografia, espaçamento, radius, bordas e sombra;
   - tokens de estados básicos (`disabled`), movimento e z-index de shell;
   - aplicação de tema base institucional via CSS-in-JS injetado (`applyThemeTokens`).

2. `frontend/components/base.js`
   - componentes mínimos reutilizáveis:
     - `button`
     - `iconButton`
     - `input`
     - `select`
     - `panel`
     - `emptyState`
     - `tabs`
     - `searchField`
     - `filterBar`
   - utilitários de segurança/atributos (`esc`, `attrsToString`) para reduzir risco com HTML dinâmico na transição.

3. `frontend/shell/app-shell.js`
   - novo shell principal com navegação estrutural:
     - Hoje
     - Projetos
     - Tempo
     - Pessoas
     - Administração
   - placeholders coerentes para áreas ainda não reescritas;
   - navegação principal com estado ativo por `data-nav` + listeners (sem depender de `onclick` inline na barra lateral).

4. `src/index.html` (integração de transição)
   - carrega os novos scripts de tema/componentes/shell;
   - mantém convivência entre shell v2 e estrutura legada;
   - adiciona `abrirShellV2()` e `abrirOperacaoLegada()` para transição controlada;
   - adiciona retorno explícito do legado para o shell v2 (`#btn-shell-v2`) para contingência reversível;
   - adiciona estado de boot do shell v2 para evitar tela em branco durante inicialização.

### O que ainda não deve ser reescrito nesta etapa

- telas completas de Projetos/Projeto/Tarefas/Tempo;
- fluxos complexos de admin, grupos e colaboração;
- lógica operacional profunda existente no monólito.

### Limites desta etapa

- foco em gramática visual e estrutura base;
- sem redesign ornamental (sem glassmorphism dominante, sem gradientes como identidade);
- sem quebra de fluxo existente: o legado continua disponível para operação.
- placeholders são intencionalmente parciais: fornecem estrutura, filtros-base e estados visuais, mas não substituem ainda as telas operacionais completas.

### Próximos candidatos seguros para implementação de tela real

1. aprofundar integração de dados da página **Hoje** (pendências/bloqueios e ações primárias);
2. barra de filtros e busca real para Projetos;
3. primeira versão de listagem de projetos em painel funcional denso;
4. migração incremental dos blocos de topo do dashboard legado para componentes base.

## Fase 3 (primeira tela operacional real) — página “Hoje” no shell v2

### O que foi implementado na página “Hoje”

1. seção operacional real com prioridade explícita:
   - tarefa ativa / cronômetro ativo;
   - retomada;
   - prazos próximos;
   - pendências e bloqueios;
   - projetos em andamento.
2. carregamento assíncrono com estados de loading e erro no shell v2.
3. integração de baixo risco com endpoints já existentes:
   - `/tempo/ativas`
   - `/tempo/ultima-sessao`
   - `/tempo/resumo-hoje`
   - `/projetos?origem=todos&status=todos`
4. fallback honesto para dados ainda parciais, mantendo contingência no legado.
5. refresh com deduplicação de request em `loadHoje` para evitar concorrência/estado inconsistente.
6. ações primárias acionáveis no shell v2 com integração de baixo risco:
   - abrir tarefa ativa (com transição explícita para fluxo legado quando necessário);
   - abrir projeto relacionado;
   - iniciar/retomar/parar cronômetro pela própria tela;
   - abrir item de retomada com navegação mínima útil.
7. botões acionáveis com proteção de contexto:
   - desabilitados quando `tarefa_id`, `projeto_id` ou `sessao_id` não estão disponíveis;
   - fallback controlado com feedback explícito (sem erro silencioso).

### O que ainda depende do legado

- ação operacional completa de tarefa (CRUD, foco e colaboração);
- fluxo completo de decisão/retomada por projeto;
- filtros avançados e navegação cruzada de Hoje para visões de Projeto/Tarefas.
- integração ainda parcial de métricas de bloqueio (usa degradação segura quando endpoint não responde).
- ações de detalhe fino (abrir tarefa já posicionada no contexto exato) ainda usam ponte para telas antigas.

### Limites desta fase

- sem reescrever dashboard legado inteiro;
- sem migrar ainda Projetos/Projeto/Tarefas/Tempo completos;
- sem forçar integração de alto acoplamento ao monólito.
- quando não há caminho seguro no v2, a ação cai de forma explícita para o legado (transição reversível).

### Próximos candidatos seguros para migração

1. abertura nativa de tarefa no v2 sem ponte de legado;
2. bloco de pendências com origem direta de tarefas em atraso;
3. ligação de “projetos em andamento” para listagem v2 de Projetos;
4. migração incremental de cartões críticos do dashboard legado para componentes base.

## Fase 4 (primeira listagem real) — tela “Projetos” no shell v2

### O que foi implementado na tela “Projetos”

1. listagem operacional real em formato de tabela (não cardização decorativa), com colunas:
   - projeto
   - campus
   - unidade
   - fase
   - status
   - prazo
   - responsável
   - progresso
   - risco (heurística segura por status/prazo)
2. integração de baixo risco com dados reais via `GET /projetos?origem=todos&status=todos`, sem alterar contratos públicos.
3. busca funcional e filtros básicos seguros:
   - status
   - unidade/campus
   - responsável
   - limpeza rápida de filtros para evitar estado vazio inconsistente
4. abertura de projeto por ação explícita na listagem, usando fallback para fluxo atual quando ainda não há destino nativo seguro.
5. heurísticas conservadoras para progresso e risco:
   - progresso só aparece quando há volume mínimo de tarefas;
   - risco evita rótulos “fortes” quando o dado é frágil (prioriza “sem sinal forte” / “prazo próximo” / “atenção prazo”).

### O que ainda depende da interface atual

- workspace completo do projeto;
- navegação de detalhe profundo por tarefa/tempo dentro do projeto;
- edição avançada/permissões na listagem de projetos.

### Limites desta fase

- sem reescrever o workspace completo do projeto;
- sem migrar ainda telas completas de tarefas/tempo;
- sem ampliar escopo para migração geral de navegação interna.

### Próximos candidatos seguros para migração

1. abrir projeto em destino nativo v2 (quando o workspace mínimo existir);
2. filtros avançados por prazo e risco com backend dedicado;
3. ações rápidas por linha (ex.: abrir tarefas do projeto) com baixo acoplamento;
4. extração de utilitários de tabela para componentes de domínio reutilizáveis.

## Fase 5 (primeiro destino nativo) — página inicial de Projeto no shell v2

### O que foi implementado na página de Projeto

1. destino nativo inicial ao clicar em projeto na listagem v2 (não cai imediatamente no legado).
2. composição real de tela com:
   - cabeçalho compacto do projeto;
   - contexto principal (unidade/campus);
   - resumo operacional;
   - metadados principais (fase, status, prazo, responsável, progresso, risco);
   - bloco lateral com ações auxiliares e fallback explícito.
3. integração de baixo risco com endpoints existentes:
   - `GET /projetos/:id`
   - `GET /projetos/:id/relatorio` (resumo parcial, quando disponível)
4. robustez de abertura/retorno:
   - abertura da lista sempre usa `id` explícito do projeto;
   - retorno para listagem preserva estado básico de busca/filtros.
5. sinalização conservadora de dados parciais:
   - progresso exibido apenas com volume mínimo;
   - resumo/atividade marcados como parciais quando relatório não está disponível.

### O que ainda depende da interface atual

- fluxo completo de tarefas, tempo e decisões dentro do projeto;
- navegação de detalhe profundo por entidades internas;
- edição operacional completa do projeto.

### Limites desta fase

- sem reescrever workspace completo do projeto;
- sem migrar a tabela completa de tarefas no v2;
- sem expandir para migração geral de todas as subáreas.

### Próximos candidatos seguros para migração

1. primeira subárea nativa de tarefas dentro da página de projeto;
2. resumo de tempo mais confiável com endpoint dedicado para uso no v2;
3. ações rápidas contextuais no painel lateral (sem romper contratos);
4. remoção gradual de dependências de fallback para fluxo atual.

## Fase 5.1 (primeira subárea nativa) — Tarefas dentro da página de Projeto no shell v2

### O que foi implementado na subárea de tarefas

1. primeira seção nativa real de **Tarefas** dentro da página de Projeto no v2, sem abrir navegação paralela;
2. listagem/tabela operacional com dados reais e colunas de baixo risco:
   - nome da tarefa;
   - responsável;
   - colaboradores (best effort);
   - status;
   - prazo/data;
   - complexidade/prioridade;
   - tempo acumulado (best effort por resumo de tempo da tarefa);
3. integração com endpoints existentes, sem alterar contratos públicos:
   - `GET /projetos/:id/tarefas`
   - `GET /tarefas/:id/colaboradores`
   - `GET /tarefas/:id/tempo/resumo`
4. marcação explícita de confiabilidade quando enriquecimentos (colaboradores/tempo) não retornam para todas as tarefas.
5. redução do padrão N+1 no bridge v2:
   - prioriza `GET /projetos/:id/tarefas/snapshot-v2` (agregado);
   - aceita resposta agregada válida mesmo com `itens: []` (sem forçar fallback indevido);
   - só usa fallback base (`GET /projetos/:id/tarefas`) quando o agregado falha/retorna shape inválido.

### O que ainda depende da interface atual

1. CRUD completo de tarefas (criar/editar/remover/duplicar) e edição profunda;
2. fluxos de foco, colaboração avançada e permissões contextuais da tarefa;
3. navegação de detalhe fino da tarefa no contexto do projeto.
4. quando o endpoint agregado não estiver disponível, o fallback base mantém colaboradores parciais e tempo sem consolidado por tarefa.

Nesta fase, ações ainda não migradas usam fallback explícito:
- “Abrir no fluxo atual” por linha de tarefa;
- “Abrir tarefas no fluxo atual” no bloco quando necessário.
- no fallback por linha, o v2 abre o projeto no legado e tenta abrir diretamente a tarefa alvo para continuidade.

### Limites desta fase

1. não reescreve o workspace completo de Projeto;
2. não migra área completa de Tempo no projeto;
3. não altera contratos públicos nem estrutura de rotas;
4. mantém transição reversível entre `#v2-shell-root` e interface atual.

### Próximos candidatos seguros para migração

1. ação nativa de mudança de status em linha (sem edição completa);
2. abertura nativa de detalhe de tarefa em painel lateral (read-first);
3. consolidação de tempo por tarefa com endpoint agregado para reduzir N+1 no v2;
4. primeira ação nativa de criação simplificada de tarefa com campos mínimos.

## Fase 5.3 — ação nativa de status em linha na tabela de tarefas (Projeto v2)

### O que foi implementado nesta fase

1. atualização de status em linha diretamente na tabela de tarefas do Projeto v2 (select por linha);
2. integração segura com contrato já existente (`PATCH /tarefas/:id` com `{ status }`);
3. feedback discreto de loading/erro por linha durante atualização;
4. atualização conservadora da tabela após sucesso via recarga controlada do snapshot agregado (sem refresh duplicado);
5. em falha de PATCH, o select retorna ao status anterior da linha para evitar ambiguidade.

### O que ainda depende do fluxo atual

1. edição completa de tarefa;
2. foco avançado e colaboradores avançados;
3. detalhe read-first completo de tarefa e demais ações profundas.

### Limites da fase

1. sem migração de CRUD completo;
2. sem reescrita da área completa de tempo;
3. sem mudança de linguagem visual (mantém padrão sóbrio e operacional).
4. ordenação da tabela no v2 segue a ordem já entregue pelo snapshot agregado (sem resort local adicional).

### Próximos candidatos seguros para migração

1. detalhe read-first da tarefa em painel lateral;
2. ação nativa simples para prioridade/complexidade com mesmas salvaguardas de status;
3. telemetria de erro/sucesso da ação de status para hardening operacional.

## Fase 5.4 — primeiro detalhe read-first de Tarefa no v2

### O que foi implementado nesta fase

1. abertura nativa inicial de tarefa a partir da tabela de tarefas da página de Projeto no v2 (`Abrir tarefa`);
2. visualização read-first da tarefa com dados reais de baixo risco:
   - nome da tarefa;
   - contexto do projeto;
   - status;
   - prazo/data;
   - responsável;
   - colaboradores;
   - complexidade/prioridade;
   - resumo de tempo em minutos/horas.
3. integração do bridge v2 com snapshot dedicado de tarefa (`getTarefaSnapshot`), usando endpoints já existentes:
   - `GET /tarefas/:id`
   - `GET /tarefas/:id/colaboradores`
   - `GET /tarefas/:id/tempo/resumo`
4. fallback explícito para fluxo atual preservado na própria visualização (`Abrir no fluxo atual`);
5. retorno explícito para página de Projeto e para abertura de projeto no v2, mantendo transição reversível.
6. hardening de navegação e estado:
   - troca rápida entre tarefas usa `reqToken` sem bloquear clique por loading;
   - limpeza de dado anterior ao iniciar novo `loadTarefa` para evitar “estado velho”;
   - “Voltar para projeto” reabre o projeto correto quando necessário.

### O que ainda depende do fluxo atual

1. edição completa da tarefa;
2. foco avançado;
3. colaboradores avançados;
4. tempo detalhado por sessão/intervalo.

### Limites da fase

1. sem migração de CRUD completo de tarefa;
2. sem migração da área completa de tempo;
3. sem alteração de contratos públicos.

### Próximos candidatos seguros para migração

1. primeira ação nativa read-write de prioridade/complexidade com mesma política de fallback;
2. detalhes de tempo da tarefa em leitura expandida (sem edição avançada);
3. início de painel lateral de atividade/histórico mantendo contrato atual.

## Fase 5.5 — ação nativa de cronômetro no detalhe de Tarefa (v2)

### O que foi implementado nesta fase

1. ação nativa de cronômetro no detalhe read-first da tarefa:
   - iniciar/retomar cronômetro;
   - parar cronômetro.
2. snapshot da tarefa passou a incluir estado de sessão ativa (`timer`) via integração de baixo risco com `GET /tempo/ativas`.
3. feedback discreto por estado de mutação de cronômetro:
   - loading por ação (`Iniciando...` / `Parando...`);
   - erro local sem vazar para outras ações.
4. atualização conservadora após ação:
   - recarga controlada do snapshot da tarefa para refletir estado real.

### O que ainda depende do fluxo atual

1. edição completa de tarefa;
2. tempo detalhado por sessão/intervalo;
3. foco avançado e colaboradores avançados;
4. CRUD completo de tarefas.

### Limites da fase

1. sem criação de contrato novo de API;
2. sem reescrita da área completa de Tempo;
3. sem migração de edição avançada no detalhe da tarefa.

### Próximos candidatos seguros para migração

1. ação nativa simples de prioridade/complexidade no detalhe;
2. bloco read-first de sessões recentes da tarefa (sem edição avançada);
3. integração de ações de tarefa no Projeto v2 com estados unificados de operação.
