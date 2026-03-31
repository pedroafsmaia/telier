import { useMemo, useState } from 'react';
import { Grid3x3, List } from 'lucide-react';
import { AppShell } from '../app/layout/AppShell';
import { SectionHeader, EmptyState, Button, Panel } from '../design/primitives';
import { TaskList } from '../features/tasks/components/TaskList';
import { TaskFilters } from '../features/tasks/components/TaskFilters';
import { QuickTaskCreate } from '../features/tasks/components/QuickTaskCreate';
import { TaskFormDrawer } from '../features/tasks/components/TaskFormDrawer';
import { TaskDrawer } from '../features/tasks/components/TaskDrawer';
import { TaskTimerFlowDrawer } from '../features/tasks/components/TaskTimerFlowDrawer';
import { useAuth } from '../lib/auth';
import { useProjects } from '../features/projects/queries';
import { useVisibleTasks, useActiveSessions } from '../features/tasks/queries';
import { useTaskActionState } from '../features/tasks/hooks/useTaskActionState';

export function TasksPage() {
  const { isLoading: authLoading, currentUserId, isAdmin } = useAuth();
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useVisibleTasks({
    currentUserId,
    isAdmin,
    projectIds: projects.map((project) => project.id),
    enabled: !authLoading && (!!currentUserId || isAdmin),
  });
  const { data: activeSessions = [] } = useActiveSessions();

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedEase, setSelectedEase] = useState('');
  const [viewMode, setViewMode] = useState<'blocks' | 'project'>('blocks');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  const taskActions = useTaskActionState({
    tasks,
    activeSessions,
    currentUserId,
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedProject && task.projetoId !== selectedProject) {
        return false;
      }

      if (selectedPriority && task.prioridade !== selectedPriority) {
        return false;
      }

      if (selectedEase && task.facilidade !== selectedEase) {
        return false;
      }

      return true;
    });
  }, [tasks, selectedProject, selectedPriority, selectedEase]);

  const handleClearFilters = () => {
    setSelectedProject('');
    setSelectedPriority('');
    setSelectedEase('');
  };

  if (authLoading || projectsLoading || tasksLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <SectionHeader title="Tarefas" subtitle="Carregando..." />
          <div className="mt-8">
            <EmptyState title="Carregando tarefas..." description="Buscando suas tarefas..." />
          </div>
        </div>
      </AppShell>
    );
  }

  if (tasksError || projectsError) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <SectionHeader title="Tarefas" subtitle="Erro ao carregar" />
          <div className="mt-8">
            <EmptyState
              title="Erro ao carregar tarefas"
              description="Não foi possível buscar suas tarefas. Tente recarregar a página."
            />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentUserId={currentUserId}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <SectionHeader title="Tarefas" subtitle="Painel operacional do dia" />

          <div className="flex items-center gap-1 rounded-md border border-border-primary bg-surface-primary p-1">
            <Button
              variant={viewMode === 'blocks' ? 'secondary' : 'ghost'}
              size="sm"
              icon={Grid3x3}
              onClick={() => setViewMode('blocks')}
            >
              Lista por status
            </Button>
            <Button
              variant={viewMode === 'project' ? 'secondary' : 'ghost'}
              size="sm"
              icon={List}
              onClick={() => setViewMode('project')}
            >
              Agrupar por projeto
            </Button>
          </div>
        </div>

        {taskActions.actionError ? (
          <div className="mb-6">
            <Panel className="border-alert-subtle bg-alert-subtle/20">
              <p className="text-sm text-alert">{taskActions.actionError}</p>
            </Panel>
          </div>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <QuickTaskCreate
            projects={projects.map((project) => ({ id: project.id, nome: project.nome }))}
            onCreateTask={taskActions.handleCreateTask}
            disabled={projects.length === 0}
            triggerLabel="Nova tarefa rápida"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTaskFormOpen(true)}
            disabled={projects.length === 0}
          >
            Formulário completo
          </Button>
        </div>

        <div className="mb-5">
          <TaskFilters
            projects={projects.map((project) => ({ id: project.id, nome: project.nome }))}
            selectedProject={selectedProject}
            selectedPriority={selectedPriority}
            selectedEase={selectedEase}
            onProjectChange={setSelectedProject}
            onPriorityChange={setSelectedPriority}
            onEaseChange={setSelectedEase}
            onClearFilters={handleClearFilters}
          />
        </div>

        <TaskList
          tasks={filteredTasks}
          activeSessions={activeSessions}
          currentUserId={currentUserId}
          viewMode={viewMode}
          onTaskClick={taskActions.openTaskDrawer}
          onStartTimer={taskActions.handleStartTimer}
          onStopTimer={taskActions.handleStopTimer}
          onComplete={taskActions.handleCompleteTask}
        />

        <TaskDrawer
          isOpen={taskActions.isTaskDrawerOpen}
          onClose={taskActions.closeTaskDrawer}
          task={taskActions.selectedTask}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          currentUserSession={taskActions.selectedTaskCurrentUserSession}
          projects={projects.map((project) => ({ id: project.id, nome: project.nome }))}
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

        {isTaskFormOpen ? (
          <TaskFormDrawer
            isOpen={isTaskFormOpen}
            projects={projects.map((project) => ({ id: project.id, nome: project.nome }))}
            isSubmitting={taskActions.isCreatingTask}
            onClose={() => setIsTaskFormOpen(false)}
            onSubmit={taskActions.handleCreateTask}
          />
        ) : null}
      </div>
    </AppShell>
  );
}


