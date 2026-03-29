// Tipos internos do domínio de Projetos
// Nomenclatura normalizada para a nova UI do Telier

import type { Priority, ProjectStatus, ProjectPhase } from '../../lib/enums';

// Pessoa vinculada ao projeto
export interface ProjectPerson {
  id: string;
  nome: string;
  email?: string;
}

// Projeto normalizado para a nova UI
export interface Project {
  id: string;
  nome: string;
  descricao?: string;
  status: ProjectStatus;
  fase: ProjectPhase;
  prioridade: Priority;
  prazo?: string;
  areaM2?: number;
  
  // Dono do projeto
  dono: ProjectPerson;
  
  // Contexto de grupo
  grupoId?: string;
  grupoNome?: string;
  grupoStatus?: string;
  
  // Métricas
  totalTarefas: number;
  tarefasConcluidas: number;
  totalHoras?: number;
  
  // Compartilhamento
  compartilhadoComigo: boolean;
  origemCompartilhamento?: 'direto' | 'grupo';
  
  // Timestamps
  criadoEm: string;
  atualizadoEm?: string;
}

// Projeto resumido para listas
export interface ProjectListItem {
  id: string;
  nome: string;
  status: ProjectStatus;
  fase: ProjectPhase;
  prioridade: Priority;
  prazo?: string;
  grupoId?: string;
  grupoNome?: string;
  totalTarefas: number;
  tarefasConcluidas: number;
  compartilhadoComigo: boolean;
}

// Payload para criar projeto
export interface CreateProjectPayload {
  nome: string;
  fase?: ProjectPhase;
  status?: ProjectStatus;
  prioridade?: Priority;
  prazo?: string;
  areaM2?: number;
  grupoId?: string;
}

// Payload para atualizar projeto
export interface UpdateProjectPayload {
  nome?: string;
  fase?: ProjectPhase;
  status?: ProjectStatus;
  prioridade?: Priority;
  prazo?: string;
  areaM2?: number;
  grupoId?: string;
}

// Resumo de horas por usuário
export interface ProjectHoursSummary {
  usuarioId: string;
  usuarioNome: string;
  horas: number;
}
