import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, FolderKanban, Pencil } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { Button, EmptyState, Panel, SectionHeader } from '../design/primitives';
import { useCreateProject, ProjectFormDrawer } from '../features/projects';
import { useGroupPageData, useUpdateGroup, GroupFormDrawer } from '../features/groups';
import { GroupRecordsSection, RecordFormDrawer, useCreateRecord } from '../features/records';
import { useAuth } from '../lib/auth';
import { formatFullDate, isOverdue } from '../lib/dates';
import { GroupStatus, ProjectStatus } from '../lib/enums';
import type { CreateProjectPayload } from '../features/projects';
import type { CreateRecordPayload } from '../features/records';
import type { UpdateGroupPayload } from '../features/groups';
import {
  getProjectPhaseLabel,
  getProjectStatusLabel,
  getProjectStatusToneClass,
} from '../lib/projectUi';

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

    return `${doneProjects}/${projects.length} concluídos · ${inProgressProjects} em andamento`;
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
      const message = toUserErrorMessage(error, 'Não foi possível criar o registro.');
      setActionError(message);
      throw error;
    }
  };

  if (!groupId) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <EmptyState title="Grupo inválido" description="Não foi possível identificar o grupo solicitado." />
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
              description="Não foi possível carregar os dados do grupo. Tente recarregar a página."
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
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">Prazo crítico</p>
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
                <p className="text-sm text-text-secondary">Lista operacional compacta</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <FolderKanban className="h-4 w-4" />
                <span>{projects.length} projeto{projects.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            {projects.length === 0 ? (
              <EmptyState
                title="Sem projetos neste grupo"
                description="Crie o primeiro projeto do grupo usando a ação principal acima."
                className="py-10"
              />
            ) : (
              <ul className="space-y-3">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      to={`/projetos/${project.id}`}
                      className="block rounded-md border border-border-primary bg-surface-primary px-4 py-4 transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-info-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-text-primary">{project.nome}</p>
                          <p className="mt-1 text-sm text-text-secondary">{group.nome}</p>
                        </div>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
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
                          <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Prazo</p>
                          <p
                            className={`mt-1 text-sm font-medium ${
                              project.prazo &&
                              isOverdue(project.prazo) &&
                              project.status !== ProjectStatus.DONE &&
                              project.status !== ProjectStatus.ARCHIVED
                                ? 'text-alert'
                                : 'text-text-primary'
                            }`}
                          >
                            {project.prazo ? formatFullDate(project.prazo) : 'Sem prazo'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">Tarefas</p>
                          <p className="mt-1 text-sm font-medium text-text-primary">
                            {project.tarefasConcluidas}/{project.totalTarefas} concluídas
                          </p>
                        </div>
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


