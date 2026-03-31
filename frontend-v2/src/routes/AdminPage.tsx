import { useMemo, useState } from 'react';
import { AppShell } from '../app/layout/AppShell';
import { useAuth } from '../lib/auth';
import {
  useAdminEditGroup,
  useAdminEditProject,
  useAdminEditTask,
  useAdminGroups,
  useAdminProjects,
  useAdminTasks,
  useAdminUsers,
} from '../features/admin';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  SearchField,
  SectionHeader,
  Select,
  Skeleton,
} from '../design/primitives';
import {
  getEaseLabel,
  getPriorityLabel,
  getTaskStatusLabel,
  GroupStatus,
  ProjectPhase,
  ProjectStatus,
  TaskStatus,
  type GroupStatus as GroupStatusType,
  type ProjectPhase as ProjectPhaseType,
  type ProjectStatus as ProjectStatusType,
  type TaskStatus as TaskStatusType,
} from '../lib/enums';

type AdminEntityFilter = 'all' | 'tasks' | 'projects' | 'groups';

const TASKS_PAGE_SIZE = 200;
const PROJECTS_PAGE_SIZE = 100;
const GROUPS_PAGE_SIZE = 100;

const taskStatusOptions = [
  { value: TaskStatus.TODO, label: 'A fazer' },
  { value: TaskStatus.IN_PROGRESS, label: 'Em andamento' },
  { value: TaskStatus.WAITING, label: 'Em espera' },
  { value: TaskStatus.DONE, label: 'Concluída' },
];

const projectStatusOptions = [
  { value: ProjectStatus.TODO, label: 'A fazer' },
  { value: ProjectStatus.IN_PROGRESS, label: 'Em andamento' },
  { value: ProjectStatus.IN_REVIEW, label: 'Em revisão' },
  { value: ProjectStatus.PAUSED, label: 'Pausado' },
  { value: ProjectStatus.DONE, label: 'Concluído' },
  { value: ProjectStatus.ARCHIVED, label: 'Arquivado' },
];

const groupStatusOptions = [
  { value: GroupStatus.ACTIVE, label: 'Ativo' },
  { value: GroupStatus.PAUSED, label: 'Pausado' },
  { value: GroupStatus.ARCHIVED, label: 'Arquivado' },
];

function toUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function getProjectStatusLabel(status: ProjectStatusType): string {
  switch (status) {
    case ProjectStatus.TODO:
      return 'A fazer';
    case ProjectStatus.IN_PROGRESS:
      return 'Em andamento';
    case ProjectStatus.IN_REVIEW:
      return 'Em revisão';
    case ProjectStatus.PAUSED:
      return 'Pausado';
    case ProjectStatus.DONE:
      return 'Concluído';
    case ProjectStatus.ARCHIVED:
      return 'Arquivado';
    default:
      return 'A fazer';
  }
}

function getProjectPhaseLabel(phase: ProjectPhaseType): string {
  switch (phase) {
    case ProjectPhase.PRELIMINARY_STUDY:
      return 'Estudo preliminar';
    case ProjectPhase.PRELIMINARY_PROJECT:
      return 'Anteprojeto';
    case ProjectPhase.BASIC_PROJECT:
      return 'Projeto básico';
    case ProjectPhase.EXECUTIVE_PROJECT:
      return 'Projeto executivo';
    case ProjectPhase.IN_CONSTRUCTION:
      return 'Em obra';
    default:
      return 'Estudo preliminar';
  }
}

function getGroupStatusLabel(status: GroupStatusType): string {
  switch (status) {
    case GroupStatus.ACTIVE:
      return 'Ativo';
    case GroupStatus.PAUSED:
      return 'Pausado';
    case GroupStatus.ARCHIVED:
      return 'Arquivado';
    default:
      return 'Ativo';
  }
}

function getBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (
    status === ProjectStatus.DONE ||
    status === GroupStatus.ACTIVE ||
    status === 'concluida' ||
    status === 'concluído'
  ) {
    return 'success';
  }
  if (status === ProjectStatus.PAUSED || status === GroupStatus.PAUSED || status === 'em-espera') {
    return 'warning';
  }
  if (status === ProjectStatus.ARCHIVED || status === GroupStatus.ARCHIVED) {
    return 'error';
  }
  return 'default';
}

function getTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function AdminPage() {
  const { isLoading: authLoading, currentUserId, isAdmin } = useAuth();
  const [tasksPage, setTasksPage] = useState(1);
  const [projectsPage, setProjectsPage] = useState(1);
  const [groupsPage, setGroupsPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<AdminEntityFilter>('all');
  const [selectedPersonId, setSelectedPersonId] = useState('');

  const { data: projectsResult, isLoading: projectsLoading, error: projectsError } = useAdminProjects({
    enabled: Boolean(isAdmin),
    selectedPersonId: selectedPersonId || undefined,
    page: projectsPage,
    pageSize: PROJECTS_PAGE_SIZE,
  });
  const { data: groupsResult, isLoading: groupsLoading, error: groupsError } = useAdminGroups({
    enabled: Boolean(isAdmin),
    selectedPersonId: selectedPersonId || undefined,
    page: groupsPage,
    pageSize: GROUPS_PAGE_SIZE,
  });
  const { data: users = [], isLoading: usersLoading, error: usersError } = useAdminUsers(isAdmin);
  const editTaskMutation = useAdminEditTask();
  const editProjectMutation = useAdminEditProject();
  const editGroupMutation = useAdminEditGroup();
  const { data: tasksResult, isLoading: tasksLoading, error: tasksError } = useAdminTasks({
    currentUserId,
    selectedPersonId: selectedPersonId || undefined,
    enabled: Boolean(isAdmin),
    page: tasksPage,
    pageSize: TASKS_PAGE_SIZE,
  });
  const projects = useMemo(() => projectsResult?.items ?? [], [projectsResult]);
  const groups = useMemo(() => groupsResult?.items ?? [], [groupsResult]);
  const tasks = useMemo(() => tasksResult?.items ?? [], [tasksResult]);
  const projectsTotal = projectsResult?.total || 0;
  const groupsTotal = groupsResult?.total || 0;
  const tasksTotal = tasksResult?.total || 0;
  const [taskStatusDrafts, setTaskStatusDrafts] = useState<Record<string, TaskStatusType>>({});
  const [projectStatusDrafts, setProjectStatusDrafts] = useState<Record<string, ProjectStatusType>>({});
  const [groupStatusDrafts, setGroupStatusDrafts] = useState<Record<string, GroupStatusType>>({});
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const personOptions = useMemo(
    () => [
      { value: '', label: 'Todas as pessoas' },
      ...users.map((user) => ({ value: user.id, label: user.nome })),
    ],
    [users],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.nome.toLowerCase().includes(normalizedSearch) ||
        task.projetoNome.toLowerCase().includes(normalizedSearch) ||
        task.responsaveis.some((person) => person.nome.toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) return false;

      if (!selectedPersonId) return true;

      const isCreator = task.criadoPor?.id === selectedPersonId;
      const isResponsible = task.responsaveis.some((person) => person.id === selectedPersonId);
      return isCreator || isResponsible;
    });
  }, [tasks, normalizedSearch, selectedPersonId]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        !normalizedSearch ||
        project.nome.toLowerCase().includes(normalizedSearch) ||
        (project.grupoNome || '').toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });
  }, [projects, normalizedSearch]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const matchesSearch =
        !normalizedSearch ||
        group.nome.toLowerCase().includes(normalizedSearch) ||
        (group.descricao || '').toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });
  }, [groups, normalizedSearch]);

  const isLoading = authLoading || projectsLoading || groupsLoading || tasksLoading || usersLoading;

  const dataError = projectsError || groupsError || tasksError || usersError;
  const errorMessage = toUserErrorMessage(dataError, 'Não foi possível carregar dados administrativos.');

  const entityOptions = [
    { value: 'all', label: 'Todas as entidades' },
    { value: 'tasks', label: 'Tarefas' },
    { value: 'projects', label: 'Projetos' },
    { value: 'groups', label: 'Grupos' },
  ];

  const showTasks = selectedEntity === 'all' || selectedEntity === 'tasks';
  const showProjects = selectedEntity === 'all' || selectedEntity === 'projects';
  const showGroups = selectedEntity === 'all' || selectedEntity === 'groups';
  const tasksTotalPages = getTotalPages(tasksTotal, TASKS_PAGE_SIZE);
  const projectsTotalPages = getTotalPages(projectsTotal, PROJECTS_PAGE_SIZE);
  const groupsTotalPages = getTotalPages(groupsTotal, GROUPS_PAGE_SIZE);
  const hasMoreTasks = tasksPage < tasksTotalPages;
  const hasMoreProjects = projectsPage < projectsTotalPages;
  const hasMoreGroups = groupsPage < groupsTotalPages;

  const taskStatusValue = (taskId: string, fallback: TaskStatusType) => taskStatusDrafts[taskId] || fallback;
  const projectStatusValue = (projectId: string, fallback: ProjectStatusType) => projectStatusDrafts[projectId] || fallback;
  const groupStatusValue = (groupId: string, fallback: GroupStatusType) => groupStatusDrafts[groupId] || fallback;

  const saveTaskStatus = async (taskId: string, currentStatus: TaskStatusType, nome: string) => {
    const status = taskStatusValue(taskId, currentStatus);
    if (status === currentStatus) return;

    try {
      setActionFeedback(null);
      await editTaskMutation.mutateAsync({ taskId, status, nome });
      setActionFeedback('Status da tarefa atualizado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar a tarefa.';
      setActionFeedback(message);
    }
  };

  const saveProjectStatus = async (projectId: string, currentStatus: ProjectStatusType, nome: string) => {
    const status = projectStatusValue(projectId, currentStatus);
    if (status === currentStatus) return;

    try {
      setActionFeedback(null);
      await editProjectMutation.mutateAsync({ projectId, status, nome });
      setActionFeedback('Status do projeto atualizado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o projeto.';
      setActionFeedback(message);
    }
  };

  const saveGroupStatus = async (groupId: string, currentStatus: GroupStatusType, nome: string) => {
    const status = groupStatusValue(groupId, currentStatus);
    if (status === currentStatus) return;

    try {
      setActionFeedback(null);
      await editGroupMutation.mutateAsync({ groupId, status, nome });
      setActionFeedback('Status do grupo atualizado com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o grupo.';
      setActionFeedback(message);
    }
  };

  if (!authLoading && !isAdmin) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <SectionHeader title="Administração" subtitle="Acesso restrito" />
          <div className="mt-8">
            <EmptyState
              title="Acesso indisponível"
              description="Esta área é exclusiva para administradores."
            />
          </div>
        </div>
      </AppShell>
    );
  }

  if (isLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <SectionHeader title="Administração" subtitle="Carregando visão global..." />
          <Panel>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Panel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  if (dataError) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <SectionHeader title="Administração" subtitle="Erro ao carregar dados" />
          <div className="mt-8">
            <EmptyState title="Erro ao carregar visão administrativa" description={errorMessage} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentUserId={currentUserId}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <SectionHeader
          title="Administração"
          subtitle="Camada administrativa para auditoria e ajustes globais, separada da rotina operacional."
        />

        {actionFeedback ? (
          <Panel padding="sm" className="border-border-secondary bg-surface-secondary">
            <p className="text-sm text-text-secondary">{actionFeedback}</p>
          </Panel>
        ) : null}

        <Panel className="border-border-secondary bg-surface-secondary" padding="sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Contexto administrativo</p>
          <p className="mt-1 text-sm text-text-secondary">
            Leitura orientada a manutenção de dados. Use esta área para ajustes globais e validação transversal.
          </p>
        </Panel>

        <Panel className="border-border-secondary">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SearchField
              aria-label="Buscar em administração"
              placeholder="Buscar por nome, projeto ou pessoa"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery('')}
            />
            <Select
              aria-label="Filtro por entidade"
              options={entityOptions}
              value={selectedEntity}
              onChange={(event) => setSelectedEntity(event.target.value as AdminEntityFilter)}
            />
            <Select
              aria-label="Filtro por pessoa"
              options={personOptions}
              value={selectedPersonId}
              onChange={(event) => {
                const nextUserId = event.target.value;
                setSelectedPersonId(nextUserId);
                setTasksPage(1);
                setProjectsPage(1);
                setGroupsPage(1);
              }}
            />
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Listagens administrativas são paginadas. Navegue pelas páginas para evitar truncamento em bases grandes.
          </p>
        </Panel>

        <Panel className="border-border-secondary">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="border-l-2 border-border-primary pl-3">
              <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Tarefas visíveis</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{filteredTasks.length}</p>
            </div>
            <div className="border-l-2 border-border-primary pl-3">
              <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Projetos visíveis</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{filteredProjects.length}</p>
            </div>
            <div className="border-l-2 border-border-primary pl-3">
              <p className="text-xs uppercase tracking-[0.08em] text-text-tertiary">Grupos visíveis</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{filteredGroups.length}</p>
            </div>
          </div>
        </Panel>

        {showTasks && (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Tarefas</h2>
                <p className="text-xs text-text-secondary">Visão tabular administrativa</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">{filteredTasks.length} itens</span>
                <span className="text-xs text-text-secondary">Página {tasksPage} de {tasksTotalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setTasksPage((current) => Math.max(1, current - 1))} disabled={tasksPage === 1}>
                  Anterior
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setTasksPage((current) => current + 1)} disabled={!hasMoreTasks}>
                  Próxima
                </Button>
              </div>
            </div>
            {filteredTasks.length === 0 ? (
              <EmptyState
                className="py-8"
                title="Nenhuma tarefa encontrada"
                description="Ajuste os filtros para localizar tarefas no contexto administrativo."
              />
            ) : (
              <div className="mt-4 overflow-x-auto rounded-md border border-border-secondary">
                <div className="grid min-w-[980px] grid-cols-[minmax(260px,2fr)_minmax(220px,1.6fr)_minmax(160px,1fr)_minmax(220px,1.4fr)] bg-surface-secondary px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  <p>Tarefa</p>
                  <p>Contexto</p>
                  <p>Status atual</p>
                  <p>Ações</p>
                </div>
                {filteredTasks.map((task) => (
                  <div key={task.id} className="grid min-w-[980px] grid-cols-[minmax(260px,2fr)_minmax(220px,1.6fr)_minmax(160px,1fr)_minmax(220px,1.4fr)] items-center gap-3 border-t border-border-secondary px-3 py-2">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-medium text-text-primary truncate">{task.nome}</p>
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-xs text-text-secondary truncate">
                        Projeto: {task.projetoNome} · Responsáveis: {task.responsaveis.map((person) => person.nome).join(', ') || '—'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <Badge size="sm" variant={getBadgeVariant(task.status)}>{getTaskStatusLabel(task.status)}</Badge>
                      <p className="mt-1 text-xs text-text-tertiary">
                        {getPriorityLabel(task.prioridade)} · {getEaseLabel(task.facilidade)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        options={taskStatusOptions}
                        value={taskStatusValue(task.id, task.status)}
                        onChange={(event) => {
                          const nextStatus = event.target.value as TaskStatusType;
                          setTaskStatusDrafts((current) => ({ ...current, [task.id]: nextStatus }));
                        }}
                        className="min-w-[150px]"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={editTaskMutation.isPending && editTaskMutation.variables?.taskId === task.id}
                        onClick={() => saveTaskStatus(task.id, task.status, task.nome)}
                      >
                        Salvar
                      </Button>
                      <span className="text-xs text-text-tertiary">Projeto #{task.projetoId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {showProjects && (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Projetos</h2>
                <p className="text-xs text-text-secondary">Visão tabular administrativa</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">{filteredProjects.length} itens</span>
                <span className="text-xs text-text-secondary">Página {projectsPage} de {projectsTotalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setProjectsPage((current) => Math.max(1, current - 1))} disabled={projectsPage === 1}>
                  Anterior
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setProjectsPage((current) => current + 1)} disabled={!hasMoreProjects}>
                  Próxima
                </Button>
              </div>
            </div>
            {filteredProjects.length === 0 ? (
              <EmptyState
                className="py-8"
                title="Nenhum projeto encontrado"
                description="Ajuste os filtros para localizar projetos no contexto administrativo."
              />
            ) : (
              <div className="mt-4 overflow-x-auto rounded-md border border-border-secondary">
                <div className="grid min-w-[940px] grid-cols-[minmax(260px,2fr)_minmax(260px,1.8fr)_minmax(140px,1fr)_minmax(220px,1.4fr)] bg-surface-secondary px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  <p>Projeto</p>
                  <p>Contexto</p>
                  <p>Status atual</p>
                  <p>Ações</p>
                </div>
                {filteredProjects.map((project) => (
                  <div key={project.id} className="grid min-w-[940px] grid-cols-[minmax(260px,2fr)_minmax(260px,1.8fr)_minmax(140px,1fr)_minmax(220px,1.4fr)] items-center gap-3 border-t border-border-secondary px-3 py-2">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-medium text-text-primary truncate">{project.nome}</p>
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-xs text-text-secondary truncate">
                        Grupo: {project.grupoNome || 'Sem grupo'} · Fase: {getProjectPhaseLabel(project.fase)}
                      </p>
                    </div>
                    <div>
                      <Badge size="sm" variant={getBadgeVariant(project.status)}>{getProjectStatusLabel(project.status)}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        options={projectStatusOptions}
                        value={projectStatusValue(project.id, project.status)}
                        onChange={(event) => {
                          const nextStatus = event.target.value as ProjectStatusType;
                          setProjectStatusDrafts((current) => ({ ...current, [project.id]: nextStatus }));
                        }}
                        className="min-w-[160px]"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={editProjectMutation.isPending && editProjectMutation.variables?.projectId === project.id}
                        onClick={() => saveProjectStatus(project.id, project.status, project.nome)}
                      >
                        Salvar
                      </Button>
                      <span className="text-xs text-text-tertiary">Projeto #{project.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {showGroups && (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">Grupos</h2>
                <p className="text-xs text-text-secondary">Visão tabular administrativa</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">{filteredGroups.length} itens</span>
                <span className="text-xs text-text-secondary">Página {groupsPage} de {groupsTotalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setGroupsPage((current) => Math.max(1, current - 1))} disabled={groupsPage === 1}>
                  Anterior
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setGroupsPage((current) => current + 1)} disabled={!hasMoreGroups}>
                  Próxima
                </Button>
              </div>
            </div>
            {filteredGroups.length === 0 ? (
              <EmptyState
                className="py-8"
                title="Nenhum grupo encontrado"
                description="Ajuste os filtros para localizar grupos no contexto administrativo."
              />
            ) : (
              <div className="mt-4 overflow-x-auto rounded-md border border-border-secondary">
                <div className="grid min-w-[920px] grid-cols-[minmax(260px,2fr)_minmax(260px,1.8fr)_minmax(140px,1fr)_minmax(220px,1.4fr)] bg-surface-secondary px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                  <p>Grupo</p>
                  <p>Indicadores</p>
                  <p>Status atual</p>
                  <p>Ações</p>
                </div>
                {filteredGroups.map((group) => (
                  <div key={group.id} className="grid min-w-[920px] grid-cols-[minmax(260px,2fr)_minmax(260px,1.8fr)_minmax(140px,1fr)_minmax(220px,1.4fr)] items-center gap-3 border-t border-border-secondary px-3 py-2">
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-medium text-text-primary truncate">{group.nome}</p>
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-xs text-text-secondary truncate">
                        Projetos: {group.totalProjetos} · Atrasados: {group.projetosAtrasados}
                      </p>
                    </div>
                    <div>
                      <Badge size="sm" variant={getBadgeVariant(group.status)}>{getGroupStatusLabel(group.status)}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        options={groupStatusOptions}
                        value={groupStatusValue(group.id, group.status)}
                        onChange={(event) => {
                          const nextStatus = event.target.value as GroupStatusType;
                          setGroupStatusDrafts((current) => ({ ...current, [group.id]: nextStatus }));
                        }}
                        className="min-w-[140px]"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={editGroupMutation.isPending && editGroupMutation.variables?.groupId === group.id}
                        onClick={() => saveGroupStatus(group.id, group.status, group.nome)}
                      >
                        Salvar
                      </Button>
                      <span className="text-xs text-text-tertiary">Grupo #{group.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
