export type ParityImplementationStatus = 'implemented';
export type ParityValidationStatus = 'pending-real-validation' | 'validated-real-usage';

export interface ParityChecklistItem {
  id: string;
  label: string;
  route: string;
  implementationStatus: ParityImplementationStatus;
  validationStatus: ParityValidationStatus;
  evidence: string[];
  verification: string;
}

export const parityChecklist: ParityChecklistItem[] = [
  {
    id: 'login',
    label: 'Login',
    route: '/login',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['routes/LoginPage.tsx', 'lib/auth.tsx', 'app/RequireAuth.tsx'],
    verification: 'Autenticar com credenciais reais e confirmar redirecionamento para Tarefas.',
  },
  {
    id: 'main-navigation',
    label: 'Navegacao principal',
    route: '/tarefas, /projetos, /grupos, /admin',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['app/layout/Sidebar.tsx', 'app/routerConfig.tsx'],
    verification: 'Abrir Tarefas, Projetos, Grupos e Administracao respeitando o papel do usuario.',
  },
  {
    id: 'global-timer',
    label: 'Timer global',
    route: 'layout global',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['app/layout/GlobalTimerBar.tsx', 'features/tasks/queries.ts'],
    verification: 'Iniciar um timer e confirmar barra fixa no topo em qualquer pagina.',
  },
  {
    id: 'start-session',
    label: 'Iniciar sessao',
    route: '/tarefas e /projetos/:projectId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/tasks/components/TaskRow.tsx', 'features/tasks/hooks/useTaskActionState.ts'],
    verification: 'Acionar iniciar timer em uma tarefa sem sessao ativa e verificar destaque imediato.',
  },
  {
    id: 'stop-session',
    label: 'Parar sessao',
    route: '/tarefas e /projetos/:projectId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/tasks/components/TaskTimerFlowDrawer.tsx', 'features/tasks/hooks/useTaskActionState.ts'],
    verification: 'Encerrar timer ativo com observacao ou ajuste no drawer leve de parada.',
  },
  {
    id: 'open-task-drawer',
    label: 'Abrir drawer da tarefa',
    route: '/tarefas e /projetos/:projectId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/tasks/components/TaskList.tsx', 'features/tasks/components/TaskDrawer.tsx'],
    verification: 'Clicar no corpo da tarefa e confirmar drawer lateral em modo leitura.',
  },
  {
    id: 'edit-task',
    label: 'Editar tarefa',
    route: 'drawer de tarefa',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/tasks/components/TaskDrawer.tsx'],
    verification: 'Trocar para modo edicao no mesmo drawer e salvar alteracoes da tarefa.',
  },
  {
    id: 'complete-task',
    label: 'Concluir tarefa',
    route: '/tarefas, /projetos/:projectId e drawer',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/tasks/components/TaskRow.tsx', 'features/tasks/components/TaskDrawer.tsx'],
    verification: 'Concluir tarefa na linha ou no drawer e conferir mudanca para Concluida.',
  },
  {
    id: 'quick-task-create',
    label: 'Criacao rapida de tarefa',
    route: '/tarefas e /projetos/:projectId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/tasks/components/QuickTaskCreate.tsx', 'routes/TasksPage.tsx', 'routes/ProjectPage.tsx'],
    verification: 'Criar tarefa pela acao rapida e validar retorno imediato na lista.',
  },
  {
    id: 'open-project',
    label: 'Abrir projeto',
    route: '/projetos/:projectId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['routes/ProjectsPage.tsx', 'routes/ProjectPage.tsx'],
    verification: 'Abrir um projeto a partir da listagem ou contexto administrativo.',
  },
  {
    id: 'create-project',
    label: 'Criar projeto',
    route: '/projetos e /grupos/:groupId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/projects/components/ProjectFormDrawer.tsx', 'routes/ProjectsPage.tsx', 'routes/GroupPage.tsx'],
    verification: 'Criar projeto na listagem geral ou dentro de um grupo e confirmar navegacao para o detalhe.',
  },
  {
    id: 'open-group',
    label: 'Abrir grupo',
    route: '/grupos/:groupId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['routes/GroupsPage.tsx', 'routes/GroupPage.tsx'],
    verification: 'Abrir grupo a partir da listagem geral.',
  },
  {
    id: 'create-group',
    label: 'Criar grupo',
    route: '/grupos',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/groups/components/GroupFormDrawer.tsx', 'routes/GroupsPage.tsx'],
    verification: 'Criar grupo na listagem e confirmar navegacao para o detalhe criado.',
  },
  {
    id: 'project-records',
    label: 'Usar registros em projeto',
    route: '/projetos/:projectId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/records/components/ProjectRecordsSection.tsx', 'features/records/components/RecordFormDrawer.tsx'],
    verification: 'Criar, concluir ou reabrir e converter registro em tarefa dentro do projeto.',
  },
  {
    id: 'group-records',
    label: 'Usar registros em grupo',
    route: '/grupos/:groupId',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['features/records/components/GroupRecordsSection.tsx', 'features/records/components/RecordFormDrawer.tsx'],
    verification: 'Criar registro no grupo, ordenar pendencias e converter em tarefa.',
  },
  {
    id: 'admin-minimum',
    label: 'Visao admin minima',
    route: '/admin',
    implementationStatus: 'implemented',
    validationStatus: 'pending-real-validation',
    evidence: ['app/AdminRoute.tsx', 'routes/AdminPage.tsx'],
    verification: 'Entrar como admin e validar listagens minimas de tarefas, projetos e grupos.',
  },
];

export const implementedParityItems = parityChecklist.filter((item) => item.implementationStatus === 'implemented').length;
export const validatedParityItems = parityChecklist.filter((item) => item.validationStatus === 'validated-real-usage').length;
export const pendingRealValidationItems = parityChecklist.filter((item) => item.validationStatus === 'pending-real-validation').length;
