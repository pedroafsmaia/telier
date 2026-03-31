import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { Button, EmptyState, MetricStrip, Panel } from '../design/primitives';
import { ProjectFormDrawer, useProjectPageData, useUpdateProject } from '../features/projects';
import { useGroups } from '../features/groups';
import { ProjectRecordsSection, RecordFormDrawer, useCreateRecord } from '../features/records';
import type { CreateRecordPayload } from '../features/records';
import { TaskDrawer, TaskFormDrawer, TaskList } from '../features/tasks/components';
import { TaskTimerFlowDrawer } from '../features/tasks/components/TaskTimerFlowDrawer';
import { useProjectTaskActions } from '../features/tasks/hooks/useProjectTaskActions';
import type { CreateTaskPayload } from '../features/tasks';
import { formatFullDate, isOverdue } from '../lib/dates';
import { ProjectStatus } from '../lib/enums';
import { useAuth } from '../lib/auth';
import type { UpdateProjectPayload } from '../features/projects';
import {
  formatAreaLabel,
  formatProjectProgressLabel,
  getProjectPhaseLabel,
  getProjectStatusLabel,
  getProjectStatusToneClass,
} from '../lib/projectUi';

function toUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const { isLoading: authLoading, currentUserId, isAdmin } = useAuth();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);

  const updateProjectMutation = useUpdateProject();
  const createRecordMutation = useCreateRecord();
  const { data: groups = [] } = useGroups();

  const {
    project,
    tasks,
    records,
    activeSessions,
    isLoading: projectDataLoading,
    hasError: projectDataError,
  } = useProjectPageData({ projectId, currentUserId });

  const taskActions = useProjectTaskActions({
    projectId,
    tasks,
    activeSessions,
    currentUserId,
  });

  const completionPercent = useMemo(() => {
    if (!project || project.totalTarefas === 0) return 0;
    return Math.round((project.tarefasConcluidas / project.totalTarefas) * 100);
  }, [project]);

  const projectIsOverdue = Boolean(
    project?.prazo &&
    isOverdue(project.prazo) &&
    project.status !== ProjectStatus.DONE &&
    project.status !== ProjectStatus.ARCHIVED,
  );

  const handleCreateStructuredTask = async (payload: CreateTaskPayload) => {
    await taskActions.handleCreateTask(payload);
  };

  const handleCreateRecord = async (payload: CreateRecordPayload) => {
    taskActions.setActionError(null);
    try {
      await createRecordMutation.mutateAsync(payload);
    } catch (error) {
      const message = toUserErrorMessage(error, 'Não foi possível criar o registro.');
      taskActions.setActionError(message);
      throw error;
    }
  };

  const handleUpdateProject = async (payload: UpdateProjectPayload) => {
    if (!project) return;
    taskActions.setActionError(null);
    await updateProjectMutation.mutateAsync({
      projectId: project.id,
      payload,
    });
  };

  if (!projectId) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <EmptyState title="Projeto inválido" description="Não foi possível identificar o projeto solicitado." />
        </div>
      </AppShell>
    );
  }

  if (authLoading || projectDataLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="border-b border-border-secondary pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Projeto</h1>
            <p className="mt-1 text-sm text-text-secondary">Carregando...</p>
          </header>
          <div className="mt-8">
            <EmptyState title="Carregando projeto..." description="Buscando tarefas e registros do projeto." />
          </div>
        </div>
      </AppShell>
    );
  }

  if (projectDataError || !project) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <header className="border-b border-border-secondary pb-4">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">Projeto</h1>
            <p className="mt-1 text-sm text-text-secondary">Erro ao carregar</p>
          </header>
          <div className="mt-8">
            <EmptyState
              title="Erro ao carregar projeto"
              description="Não foi possível carregar os dados do projeto. Tente recarregar a página."
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
              <h1 className="text-xl font-semibold tracking-tight text-text-primary">{project.nome}</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Tarefas e registros operacionais do projeto.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsProjectFormOpen(true)}>
                Editar projeto
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsTaskFormOpen(true)}>
                Nova tarefa
              </Button>
            </div>
          </div>

          <MetricStrip
            className="mt-4"
            items={[
              { label: 'Grupo', value: project.grupoNome || 'Sem grupo' },
              { label: 'Fase', value: getProjectPhaseLabel(project.fase) },
              {
                label: 'Status',
                value: getProjectStatusLabel(project.status),
                valueClassName: getProjectStatusToneClass(project.status),
              },
              {
                label: 'Prazo',
                value: project.prazo ? formatFullDate(project.prazo) : 'Sem prazo',
                valueClassName: projectIsOverdue ? 'text-error-600' : undefined,
                minWidthClassName: 'min-w-[11rem]',
              },
              {
                label: 'Progresso',
                value: formatProjectProgressLabel(project.tarefasConcluidas, project.totalTarefas),
                minWidthClassName: 'min-w-[12rem]',
              },
              { label: 'Área', value: formatAreaLabel(project.areaM2) },
            ]}
          />
        </header>

        {taskActions.actionError ? (
          <div className="mt-6">
            <Panel className="border-alert-subtle bg-alert-subtle/20" padding="sm">
              <p className="text-sm text-alert">{taskActions.actionError}</p>
            </Panel>
          </div>
        ) : null}

        <div className="mt-6">
          <ProjectRecordsSection
            projectId={projectId}
            records={records}
            className="border-border-secondary bg-surface-secondary/20"
            onActionError={(message) => taskActions.setActionError(message || null)}
            actions={
              <Button variant="secondary" size="sm" onClick={() => setIsRecordFormOpen(true)}>
                Novo registro
              </Button>
            }
          />
        </div>

        <section className="mt-6 border-t border-border-secondary pt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-text-primary">Tarefas do projeto</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Lista operacional compacta com progresso atual de {completionPercent}%.
              </p>
            </div>
            <p className="text-sm text-text-secondary">
              {tasks.length} tarefa{tasks.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="mt-4">
            <TaskList
              tasks={tasks}
              activeSessions={activeSessions}
              currentUserId={currentUserId}
              presentation="compact-status"
              density="compact"
              onTaskClick={taskActions.openTaskDrawer}
              onStartTimer={taskActions.handleStartTimer}
              onStopTimer={taskActions.handleStopTimer}
              onComplete={taskActions.handleCompleteTask}
            />
          </div>
        </section>

        <TaskDrawer
          isOpen={taskActions.isTaskDrawerOpen}
          onClose={taskActions.closeTaskDrawer}
          task={taskActions.selectedTask}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          currentUserSession={taskActions.selectedTaskCurrentUserSession}
          projects={[{ id: project.id, nome: project.nome }]}
          onStartTimer={() => taskActions.selectedTask && taskActions.handleStartTimer(taskActions.selectedTask)}
          onStopTimer={() => {
            if (taskActions.selectedTaskCurrentUserSession && taskActions.selectedTask) {
              taskActions.handleStopTimer(taskActions.selectedTaskCurrentUserSession.id, taskActions.selectedTask);
            }
          }}
          onComplete={() => taskActions.selectedTask && taskActions.handleCompleteTask(taskActions.selectedTask)}
        />

        <TaskTimerFlowDrawer
          key={`${taskActions.timerFlow.isOpen ? 'open' : 'closed'}-${taskActions.timerFlow.mode}-${taskActions.timerFlow.currentSession?.id || 'none'}-${taskActions.timerFlow.nextTask?.id || 'none'}`}
          isOpen={taskActions.timerFlow.isOpen}
          mode={taskActions.timerFlow.mode}
          currentSession={taskActions.timerFlow.currentSession}
          nextTask={taskActions.timerFlow.mode === 'switch' ? taskActions.timerFlow.nextTask : null}
          isSubmitting={taskActions.isSubmittingTimerFlow}
          errorMessage={taskActions.timerFlowError}
          onClose={taskActions.closeTimerFlow}
          onConfirm={taskActions.handleConfirmTimerFlow}
        />
      </div>

      {isTaskFormOpen ? (
        <TaskFormDrawer
          isOpen={isTaskFormOpen}
          projects={[{ id: project.id, nome: project.nome }]}
          lockedProject={{ id: project.id, nome: project.nome }}
          isSubmitting={taskActions.isCreatingTask}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleCreateStructuredTask}
        />
      ) : null}

      {isRecordFormOpen ? (
        <RecordFormDrawer
          isOpen={isRecordFormOpen}
          projects={[{ id: project.id, nome: project.nome }]}
          lockedProject={{ id: project.id, nome: project.nome }}
          isSubmitting={createRecordMutation.isPending}
          onClose={() => setIsRecordFormOpen(false)}
          onSubmit={handleCreateRecord}
        />
      ) : null}

      {isProjectFormOpen ? (
        <ProjectFormDrawer
          isOpen={isProjectFormOpen}
          mode="edit"
          project={project}
          groups={groups.map((group) => ({ id: group.id, nome: group.nome }))}
          isSubmitting={updateProjectMutation.isPending}
          onClose={() => setIsProjectFormOpen(false)}
          onSubmit={handleUpdateProject}
        />
      ) : null}
    </AppShell>
  );
}
