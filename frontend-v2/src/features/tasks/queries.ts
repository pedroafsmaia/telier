// Queries e Mutations do domínio de Tarefas
// Integração com TanStack Query para cache e sincronização

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import * as api from './api';
import { adaptTaskList, adaptActiveSession, adaptDailySummary, adaptTaskTimeEntry, adaptTaskTimeSummaryItem, adaptUserOption } from './adapters';
import type { TaskListItem, ActiveTimeSession, DailyTimeSummary, CreateTaskPayload, UpdateTaskPayload, TaskTimeEntry, TaskTimeSummaryItem, UserOption } from './types';

// Query keys centralizadas
export const taskKeys = {
  all: ['tasks'] as const,
  myTasks: () => [...taskKeys.all, 'my'] as const,
  todayOperation: () => [...taskKeys.all, 'today-operation'] as const,
  projectTasks: (projectId: string) => [...taskKeys.all, 'project', projectId] as const,
  taskTimeEntries: (taskId: string) => [...taskKeys.all, 'task-time-entries', taskId] as const,
  taskTimeSummary: (taskId: string) => [...taskKeys.all, 'task-time-summary', taskId] as const,
  taskCollaborators: (taskId: string) => [...taskKeys.all, 'task-collaborators', taskId] as const,
  assignableUsers: () => [...taskKeys.all, 'assignable-users'] as const,
  activeSessions: () => ['time', 'active-sessions'] as const,
  dailySummary: () => ['time', 'daily-summary'] as const,
  recentSessions: (limit: number) => [...taskKeys.all, 'recent-sessions', limit] as const,
};

// Hook: Buscar minhas tarefas
export function useMyTasks(currentUserId?: string) {
  return useQuery<TaskListItem[], Error>({
    queryKey: taskKeys.myTasks(),
    queryFn: async () => {
      const raw = await api.fetchMyTasks();
      return adaptTaskList(raw, currentUserId);
    },
  });
}

export function useVisibleTasks(params: {
  currentUserId?: string;
  isAdmin: boolean;
  projectIds: string[];
  enabled?: boolean;
}) {
  const { currentUserId, isAdmin, projectIds, enabled = true } = params;

  const myTasksQuery = useQuery<TaskListItem[], Error>({
    queryKey: [...taskKeys.myTasks(), currentUserId ?? 'anon'],
    queryFn: async () => {
      const raw = await api.fetchMyTasks();
      return adaptTaskList(raw, currentUserId);
    },
    enabled: enabled && !isAdmin,
  });

  const adminProjectQueries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: taskKeys.projectTasks(projectId),
      queryFn: async () => {
        const raw = await api.fetchProjectTasks(projectId);
        return adaptTaskList(raw, currentUserId);
      },
      enabled: enabled && isAdmin,
    })),
  });

  const adminTasks = useMemo(() => {
    if (!isAdmin) return [] as TaskListItem[];
    const all = adminProjectQueries.flatMap((query) => query.data ?? []);
    const unique = new Map<string, TaskListItem>();
    all.forEach((task) => unique.set(task.id, task));
    return Array.from(unique.values());
  }, [adminProjectQueries, isAdmin]);

  const isLoading = isAdmin
    ? adminProjectQueries.some((query) => query.isLoading)
    : myTasksQuery.isLoading;

  const error = isAdmin
    ? adminProjectQueries.find((query) => query.error)?.error ?? null
    : myTasksQuery.error;

  return {
    data: isAdmin ? adminTasks : (myTasksQuery.data ?? []),
    isLoading,
    error,
  };
}

// Hook: Buscar tarefas para operação do dia
export function useTodayOperationTasks(currentUserId?: string, enabled: boolean = true) {
  return useQuery<TaskListItem[], Error>({
    queryKey: taskKeys.todayOperation(),
    queryFn: async () => {
      const raw = await api.fetchTodayOperationTasks();
      return adaptTaskList(raw, currentUserId);
    },
    enabled,
  });
}

// Hook: Buscar tarefas de um projeto
export function useProjectTasks(projectId: string, currentUserId?: string) {
  return useQuery<TaskListItem[], Error>({
    queryKey: taskKeys.projectTasks(projectId),
    queryFn: async () => {
      const raw = await api.fetchProjectTasks(projectId);
      return adaptTaskList(raw, currentUserId);
    },
    enabled: Boolean(projectId),
  });
}

// NOTA: Hook de detalhe removido - GET /tarefas/{id} não existe no backend
// Para obter detalhe, usar useProjectTasks e filtrar por ID

