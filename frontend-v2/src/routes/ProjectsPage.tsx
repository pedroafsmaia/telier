import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { useAuth } from '../lib/auth';
import { formatShortDate } from '../lib/dates';
import { ProjectPhase, ProjectStatus } from '../lib/enums';
import { useProjects, useCreateProject, ProjectFormDrawer } from '../features/projects';
import { useGroups } from '../features/groups';
import { SectionHeader, EmptyState, Button, SearchField, Select, Panel, Badge } from '../design/primitives';
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

function getStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case ProjectStatus.DONE:
      return 'success';
    case ProjectStatus.PAUSED:
      return 'warning';
    case ProjectStatus.ARCHIVED:
      return 'error';
    default:
      return 'default';
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
    const groupsFromProjects = projects
      .filter((project) => project.grupoId && project.grupoNome)
      .map((project) => ({ value: project.grupoId as string, label: project.grupoNome as string }));

    const uniqueGroups = Array.from(new Map(groupsFromProjects.map((group) => [group.value, group])).values());

    return [{ value: '', label: 'Todos os grupos' }, ...uniqueGroups];
  }, [projects]);

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

  const filteredProjects = useMemo(() => {
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
  }, [projects, searchQuery, selectedGroup, selectedStatus, selectedPhase]);

  const handleCreateProject = async (payload: CreateProjectPayload) => {
    const createdProject = await createProjectMutation.mutateAsync(payload);
    navigate(`/projetos/${createdProject.id}`);
  };

  if (authLoading || projectsLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <SectionHeader title="Projetos" subtitle="Carregando..." />
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
        <div className="mx-auto max-w-7xl px-6 py-8">
          <SectionHeader title="Projetos" subtitle="Erro ao carregar" />
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
      <div className="mx-auto max-w-7xl px-6 py-8">
        <SectionHeader
          title="Projetos"
          subtitle="Consulta e localizacao rapida"
          actions={
            <Button variant="primary" onClick={() => setIsProjectFormOpen(true)}>
              Novo projeto
            </Button>
          }
        />

        {groupsError ? (
          <div className="mt-4">
            <Panel className="border-warning-subtle bg-warning-subtle/20" padding="sm">
              <p className="text-sm text-warning-DEFAULT">
                Nao foi possivel carregar grupos agora. Voce ainda pode criar projeto sem grupo.
              </p>
            </Panel>
          </div>
        ) : null}

        <div className="mt-6">
          <Panel>
            <div className="space-y-4">
              <SearchField
                placeholder="Buscar projeto por nome ou grupo"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onClear={() => setSearchQuery('')}
                className="w-full py-3 text-base"
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Select
                  options={groupOptions}
                  value={selectedGroup}
                  onChange={(event) => setSelectedGroup(event.target.value)}
                  aria-label="Filtro por grupo"
                />
                <Select
                  options={statusOptions}
                  value={selectedStatus}
                  onChange={(event) => setSelectedStatus(event.target.value)}
                  aria-label="Filtro por status"
                />
                <Select
                  options={phaseOptions}
                  value={selectedPhase}
                  onChange={(event) => setSelectedPhase(event.target.value)}
                  aria-label="Filtro por fase"
                />
              </div>
            </div>
          </Panel>
        </div>

        <div className="mt-6 space-y-3">
          {filteredProjects.length === 0 ? (
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
                className="w-full text-left"
              >
                <Panel className="transition-colors hover:bg-surface-secondary">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-medium text-text-primary">{project.nome}</h2>
                      <p className="mt-1 text-sm text-text-secondary">{project.grupoNome || 'Sem grupo'}</p>
                    </div>
                    <span className="shrink-0 text-xs text-text-tertiary">Abrir</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge size="sm" variant={getStatusVariant(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                    <Badge size="sm" variant="default">
                      {getPhaseLabel(project.fase)}
                    </Badge>
                    <span className="text-xs text-text-tertiary">
                      Prazo: {project.prazo ? formatShortDate(project.prazo) : 'Sem prazo'}
                    </span>
                  </div>
                </Panel>
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

