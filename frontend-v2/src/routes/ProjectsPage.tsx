import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { useAuth } from '../lib/auth';
import { ProjectPhase, ProjectStatus } from '../lib/enums';
import { useProjects, useCreateProject, ProjectFormDrawer } from '../features/projects';
import { useGroups } from '../features/groups';
import { EmptyState, Button, SearchField, Select, Panel } from '../design/primitives';
import type { CreateProjectPayload } from '../features/projects';

function getStatusLabel(status: string): string {
  switch (status) {
    case ProjectStatus.TODO:
      return 'A fazer';
    case ProjectStatus.IN_PROGRESS:
      return 'Em andamento';
    case ProjectStatus.IN_REVIEW:
      return 'Em revisao';
    case ProjectStatus.PAUSED:
      return 'Pausado';
    case ProjectStatus.DONE:
      return 'Concluido';
    case ProjectStatus.ARCHIVED:
      return 'Arquivado';
    default:
      return status;
  }
}

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case ProjectPhase.PRELIMINARY_STUDY:
      return 'Estudo preliminar';
    case ProjectPhase.PRELIMINARY_PROJECT:
      return 'Anteprojeto';
    case ProjectPhase.BASIC_PROJECT:
      return 'Projeto basico';
    case ProjectPhase.EXECUTIVE_PROJECT:
      return 'Projeto executivo';
    case ProjectPhase.IN_CONSTRUCTION:
      return 'Em obra';
    default:
      return phase;
  }
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
      { value: ProjectStatus.TODO, label: getStatusLabel(ProjectStatus.TODO) },
      { value: ProjectStatus.IN_PROGRESS, label: getStatusLabel(ProjectStatus.IN_PROGRESS) },
      { value: ProjectStatus.IN_REVIEW, label: getStatusLabel(ProjectStatus.IN_REVIEW) },
      { value: ProjectStatus.PAUSED, label: getStatusLabel(ProjectStatus.PAUSED) },
      { value: ProjectStatus.DONE, label: getStatusLabel(ProjectStatus.DONE) },
      { value: ProjectStatus.ARCHIVED, label: getStatusLabel(ProjectStatus.ARCHIVED) },
    ],
    [],
  );

  const phaseOptions = useMemo(
    () => [
      { value: '', label: 'Todas as fases' },
      { value: ProjectPhase.PRELIMINARY_STUDY, label: getPhaseLabel(ProjectPhase.PRELIMINARY_STUDY) },
      { value: ProjectPhase.PRELIMINARY_PROJECT, label: getPhaseLabel(ProjectPhase.PRELIMINARY_PROJECT) },
      { value: ProjectPhase.BASIC_PROJECT, label: getPhaseLabel(ProjectPhase.BASIC_PROJECT) },
      { value: ProjectPhase.EXECUTIVE_PROJECT, label: getPhaseLabel(ProjectPhase.EXECUTIVE_PROJECT) },
      { value: ProjectPhase.IN_CONSTRUCTION, label: getPhaseLabel(ProjectPhase.IN_CONSTRUCTION) },
    ],
    [],
  );

  const hasSearchOrFilters = Boolean(searchQuery.trim() || selectedGroup || selectedStatus || selectedPhase);

  const filteredProjects = useMemo(() => {
    if (!hasSearchOrFilters) {
      return [];
    }

    return projects.filter((project) => {
      if (
        searchQuery &&
        !project.nome.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(project.grupoNome || '').toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [projects, searchQuery, selectedGroup, selectedStatus, selectedPhase, hasSearchOrFilters]);

  const hasActiveFilters = Boolean(searchQuery || selectedGroup || selectedStatus || selectedPhase);

  const handleCreateProject = async (payload: CreateProjectPayload) => {
    const createdProject = await createProjectMutation.mutateAsync(payload);
    navigate(`/projetos/${createdProject.id}`);
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
              description="Nao foi possivel buscar os projetos. Tente recarregar a pagina."
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
            <p className="mt-1 text-sm text-text-secondary">Tela de localizacao e abertura rapida de projetos.</p>
          </div>
          <Button variant="primary" onClick={() => setIsProjectFormOpen(true)}>
            Novo projeto
          </Button>
        </header>

        {groupsError ? (
          <div className="mt-4">
            <Panel className="border-warning-subtle bg-warning-subtle/20" padding="sm">
              <p className="text-sm text-warning">
                Nao foi possivel carregar grupos agora. Voce ainda pode criar projeto sem grupo.
              </p>
            </Panel>
          </div>
        ) : null}

        <div className="mt-5 rounded-lg border-2 border-border-focus/40 bg-surface-primary p-4">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">Busca de projetos</p>
              <SearchField
                placeholder="Buscar por nome do projeto ou grupo"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onClear={() => setSearchQuery('')}
                className="mt-2 w-full py-3 text-base"
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
            {hasSearchOrFilters
              ? `${filteredProjects.length} projeto${filteredProjects.length === 1 ? '' : 's'} encontrado${filteredProjects.length === 1 ? '' : 's'}`
              : 'Use a busca para localizar um projeto rapidamente.'}
          </p>
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedGroup('');
                setSelectedStatus('');
                setSelectedPhase('');
              }}
            >
              Limpar busca e filtros
            </Button>
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          {!hasSearchOrFilters ? (
            <EmptyState
              title="Localize um projeto"
              description="Digite um nome de projeto ou aplique um filtro para encontrar o projeto desejado."
            />
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              title="Nenhum projeto encontrado"
              description="Ajuste a busca ou filtros para localizar outro projeto."
            />
          ) : (
            filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate(`/projetos/${project.id}`)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-4 py-3 text-left transition-colors hover:border-border-focus hover:bg-surface-secondary"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-text-primary">{project.nome}</h2>
                    <p className="mt-0.5 truncate text-xs text-text-secondary">{project.grupoNome || 'Sem grupo'}</p>
                  </div>
                  <span className="shrink-0 text-xs text-text-tertiary">Abrir</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                  <span>{getPhaseLabel(project.fase)}</span>
                </div>
              </button>
            ))
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

