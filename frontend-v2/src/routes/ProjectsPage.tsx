import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { useAuth } from '../lib/auth';
import { getPriorityLabel, ProjectPhase, ProjectStatus } from '../lib/enums';
import { useProjects, useCreateProject, ProjectFormDrawer } from '../features/projects';
import { useGroups } from '../features/groups';
import { EmptyState, Button, SearchField, Select, Panel } from '../design/primitives';
import type { CreateProjectPayload } from '../features/projects';
import { formatFullDate, isOverdue } from '../lib/dates';
import {
  getProjectPhaseLabel,
  getProjectStatusLabel,
  getProjectStatusToneClass,
} from '../lib/projectUi';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { isLoading: authLoading, currentUserId } = useAuth();
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: groups = [], error: groupsError } = useGroups();
  const createProjectMutation = useCreateProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);

  const groupOptions = useMemo(() => {
    const groupsFromApi = groups.map((group) => ({ value: group.id, label: group.nome }));
    const groupsFromProjects = projects
      .filter((project) => project.grupoId && project.grupoNome)
      .map((project) => ({ value: project.grupoId as string, label: project.grupoNome as string }));

    const uniqueGroups = Array.from(
      new Map([...groupsFromApi, ...groupsFromProjects].map((group) => [group.value, group])).values(),
    ).sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'));

    return [{ value: '', label: 'Todos os grupos' }, ...uniqueGroups];
  }, [groups, projects]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: 'Todos os status' },
      { value: ProjectStatus.TODO, label: getProjectStatusLabel(ProjectStatus.TODO) },
      { value: ProjectStatus.IN_PROGRESS, label: getProjectStatusLabel(ProjectStatus.IN_PROGRESS) },
      { value: ProjectStatus.IN_REVIEW, label: getProjectStatusLabel(ProjectStatus.IN_REVIEW) },
      { value: ProjectStatus.PAUSED, label: getProjectStatusLabel(ProjectStatus.PAUSED) },
      { value: ProjectStatus.DONE, label: getProjectStatusLabel(ProjectStatus.DONE) },
      { value: ProjectStatus.ARCHIVED, label: getProjectStatusLabel(ProjectStatus.ARCHIVED) },
    ],
    [],
  );

  const phaseOptions = useMemo(
    () => [
      { value: '', label: 'Todas as fases' },
      { value: ProjectPhase.PRELIMINARY_STUDY, label: getProjectPhaseLabel(ProjectPhase.PRELIMINARY_STUDY) },
      { value: ProjectPhase.PRELIMINARY_PROJECT, label: getProjectPhaseLabel(ProjectPhase.PRELIMINARY_PROJECT) },
      { value: ProjectPhase.BASIC_PROJECT, label: getProjectPhaseLabel(ProjectPhase.BASIC_PROJECT) },
      { value: ProjectPhase.EXECUTIVE_PROJECT, label: getProjectPhaseLabel(ProjectPhase.EXECUTIVE_PROJECT) },
      { value: ProjectPhase.IN_CONSTRUCTION, label: getProjectPhaseLabel(ProjectPhase.IN_CONSTRUCTION) },
    ],
    [],
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      if (
        normalizedQuery &&
        !project.nome.toLowerCase().includes(normalizedQuery) &&
        !(project.grupoNome || '').toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }

      if (selectedGroup && project.grupoId !== selectedGroup) {
        return false;
      }

      if (selectedStatus && project.status !== selectedStatus) {
        return false;
      }

      if (selectedPhase && project.fase !== selectedPhase) {
        return false;
      }

      return true;
    });
  }, [projects, searchQuery, selectedGroup, selectedStatus, selectedPhase]);

  const hasActiveFilters = Boolean(searchQuery || selectedGroup || selectedStatus || selectedPhase);

  const visibleProjects = useMemo(() => {
    return [...filteredProjects].sort((left, right) => {
      const getPriorityRank = (status: string, deadline?: string) => {
        const isDone = status === ProjectStatus.DONE;
        const isArchived = status === ProjectStatus.ARCHIVED;
        const overdue = Boolean(deadline && isOverdue(deadline) && !isDone && !isArchived);

        if (overdue) return 0;
        if (status === ProjectStatus.IN_PROGRESS) return 1;
        if (status === ProjectStatus.IN_REVIEW) return 2;
        if (status === ProjectStatus.TODO || status === ProjectStatus.PAUSED) return 3;
        if (isDone) return 4;
        return 5;
      };

      const leftRank = getPriorityRank(left.status, left.prazo);
      const rightRank = getPriorityRank(right.status, right.prazo);

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (left.prazo && right.prazo) {
        const deadlineDiff = new Date(left.prazo).getTime() - new Date(right.prazo).getTime();
        if (deadlineDiff !== 0) {
          return deadlineDiff;
        }
      }

      if (left.prazo && !right.prazo) return -1;
      if (!left.prazo && right.prazo) return 1;

      return left.nome.localeCompare(right.nome, 'pt-BR');
    });
  }, [filteredProjects]);

  const summary = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status === ProjectStatus.IN_PROGRESS).length;
    const overdueProjects = projects.filter(
      (project) =>
        project.prazo &&
        isOverdue(project.prazo) &&
        project.status !== ProjectStatus.DONE &&
        project.status !== ProjectStatus.ARCHIVED,
    ).length;
    const completedProjects = projects.filter((project) => project.status === ProjectStatus.DONE).length;

    return {
      total: projects.length,
      active: activeProjects,
      overdue: overdueProjects,
      completed: completedProjects,
    };
  }, [projects]);

  const handleCreateProject = async (payload: CreateProjectPayload) => {
    const createdProject = await createProjectMutation.mutateAsync(payload);
    navigate(`/projetos/${createdProject.id}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGroup('');
    setSelectedStatus('');
    setSelectedPhase('');
  };

  if (authLoading || projectsLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="border-b border-border-secondary pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Projetos</h1>
            <p className="mt-1 text-sm text-text-secondary">Carregando...</p>
          </header>
          <div className="mt-8">
            <EmptyState title="Carregando projetos..." description="Buscando lista de projetos." />
          </div>
        </div>
      </AppShell>
    );
  }

  if (projectsError) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="border-b border-border-secondary pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Projetos</h1>
            <p className="mt-1 text-sm text-text-secondary">Erro ao carregar</p>
          </header>
          <div className="mt-8">
            <EmptyState
              title="Erro ao carregar projetos"
              description="Não foi possível buscar os projetos. Tente recarregar a página."
            />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentUserId={currentUserId}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border-secondary pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Projetos</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Visão operacional dos projetos ativos e do acervo recente.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsProjectFormOpen(true)}>
            Novo projeto
          </Button>
        </header>

        <div className="mt-5 rounded-md border border-border-secondary bg-surface-secondary/35 px-4 py-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Projetos</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{summary.total}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Em andamento</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{summary.active}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Atrasados</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{summary.overdue}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Concluídos</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{summary.completed}</p>
            </div>
          </div>
        </div>

        {groupsError ? (
          <div className="mt-4">
            <Panel className="border-warning-subtle bg-warning-subtle/20" padding="sm">
              <p className="text-sm text-warning">
                Não foi possível carregar os grupos agora. Você ainda pode criar projeto sem grupo.
              </p>
            </Panel>
          </div>
        ) : null}

        <div className="mt-4 rounded-md border border-border-secondary bg-surface-primary px-4 py-4">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-tertiary">Busca e filtros</p>
              <p className="mt-1 text-sm text-text-secondary">
                A lista abaixo já mostra os projetos. Use a busca e os filtros para refinar a leitura.
              </p>
            </div>

            <div>
              <SearchField
                placeholder="Buscar por nome do projeto ou grupo"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onClear={() => setSearchQuery('')}
                className="w-full py-3 text-base"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Select
                label="Grupo"
                options={groupOptions}
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
                aria-label="Filtro por grupo"
              />
              <Select
                label="Status"
                options={statusOptions}
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                aria-label="Filtro por status"
              />
              <Select
                label="Fase"
                options={phaseOptions}
                value={selectedPhase}
                onChange={(event) => setSelectedPhase(event.target.value)}
                aria-label="Filtro por fase"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">
            Mostrando {visibleProjects.length} de {projects.length} projeto{projects.length === 1 ? '' : 's'}.
            {!hasActiveFilters ? ' Projetos em andamento e prazos críticos aparecem primeiro.' : ''}
          </p>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar busca e filtros
            </Button>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          {visibleProjects.length === 0 ? (
            <EmptyState
              title="Nenhum projeto encontrado"
              description="Ajuste a busca ou os filtros para localizar outro projeto."
            />
          ) : (
            visibleProjects.map((project) => {
              const completionPercent =
                project.totalTarefas > 0
                  ? Math.round((project.tarefasConcluidas / project.totalTarefas) * 100)
                  : 0;
              const projectIsOverdue =
                Boolean(project.prazo) &&
                isOverdue(project.prazo as string) &&
                project.status !== ProjectStatus.DONE &&
                project.status !== ProjectStatus.ARCHIVED;

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => navigate(`/projetos/${project.id}`)}
                  className="w-full rounded-md border border-border-primary bg-surface-primary px-4 py-4 text-left transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-info-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-text-primary">{project.nome}</h2>
                      <p className="mt-1 truncate text-sm text-text-secondary">{project.grupoNome || 'Sem grupo'}</p>
                    </div>
                    <span className="shrink-0 text-sm text-text-secondary">Abrir</span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Status</p>
                      <p className={`mt-1 text-sm font-medium ${getProjectStatusToneClass(project.status)}`}>
                        {getProjectStatusLabel(project.status)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Fase</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{getProjectPhaseLabel(project.fase)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Prioridade</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">{getPriorityLabel(project.prioridade)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Prazo</p>
                      <p className={`mt-1 text-sm font-medium ${projectIsOverdue ? 'text-error-600' : 'text-text-primary'}`}>
                        {project.prazo ? formatFullDate(project.prazo) : 'Sem prazo'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Progresso</p>
                      <p className="text-sm font-medium text-text-primary">
                        {completionPercent}% · {project.tarefasConcluidas}/{project.totalTarefas} tarefas
                      </p>
                    </div>
                    <progress
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-info-500 [&::-webkit-progress-bar]:bg-surface-secondary [&::-webkit-progress-value]:bg-info-500"
                      value={completionPercent}
                      max={100}
                      aria-label={`Progresso do projeto ${project.nome}`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {isProjectFormOpen ? (
        <ProjectFormDrawer
          isOpen={isProjectFormOpen}
          mode="create"
          groups={groups.map((group) => ({ id: group.id, nome: group.nome }))}
          isSubmitting={createProjectMutation.isPending}
          onClose={() => setIsProjectFormOpen(false)}
          onSubmit={handleCreateProject}
        />
      ) : null}
    </AppShell>
  );
}
