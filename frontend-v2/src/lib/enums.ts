// Enums internos da nova UI do Telier
// Normalizam a nomenclatura do backend para interface consistente

export const TaskStatus = {
  TODO: 'a-fazer',
  IN_PROGRESS: 'em-andamento',
  WAITING: 'em-espera',
  DONE: 'concluida'
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const Priority = {
  LOW: 'baixa',
  MEDIUM: 'media',
  HIGH: 'alta',
  URGENT: 'urgente'
} as const;

export type Priority = typeof Priority[keyof typeof Priority];

export const Ease = {
  VERY_EASY: 'muito-facil',
  EASY: 'facil',
  MEDIUM: 'medio',
  HARD: 'dificil',
  VERY_HARD: 'muito-dificil'
} as const;

export type Ease = typeof Ease[keyof typeof Ease];

export const RecordType = {
  DECISION: 'decisao',
  PENDING: 'pendencia',
  NOTE: 'observacao'
} as const;

export type RecordType = typeof RecordType[keyof typeof RecordType];

export const UserRole = {
  ADMIN: 'admin',
  MEMBER: 'membro'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Enums adicionais consolidados
export const ProjectStatus = {
  TODO: 'a-fazer',
  IN_PROGRESS: 'em-andamento',
  IN_REVIEW: 'em-revisao',
  PAUSED: 'pausado',
  DONE: 'concluido',
  ARCHIVED: 'arquivado'
} as const;

export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];

export const ProjectPhase = {
  PRELIMINARY_STUDY: 'estudo-preliminar',
  PRELIMINARY_PROJECT: 'anteprojeto',
  BASIC_PROJECT: 'projeto-basico',
  EXECUTIVE_PROJECT: 'projeto-executivo',
  IN_CONSTRUCTION: 'em-obra'
} as const;

export type ProjectPhase = typeof ProjectPhase[keyof typeof ProjectPhase];

export const GroupStatus = {
  ACTIVE: 'ativo',
  PAUSED: 'pausado',
  ARCHIVED: 'arquivado'
} as const;

export type GroupStatus = typeof GroupStatus[keyof typeof GroupStatus];

export const RecordStatus = {
  OPEN: 'aberta',
  DONE: 'concluida'
} as const;

export type RecordStatus = typeof RecordStatus[keyof typeof RecordStatus];

// Helper functions para display
export const getTaskStatusLabel = (status: TaskStatus): string => {
  const labels = {
    [TaskStatus.TODO]: 'A fazer',
    [TaskStatus.IN_PROGRESS]: 'Em andamento',
    [TaskStatus.WAITING]: 'Em espera',
    [TaskStatus.DONE]: 'Concluída'
  };
  return labels[status];
};

export const getPriorityLabel = (priority: Priority): string => {
  const labels = {
    [Priority.LOW]: 'Baixa',
    [Priority.MEDIUM]: 'Média',
    [Priority.HIGH]: 'Alta',
    [Priority.URGENT]: 'Urgente'
  };
  return labels[priority];
};

export const getEaseLabel = (ease: Ease): string => {
  const labels = {
    [Ease.VERY_EASY]: 'Muito fácil',
    [Ease.EASY]: 'Fácil',
    [Ease.MEDIUM]: 'Médio',
    [Ease.HARD]: 'Difícil',
    [Ease.VERY_HARD]: 'Muito difícil'
  };
  return labels[ease];
};

export const getRecordTypeLabel = (type: RecordType): string => {
  const labels = {
    [RecordType.DECISION]: 'Decisão',
    [RecordType.PENDING]: 'Pendência',
    [RecordType.NOTE]: 'Observação'
  };
  return labels[type];
};
