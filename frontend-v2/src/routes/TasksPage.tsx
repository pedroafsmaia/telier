import { useEffect, useMemo, useState } from 'react';
import { Filter, Grid3x3, List } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../app/layout/AppShell';
import { Button, EmptyState, Panel, SectionHeader } from '../design/primitives';
import { TaskDrawer } from '../features/tasks/components/TaskDrawer';
import { TaskFilters } from '../features/tasks/components/TaskFilters';
import { TaskFormDrawer } from '../features/tasks/components/TaskFormDrawer';
import { TaskList } from '../features/tasks/components/TaskList';
import { TaskSummaryChart } from '../features/tasks/components/TaskSummaryChart';
import { QuickTaskCreate } from '../features/tasks/components/QuickTaskCreate';
import { TaskTimerFlowDrawer } from '../features/tasks/components/TaskTimerFlowDrawer';
import { useTaskActionState } from '../features/tasks/hooks/useTaskActionState';
import { useActiveSessions, useTodayOperationTasks, useVisibleTasks } from '../features/tasks/queries';
import { useProjects } from '../features/projects/queries';
import { useAuth } from '../lib/auth';

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isLoading: authLoading, currentUserId, isAdmin } = useAuth();
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  const taskScope = searchParams.get('escopo') === 'minhas' ? 'mine' : 'today';
  const visibleTasksQuery = useVisibleTasks({
    currentUserId,
    isAdmin,
    projectIds: projects.map((project) => project.id),
    enabled: !authLoading && (!!currentUserId || isAdmin) && taskScope === 'mine',
  });
  const todayTasksQuery = useTodayOperationTasks(currentUserId, !authLoading && taskScope === 'today');
  const { data: activeSessions = [] } = useActiveSessions();

  const tasks = useMemo(
    () => (taskScope === 'today' ? (todayTasksQuery.data ?? []) : (visibleTasksQuery.data ?? [])),
    [taskScope, todayTasksQuery.data, visibleTasksQuery.data],
  );
  const tasksLoading = taskScope === 'today' ? todayTasksQuery.isLoading : visibleTasksQuery.isLoading;
  const tasksError = taskScope === 'today' ? todayTasksQuery.error : visibleTasksQuery.error;
  const tasksScopeLabel = taskScope === 'today' ? 'Hoje' : 'Minhas tarefas';

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedEase, setSelectedEase] = useState('');
  const [viewMode, setViewMode] = useState<'blocks' | 'project'>('blocks');
  const [isTaskFormExpanded, setIsTaskFormExpanded] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const taskActions = useTaskActionState({
    tasks,
    activeSessions,
    currentUserId,
  });

  const searchKey = searchParams.toString();
  const isTaskFormOpen = isTaskFormExpanded || searchParams.get('nova') === '1';
  const hasActiveFilters = Boolean(selectedProject || selectedPriority || selectedEase);

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

  const openStructuredTaskForm = () => {
    setIsTaskFormExpanded(true);
  };

  const closeStructuredTaskForm = () => {
    setIsTaskFormExpanded(false);

    if (searchParams.get('nova') === '1') {
      const params = new URLSearchParams(searchParams);
      params.delete('nova');
      setSearchParams(params, { replace: true });
    }
  };

  useEffect(() => {
    if (authLoading || projectsLoading || tasksLoading) return;

    const params = new URLSearchParams(searchKey);
    const taskIdToOpen = params.get('abrir');

    if (!taskIdToOpen) return;

    const taskToOpen = tasks.find((task) => task.id === taskIdToOpen);
    if (taskToOpen) {
      taskActions.openTaskDrawer(taskToOpen);
    }

    params.delete('abrir');
    setSearchParams(params, { replace: true });
  }, [authLoading, projectsLoading, tasks, tasksLoading, searchKey, setSearchParams, taskActions]);

  if (authLoading || projectsLoading || tasksLoading) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <SectionHeader title="Tarefas" subtitle="Carregando..." />
          <div className="mt-8">
            <EmptyState title="Carregando tarefas..." description={`Buscando ${tasksScopeLabel.toLowerCase()}...`} />
          </div>
        </div>
      </AppShell>
    );
  }

  if (tasksError || projectsError) {
    return (
      <AppShell currentUserId={currentUserId}>
        <div className="mx-auto max-w-7xl px-6 py-8">
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
      <div className="mx-auto max-w-7xl px-6 py-8">
        <SectionHeader
          title="Tarefas"
          actions={
            <div className="flex items-center gap-1 rounded-md border border-border-primary bg-surface-primary p-1">
              <Button
                variant={viewMode === 'blocks' ? 'secondary' : 'ghost'}
                size="sm"
                icon={Grid3x3}
                onClick={() => setViewMode('blocks')}
              >
                Por status
              </Button>
              <Button
                variant={viewMode === 'project' ? 'secondary' : 'ghost'}
                size="sm"
                icon={List}
                onClick={() => setViewMode('project')}
              >
                Por projeto
              </Button>
            </div>
          }
        />

        {tasks.length > 0 ? (
          <div className="mt-5">
            <TaskSummaryChart tasks={tasks} />
          </div>
        ) : null}

        {taskActions.actionError ? (
          <div className="mt-6">
            <Panel className="border-alert-subtle bg-alert-subtle/20">
              <p className="text-sm text-alert">{taskActions.actionError}</p>
            </Panel>
          </div>
        ) : null}

        <div className="mt-5 border-b border-border-secondary pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <QuickTaskCreate
                projects={projects.map((project) => ({ id: project.id, nome: project.nome }))}
                onCreateTask={taskActions.handleCreateTask}
                disabled={projects.length === 0}
                triggerLabel="Nova tarefa rápida"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={openStructuredTaskForm}
                disabled={projects.length === 0}
              >
                Abrir formulário
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={Filter}
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="sm:hidden"
            >
              Filtros
            </Button>
            <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} w-full sm:block sm:w-auto`}>
              <TaskFilters
                projects={projects.map((project) => ({ id: project.id, nome: project.nome }))}
                selectedProject={selectedProject}
                selectedPriority={selectedPriority}
                selectedEase={selectedEase}
                onProjectChange={setSelectedProject}
                onPriorityChange={setSelectedPriority}
                onEaseChange={setSelectedEase}
                onClearFilters={handleClearFilters}
                className="justify-end"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
            <p>
              Mostrando {filteredTasks.length} de {tasks.length} tarefa{tasks.length === 1 ? '' : 's'}.
            </p>
            {hasActiveFilters ? (
              <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Filtros ativos</span>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
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
        </div>

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
            onClose={closeStructuredTaskForm}
            onSubmit={taskActions.handleCreateTask}
          />
        ) : null}
      </div>
    </AppShell>
  );
}
