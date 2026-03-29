// Adapters do domínio de Tarefas
// Escondem confusões de nomenclatura do backend legado

import { TaskStatus, Priority, Ease } from '../../lib/enums';
import type { Task, TaskListItem, TaskPerson, ActiveTimeSession, DailyTimeSummary, TaskTimeEntry, TaskTimeInterval, TaskTimeSummaryItem, UserOption } from './types';

// Tipos do payload cru do backend (legado)
interface RawTask {
  id: number | string;
  nome?: string;
  tarefa_nome?: string;
  descricao?: string;
  observacao_espera?: string;
  status?: string;
  prioridade?: string;
  dificuldade?: string;
  complexidade?: string; // Backend usa "complexidade", UI usa "facilidade"
  data?: string; // Backend usa "data", UI usa "prazo"
  foco?: boolean | number;
  
  // Backend mistura dono e colaboradores
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

interface RawTaskTimeInterval {
  id: number | string;
  tipo?: string;
  inicio: string;
  fim?: string;
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
  intervalos?: RawTaskTimeInterval[];
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

function parseListField(raw?: (number | string)[] | string): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

// Mapeia status do backend para enum interno
function mapStatus(raw?: string): TaskStatus {
  const normalized = (raw || '').toLowerCase().trim();
  
  if (normalized === 'a fazer' || normalized === 'a-fazer') return TaskStatus.TODO;
  if (normalized === 'em andamento' || normalized === 'em-andamento') return TaskStatus.IN_PROGRESS;
  if (normalized === 'bloqueada' || normalized === 'em espera' || normalized === 'em-espera') return TaskStatus.WAITING;
  if (normalized === 'concluída' || normalized === 'concluida') return TaskStatus.DONE;
  
  return TaskStatus.TODO;
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

// Mapeia complexidade do backend para facilidade na UI
// IMPORTANTE: Backend usa "complexidade" (Simples, Moderada, Complexa)
// UI usa "facilidade" (muito-facil, facil, medio, dificil, muito-dificil)
function mapComplexityToEase(raw?: string): Ease {
  const normalized = (raw || '').toLowerCase().trim();
  
  // Backend: Simples -> UI: Fácil
  if (normalized === 'simples') return Ease.EASY;
  // Backend: Moderada -> UI: Médio
  if (normalized === 'moderada') return Ease.MEDIUM;
  // Backend: Complexa -> UI: Difícil
  if (normalized === 'complexa') return Ease.HARD;
  
  return Ease.MEDIUM;
}

// Mapeia facilidade da UI para complexidade do backend
export function mapEaseToComplexity(ease: Ease): string {
  switch (ease) {
    case Ease.VERY_EASY:
    case Ease.EASY:
      return 'Simples';
    case Ease.MEDIUM:
      return 'Moderada';
    case Ease.HARD:
    case Ease.VERY_HARD:
      return 'Complexa';
    default:
      return 'Moderada';
  }
}

// Mapeia status da UI para backend
export function mapStatusToBackend(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.TODO:
      return 'A fazer';
    case TaskStatus.IN_PROGRESS:
      return 'Em andamento';
    case TaskStatus.WAITING:
      return 'Bloqueada';
    case TaskStatus.DONE:
      return 'Concluída';
    default:
      return 'A fazer';
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

// Adapta tarefa crua do backend para tipo interno
export function adaptTask(raw: RawTask): Task {
  const criadoPor: TaskPerson = {
    id: String(raw.dono_id || ''),
    nome: raw.dono_nome || 'Desconhecido',
    email: raw.dono_email,
  };

  // Responsáveis = dono + colaboradores
  const responsaveis: TaskPerson[] = [criadoPor];
  
  const collaboratorIds = parseListField(raw.colaboradores_ids);
  const collaboratorNames = Array.isArray(raw.colaboradores_nomes)
    ? raw.colaboradores_nomes
    : (raw.colaboradores_nomes || '').split(',').map((item) => item.trim()).filter(Boolean);

  if (collaboratorIds.length > 0) {
    collaboratorIds.forEach((id, index) => {
      // Adiciona colaborador apenas se não for o dono
      if (String(id) !== String(raw.dono_id)) {
        responsaveis.push({
          id: String(id),
          nome: collaboratorNames[index] || 'Colaborador',
        });
      }
    });
  }

  return {
    id: String(raw.id),
    nome: raw.nome || raw.tarefa_nome || 'Tarefa sem nome',
    descricao: raw.descricao,
    observacaoEspera: raw.observacao_espera,
    status: mapStatus(raw.status),
    prioridade: mapPriority(raw.prioridade),
    facilidade: mapComplexityToEase(raw.complexidade || raw.dificuldade),
    prazo: raw.data,
    foco: Boolean(raw.foco),
    criadoPor,
    responsaveis,
    projetoId: String(raw.projeto_id || ''),
    projetoNome: raw.projeto_nome || '',
    grupoId: raw.grupo_id ? String(raw.grupo_id) : undefined,
    grupoNome: raw.grupo_nome,
    sessaoAtivaId: raw.sessao_ativa_id ? String(raw.sessao_ativa_id) : undefined,
    tempoTotalHoras: raw.total_horas,
    criadoEm: raw.criado_em || new Date().toISOString(),
    atualizadoEm: raw.atualizado_em,
  };
}

// Adapta tarefa para item de lista (mais leve)
export function adaptTaskListItem(raw: RawTask, currentUserId?: string): TaskListItem {
  const responsaveis: TaskPerson[] = [];
  
  if (raw.dono_id) {
    responsaveis.push({
      id: String(raw.dono_id),
      nome: raw.dono_nome || 'Desconhecido',
    });
  }
  
  const collaboratorIds = parseListField(raw.colaboradores_ids);
  const collaboratorNames = Array.isArray(raw.colaboradores_nomes)
    ? raw.colaboradores_nomes
    : (raw.colaboradores_nomes || '').split(',').map((item) => item.trim()).filter(Boolean);

  if (collaboratorIds.length > 0) {
    collaboratorIds.forEach((id, index) => {
      if (String(id) !== String(raw.dono_id)) {
        responsaveis.push({
          id: String(id),
          nome: collaboratorNames[index] || 'Colaborador',
        });
      }
    });
  }

  // Indicador discreto deve aparecer sempre que exista compartilhamento real,
  // inclusive para o dono quando a tarefa foi compartilhada com outras pessoas.
  const isOwner = currentUserId && String(raw.dono_id) === currentUserId;
  const isCollaborator = currentUserId && collaboratorIds.includes(currentUserId);
  const compartilhada = collaboratorIds.length > 0 || (!isOwner && Boolean(isCollaborator));

  return {
    id: String(raw.id),
    nome: raw.nome || raw.tarefa_nome || 'Tarefa sem nome',
    descricao: raw.descricao,
    observacaoEspera: raw.observacao_espera,
    status: mapStatus(raw.status),
    prioridade: mapPriority(raw.prioridade),
    facilidade: mapComplexityToEase(raw.complexidade || raw.dificuldade),
    prazo: raw.data,
    foco: Boolean(raw.foco),
    projetoId: String(raw.projeto_id || ''),
    projetoNome: raw.projeto_nome || '',
    grupoNome: raw.grupo_nome,
    criadoPor: raw.dono_id ? {
      id: String(raw.dono_id),
      nome: raw.dono_nome || 'Desconhecido',
      email: raw.dono_email,
    } : undefined,
    responsaveis,
    sessaoAtivaId: raw.sessao_ativa_id ? String(raw.sessao_ativa_id) : undefined,
    compartilhada,
    tempoTotalHoras: raw.total_horas,
    criadoEm: raw.criado_em || new Date().toISOString(),
    atualizadoEm: raw.atualizado_em,
  };
}

// Adapta lista de tarefas
export function adaptTaskList(rawList: RawTask[], currentUserId?: string): TaskListItem[] {
  return rawList.map(raw => adaptTaskListItem(raw, currentUserId));
}

// Adapta sessão ativa
export function adaptActiveSession(raw: RawActiveSession): ActiveTimeSession {
  return {
    id: String(raw.id),
    tarefaId: String(raw.tarefa_id),
    tarefaNome: raw.tarefa_nome || 'Tarefa',
    projetoId: String(raw.projeto_id),
    projetoNome: raw.projeto_nome || '',
    usuarioId: String(raw.usuario_id),
    usuarioNome: raw.usuario_nome || '',
    inicio: raw.inicio,
    fim: raw.fim,
    observacao: raw.observacao,
    horasLiquidas: raw.horas_liquidas,
  };
}

// Adapta resumo diário
export function adaptDailySummary(raw: RawDailySummary): DailyTimeSummary {
  return {
    horasHoje: raw.horas_hoje || 0,
    sessoesHoje: raw.sessoes_hoje || 0,
  };
}

export function adaptTaskTimeInterval(raw: RawTaskTimeInterval): TaskTimeInterval {
  return {
    id: String(raw.id),
    tipo: raw.tipo || 'intervalo',
    inicio: raw.inicio,
    fim: raw.fim,
  };
}

export function adaptTaskTimeEntry(raw: RawTaskTimeEntry): TaskTimeEntry {
  return {
    id: String(raw.id),
    tarefaId: String(raw.tarefa_id),
    usuarioId: String(raw.usuario_id),
    usuarioNome: raw.usuario_nome || 'Usuário',
    inicio: raw.inicio,
    fim: raw.fim,
    observacao: raw.observacao,
    horasLiquidas: raw.horas_liquidas || 0,
    intervalos: (raw.intervalos || []).map(adaptTaskTimeInterval),
  };
}

export function adaptTaskTimeSummaryItem(raw: RawTaskTimeSummaryItem): TaskTimeSummaryItem {
  return {
    usuarioId: String(raw.usuario_id),
    usuarioNome: raw.usuario_nome || 'Usuário',
    horasLiquidas: raw.horas_liquidas || 0,
  };
}

export function adaptUserOption(raw: RawUserOption): UserOption {
  return {
    id: String(raw.id),
    nome: raw.nome || 'Usuário',
    login: raw.usuario_login,
  };
}
