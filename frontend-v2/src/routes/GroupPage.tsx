import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, FolderKanban, Pencil } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { Badge, Button, EmptyState, Panel, SectionHeader } from '../design/primitives';
import { useCreateProject, ProjectFormDrawer } from '../features/projects';
import { useGroupPageData, useUpdateGroup, GroupFormDrawer } from '../features/groups';
import { GroupRecordsSection, RecordFormDrawer, useCreateRecord } from '../features/records';
import { useAuth } from '../lib/auth';
import { formatFullDate, isOverdue } from '../lib/dates';
import { GroupStatus, ProjectPhase, ProjectStatus } from '../lib/enums';
import type { CreateProjectPayload } from '../features/projects';
import type { CreateRecordPayload } from '../features/records';
import type { UpdateGroupPayload } from '../features/groups';

function getGroupStatusLabel(status: string): string {
  switch (status) {
    case GroupStatus.ACTIVE:
      return 'Ativo';
    case GroupStatus.PAUSED:
      return 'Pausado';
    case GroupStatus.ARCHIVED:
      return 'Arquivado';
    default:
      return status;
  }
}

function getProjectPhaseLabel(phase: string): string {
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

function getProjectStatusLabel(status: string): string {
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

function getProjectStatusBadgeVariant(status: string): 'default' | 'warning' | 'success' | 'error' {
  if (status === ProjectStatus.DONE) return 'success';
  if (status === ProjectStatus.PAUSED || status === ProjectStatus.IN_REVIEW) return 'warning';
  if (status === ProjectStatus.ARCHIVED) return 'default';
  return 'default';
}

function toUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function GroupPage() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const { isLoading: authLoading, currentUserId } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);

  const createProjectMutation = useCreateProject();
  const updateGroupMutation = useUpdateGroup();
  const createRecordMutation = useCreateRecord();

  const {
    group,
    projects,
    records,
    isLoading: groupDataLoading,
    hasError: groupDataError,
  } = useGroupPageData({ groupId });

  const projectNamesById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.nome])),
    [projects],
  );

  const aggregateProgressLabel = useMemo(() => {
    if (projects.length === 0) {
      return 'Sem projetos vinculados';
    }

    const doneProjects = projects.filter((project) => project.status === ProjectStatus.DONE).length;
    const inProgressProjects = projects.filter((project) => project.status === ProjectStatus.IN_PROGRESS).length;

    return `${doneProjects}/${projects.length} concluidos · ${inProgressProjects} em andamento`;
  }, [projects]);

  const criticalDeadlineProject = useMemo(() => {
    const activeProjectsWithDeadline = projects
      .filter(
        (project) =>
          project.prazo &&
          project.status !== ProjectStatus.DONE &&
          project.status !== ProjectStatus.ARCHIVED,
      )
      .sort((a, b) => new Date(a.prazo || '').getTime() - new Date(b.prazo || '').getTime());

    return activeProjectsWithDeadline[0] ?? null;
  }, [projects]);

  const handleCreateProject = async (payload: CreateProjectPayload) => {
    setActionError(null);
    const createdProject = await createProjectMutation.mutateAsync({
      ...payload,
      grupoId: group?.id,
    });
    navigate(`/projetos/${createdProject.id}`);
  };

  const handleUpdateGroup = async (payload: UpdateGroupPayload) => {
    if (!group) return;
    setActionError(null);
    await updateGroupMutation.mutateAsync({ groupId: group.id, payload });
  };

  const handleCreateRecord = async (payload: CreateRecordPayload) => {
    setActionError(null);
    try {
      await createRecordMutation.mutateAsync(payload);
    } catch (error) {
      const message = toUserErrorMessage(error, 'Nao foi possivel criar o registro.');
      setActionError(message);
      throw error;
    }
  };

  if (!groupId) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <EmptyState title="Grupo invalido" description="Nao foi possivel identificar o grupo solicitado." />
        </div>
      </AppShell>
    );
  }

  if (authLoading || groupDataLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <SectionHeader title="Grupo" subtitle="Carregando..." />
          <div className="mt-8">
            <EmptyState title="Carregando grupo..." description="Buscando resumo, projetos e registros do grupo." />
          </div>
        </div>
      </AppShell>
    );
  }

  if (groupDataError || !group) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <SectionHeader title="Grupo" subtitle="Erro ao carregar" />
          <div className="mt-8">
            <EmptyState
              title="Erro ao carregar grupo"
              description="Nao foi possivel carregar os dados do grupo. Tente recarregar a pagina."
            />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentUserId={currentUserId}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <SectionHeader
          title={group.nome}
          subtitle="Grupo: projetos, registros e leitura agregada"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setIsGroupFormOpen(true)}>
                Editar grupo
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsProjectFormOpen(true)}>
                Novo projeto
              </Button>
            </div>
          }
        />

        {actionError ? (
          <div className="mt-6">
            <Panel className="border-alert-subtle bg-alert-subtle/20" padding="sm">
              <p className="text-sm text-alert">{actionError}</p>
            </Panel>
          </div>
        ) : null}

        <div className="mt-6">
          <Panel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Nome do grupo</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{group.nome}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Status</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{getGroupStatusLabel(group.status)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Projetos</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{projects.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Andamento agregado</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{aggregateProgressLabel}</p>
              </div>
              {criticalDeadlineProject ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">Prazo critico</p>
                  <p
                    className={`mt-1 flex items-center gap-2 text-sm font-medium ${
                      criticalDeadlineProject.prazo && isOverdue(criticalDeadlineProject.prazo)
                        ? 'text-alert'
                        : 'text-warning'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {criticalDeadlineProject.nome} · {formatFullDate(criticalDeadlineProject.prazo || '')}
                  </p>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <GroupRecordsSection
            records={records}
            projectNamesById={projectNamesById}
            className="border-border-secondary bg-surface-secondary/20"
            onActionError={(message) => setActionError(message || null)}
            actions={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsRecordFormOpen(true)}
                disabled={projects.length === 0}
              >
                Novo registro
              </Button>
            }
          />
        </div>

        <div className="mt-6">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium text-text-primary">Projetos do grupo</h2>
                <p className="text-sm text-text-secondary">Cards compactos com leitura rapida</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <FolderKanban className="h-4 w-4" />
                <span>{projects.length} projeto{projects.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            {projects.length === 0 ? (
              <EmptyState
                title="Sem projetos neste grupo"
                description="Crie o primeiro projeto do grupo usando a acao principal acima."
                className="py-10"
              />
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      to={`/projetos/${project.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border-primary bg-surface-primary px-4 py-3 transition-colors hover:bg-surface-secondary"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{project.nome}</p>
                        <p className="mt-1 text-xs text-text-tertiary">
                          {getProjectPhaseLabel(project.fase)} · {project.tarefasConcluidas}/{project.totalTarefas}{' '}
                          tarefas concluidas
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {project.prazo ? (
                          <span
                            className={`text-xs ${
                              isOverdue(project.prazo) &&
                              project.status !== ProjectStatus.DONE &&
                              project.status !== ProjectStatus.ARCHIVED
                                ? 'text-alert'
                                : 'text-text-tertiary'
                            }`}
                          >
                            {formatFullDate(project.prazo)}
                          </span>
                        ) : (
                          <span className="text-xs text-text-tertiary">Sem prazo</span>
                        )}
                        <Badge variant={getProjectStatusBadgeVariant(project.status)} size="sm">
                          {getProjectStatusLabel(project.status)}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-text-tertiary" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {isProjectFormOpen ? (
        <ProjectFormDrawer
          isOpen={isProjectFormOpen}
          mode="create"
          groups={[]}
          lockedGroup={{ id: group.id, nome: group.nome }}
          isSubmitting={createProjectMutation.isPending}
          onClose={() => setIsProjectFormOpen(false)}
          onSubmit={handleCreateProject}
        />
      ) : null}

      {isGroupFormOpen ? (
        <GroupFormDrawer
          isOpen={isGroupFormOpen}
          mode="edit"
          group={group}
          isSubmitting={updateGroupMutation.isPending}
          onClose={() => setIsGroupFormOpen(false)}
          onSubmit={handleUpdateGroup}
        />
      ) : null}

      {isRecordFormOpen ? (
        <RecordFormDrawer
          isOpen={isRecordFormOpen}
          projects={projects.map((project) => ({ id: project.id, nome: project.nome }))}
          isSubmitting={createRecordMutation.isPending}
          onClose={() => setIsRecordFormOpen(false)}
          onSubmit={handleCreateRecord}
        />
      ) : null}
    </AppShell>
  );
}


