// API do domínio de Tarefas
// Chamadas HTTP para o backend

import http from '../../lib/http';
import type { CreateTaskPayload, UpdateTaskPayload } from './types';
import { mapStatusToBackend, mapPriorityToBackend, mapEaseToComplexity } from './adapters';

// Tipos de resposta do backend (raw)
interface RawTask {
  id: number | string;
  nome?: string;
  tarefa_nome?: string;
  descricao?: string;
  observacao_espera?: string;
  status?: string;
  prioridade?: string;
  dificuldade?: string;
  complexidade?: string;
  data?: string;
  foco?: boolean | number;
  dono_id?: number | string;
  dono_nome?: string;
  dono_email?: string;
  colaboradores_ids?: (number | string)[] | string;
  colaboradores_nomes?: string[] | string;
  projeto_id?: number | string;
  projeto_nome?: string;
  grupo_id?: number | string;
  grupo_nome?: string;
  sessao_ativa_id?: number | string;
  total_horas?: number;
  criado_em?: string;
  atualizado_em?: string;
}

interface RawActiveSession {
  id: number | string;
  tarefa_id: number | string;
  tarefa_nome?: string;
  projeto_id: number | string;
  projeto_nome?: string;
  usuario_id: number | string;
  usuario_nome?: string;
  inicio: string;
  fim?: string;
  observacao?: string;
  horas_liquidas?: number;
}

interface RawDailySummary {
  horas_hoje?: number;
  sessoes_hoje?: number;
}

interface RawTaskTimeEntry {
  id: number | string;
  tarefa_id: number | string;
  usuario_id: number | string;
  usuario_nome?: string;
  inicio: string;
  fim?: string;
  observacao?: string;
  horas_liquidas?: number;
  intervalos?: Array<{
    id: number | string;
    tipo?: string;
    inicio: string;
    fim?: string;
  }>;
}

interface RawTaskTimeSummaryItem {
  usuario_id: number | string;
  usuario_nome?: string;
  horas_liquidas?: number;
}

interface RawUserOption {
  id: number | string;
  nome?: string;
  usuario_login?: string;
}

// Buscar tarefas do usuário atual
export async function fetchMyTasks(): Promise<RawTask[]> {
  return http.get<RawTask[]>('/tarefas/minhas');
}

// Buscar tarefas para operação do dia
export async function fetchTodayOperationTasks(): Promise<RawTask[]> {
  return http.get<RawTask[]>('/tarefas/operacao-hoje');
}

// Buscar tarefas de um projeto
export async function fetchProjectTasks(projectId: string): Promise<RawTask[]> {
  return http.get<RawTask[]>(`/projetos/${projectId}/tarefas`);
}

// NOTA: GET /tarefas/{id} não existe no backend
// Para obter detalhe, usar lista de tarefas do projeto e filtrar por ID

// Criar tarefa (dentro de projeto)
export async function createTask(projectId: string, payload: CreateTaskPayload): Promise<{ id: string }> {
  const body = {
    nome: payload.nome,
    descricao: payload.descricao,
    observacao_espera: payload.observacaoEspera,
    status: payload.status ? mapStatusToBackend(payload.status) : 'A fazer',
    prioridade: payload.prioridade ? mapPriorityToBackend(payload.prioridade) : 'Média',
    complexidade: payload.facilidade ? mapEaseToComplexity(payload.facilidade) : 'Moderada',
    data: payload.prazo || null,
    colaboradores_ids: payload.responsaveisIds || [],
  };
  
  return http.post<{ id: string }>(`/projetos/${projectId}/tarefas`, body);
}

// Atualizar tarefa
export async function updateTask(taskId: string, payload: UpdateTaskPayload): Promise<{ ok: true }> {
  const body: Record<string, unknown> = {};
  
  if (payload.nome !== undefined) body.nome = payload.nome;
  if (payload.descricao !== undefined) body.descricao = payload.descricao;
  if (payload.observacaoEspera !== undefined) body.observacao_espera = payload.observacaoEspera;
  if (payload.status !== undefined) body.status = mapStatusToBackend(payload.status);
  if (payload.prioridade !== undefined) body.prioridade = mapPriorityToBackend(payload.prioridade);
  if (payload.facilidade !== undefined) body.complexidade = mapEaseToComplexity(payload.facilidade);
  if (payload.prazo !== undefined) body.data = payload.prazo;
  if (payload.projetoId !== undefined) body.projeto_id = payload.projetoId;
  
  return http.put<{ ok: true }>(`/tarefas/${taskId}`, body);
}

// Deletar tarefa
export async function deleteTask(taskId: string): Promise<void> {
  return http.delete<void>(`/tarefas/${taskId}`);
}

// Concluir tarefa (PATCH com status)
export async function completeTask(taskId: string): Promise<{ ok: true }> {
  return http.patch<{ ok: true }>(`/tarefas/${taskId}`, {
    status: 'Concluída',
  });
}

// Definir foco na tarefa
export async function setTaskFocus(taskId: string): Promise<{ ok: true }> {
  return http.put<{ ok: true }>(`/tarefas/${taskId}/foco`, {});
}

// Remover foco da tarefa
export async function removeTaskFocus(taskId: string): Promise<{ ok: true }> {
  return http.delete<{ ok: true }>(`/tarefas/${taskId}/foco`);
}

// Sessões de tempo ativas
export async function fetchActiveSessions(): Promise<RawActiveSession[]> {
  return http.get<RawActiveSession[]>('/tempo/ativas');
}

// Resumo de tempo do dia
export async function fetchDailySummary(): Promise<RawDailySummary> {
  return http.get<RawDailySummary>('/tempo/resumo-hoje');
}

// Iniciar cronômetro
export async function startTimer(taskId: string): Promise<RawActiveSession> {
  return http.post<RawActiveSession>(`/tarefas/${taskId}/tempo`, {});
}

// Parar cronômetro
export async function stopTimer(
  sessionId: string,
  options?: { observacao?: string; fim?: string },
): Promise<void> {
  return http.put<void>(`/tempo/${sessionId}/parar`, {
    observacao: options?.observacao || null,
    fim: options?.fim || null,
  });
}

// Sessões recentes
export async function fetchRecentSessions(limit: number = 6): Promise<RawActiveSession[]> {
  return http.get<RawActiveSession[]>(`/tempo/sessoes-recentes?limit=${limit}`);
}

export async function fetchTaskTimeEntries(taskId: string): Promise<RawTaskTimeEntry[]> {
  return http.get<RawTaskTimeEntry[]>(`/tarefas/${taskId}/tempo`);
}

export async function fetchTaskTimeSummary(taskId: string): Promise<RawTaskTimeSummaryItem[]> {
  return http.get<RawTaskTimeSummaryItem[]>(`/tarefas/${taskId}/tempo/resumo`);
}

export async function fetchTaskCollaborators(taskId: string): Promise<RawUserOption[]> {
  return http.get<RawUserOption[]>(`/tarefas/${taskId}/colaboradores`);
}

export async function addTaskCollaborator(taskId: string, userId: string): Promise<{ ok: true }> {
  return http.post<{ ok: true }>(`/tarefas/${taskId}/colaboradores`, { usuario_id: userId });
}

export async function removeTaskCollaborator(taskId: string, userId: string): Promise<{ ok: true }> {
  return http.delete<{ ok: true }>(`/tarefas/${taskId}/colaboradores/${userId}`);
}

export async function fetchAssignableUsers(): Promise<RawUserOption[]> {
  return http.get<RawUserOption[]>('/usuarios');
}
