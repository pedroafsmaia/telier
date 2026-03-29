// Adapters do domínio de Projetos
// Escondem confusões de nomenclatura do backend legado

import { Priority, ProjectStatus, ProjectPhase } from '../../lib/enums';
import type { Project, ProjectListItem, ProjectPerson, ProjectHoursSummary } from './types';

// Tipos do payload cru do backend (legado)
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

// Mapeia status do backend para enum interno
function mapStatus(raw?: string): ProjectStatus {
  const normalized = (raw || '').toLowerCase().trim();
  
  if (normalized === 'a fazer') return ProjectStatus.TODO;
  if (normalized === 'em andamento') return ProjectStatus.IN_PROGRESS;
  if (normalized === 'em revisão' || normalized === 'em revisao') return ProjectStatus.IN_REVIEW;
  if (normalized === 'pausado') return ProjectStatus.PAUSED;
  if (normalized === 'concluído' || normalized === 'concluido') return ProjectStatus.DONE;
  if (normalized === 'arquivado') return ProjectStatus.ARCHIVED;
  
  return ProjectStatus.TODO;
}

// Mapeia fase do backend para enum interno
function mapPhase(raw?: string): ProjectPhase {
  const normalized = (raw || '').toLowerCase().trim();
  
  if (normalized === 'estudo preliminar') return ProjectPhase.PRELIMINARY_STUDY;
  if (normalized === 'anteprojeto') return ProjectPhase.PRELIMINARY_PROJECT;
  if (normalized === 'projeto básico' || normalized === 'projeto basico') return ProjectPhase.BASIC_PROJECT;
  if (normalized === 'projeto executivo') return ProjectPhase.EXECUTIVE_PROJECT;
  if (normalized === 'em obra') return ProjectPhase.IN_CONSTRUCTION;
  
  return ProjectPhase.PRELIMINARY_STUDY;
}

// Mapeia prioridade do backend para enum interno
function mapPriority(raw?: string): Priority {
  const normalized = (raw || '').toLowerCase().trim();
  
  if (normalized === 'baixa') return Priority.LOW;
  if (normalized === 'média' || normalized === 'media') return Priority.MEDIUM;
  if (normalized === 'alta') return Priority.HIGH;
  if (normalized === 'urgente') return Priority.URGENT;
  
  return Priority.MEDIUM;
}

// Mapeia status da UI para backend
export function mapStatusToBackend(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.TODO:
      return 'A fazer';
    case ProjectStatus.IN_PROGRESS:
      return 'Em andamento';
    case ProjectStatus.IN_REVIEW:
      return 'Em revisão';
    case ProjectStatus.PAUSED:
      return 'Pausado';
    case ProjectStatus.DONE:
      return 'Concluído';
    case ProjectStatus.ARCHIVED:
      return 'Arquivado';
    default:
      return 'A fazer';
  }
}

// Mapeia fase da UI para backend
export function mapPhaseToBackend(phase: ProjectPhase): string {
  switch (phase) {
    case ProjectPhase.PRELIMINARY_STUDY:
      return 'Estudo preliminar';
    case ProjectPhase.PRELIMINARY_PROJECT:
      return 'Anteprojeto';
    case ProjectPhase.BASIC_PROJECT:
      return 'Projeto básico';
    case ProjectPhase.EXECUTIVE_PROJECT:
      return 'Projeto executivo';
    case ProjectPhase.IN_CONSTRUCTION:
      return 'Em obra';
    default:
      return 'Estudo preliminar';
  }
}

// Mapeia prioridade da UI para backend
export function mapPriorityToBackend(priority: Priority): string {
  switch (priority) {
    case Priority.LOW:
      return 'Baixa';
    case Priority.MEDIUM:
      return 'Média';
    case Priority.HIGH:
      return 'Alta';
    case Priority.URGENT:
      return 'Urgente';
    default:
      return 'Média';
  }
}

// Adapta projeto cru do backend para tipo interno
export function adaptProject(raw: RawProject): Project {
  const dono: ProjectPerson = {
    id: String(raw.dono_id || ''),
    nome: raw.dono_nome || 'Desconhecido',
    email: raw.dono_email,
  };

  return {
    id: String(raw.id),
    nome: raw.nome || 'Projeto sem nome',
    descricao: raw.descricao,
    status: mapStatus(raw.status),
    fase: mapPhase(raw.fase),
    prioridade: mapPriority(raw.prioridade),
    prazo: raw.prazo,
    areaM2: raw.area_m2,
    dono,
    grupoId: raw.grupo_id ? String(raw.grupo_id) : undefined,
    grupoNome: raw.grupo_nome,
    grupoStatus: raw.grupo_status,
    totalTarefas: raw.total_tarefas || 0,
    tarefasConcluidas: raw.tarefas_concluidas || 0,
    totalHoras: raw.total_horas,
    compartilhadoComigo: Boolean(raw.compartilhado_comigo),
    origemCompartilhamento: raw.origem_compartilhamento === 'grupo' ? 'grupo' : 
                            raw.origem_compartilhamento === 'direto' ? 'direto' : undefined,
    criadoEm: raw.criado_em || new Date().toISOString(),
    atualizadoEm: raw.atualizado_em,
  };
}

// Adapta projeto para item de lista (mais leve)
export function adaptProjectListItem(raw: RawProject): ProjectListItem {
  return {
    id: String(raw.id),
    nome: raw.nome || 'Projeto sem nome',
    status: mapStatus(raw.status),
    fase: mapPhase(raw.fase),
    prioridade: mapPriority(raw.prioridade),
    prazo: raw.prazo,
    grupoId: raw.grupo_id ? String(raw.grupo_id) : undefined,
    grupoNome: raw.grupo_nome,
    totalTarefas: raw.total_tarefas || 0,
    tarefasConcluidas: raw.tarefas_concluidas || 0,
    compartilhadoComigo: Boolean(raw.compartilhado_comigo),
  };
}

// Adapta lista de projetos
export function adaptProjectList(rawList: RawProject[]): ProjectListItem[] {
  return rawList.map(adaptProjectListItem);
}

// Adapta resumo de horas
export function adaptHoursSummary(raw: RawHoursSummary): ProjectHoursSummary {
  return {
    usuarioId: String(raw.usuario_id),
    usuarioNome: raw.usuario_nome || 'Usuário',
    horas: raw.horas || 0,
  };
}
