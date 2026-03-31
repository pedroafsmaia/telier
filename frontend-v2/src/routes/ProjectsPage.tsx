import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { AvatarStack, Button, EmptyState, Panel, SearchField, Select } from '../design/primitives';
import { useGroups } from '../features/groups';
import { ProjectFormDrawer, useCreateProject, useProjects } from '../features/projects';
import type { CreateProjectPayload } from '../features/projects';
import { formatFullDate, isOverdue } from '../lib/dates';
import { ProjectPhase, ProjectStatus, getPriorityLabel } from '../lib/enums';
import { useAuth } from '../lib/auth';
import {
  formatAreaLabel,
  formatHoursLabel,
  formatProjectProgressLabel,
  getProjectPhaseLabel,
  getProjectStatusLabel,
  getProjectStatusToneClass,
} from '../lib/projectUi';

function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function DetailField({
  label,
  value,
  toneClassName = 'text-text-primary',
}: {
  label: string;
  value: string;
  toneClassName?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{label}</p>
      <p className={`mt-1 text-sm font-medium ${toneClassName}`}>{value}</p>
    </div>
  );
}

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
        <header className="border-b border-border-secondary pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">Projetos</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Operação dos projetos ativos, atrasos críticos e acervo recente.
              </p>
            </div>
            <Button variant="primary" onClick={() => setIsProjectFormOpen(true)}>
              Novo projeto
            </Button>
          </div>

          <div className="mt-4 grid gap-4 border-t border-border-secondary pt-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricItem label="Projetos" value={summary.total} />
            <MetricItem label="Em andamento" value={summary.active} />
            <MetricItem label="Atrasados" value={summary.overdue} />
            <MetricItem label="Concluídos" value={summary.completed} />
          </div>
        </header>

        {groupsError ? (
          <div className="mt-4">
            <Panel className="border-warning-subtle bg-warning-subtle/20" padding="sm">
              <p className="text-sm text-warning">
                Não foi possível carregar os grupos agora. Você ainda pode criar projeto sem grupo.
              </p>
            </Panel>
          </div>
        ) : null}

        <div className="mt-5 border-b border-border-secondary pb-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
            <SearchField
              placeholder="Buscar por nome do projeto ou grupo"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery('')}
              className="w-full py-3 text-base"
            />
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
            <p>
              Mostrando {visibleProjects.length} de {projects.length} projeto{projects.length === 1 ? '' : 's'}.
              {!hasActiveFilters ? ' Projetos em andamento e prazos críticos aparecem primeiro.' : ''}
            </p>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar busca e filtros
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-6">
          {visibleProjects.length === 0 ? (
            <EmptyState
              title="Nenhum projeto encontrado"
              description="Ajuste a busca ou os filtros para localizar outro projeto."
            />
          ) : (
            visibleProjects.map((project, index) => {
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
                <article
                  key={project.id}
                  className={`${index > 0 ? 'border-t border-border-secondary pt-6' : ''} space-y-4`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-text-primary">{project.nome}</h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        {project.grupoNome || 'Sem grupo vinculado'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {project.grupoId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/grupos/${project.grupoId}`)}
                        >
                          Ver grupo
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/projetos/${project.id}`)}
                      >
                        Abrir
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <DetailField label="Fase" value={getProjectPhaseLabel(project.fase)} />
                    <DetailField
                      label="Status"
                      value={getProjectStatusLabel(project.status)}
                      toneClassName={getProjectStatusToneClass(project.status)}
                    />
                    <DetailField label="Prioridade" value={getPriorityLabel(project.prioridade)} />
                    <DetailField
                      label="Prazo"
                      value={project.prazo ? formatFullDate(project.prazo) : 'Sem prazo'}
                      toneClassName={projectIsOverdue ? 'text-error-600' : 'text-text-primary'}
                    />
                    <DetailField label="Área" value={formatAreaLabel(project.areaM2)} />
                    <DetailField
                      label="Progresso"
                      value={formatProjectProgressLabel(project.tarefasConcluidas, project.totalTarefas)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Avanço</p>
                      <p className="text-sm font-medium text-text-primary">{completionPercent}% concluído</p>
                    </div>
                    <progress
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-info-500 [&::-webkit-progress-bar]:bg-surface-secondary [&::-webkit-progress-value]:bg-info-500"
                      value={completionPercent}
                      max={100}
                      aria-label={`Progresso do projeto ${project.nome}`}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-secondary pt-4">
                    <div className="flex items-center gap-3">
                      <AvatarStack
                        avatars={[
                          {
                            id: project.dono.id || `owner-${project.id}`,
                            name: project.dono.nome,
                          },
                        ]}
                        max={1}
                        size="sm"
                      />
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Responsável</p>
                        <p className="text-sm font-medium text-text-primary">{project.dono.nome}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                      {project.compartilhadoComigo ? <span>Compartilhado comigo</span> : null}
                      <span>Horas: {formatHoursLabel(project.totalHoras)}</span>
                    </div>
                  </div>
                </article>
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
