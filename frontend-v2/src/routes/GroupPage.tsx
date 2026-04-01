import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { AvatarStack, Button, EmptyState, MetricStrip, Panel } from '../design/primitives';
import { GroupFormDrawer, useGroupPageData, useUpdateGroup } from '../features/groups';
import { ProjectFormDrawer, useCreateProject } from '../features/projects';
import type { CreateProjectPayload } from '../features/projects';
import { GroupRecordsSection, RecordFormDrawer, useCreateRecord } from '../features/records';
import type { CreateRecordPayload } from '../features/records';
import { formatFullDate, formatShortDate, isOverdue } from '../lib/dates';
import { ProjectStatus, getPriorityLabel } from '../lib/enums';
import { useAuth } from '../lib/auth';
import type { UpdateGroupPayload } from '../features/groups';
import {
  formatAreaLabel,
  formatProjectProgressLabel,
  getGroupStatusLabel,
  getGroupStatusToneClass,
  getProjectPhaseLabel,
  getProjectStatusLabel,
  getProjectStatusToneClass,
} from '../lib/projectUi';

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
      .sort((left, right) => new Date(left.prazo || '').getTime() - new Date(right.prazo || '').getTime());

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
          <header className="border-b border-border-secondary pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Grupo</h1>
            <p className="mt-1 text-sm text-text-secondary">Carregando...</p>
          </header>
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
          <header className="border-b border-border-secondary pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Grupo</h1>
            <p className="mt-1 text-sm text-text-secondary">Erro ao carregar</p>
          </header>
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
        <header className="border-b border-border-secondary pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">{group.nome}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsGroupFormOpen(true)}>
                Editar grupo
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsProjectFormOpen(true)}>
                Novo projeto
              </Button>
            </div>
          </div>

          <MetricStrip
            className="mt-4"
            items={[
              {
                label: 'Status',
                value: getGroupStatusLabel(group.status),
                valueClassName: getGroupStatusToneClass(group.status),
              },
              { label: 'Projetos', value: String(projects.length) },
              {
                label: 'Andamento agregado',
                value: aggregateProgressLabel,
                minWidthClassName: 'min-w-[14rem]',
              },
              {
                label: 'Prazo crítico',
                value: criticalDeadlineProject
                  ? `${criticalDeadlineProject.nome} · ${formatShortDate(criticalDeadlineProject.prazo || '')}`
                  : 'Sem prazo crítico',
                valueClassName:
                  criticalDeadlineProject?.prazo && isOverdue(criticalDeadlineProject.prazo)
                    ? 'text-error-600'
                    : undefined,
                minWidthClassName: 'min-w-[14rem]',
                title: criticalDeadlineProject?.prazo
                  ? `${criticalDeadlineProject.nome} · ${formatFullDate(criticalDeadlineProject.prazo || '')}`
                  : 'Sem prazo crítico',
              },
            ]}
          />
        </header>

        {actionError ? (
          <div className="mt-6">
            <Panel className="border-alert-subtle bg-alert-subtle/20" padding="sm">
              <p className="text-sm text-alert">{actionError}</p>
            </Panel>
          </div>
        ) : null}

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

        <section className="mt-6 border-t border-border-secondary pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-text-primary">Projetos do grupo</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Lista compacta de projetos com responsável, prazo e progresso.
              </p>
            </div>
            <p className="text-sm text-text-secondary">
              {projects.length} projeto{projects.length === 1 ? '' : 's'}
            </p>
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="Sem projetos neste grupo"
              description="Crie o primeiro projeto do grupo usando a ação principal acima."
              className="mt-6 py-10"
            />
          ) : (
            <div className="mt-6 space-y-6">
              {projects.map((project, index) => {
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
                        <h3 className="truncate text-base font-semibold text-text-primary">{project.nome}</h3>
                        <p className="mt-1 text-sm text-text-secondary">Projeto vinculado a este grupo.</p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/projetos/${project.id}`)}
                      >
                        Abrir
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <DetailField label="Fase" value={getProjectPhaseLabel(project.fase)} />
                      <DetailField
                        label="Status"
                        value={getProjectStatusLabel(project.status)}
                        toneClassName={getProjectStatusToneClass(project.status)}
                      />
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
                      <DetailField label="Prioridade" value={getPriorityLabel(project.prioridade)} />
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

                      <div className="text-sm text-text-secondary">
                        {project.compartilhadoComigo ? 'Compartilhado comigo' : 'Uso interno do grupo'}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
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
