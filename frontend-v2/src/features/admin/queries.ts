// Queries e Mutations do domínio de Administração
// Apenas endpoints reais do backend

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { adaptCurrentSession, adaptUser, adaptUserList } from './adapters';
import type { CurrentSession, User, UserListItem } from './types';
import type { TaskStatus, ProjectStatus, GroupStatus } from '../../lib/enums';
import { adaptTaskList } from '../tasks/adapters';
import { adaptProjectList } from '../projects/adapters';
import { adaptGroupList } from '../groups/adapters';
import type { TaskListItem } from '../tasks/types';
import type { ProjectListItem } from '../projects/types';
import type { GroupListItem } from '../groups/types';

interface AdminPaginatedResult<T> {
  items: T[];
  total: number;
}

// Query keys centralizadas
export const adminKeys = {
  all: ['admin'] as const,
  currentSession: () => ['session', 'current'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  user: (userId: string) => [...adminKeys.all, 'user', userId] as const,
  tasks: () => [...adminKeys.all, 'tasks'] as const,
  projects: () => [...adminKeys.all, 'projects'] as const,
  groups: () => [...adminKeys.all, 'groups'] as const,
};

// Hook: Buscar sessão atual
export function useCurrentSession() {
  return useQuery<CurrentSession, Error>({
    queryKey: adminKeys.currentSession(),
    queryFn: async () => {
      const raw = await api.fetchCurrentSession();
      return adaptCurrentSession(raw);
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useAdminTasks(params: {
  currentUserId?: string;
  selectedPersonId?: string;
  enabled?: boolean;
  page: number;
  pageSize: number;
}) {
  const { currentUserId, selectedPersonId, enabled = true, page, pageSize } = params;

  return useQuery<AdminPaginatedResult<TaskListItem>, Error>({
    queryKey: [...adminKeys.tasks(), currentUserId ?? 'anon', selectedPersonId || 'all-users', page, pageSize],
    queryFn: async () => {
      const raw = await api.fetchAdminTasks({ page, pageSize, userId: selectedPersonId });
      return {
        items: adaptTaskList(raw.items, currentUserId),
        total: raw.total,
      };
    },
    enabled,
  });
}

export function useAdminProjects(params: {
  selectedPersonId?: string;
  enabled?: boolean;
  page: number;
  pageSize: number;
}) {
  const { selectedPersonId, enabled = true, page, pageSize } = params;

  return useQuery<AdminPaginatedResult<ProjectListItem>, Error>({
    queryKey: [...adminKeys.projects(), selectedPersonId || 'all-users', page, pageSize],
    queryFn: async () => {
      const raw = await api.fetchAdminProjects({ page, pageSize, userId: selectedPersonId });
      return {
        items: adaptProjectList(raw.items),
        total: raw.total,
      };
    },
    enabled,
  });
}

export function useAdminGroups(params: {
  selectedPersonId?: string;
  enabled?: boolean;
  page: number;
  pageSize: number;
}) {
  const { selectedPersonId, enabled = true, page, pageSize } = params;

  return useQuery<AdminPaginatedResult<GroupListItem>, Error>({
    queryKey: [...adminKeys.groups(), selectedPersonId || 'all-users', page, pageSize],
    queryFn: async () => {
      const raw = await api.fetchAdminGroups({ page, pageSize, userId: selectedPersonId });
      return {
        items: adaptGroupList(raw.items),
        total: raw.total,
      };
    },
    enabled,
  });
}

// Hook: Buscar todos os usuários (admin only)
export function useAdminUsers(enabled: boolean = true) {
  return useQuery<UserListItem[], Error>({
    queryKey: adminKeys.users(),
    queryFn: async () => {
      const raw = await api.fetchUsers();
      return adaptUserList(raw);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook: Buscar usuário por ID (admin only)
export function useAdminUser(userId?: string, enabled: boolean = true) {
  return useQuery<User, Error>({
    queryKey: adminKeys.user(userId || ''),
    queryFn: async () => {
      const raw = await api.fetchUser(userId || '');
      return adaptUser(raw);
    },
    enabled: enabled && Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminEditTask() {
  const queryClient = useQueryClient();

  return useMutation<{ ok: true }, Error, { taskId: string; status: TaskStatus; nome: string }>({
    mutationFn: async ({ taskId, status, nome }) => {
      return api.updateTaskAsAdmin(taskId, { status, nome });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useAdminEditProject() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { projectId: string; status: ProjectStatus; nome: string }>({
    mutationFn: async ({ projectId, status, nome }) => {
      return api.updateProjectAsAdmin(projectId, { status, nome });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useAdminEditGroup() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { groupId: string; status: GroupStatus; nome: string }>({
    mutationFn: async ({ groupId, status, nome }) => {
      return api.updateGroupAsAdmin(groupId, { status, nome });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// Mutations de usuário removidas - endpoints não existem no backend
// Para criar/editar/deletar usuários, usar endpoints diretos ou implementar no backend
