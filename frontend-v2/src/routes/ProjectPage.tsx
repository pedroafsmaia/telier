import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardList, Pencil } from 'lucide-react';
import { AppShell } from '../app/layout/AppShell';
import { Button, EmptyState, Panel, SectionHeader } from '../design/primitives';
import { formatFullDate } from '../lib/dates';
import { ProjectPhase, ProjectStatus } from '../lib/enums';
import { useAuth } from '../lib/auth';
import { useProjectPageData, ProjectFormDrawer, useUpdateProject } from '../features/projects';
import { useGroups } from '../features/groups';
import { QuickTaskCreate, TaskDrawer, TaskFormDrawer, TaskList } from '../features/tasks/components';
import { TaskTimerFlowDrawer } from '../features/tasks/components/TaskTimerFlowDrawer';
import { useProjectTaskActions } from '../features/tasks/hooks/useProjectTaskActions';
import { ProjectRecordsSection, RecordFormDrawer, useCreateRecord } from '../features/records';
import type { CreateRecordPayload } from '../features/records';
import type { UpdateProjectPayload } from '../features/projects';
import type { CreateTaskPayload } from '../features/tasks';

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

  const handleCreateStructuredTask = async (payload: CreateTaskPayload) => {
    await taskActions.handleCreateTask(payload);
  };

  const handleCreateRecord = async (payload: CreateRecordPayload) => {
    taskActions.setActionError(null);
    try {
      await createRecordMutation.mutateAsync(payload);
    } catch (error) {
      const message = toUserErrorMessage(error, 'Nao foi possivel criar o registro.');
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
          <EmptyState title="Projeto invalido" description="Nao foi possivel identificar o projeto solicitado." />
        </div>
      </AppShell>
    );
  }

  if (authLoading || projectDataLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <SectionHeader title="Projeto" subtitle="Carregando..." />
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
          <SectionHeader title="Projeto" subtitle="Erro ao carregar" />
          <div className="mt-8">
            <EmptyState
              title="Erro ao carregar projeto"
              description="Nao foi possivel carregar os dados do projeto. Tente recarregar a pagina."
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
          title={project.nome}
          subtitle="Projeto: tarefas e registros operacionais"
          actions={
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setIsProjectFormOpen(true)}>
              Editar projeto
            </Button>
          }
        />

        {taskActions.actionError ? (
          <div className="mt-6">
            <Panel className="border-alert-subtle bg-alert-subtle/20" padding="sm">
              <p className="text-sm text-alert-DEFAULT">{taskActions.actionError}</p>
            </Panel>
          </div>
        ) : null}

        <div className="mt-6">
          <Panel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Grupo</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{project.grupoNome || 'Sem grupo'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Fase</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{getProjectPhaseLabel(project.fase)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Status</p>
                <p className="mt-1 text-sm font-medium text-text-primary">{getProjectStatusLabel(project.status)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Prazo</p>
                <p className="mt-1 text-sm font-medium text-text-primary">
                  {project.prazo ? formatFullDate(project.prazo) : 'Sem prazo'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Progresso</p>
                <p className="mt-1 text-sm font-medium text-text-primary">
                  {completionPercent}% ({project.tarefasConcluidas}/{project.totalTarefas})
                </p>
              </div>
            </div>
          </Panel>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsTaskFormOpen(true)}>
            Nova tarefa
          </Button>
          <QuickTaskCreate
            projects={[{ id: project.id, nome: project.nome }]}
            lockedProject={{ id: project.id, nome: project.nome }}
            triggerLabel="Criacao rapida"
            disabled={taskActions.isCreatingTask}
            onCreateTask={taskActions.handleCreateTask}
          />
        </div>

        <div className="mt-6">
          <ProjectRecordsSection
            projectId={projectId}
            records={records}
            onActionError={(message) => taskActions.setActionError(message || null)}
            actions={
              <Button variant="secondary" size="sm" onClick={() => setIsRecordFormOpen(true)}>
                Novo registro
              </Button>
            }
          />
        </div>

        <div className="mt-6">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium text-text-primary">Tarefas do projeto</h2>
                <p className="text-sm text-text-secondary">Lista operacional compacta</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <ClipboardList className="h-4 w-4" />
                <span>{tasks.length} tarefa{tasks.length === 1 ? '' : 's'}</span>
              </div>
            </div>

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
          </Panel>
        </div>

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

