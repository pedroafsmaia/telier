# Backend modular (extração incremental por fases)

Referências desta etapa: `AGENTS.md`, `docs/redesign/masterplan.md`, `docs/redesign/redesign-audit.md` e `docs/redesign/naming-contracts.md`.

## O que foi extraído no PR anterior (HTTP/Auth)

Extração incremental e de baixo risco a partir de `src/worker.js`:

1. `src/backend/http/response.js`
   - `getCors(...)`
   - `json(...)`
   - `err(...)`
   - `buildResponseHeaders(...)`
   - responsabilidade: infraestrutura HTTP transversal de resposta/CORS.

2. `src/backend/utils/request.js`
   - `readJsonBody(...)`
   - `clampStr(...)`
   - `validateDate(...)`
   - `validatePositiveNumber(...)`
   - `toInt(...)`
   - `getPagination(...)`
   - `nowStr(...)`
   - responsabilidade: parsing/validação utilitária e helpers puros de request.

3. `src/backend/domain/auth/core.js`
   - `hashSenha(...)`, `verificarSenha(...)`
   - `checkRateLimit(...)`, `getRateLimitRetryAfter(...)`
   - `getUsuario(...)`, `requireAuth(...)`, `isAdmin(...)`
   - `getUsuarioLoginInput(...)`
   - `normalizeUsuarioPayload(...)`, `normalizeTarefaPayload(...)`
   - responsabilidade: núcleo de autenticação e compatibilidade de naming já estabilizada.
   - observação: normalizadores de naming são **opt-in por endpoint** (não aplicação global automática).

## Compatibilidade com o runtime atual

- `src/worker.js` **permanece entrypoint único**.
- O worker passou a importar infraestrutura/auth extraídos, mantendo contratos e rotas existentes.
- Não houve extração de domínios operacionais grandes (projetos/tarefas/tempo/admin) na fase inicial.

## O que foi extraído nesta fase (tarefas + tempo)

Extração incremental, reversível e sem mudança de fluxo em rotas já existentes:

1. `src/backend/domain/tasks/core.js`
   - `podeEditarTarefa(...)`
   - `podeCronometrarTarefa(...)`
   - responsabilidade: autorização operacional de tarefa/cronômetro sem mover roteamento.

2. `src/backend/domain/tasks/contracts.js`
   - `parseTarefaUpsertInput(...)`
   - `getComplexidadeNormalizada(...)`
   - responsabilidade: parsing/normalização de payload de criação/edição de tarefa com aliases já estabilizados.

3. `src/backend/domain/time/contracts.js`
   - `parseSessaoTempoCreateInput(...)`
   - `parseSessaoTempoUpdateInput(...)`
   - `parseSessaoTempoStopInput(...)`
   - responsabilidade: parsing de payload dos endpoints de sessão de tempo.

4. `src/backend/repositories/time.js`
   - queries reutilizáveis de sessões de tempo e agregações:
     - listagem de sessões por tarefa com intervalos
     - resumo por tarefa
     - sessões ativas
     - colegas ativos
     - última sessão concluída
     - resumo do dia
     - CRUD básico de sessão (get/criar/atualizar/excluir/parar)
   - responsabilidade: retirar SQL repetido de tempo do `worker.js` sem alterar contratos.

## O que foi extraído nesta fase (tarefas operacional)

Extração incremental do domínio de tarefas sem desmontar roteamento:

1. `src/backend/repositories/tasks.js`
   - listagem de tarefas por projeto;
   - lookup de template ativo para criação;
   - operações de CRUD de tarefa e patch de status;
   - duplicação de tarefa;
   - regras de foco (incluindo atualização exclusiva via batch);
   - operações de colaboradores (listar/adicionar/remover).
   - responsabilidade: reduzir SQL de tarefas no `worker.js` em operações operacionais de baixo a moderado risco.

2. `src/backend/domain/tasks/core.js` (ampliação)
   - regras puras para foco e gestão de colaboradores;
   - helper de mensagem de notificação de compartilhamento.

3. `src/backend/domain/tasks/contracts.js` (ampliação)
   - parsing de payload de colaboradores (`parseColaboradorInput`).

## O que foi extraído nesta fase (tempo analítico / relatórios de projeto)

Extração incremental focada em reduzir duplicação de SQL analítico de tempo:

1. `src/backend/repositories/time.js` (ampliação)
   - `listRelatorioProjetoTempoRows(...)` para `GET /projetos/:id/relatorio`;
   - `listHorasPorUsuarioNoProjeto(...)` para `GET /projetos/:id/horas-por-usuario`;
   - mantém exatamente filtros, agrupamentos, `HAVING`, ordenação e arredondamentos já existentes.

2. `src/backend/services/time_reports.js`
   - `agruparRelatorioProjetoPorTarefa(...)` para montagem reutilizável da estrutura retornada por `/projetos/:id/relatorio`.

