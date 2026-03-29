// Queries e Mutations do domínio de Projetos
// Integração com TanStack Query para cache e sincronização

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { 
  adaptProjectList, 
  adaptProject, 
  adaptHoursSummary 
} from './adapters';
import type { 
  ProjectListItem, 
  Project, 
  ProjectHoursSummary,
  CreateProjectPayload,
  UpdateProjectPayload 
} from './types';

// Query keys centralizadas
export const projectKeys = {
  all: ['projects'] as const,
  list: (params?: string) => [...projectKeys.all, 'list', params] as const,
  detail: (projectId: string) => [...projectKeys.all, 'detail', projectId] as const,
  hours: (projectId: string) => [...projectKeys.all, 'hours', projectId] as const,
};

// Hook: Buscar todos os projetos
export function useProjects(params?: URLSearchParams) {
  return useQuery<ProjectListItem[], Error>({
    queryKey: projectKeys.list(params?.toString()),
    queryFn: async () => {
      const raw = await api.fetchProjects(params);
      return adaptProjectList(raw);
    },
  });
}

// Hook: Buscar projeto por ID
export function useProject(projectId: string) {
  return useQuery<Project, Error>({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => {
      const raw = await api.fetchProject(projectId);
      return adaptProject(raw);
    },
    enabled: Boolean(projectId),
  });
}

// Hook: Buscar horas por usuário do projeto
export function useProjectHours(projectId: string) {
  return useQuery<ProjectHoursSummary[], Error>({
    queryKey: projectKeys.hours(projectId),
    queryFn: async () => {
      const raw = await api.fetchProjectHours(projectId);
      return raw.map(adaptHoursSummary);
    },
    enabled: Boolean(projectId),
  });
}

// Mutation: Criar projeto
export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation<Project, Error, CreateProjectPayload>({
    mutationFn: async (payload) => {
      const raw = await api.createProject(payload);
      return adaptProject(raw);
    },
    onSuccess: () => {
      // Invalidar lista de projetos
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

// Mutation: Atualizar projeto
export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation<Project, Error, { projectId: string; payload: UpdateProjectPayload }>({
    mutationFn: async ({ projectId, payload }) => {
      const raw = await api.updateProject(projectId, payload);
      return adaptProject(raw);
    },
    onSuccess: (data, variables) => {
      // Atualizar cache do projeto específico
      queryClient.setQueryData(projectKeys.detail(variables.projectId), data);
      
      // Invalidar lista de projetos
      queryClient.invalidateQueries({ queryKey: projectKeys.list() });
    },
  });
}

// Mutation: Deletar projeto
export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (projectId) => {
      await api.deleteProject(projectId);
    },
    onSuccess: (_, projectId) => {
      // Remover do cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      
      // Invalidar lista de projetos
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

// Mutation: Sair de projeto compartilhado
export function useLeaveSharedProject() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (projectId) => {
      await api.leaveSharedProject(projectId);
    },
    onSuccess: (_, projectId) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
