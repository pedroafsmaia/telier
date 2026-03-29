import { useMemo, useState } from 'react';
import {
  useCompleteTask,
  useCreateTask,
  useStartTimer,
  useStopTimer,
} from '../queries';
import type { ActiveTimeSession, CreateTaskPayload, TaskListItem } from '../types';

interface TimerFlowState {
  isOpen: boolean;
  mode: 'stop' | 'switch';
  currentSession: ActiveTimeSession | null;
  nextTask: TaskListItem | null;
}

interface UseTaskActionStateParams {
  tasks: TaskListItem[];
  activeSessions: ActiveTimeSession[];
  currentUserId?: string;
  fixedProjectId?: string;
}

function toUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function useTaskActionState({
  tasks,
  activeSessions,
  currentUserId,
  fixedProjectId,
}: UseTaskActionStateParams) {
  const createTaskMutation = useCreateTask();
  const startTimerMutation = useStartTimer();
  const stopTimerMutation = useStopTimer();
  const completeTaskMutation = useCompleteTask();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [timerFlowError, setTimerFlowError] = useState<string | null>(null);
  const [timerFlow, setTimerFlow] = useState<TimerFlowState>({
    isOpen: false,
    mode: 'stop',
    currentSession: null,
    nextTask: null,
  });

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const currentUserActiveSession = activeSessions.find((session) => session.usuarioId === currentUserId);

  const selectedTaskCurrentUserSession = useMemo(() => {
    if (!selectedTask) return undefined;
    return activeSessions.find((session) => session.tarefaId === selectedTask.id && session.usuarioId === currentUserId);
  }, [activeSessions, currentUserId, selectedTask]);

  const isSubmittingTimerFlow = stopTimerMutation.isPending || startTimerMutation.isPending;

  const closeTimerFlow = () => {
    if (isSubmittingTimerFlow) return;
    setActionError(null);
    setTimerFlowError(null);
    setTimerFlow({
      isOpen: false,
      mode: 'stop',
      currentSession: null,
      nextTask: null,
    });
  };

  const openTaskDrawer = (task: TaskListItem) => {
    setActionError(null);
    setSelectedTaskId(task.id);
    setIsTaskDrawerOpen(true);
  };

  const closeTaskDrawer = () => {
    setActionError(null);
    setIsTaskDrawerOpen(false);
    setSelectedTaskId(null);
  };

  const handleCreateTask = async (payload: CreateTaskPayload) => {
    setActionError(null);
    const projectId = fixedProjectId || payload.projetoId;

    try {
      await createTaskMutation.mutateAsync({
        projectId,
        payload: {
          ...payload,
          projetoId: projectId,
        },
      });
    } catch (error) {
      setActionError(toUserErrorMessage(error, 'Nao foi possivel criar a tarefa. Tente novamente.'));
      throw error;
    }
  };

  const handleStartTimer = async (task: TaskListItem) => {
    setActionError(null);
    setTimerFlowError(null);

    try {
      if (currentUserActiveSession && currentUserActiveSession.tarefaId !== task.id) {
        setTimerFlow({
          isOpen: true,
          mode: 'switch',
          currentSession: currentUserActiveSession,
          nextTask: task,
        });
        return;
      }

      await startTimerMutation.mutateAsync({ taskId: task.id, projectId: task.projetoId });
    } catch (error) {
      setActionError(toUserErrorMessage(error, 'Nao foi possivel iniciar o timer. Tente novamente.'));
    }
  };

  const handleStopTimer = (sessionId: string, task: TaskListItem) => {
    setTimerFlowError(null);
    const currentSession = activeSessions.find((session) => session.id === sessionId) ?? null;
    if (!currentSession) return;

    setTimerFlow({
      isOpen: true,
      mode: 'stop',
      currentSession,
      nextTask: task,
    });
  };

  const handleConfirmTimerFlow = async (value: { fim?: string; observacao?: string }) => {
    if (!timerFlow.currentSession) return;

    setActionError(null);
    setTimerFlowError(null);

    try {
      await stopTimerMutation.mutateAsync({
        sessionId: timerFlow.currentSession.id,
        projectId: timerFlow.currentSession.projetoId,
        taskId: timerFlow.currentSession.tarefaId,
        ...value,
      });

      if (timerFlow.mode === 'switch' && timerFlow.nextTask) {
        await startTimerMutation.mutateAsync({
          taskId: timerFlow.nextTask.id,
          projectId: timerFlow.nextTask.projetoId,
        });
      }

      closeTimerFlow();
    } catch (error) {
      const message = toUserErrorMessage(error, 'Nao foi possivel concluir o fluxo de timer. Tente novamente.');
      setActionError(message);
      setTimerFlowError(message);
    }
  };

  const handleCompleteTask = async (task: TaskListItem) => {
    setActionError(null);
    try {
      await completeTaskMutation.mutateAsync({ taskId: task.id, projectId: task.projetoId });
    } catch (error) {
      setActionError(toUserErrorMessage(error, 'Nao foi possivel concluir a tarefa. Tente novamente.'));
    }
  };

  return {
    actionError,
    setActionError,
    isTaskDrawerOpen,
    selectedTask,
    selectedTaskCurrentUserSession,
    timerFlow,
    timerFlowError,
    isSubmittingTimerFlow,
    isCreatingTask: createTaskMutation.isPending,
    openTaskDrawer,
    closeTaskDrawer,
    closeTimerFlow,
    handleCreateTask,
    handleStartTimer,
    handleStopTimer,
    handleConfirmTimerFlow,
    handleCompleteTask,
  };
}
