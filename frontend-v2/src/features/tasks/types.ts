// Tipos internos do domínio de Tarefas
// Nomenclatura normalizada para a nova UI do Telier

import type { TaskStatus, Priority, Ease } from '../../lib/enums';

// Pessoa vinculada a uma tarefa
export interface TaskPerson {
  id: string;
  nome: string;
  email?: string;
}

// Tarefa normalizada para a nova UI
export interface Task {
  id: string;
  nome: string;
  descricao?: string;
  observacaoEspera?: string;
  status: TaskStatus;
  prioridade: Priority;
  facilidade: Ease; // Normalizado de "complexidade" do backend
  prazo?: string; // ISO date string
  foco: boolean;
  
  // Separação clara entre criador e responsáveis
  criadoPor: TaskPerson;
  responsaveis: TaskPerson[];
  
  // Contexto
  projetoId: string;
  projetoNome: string;
  grupoId?: string;
  grupoNome?: string;
  
  // Metadados de tempo
  sessaoAtivaId?: string;
  tempoTotalHoras?: number;
  
  // Timestamps
  criadoEm: string;
  atualizadoEm?: string;
}

// Tarefa resumida para listas
export interface TaskListItem {
  id: string;
  nome: string;
  descricao?: string;
  observacaoEspera?: string;
  status: TaskStatus;
  prioridade: Priority;
  facilidade: Ease;
  prazo?: string;
  foco: boolean;
  projetoId: string;
  projetoNome: string;
  grupoNome?: string;
  criadoPor?: TaskPerson;
  responsaveis: TaskPerson[];
  sessaoAtivaId?: string;
  compartilhada: boolean;
  tempoTotalHoras?: number;
  criadoEm: string;
  atualizadoEm?: string;
}

// Payload para criar tarefa
export interface CreateTaskPayload {
  nome: string;
  descricao?: string;
  observacaoEspera?: string;
  status?: TaskStatus;
  prioridade?: Priority;
  facilidade?: Ease;
  prazo?: string;
  projetoId: string;
  responsaveisIds?: string[];
}

// Payload para atualizar tarefa
export interface UpdateTaskPayload {
  nome?: string;
  descricao?: string;
  observacaoEspera?: string;
  status?: TaskStatus;
  prioridade?: Priority;
  facilidade?: Ease;
  prazo?: string;
  foco?: boolean;
  projetoId?: string;
  responsaveisIds?: string[];
}

// Sessão de tempo ativa
export interface ActiveTimeSession {
  id: string;
  tarefaId: string;
  tarefaNome: string;
  projetoId: string;
  projetoNome: string;
  usuarioId: string;
  usuarioNome: string;
  inicio: string;
  fim?: string;
  observacao?: string;
  horasLiquidas?: number;
}

// Resumo de tempo do dia
export interface DailyTimeSummary {
  horasHoje: number;
  sessoesHoje: number;
}

export interface TaskTimeInterval {
  id: string;
  tipo: string;
  inicio: string;
  fim?: string;
}

export interface TaskTimeEntry {
  id: string;
  tarefaId: string;
  usuarioId: string;
  usuarioNome: string;
  inicio: string;
  fim?: string;
  observacao?: string;
  horasLiquidas: number;
  intervalos: TaskTimeInterval[];
}

export interface TaskTimeSummaryItem {
  usuarioId: string;
  usuarioNome: string;
  horasLiquidas: number;
}

export interface UserOption {
  id: string;
  nome: string;
  login?: string;
}
