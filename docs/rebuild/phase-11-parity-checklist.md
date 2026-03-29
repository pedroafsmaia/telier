# Fase 11 - Flag, paridade e corte do legado

## Mecanismo de ativacao controlada

A nova UI passou a ser governada por uma camada unica de migracao no bootstrap do `frontend-v2`.

### Flag oficial

- Variavel: `VITE_TELIER_UI_MIGRATION_MODE`
- Valores aceitos:
  - `legacy`: a nova UI fica fechada por padrao
  - `validation`: a nova UI pode ser validada de forma controlada
  - `rebuild`: a nova UI assume a superficie principal
- Fallback para valor ausente ou invalido: `legacy`

### Override local durante validacao

- Query param suportado: `?telier_ui=legacy|rebuild`
- Persistencia local: `localStorage['telier_migration_surface']`
- Restricao obrigatoria: override so e aceito quando `VITE_TELIER_UI_MIGRATION_MODE=validation`
- Em `legacy`, nao existe bypass local para abrir a nova UI

### Handoff para o legado

- Variavel opcional: `VITE_TELIER_LEGACY_URL`
- Uso: direcionar explicitamente o botao `Abrir legado` para a superficie antiga durante a validacao
- Fallback: `window.location.origin`

## Checklist de paridade minima

Interpretacao obrigatoria desta fase:
- `Implementado no codigo`: o fluxo existe na nova UI e tem evidencia objetiva no repositorio
- `Validacao real`: o fluxo foi ou nao foi comprovado em uso real

| Fluxo | Implementado no codigo | Validacao real | Evidencia principal | Como verificar |
| --- | --- | --- | --- | --- |
| login | Sim | Pendente | `frontend-v2/src/routes/LoginPage.tsx`, `frontend-v2/src/lib/auth.tsx`, `frontend-v2/src/app/RequireAuth.tsx` | Entrar com credenciais reais e confirmar redirecionamento para `Tarefas`. |
| navegacao principal | Sim | Pendente | `frontend-v2/src/app/layout/Sidebar.tsx`, `frontend-v2/src/app/routerConfig.tsx` | Navegar entre `Tarefas`, `Projetos`, `Grupos` e `Administracao` conforme o papel. |
| timer global | Sim | Pendente | `frontend-v2/src/app/layout/GlobalTimerBar.tsx` | Iniciar timer e confirmar barra fixa em qualquer pagina. |
| iniciar sessao | Sim | Pendente | `frontend-v2/src/features/tasks/components/TaskRow.tsx`, `frontend-v2/src/features/tasks/hooks/useTaskActionState.ts` | Iniciar timer numa tarefa sem sessao ativa. |
| parar sessao | Sim | Pendente | `frontend-v2/src/features/tasks/components/TaskTimerFlowDrawer.tsx` | Encerrar timer ativo pelo fluxo leve de parada. |
| abrir drawer da tarefa | Sim | Pendente | `frontend-v2/src/features/tasks/components/TaskDrawer.tsx` | Clicar no corpo da tarefa e abrir o drawer em leitura. |
| editar tarefa | Sim | Pendente | `frontend-v2/src/features/tasks/components/TaskDrawer.tsx` | Trocar para edicao no mesmo drawer e salvar. |
| concluir tarefa | Sim | Pendente | `frontend-v2/src/features/tasks/components/TaskRow.tsx`, `frontend-v2/src/features/tasks/components/TaskDrawer.tsx` | Concluir na linha ou no drawer. |
| criacao rapida de tarefa | Sim | Pendente | `frontend-v2/src/features/tasks/components/QuickTaskCreate.tsx` | Criar tarefa pela acao rapida e conferir retorno na lista. |
| abrir projeto | Sim | Pendente | `frontend-v2/src/routes/ProjectsPage.tsx`, `frontend-v2/src/routes/ProjectPage.tsx` | Abrir um projeto pela listagem. |
| criar projeto | Sim | Pendente | `frontend-v2/src/features/projects/components/ProjectFormDrawer.tsx`, `frontend-v2/src/routes/ProjectsPage.tsx`, `frontend-v2/src/routes/GroupPage.tsx` | Criar projeto na lista geral ou dentro de grupo. |
| abrir grupo | Sim | Pendente | `frontend-v2/src/routes/GroupsPage.tsx`, `frontend-v2/src/routes/GroupPage.tsx` | Abrir grupo pela listagem. |
| criar grupo | Sim | Pendente | `frontend-v2/src/features/groups/components/GroupFormDrawer.tsx`, `frontend-v2/src/routes/GroupsPage.tsx` | Criar grupo e validar navegacao para o detalhe. |
| usar registros em projeto | Sim | Pendente | `frontend-v2/src/features/records/components/ProjectRecordsSection.tsx`, `frontend-v2/src/features/records/components/RecordFormDrawer.tsx` | Criar, concluir ou reabrir e converter registro em tarefa. |
| usar registros em grupo | Sim | Pendente | `frontend-v2/src/features/records/components/GroupRecordsSection.tsx`, `frontend-v2/src/features/records/components/RecordFormDrawer.tsx` | Criar registro agregado e converter em tarefa. |
| visao admin minima | Sim | Pendente | `frontend-v2/src/app/AdminRoute.tsx`, `frontend-v2/src/routes/AdminPage.tsx` | Entrar como admin e conferir listagens minimas. |

## Integracao de alternancia entre legado e nova UI

A alternancia durante a validacao foi centralizada em tres pontos:

1. `MigrationContext`
- define a flag oficial
- so aceita override local em `validation`
- fecha a nova UI por padrao quando a flag estiver ausente ou invalida

2. `MigrationGate`
- impede bypass local em `legacy`
- deixa a troca explicita durante `validation`
- mantem retorno imediato ao legado

3. `MigrationStatusBanner`
- mostra separadamente implementacao em codigo e validacao real
- evita comunicar cobertura de codigo como se fosse paridade aprovada

## Pipeline e validacao versionados

O repositrio agora versiona a nova superficie no caminho de entrega:

- `.github/workflows/deploy.yml` observa `frontend-v2/**`
- o workflow executa `lint` e `build` do `frontend-v2` com `VITE_TELIER_UI_MIGRATION_MODE=legacy`
- o artifact `frontend-v2-dist` passa a ser gerado no CI
- existe smoke minima da nova UI em `smoke-rebuild.js`
- a smoke da nova UI agora consegue rodar localmente, sem depender de URL externa, subindo Worker local + preview local + conta admin de smoke
- se `REBUILD_BASE_URL`, `LOGIN_USER` e `LOGIN_PASS` forem informados, a mesma smoke tambem pode validar um ambiente externo

## Corte do legado nesta fase

Nao houve remocao automatica de codigo legado.

Motivo:
- a paridade minima esta implementada no codigo da nova UI;
- mas todos os itens seguem com validacao real pendente;
- a smoke automatizada reduz risco tecnico, mas nao substitui validacao operacional real;
- portanto o corte continua controlado, reversivel e nao destrutivo.

## Regra objetiva para fase seguinte

So considerar remocao de codigo morto legado quando, ao mesmo tempo:
- todos os itens acima estiverem validados em uso real;
- nao houver regressao critica aberta;
- nao existir fluxo principal ainda dependente da UI antiga.