## O que foi mantido no monólito (e por quê)

Permaneceu em `src/worker.js` por risco maior nesta etapa:

- roteamento principal e encadeamento de endpoints;
- regras de negócio por domínio operacional;
- consultas SQL de projetos, tarefas, tempo, grupos e administração;
- orquestração de schemas/migrações runtime (`ensure*Schema`).

Motivo: preservar comportamento e reduzir regressão enquanto o núcleo transversal é isolado primeiro.

### Detalhamento objetivo do que ficou no monólito

1. **Camada HTTP de orquestração**
   - dispatcher principal de rotas e resolução de método/path;
   - checagens de autorização contextual por endpoint.
2. **Domínios operacionais ainda acoplados ao entrypoint**
   - projetos (CRUD, compartilhamento, permissões finas);
   - tarefas (CRUD, filtros, ordenação, normalização de payload em borda);
   - tempo/sessões (início/pausa/stop, consolidação, relatórios);
   - administração (setup, usuários, parâmetros operacionais).
3. **Infra de banco com acoplamento temporal**
   - `ensure*Schema` executado em runtime com `ALTER TABLE` defensivo;
   - consultas SQL embutidas nos handlers de rota.

**Por que não saiu nesta fase:** estes blocos combinam regras de negócio + acesso a dados + shape de resposta no mesmo trecho, elevando risco de regressão funcional quando movidos sem cobertura de testes de contrato por domínio.

### O que permaneceu especificamente após a fase tarefas/tempo

1. **Roteamento completo e guardas por endpoint** em `src/worker.js`.
2. **SQL de tarefas ainda acoplado às rotas** de CRUD, foco, colaboração e duplicação.
   - após esta fase, o SQL operacional dessas rotas foi majoritariamente extraído para `repositories/tasks`;
   - permanecem no worker partes acopladas a autorização cruzada com projetos/auth e pontos fora de escopo (decisões, relatórios).
3. **Fluxos de admin, grupos e projetos** (fora do escopo deste PR) permaneceram no monólito.
4. **Schema bootstrap (`ensure*Schema`)** permanece no entrypoint por dependência de ordem/lifecycle da request.

## Critérios de extração usados

1. Priorizar utilitários puros e middleware técnico transversal.
2. Extrair autenticação primeiro (baixo risco e alta reutilização).
3. Evitar quebrar contratos públicos de API.
4. Garantir reversibilidade (imports simples no entrypoint).
5. Evitar mover domínio operacional complexo nesta etapa.

## Duplicação temporária

- Não há duplicação funcional intencional para os blocos extraídos.
- Compatibilidades de naming (`login`/`usuario_login`, `dificuldade`/`complexidade`) permanecem centralizadas no domínio auth por decisão transitória já documentada.
- Esses normalizadores só atuam quando chamados explicitamente no endpoint.

## Riscos, dependências e pendências

### Riscos atuais

1. **Regressão silenciosa por extração parcial**
   - com módulos novos coexistindo com rotas legadas, alterações em assinatura podem escapar sem testes E2E amplos.
2. **Acoplamento por import direto no entrypoint**
   - `worker.js` segue como ponto único de composição; mudanças de ordem/lifecycle ainda podem afetar múltiplos domínios.
3. **Schema evoluindo em runtime**
   - `ensure*Schema` mantém risco operacional em ambientes com variações de estado de banco.

### Dependências para avançar a modularização

1. suíte mínima de testes de contrato por rota crítica (auth, tarefas, projetos);
2. definição de fronteiras por domínio (services/repositories) antes de separar handlers;
3. estratégia de migração para reduzir `ALTER TABLE` em runtime (migrations versionadas).
4. extração de repositórios de tarefas com cobertura de permissões e foco sem alterar semântica de negócio.

### Pendências mapeadas

1. mover autorização por escopo para middleware dedicado;
2. consolidar normalização de contratos em módulo único de borda HTTP;
3. extrair consultas SQL repetidas para camada de repositório;
4. definir plano de descontinuação de aliases (`login`, `dificuldade`) com data de corte.
5. separar serviços de tarefas (CRUD/foco/colaboradores) das rotas mantendo compatibilidade integral.
6. avaliar extração de verificações de permissão de relatório (ainda no `worker.js`) sem acoplar demais com domínio de projetos/auth.

### Dívida técnica registrada (não perder no próximo ciclo)

As rotas abaixo já tiveram SQL analítico de tempo extraído para `src/backend/repositories/time.js`, mas ainda mantêm no `worker.js` as verificações de autorização e existência de projeto:

- `GET /projetos/:id/relatorio`
- `GET /projetos/:id/horas-por-usuario`

Motivo da permanência parcial: as checagens de permissão ainda dependem diretamente do domínio de projetos/auth e foram mantidas no entrypoint para reduzir risco de regressão nesta fase.

