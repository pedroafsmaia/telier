// API do domínio de Grupos
// Chamadas HTTP para o backend

import http from '../../lib/http';
import type { CreateGroupPayload, UpdateGroupPayload } from './types';
import { mapStatusToBackend } from './adapters';

// Tipos de resposta do backend (raw)
interface RawGroup {
  id: number | string;
  nome?: string;
  descricao?: string;
  status?: string;
  ordem?: number;
  dono_id?: number | string;
  dono_nome?: string;
  dono_email?: string;
  total_projetos?: number;
  projetos_atrasados?: number;
  area_total_m2?: number;
  total_horas?: number;
  pode_gerenciar?: boolean | number;
  criado_em?: string;
  atualizado_em?: string;
}

interface RawGroupShare {
  usuario_id: number | string;
  usuario_nome?: string;
  usuario_email?: string;
  pode_gerenciar?: boolean | number;
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
}

// Buscar todos os grupos
export async function fetchGroups(): Promise<RawGroup[]> {
  return http.get<RawGroup[]>('/grupos');
}

// Buscar grupo por ID
export async function fetchGroup(groupId: string): Promise<RawGroup> {
  return http.get<RawGroup>(`/grupos/${groupId}`);
}

// Criar grupo
export async function createGroup(payload: CreateGroupPayload): Promise<RawGroup> {
  const body = {
    nome: payload.nome,
    descricao: payload.descricao || null,
    status: payload.status ? mapStatusToBackend(payload.status) : 'Ativo',
  };
  
  return http.post<RawGroup>('/grupos', body);
}

// Atualizar grupo
export async function updateGroup(groupId: string, payload: UpdateGroupPayload): Promise<RawGroup> {
  const body: Record<string, unknown> = {};
  
  if (payload.nome !== undefined) body.nome = payload.nome;
  if (payload.descricao !== undefined) body.descricao = payload.descricao || null;
  if (payload.status !== undefined) body.status = mapStatusToBackend(payload.status);
  if (payload.ordem !== undefined) body.ordem = payload.ordem;
  
  return http.put<RawGroup>(`/grupos/${groupId}`, body);
}

// Deletar grupo
export async function deleteGroup(groupId: string): Promise<void> {
  return http.delete<void>(`/grupos/${groupId}`);
}

// Buscar compartilhamentos do grupo
export async function fetchGroupShares(groupId: string): Promise<RawGroupShare[]> {
  return http.get<RawGroupShare[]>(`/grupos/${groupId}/permissoes`);
}

// Compartilhar grupo
export async function shareGroup(groupId: string, email: string, podeGerenciar: boolean): Promise<void> {
  return http.post<void>(`/grupos/${groupId}/permissoes`, {
    email,
    pode_gerenciar: podeGerenciar,
  });
}

// Remover compartilhamento
export async function removeGroupShare(groupId: string, userId: string): Promise<void> {
  return http.delete<void>(`/grupos/${groupId}/permissoes/${userId}`);
}

// Sair de grupo
export async function leaveGroup(groupId: string): Promise<void> {
  return http.delete<void>(`/grupos/${groupId}/sair`);
}

// Buscar sessões ativas do grupo (ao vivo)
export async function fetchGroupActiveSessions(): Promise<RawActiveSession[]> {
  return http.get<RawActiveSession[]>('/tempo/colegas-ativos');
}

// Buscar sessões ativas de um projeto específico
export async function fetchProjectActiveSessions(): Promise<RawActiveSession[]> {
  return http.get<RawActiveSession[]>('/tempo/colegas-ativos');
}
