// Queries e Mutations do domínio de Grupos
// Integração com TanStack Query para cache e sincronização

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { 
  adaptGroup, 
  adaptGroupList, 
  adaptGroupShare
} from './adapters';
import type { 
  Group, 
  GroupListItem, 
  GroupShare, 
  CreateGroupPayload, 
  UpdateGroupPayload 
} from './types';

// Query keys centralizadas
export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
  detail: (groupId: string) => [...groupKeys.all, 'detail', groupId] as const,
  shares: (groupId: string) => [...groupKeys.all, 'shares', groupId] as const,
  activeSessions: (groupId: string) => [...groupKeys.all, 'active-sessions', groupId] as const,
  projectActiveSessions: (projectId: string) => ['projects', 'active-sessions', projectId] as const,
};

// Hook: Buscar todos os grupos
export function useGroups() {
  return useQuery<GroupListItem[], Error>({
    queryKey: groupKeys.list(),
    queryFn: async () => {
      const raw = await api.fetchGroups();
      return adaptGroupList(raw);
    },
  });
}

// Hook: Buscar grupo por ID
export function useGroup(groupId: string) {
  return useQuery<Group, Error>({
    queryKey: groupKeys.detail(groupId),
    queryFn: async () => {
      const raw = await api.fetchGroup(groupId);
      return adaptGroup(raw);
    },
    enabled: Boolean(groupId),
  });
}

// Hook: Buscar compartilhamentos do grupo
export function useGroupShares(groupId: string) {
  return useQuery<GroupShare[], Error>({
    queryKey: groupKeys.shares(groupId),
    queryFn: async () => {
      const raw = await api.fetchGroupShares(groupId);
      return raw.map(adaptGroupShare);
    },
    enabled: Boolean(groupId),
  });
}

// Hooks de sessões ativas REMOVIDOS desta fase
// O backend não expõe endpoints por grupo/projeto
// /tempo/colegas-ativos é global, não contextual
// Será reintegrado quando existir endpoint real por grupo/projeto

// Mutation: Criar grupo
export function useCreateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation<Group, Error, CreateGroupPayload>({
    mutationFn: async (payload) => {
      const raw = await api.createGroup(payload);
      return adaptGroup(raw);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}

// Mutation: Atualizar grupo
export function useUpdateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation<Group, Error, { groupId: string; payload: UpdateGroupPayload }>({
    mutationFn: async ({ groupId, payload }) => {
      const raw = await api.updateGroup(groupId, payload);
      return adaptGroup(raw);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(groupKeys.detail(variables.groupId), data);
      queryClient.invalidateQueries({ queryKey: groupKeys.list() });
    },
  });
}

// Mutation: Deletar grupo
export function useDeleteGroup() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (groupId) => {
      await api.deleteGroup(groupId);
    },
    onSuccess: (_, groupId) => {
      queryClient.removeQueries({ queryKey: groupKeys.detail(groupId) });
      queryClient.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}

// Mutation: Compartilhar grupo
export function useShareGroup() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { groupId: string; email: string; podeGerenciar: boolean }>({
    mutationFn: async ({ groupId, email, podeGerenciar }) => {
      await api.shareGroup(groupId, email, podeGerenciar);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.shares(variables.groupId) });
    },
  });
}

// Mutation: Remover compartilhamento
export function useRemoveGroupShare() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { groupId: string; userId: string }>({
    mutationFn: async ({ groupId, userId }) => {
      await api.removeGroupShare(groupId, userId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.shares(variables.groupId) });
    },
  });
}
