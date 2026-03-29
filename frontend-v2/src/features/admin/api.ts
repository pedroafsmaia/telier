// API do domínio de Administração
// Apenas endpoints reais do backend

import http from '../../lib/http';
import { updateTask } from '../tasks/api';
import { updateProject } from '../projects/api';
import { updateGroup } from '../groups/api';
import type { UpdateTaskPayload } from '../tasks/types';
import type { UpdateProjectPayload } from '../projects/types';
import type { UpdateGroupPayload } from '../groups/types';

// Tipos de resposta do backend (raw)
interface RawUser {
  id: number | string;
  nome?: string;
  login?: string;
  papel?: string;
  ativo?: boolean | number;
  criado_em?: string;
  ultimo_acesso?: string;
}

interface RawSession {
  id: number | string;
  nome?: string;
  usuario_login?: string;
  papel?: string;
  deve_trocar_senha?: number;
}

interface RawAdminTask {
  id: number | string;
  nome?: string;
  descricao?: string;
  observacao_espera?: string;
  status?: string;
  prioridade?: string;
  complexidade?: string;
  data?: string;
  foco?: boolean | number;
  projeto_id?: number | string;
  projeto_nome?: string;
  projeto_status?: string;
  grupo_id?: number | string;
  grupo_nome?: string;
  dono_id?: number | string;
  dono_nome?: string;
  dono_login?: string;
  criado_em?: string;
  atualizado_em?: string;
  colaboradores_ids?: (number | string)[] | string;
  colaboradores_nomes?: string[] | string;
  sessao_ativa_id?: number | string;
  total_horas?: number;
}

interface PaginationParams {
  page: number;
  pageSize: number;
  userId?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

function buildPaginationQuery(params: PaginationParams): string {
  const search = new URLSearchParams();
  search.set('page', String(params.page));
  search.set('page_size', String(params.pageSize));
  if (params.userId) {
    search.set('usuario_id', params.userId);
  }
  return search.toString();
}

interface RawAdminProject {
  id: number | string;
  nome?: string;
  fase?: string;
  status?: string;
  prioridade?: string;
  prazo?: string;
  grupo_id?: number | string;
  grupo_nome?: string;
  total_tarefas?: number;
  tarefas_concluidas?: number;
  total_horas?: number;
  horas_totais?: number;
}

interface RawAdminGroup {
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
}

// Buscar sessão atual (usuário logado)
export async function fetchCurrentSession(): Promise<RawSession> {
  return http.get<RawSession>('/auth/me');
}

// Buscar todos os usuários (admin only)
export async function fetchUsers(): Promise<RawUser[]> {
  return http.get<RawUser[]>('/admin/usuarios');
}

// Buscar usuário por ID (admin only)
export async function fetchUser(userId: string): Promise<RawUser> {
  return http.get<RawUser>(`/admin/usuarios/${userId}`);
}

export async function fetchAdminTasks(params: PaginationParams): Promise<PaginatedResult<RawAdminTask>> {
  const response = await http.getWithMeta<RawAdminTask[]>(`/admin/tarefas?${buildPaginationQuery(params)}`);
  return {
    items: response.data,
    total: Number(response.headers.get('X-Total-Count') || 0),
  };
}

export async function fetchAdminProjects(params: PaginationParams): Promise<PaginatedResult<RawAdminProject>> {
  const response = await http.getWithMeta<RawAdminProject[]>(`/admin/projetos?${buildPaginationQuery(params)}`);
  return {
    items: response.data,
    total: Number(response.headers.get('X-Total-Count') || 0),
  };
}

export async function fetchAdminGroups(params: PaginationParams): Promise<PaginatedResult<RawAdminGroup>> {
  const response = await http.getWithMeta<RawAdminGroup[]>(`/admin/grupos?${buildPaginationQuery(params)}`);
  return {
    items: response.data,
    total: Number(response.headers.get('X-Total-Count') || 0),
  };
}

// Criar usuário (admin only) - NÃO EXISTE NO BACKEND
// REMOVIDO: não expor API que não existe

// Atualizar usuário (admin only) - NÃO EXISTE NO BACKEND
// REMOVIDO: não expor API que não existe

// Deletar usuário (admin only) - NÃO EXISTE NO BACKEND
// REMOVIDO: não expor API que não existe

// Buscar estatísticas do sistema (admin only) - NÃO EXISTE NO BACKEND
// REMOVIDO: não expor API que não existe

// Edição administrativa mínima (Fase 9)
// Reaproveita contratos reais existentes dos domínios
export async function updateTaskAsAdmin(taskId: string, payload: UpdateTaskPayload): Promise<{ ok: true }> {
  return updateTask(taskId, payload);
}

export async function updateProjectAsAdmin(projectId: string, payload: UpdateProjectPayload) {
  return updateProject(projectId, payload);
}

export async function updateGroupAsAdmin(groupId: string, payload: UpdateGroupPayload) {
  return updateGroup(groupId, payload);
}
