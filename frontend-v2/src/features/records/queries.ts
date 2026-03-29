// Queries e Mutations do domínio de Registros
// Integração com TanStack Query para cache e sincronização

import { useMemo } from 'react';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { 
  adaptRecordList, 
  adaptRecord,
  sortRecords 
} from './adapters';
import type { 
  RecordListItem, 
  Record,
  CreateRecordPayload,
  UpdateRecordPayload,
  ConvertRecordToTaskPayload 
} from './types';
import { taskKeys } from '../tasks/queries';

// Query keys centralizadas
export const recordKeys = {
  all: ['records'] as const,
  projectRecords: (projectId: string) => [...recordKeys.all, 'project', projectId] as const,
  detail: (recordId: string) => [...recordKeys.all, 'detail', recordId] as const,
};

// Hook: Buscar registros de um projeto
export function useProjectRecords(projectId: string) {
  return useQuery<RecordListItem[], Error>({
    queryKey: recordKeys.projectRecords(projectId),
    queryFn: async () => {
      const raw = await api.fetchProjectRecords(projectId);
      const records = adaptRecordList(raw);
      return sortRecords(records);
    },
    enabled: Boolean(projectId),
  });
}

// Hook: Buscar registros agregados de múltiplos projetos (contexto de Grupo)
export function useGroupRecords(projectIds: string[]) {
  const recordQueries = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: recordKeys.projectRecords(projectId),
      queryFn: async () => {
        const raw = await api.fetchProjectRecords(projectId);
        return sortRecords(adaptRecordList(raw));
      },
      enabled: Boolean(projectId),
    })),
  });

  const records = useMemo(
    () => sortRecords(recordQueries.flatMap((query) => query.data ?? [])),
    [recordQueries],
  );

  const error = recordQueries.find((query) => query.error)?.error ?? null;
  const isLoading = recordQueries.some((query) => query.isLoading || query.isFetching);

  return {
    records,
    isLoading,
    error,
  };
}

// Hook: Buscar registro por ID
export function useRecord(recordId: string) {
  return useQuery<Record, Error>({
    queryKey: recordKeys.detail(recordId),
    queryFn: async () => {
      const raw = await api.fetchRecord(recordId);
      return adaptRecord(raw);
    },
    enabled: Boolean(recordId),
  });
}

// Mutation: Criar registro
export function useCreateRecord() {
  const queryClient = useQueryClient();
  
  return useMutation<Record, Error, CreateRecordPayload>({
    mutationFn: async (payload) => {
      const raw = await api.createRecord(payload);
      return adaptRecord(raw);
    },
    onSuccess: (_, variables) => {
      if (variables.projetoId) {
        queryClient.invalidateQueries({ queryKey: recordKeys.projectRecords(variables.projetoId) });
      }
    },
  });
}

// Mutation: Atualizar registro
export function useUpdateRecord() {
  const queryClient = useQueryClient();
  
  return useMutation<Record, Error, { recordId: string; payload: UpdateRecordPayload; projectId: string }>({
    mutationFn: async ({ recordId, payload }) => {
      const raw = await api.updateRecord(recordId, payload);
      return adaptRecord(raw);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(recordKeys.detail(variables.recordId), data);
      queryClient.invalidateQueries({ queryKey: recordKeys.projectRecords(variables.projectId) });
    },
  });
}

// Mutation: Deletar registro
export function useDeleteRecord() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, { recordId: string; projectId: string }>({
    mutationFn: async ({ recordId }) => {
      await api.deleteRecord(recordId);
    },
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: recordKeys.detail(variables.recordId) });
      queryClient.invalidateQueries({ queryKey: recordKeys.projectRecords(variables.projectId) });
    },
  });
}

// Mutation: Concluir pendência
export function useCompleteRecord() {
  const queryClient = useQueryClient();
  
  return useMutation<Record, Error, { recordId: string; projectId: string }>({
    mutationFn: async ({ recordId }) => {
      const raw = await api.completeRecord(recordId);
      return adaptRecord(raw);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(recordKeys.detail(variables.recordId), data);
      queryClient.invalidateQueries({ queryKey: recordKeys.projectRecords(variables.projectId) });
    },
  });
}

// Mutation: Reabrir pendência
export function useReopenRecord() {
  const queryClient = useQueryClient();
  
  return useMutation<Record, Error, { recordId: string; projectId: string }>({
    mutationFn: async ({ recordId }) => {
      const raw = await api.reopenRecord(recordId);
      return adaptRecord(raw);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(recordKeys.detail(variables.recordId), data);
      queryClient.invalidateQueries({ queryKey: recordKeys.projectRecords(variables.projectId) });
    },
  });
}

// Mutation: Converter registro em tarefa
export function useConvertRecordToTask() {
  const queryClient = useQueryClient();
  
  return useMutation<{ id: string; nome: string }, Error, ConvertRecordToTaskPayload>({
    mutationFn: async (payload) => {
      const raw = await api.convertRecordToTask(payload);
      return {
        id: String(raw.id),
        nome: raw.nome || '',
      };
    },
    onSuccess: (_, variables) => {
      if (variables.projetoId) {
        queryClient.invalidateQueries({ queryKey: recordKeys.projectRecords(variables.projetoId) });
        queryClient.invalidateQueries({ queryKey: taskKeys.projectTasks(variables.projetoId) });
      }
    },
  });
}
