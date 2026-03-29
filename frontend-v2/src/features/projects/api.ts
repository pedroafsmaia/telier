// API do domínio de Projetos
// Chamadas HTTP para o backend

import http from '../../lib/http';
import type { CreateProjectPayload, UpdateProjectPayload } from './types';
import { mapStatusToBackend, mapPhaseToBackend, mapPriorityToBackend } from './adapters';

// Tipos de resposta do backend (raw)
interface RawProject {
  id: number | string;
  nome?: string;
  descricao?: string;
  status?: string;
  fase?: string;
  prioridade?: string;
  prazo?: string;
  area_m2?: number;
  dono_id?: number | string;
  dono_nome?: string;
  dono_email?: string;
  grupo_id?: number | string;
  grupo_nome?: string;
  grupo_status?: string;
  total_tarefas?: number;
  tarefas_concluidas?: number;
  total_horas?: number;
  compartilhado_comigo?: number | boolean;
  origem_compartilhamento?: string;
  criado_em?: string;
  atualizado_em?: string;
}

interface RawHoursSummary {
  usuario_id: number | string;
  usuario_nome?: string;
  horas?: number;
}

// Buscar todos os projetos
export async function fetchProjects(params?: URLSearchParams): Promise<RawProject[]> {
  const query = params ? `?${params.toString()}` : '';
  return http.get<RawProject[]>(`/projetos${query}`);
}

// Buscar projeto por ID
export async function fetchProject(projectId: string): Promise<RawProject> {
  return http.get<RawProject>(`/projetos/${projectId}`);
}

// Criar projeto
export async function createProject(payload: CreateProjectPayload): Promise<RawProject> {
  const body = {
    nome: payload.nome,
    fase: payload.fase ? mapPhaseToBackend(payload.fase) : 'Estudo preliminar',
    status: payload.status ? mapStatusToBackend(payload.status) : 'A fazer',
    prioridade: payload.prioridade ? mapPriorityToBackend(payload.prioridade) : 'Média',
    prazo: payload.prazo || null,
    area_m2: payload.areaM2 || null,
    grupo_id: payload.grupoId || null,
  };
  
  return http.post<RawProject>('/projetos', body);
}

// Atualizar projeto
export async function updateProject(projectId: string, payload: UpdateProjectPayload): Promise<RawProject> {
  const body: Record<string, unknown> = {};
  
  if (payload.nome !== undefined) body.nome = payload.nome;
  if (payload.fase !== undefined) body.fase = mapPhaseToBackend(payload.fase);
  if (payload.status !== undefined) body.status = mapStatusToBackend(payload.status);
  if (payload.prioridade !== undefined) body.prioridade = mapPriorityToBackend(payload.prioridade);
  if (payload.prazo !== undefined) body.prazo = payload.prazo || null;
  if (payload.areaM2 !== undefined) body.area_m2 = payload.areaM2 || null;
  if (payload.grupoId !== undefined) body.grupo_id = payload.grupoId || null;
  
  return http.put<RawProject>(`/projetos/${projectId}`, body);
}

// Deletar projeto
export async function deleteProject(projectId: string): Promise<void> {
  return http.delete<void>(`/projetos/${projectId}`);
}

// Buscar horas por usuário do projeto
export async function fetchProjectHours(projectId: string): Promise<RawHoursSummary[]> {
  return http.get<RawHoursSummary[]>(`/projetos/${projectId}/horas-por-usuario`);
}

// Sair de projeto compartilhado
export async function leaveSharedProject(projectId: string): Promise<void> {
  return http.delete<void>(`/projetos/${projectId}/sair`);
}