Encaminhamento acordado:

- tratar essa extração como **candidato explícito do próximo PR técnico de backend**;
- se houver bloqueio de escopo no próximo, promover para **penúltimo PR técnico de backend**, mantendo rastreabilidade formal (não como ajuste informal).

## Fase 5.2 — snapshot agregado de tarefas para Projeto v2 (redução de N+1)

### O que foi consolidado

1. novo endpoint dedicado de suporte ao v2:
   - `GET /projetos/:id/tarefas/snapshot-v2`
   - retorno explícito com `source: "aggregated-v2"` e `parcial: false` quando a agregação responde com sucesso (mesmo sem tarefas).
2. consolidação em query agregada no repositório de tarefas:
   - base de tarefas por projeto;
   - agregação de colaboradores por tarefa (`colaboradores_*_raw`);
   - agregação de tempo líquido por tarefa em minutos (`tempo_minutos`).
3. o endpoint permanece de baixo risco:
   - usa mesmas permissões de leitura operacional de projeto;
   - não altera rotas legadas já consumidas por outras áreas.

### O que deixou de ser N+1

- o fluxo v2 deixou de depender de chamada por tarefa para:
  - `GET /tarefas/:id/colaboradores`
  - `GET /tarefas/:id/tempo/resumo`
- esses dados passam a vir agregados no endpoint dedicado para o snapshot da tabela de tarefas do projeto.

### O que ainda pode permanecer parcial

1. quando o endpoint agregado não estiver disponível no ambiente, o frontend usa fallback base (`GET /projetos/:id/tarefas`) sem tempo consolidado por tarefa;
2. ações avançadas de tarefa (CRUD completo, foco e colaboração avançada) continuam fora do escopo deste endpoint.

### Próximos candidatos seguros para migração

1. adicionar testes de contrato para `GET /projetos/:id/tarefas/snapshot-v2`;
2. mover composição de payload do snapshot para service dedicado (mantendo repositório com SQL);
3. introduzir cache curto opcional por projeto para reduzir carga em cenários de refresh frequente.

## Fase 5.3 — suporte backend para ação nativa de status em linha (Projeto v2)

### O que foi implementado nesta fase

1. reutilização do contrato existente de atualização de status (`PATCH /tarefas/:id` com `{ status }`) para ação nativa no v2;
2. manutenção da trilha agregada de snapshot para recarga controlada após mudança de status;
3. ajuste de documentação no `worker` para explicitar método PATCH no fluxo de atualização de status.

### O que ainda depende do fluxo atual

1. edição completa de tarefa, foco avançado e colaboração avançada permanecem no legado;
2. não houve criação de endpoint novo para status, por ser desnecessário nesta fase.

### Limites da fase

1. sem alteração de contratos públicos além de reaproveitar os existentes;
2. sem reescrita da área completa de tempo;
3. sem migração de CRUD completo de tarefas.

### Próximos candidatos seguros para migração

1. endurecer validação de status permitidos em contrato dedicado;
2. adicionar teste de contrato específico para `PATCH /tarefas/:id` no contexto v2;
3. avaliar lock otimista por `atualizado_em` em mudanças concorrentes de status.

## Checks executados nesta etapa

1. `node scripts/check_backend_infra_compat.mjs`
   - cobre `getCors`, `json`, `err`, `readJsonBody`, hash/verificação de senha, rate limit, `requireAuth`, `isAdmin` e normalizadores de payload.
2. `npm run smoke`
   - check de smoke do app; depende de binários Playwright no ambiente.
3. `node --check src/worker.js`
4. `node --check src/backend/domain/tasks/core.js`
5. `node --check src/backend/domain/tasks/contracts.js`
6. `node --check src/backend/domain/time/contracts.js`
7. `node --check src/backend/repositories/time.js`
8. `node --check src/backend/repositories/tasks.js`
9. `node --check src/backend/services/time_reports.js`

## Mudança indireta em contratos públicos

- **Não houve mudança quebradora intencional** de contrato público nesta etapa.
- Houve **estabilização compatível** de naming:
  - entrada aceita `usuario_login` e `login`;
  - entrada aceita `complexidade` e `dificuldade`;
  - respostas mantêm aliases sincronizados durante transição.
- Endpoint `/auth/foco-global` foi formalizado para evitar 404 silencioso, mantendo shape defensivo e compatibilidade.

## Próximos candidatos seguros para extração

1. middlewares de autorização por escopo (admin/editor/colaborador);
2. camadas de query compartilhada para usuários/sessões;
3. repositório de tarefas (listagem por projeto, CRUD e foco) com testes de contrato dedicados;
4. serviço de colaboradores de tarefa e compartilhamento;
5. roteamento por domínio em `http/routes` sem mover regra de negócio complexa de uma vez;
6. serviço de notificações como módulo isolado.
