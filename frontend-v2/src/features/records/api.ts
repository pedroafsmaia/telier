// API do domínio de Registros
// Chamadas HTTP para o backend

import http from '../../lib/http';
import type { CreateRecordPayload, UpdateRecordPayload, ConvertRecordToTaskPayload } from './types';
import { mapTypeToBackend, mapStatusToBackend } from './adapters';

// Tipos de resposta do backend (raw)
interface RawRecord {
  id: number | string;
  tipo?: string;
  conteudo?: string;
  texto?: string;
  status?: string;
  projeto_id?: number | string;
  projeto_nome?: string;
  grupo_id?: number | string;
  grupo_nome?: string;
  autor_id?: number | string;
  autor_nome?: string;
  usuario_id?: number | string;
  usuario_nome?: string;
  criado_em?: string;
  atualizado_em?: string;
}

interface RawTask {
  id: number | string;
  nome?: string;
  projeto_id?: number | string;
}

// Buscar registros de um projeto
export async function fetchProjectRecords(projectId: string): Promise<RawRecord[]> {
  return http.get<RawRecord[]>(`/projetos/${projectId}/decisoes`);
}

// Buscar registro por ID
export async function fetchRecord(recordId: string): Promise<RawRecord> {
  return http.get<RawRecord>(`/decisoes/${recordId}`);
}

// Criar registro
export async function createRecord(payload: CreateRecordPayload): Promise<RawRecord> {
  if (payload.projetoId) {
    const body = {
      tipo: mapTypeToBackend(payload.tipo),
      conteudo: payload.conteudo,
    };
    return http.post<RawRecord>(`/projetos/${payload.projetoId}/decisoes`, body);
  }
  throw new Error('Registro deve estar associado a um projeto');
}

// Atualizar registro
export async function updateRecord(recordId: string, payload: UpdateRecordPayload): Promise<RawRecord> {
  const body: Record<string, unknown> = {};
  
  if (payload.conteudo !== undefined) body.conteudo = payload.conteudo;
  if (payload.status !== undefined) body.status = mapStatusToBackend(payload.status);
  
  return http.put<RawRecord>(`/decisoes/${recordId}`, body);
}

// Deletar registro
export async function deleteRecord(recordId: string): Promise<void> {
  return http.delete<void>(`/decisoes/${recordId}`);
}

// Concluir pendência
export async function completeRecord(recordId: string): Promise<RawRecord> {
  return http.put<RawRecord>(`/decisoes/${recordId}`, { status: 'Concluída' });
}

// Reabrir pendência
export async function reopenRecord(recordId: string): Promise<RawRecord> {
  return http.put<RawRecord>(`/decisoes/${recordId}`, { status: 'Aberta' });
}

// Converter registro em tarefa
export async function convertRecordToTask(payload: ConvertRecordToTaskPayload): Promise<RawTask> {
  if (!payload.projetoId) {
    throw new Error('Registro deve estar associado a um projeto para converter em tarefa');
  }
  return http.post<RawTask>(`/decisoes/${payload.recordId}/converter-tarefa`, {
    projeto_id: payload.projetoId,
    nome: payload.nome,
  });
}