// Hook: Sessões ativas
export function useActiveSessions() {
  return useQuery<ActiveTimeSession[], Error>({
    queryKey: taskKeys.activeSessions(),
    queryFn: async () => {
      const raw = await api.fetchActiveSessions();
      return raw.map(adaptActiveSession);
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}

// Hook: Resumo diário de tempo
export function useDailySummary() {
  return useQuery<DailyTimeSummary, Error>({
    queryKey: taskKeys.dailySummary(),
    queryFn: async () => {
      const raw = await api.fetchDailySummary();
      return adaptDailySummary(raw);
    },
  });
}

// Hook: Sessões recentes
export function useRecentSessions(limit: number = 6) {
  return useQuery<ActiveTimeSession[], Error>({
    queryKey: taskKeys.recentSessions(limit),
    queryFn: async () => {
      const raw = await api.fetchRecentSessions(limit);
      return raw.map(adaptActiveSession);
    },
  });
}

export function useTaskTimeEntries(taskId?: string) {
  return useQuery<TaskTimeEntry[], Error>({
    queryKey: taskKeys.taskTimeEntries(taskId || ''),
    queryFn: async () => {
      const raw = await api.fetchTaskTimeEntries(taskId || '');
      return raw.map(adaptTaskTimeEntry);
    },
    enabled: Boolean(taskId),
  });
}

export function useTaskTimeSummary(taskId?: string) {
  return useQuery<TaskTimeSummaryItem[], Error>({
    queryKey: taskKeys.taskTimeSummary(taskId || ''),
    queryFn: async () => {
      const raw = await api.fetchTaskTimeSummary(taskId || '');
      return raw.map(adaptTaskTimeSummaryItem);
    },
    enabled: Boolean(taskId),
  });
}

export function useTaskCollaborators(taskId?: string) {
  return useQuery<UserOption[], Error>({
    queryKey: taskKeys.taskCollaborators(taskId || ''),
    queryFn: async () => {
      const raw = await api.fetchTaskCollaborators(taskId || '');
      return raw.map(adaptUserOption);
    },
    enabled: Boolean(taskId),
  });
}

export function useAssignableUsers(enabled: boolean = true) {
  return useQuery<UserOption[], Error>({
    queryKey: taskKeys.assignableUsers(),
    queryFn: async () => {
      const raw = await api.fetchAssignableUsers();
      return raw.map(adaptUserOption);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation: Criar tarefa
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation<{ id: string }, Error, { projectId: string; payload: CreateTaskPayload }>({
    mutationFn: async ({ projectId, payload }) => {
      const result = await api.createTask(projectId, payload);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.todayOperation() });
      queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projectId) });
    },
  });
}

// Mutation: Atualizar tarefa
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation<{ ok: true }, Error, { taskId: string; payload: UpdateTaskPayload; projectId?: string }>({
    mutationFn: async ({ taskId, payload }) => {
      const result = await api.updateTask(taskId, payload);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.todayOperation() });
      queryClient.invalidateQueries({ queryKey: taskKeys.taskTimeEntries(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.taskTimeSummary(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.taskCollaborators(variables.taskId) });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projectId) });
      }
    },
  });
}

// Mutation: Deletar tarefa
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { taskId: string; projectId?: string }>({
    mutationFn: async ({ taskId }) => {
      await api.deleteTask(taskId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.todayOperation() });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projectId) });
      }
    },
  });
}

// Mutation: Concluir tarefa
export function useCompleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation<{ ok: true }, Error, { taskId: string; projectId?: string }>({
    mutationFn: async ({ taskId }) => {
      const result = await api.completeTask(taskId);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.todayOperation() });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projectId) });
      }
    },
  });
}

// Mutation: Definir foco
export function useSetTaskFocus() {
  const queryClient = useQueryClient();
  
  return useMutation<{ ok: true }, Error, { taskId: string; projectId?: string }>({
    mutationFn: async ({ taskId }) => {
      const result = await api.setTaskFocus(taskId);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.todayOperation() });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projectId) });
      }
    },
  });
}

// Mutation: Iniciar cronômetro
export function useStartTimer() {
  const queryClient = useQueryClient();
  
  return useMutation<ActiveTimeSession, Error, { taskId: string; projectId?: string }>({
    mutationFn: async ({ taskId }) => {
      const raw = await api.startTimer(taskId);
      return adaptActiveSession(raw);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.activeSessions() });
      queryClient.invalidateQueries({ queryKey: taskKeys.dailySummary() });
      queryClient.invalidateQueries({ queryKey: taskKeys.taskTimeEntries(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.taskTimeSummary(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.todayOperation() });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projectId) });
      }
    },
  });
}

// Mutation: Parar cronômetro
export function useStopTimer() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { sessionId: string; observacao?: string; fim?: string; taskId?: string; projectId?: string }>({
    mutationFn: async ({ sessionId, observacao, fim }) => {
      await api.stopTimer(sessionId, { observacao, fim });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.activeSessions() });
      queryClient.invalidateQueries({ queryKey: taskKeys.dailySummary() });
      queryClient.invalidateQueries({ queryKey: taskKeys.recentSessions(6) });
      if (variables.taskId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.taskTimeEntries(variables.taskId) });
        queryClient.invalidateQueries({ queryKey: taskKeys.taskTimeSummary(variables.taskId) });
      }
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.todayOperation() });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projectId) });
      }
    },
  });
}

export function useSyncTaskCollaborators() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { taskId: string; currentIds: string[]; nextIds: string[]; ownerId?: string; projectId?: string }>({
    mutationFn: async ({ taskId, currentIds, nextIds, ownerId }) => {
      const protectedIds = new Set(ownerId ? [ownerId] : []);
      const currentSet = new Set(currentIds.filter((id) => !protectedIds.has(id)));
      const nextSet = new Set(nextIds.filter((id) => !protectedIds.has(id)));

      const removals = Array.from(currentSet).filter((id) => !nextSet.has(id));
      const additions = Array.from(nextSet).filter((id) => !currentSet.has(id));

      await Promise.all(removals.map((userId) => api.removeTaskCollaborator(taskId, userId)));
      await Promise.all(additions.map((userId) => api.addTaskCollaborator(taskId, userId)));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.taskCollaborators(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
      queryClient.invalidateQueries({ queryKey: taskKeys.todayOperation() });
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projectId) });
      }
    },
  });
}
