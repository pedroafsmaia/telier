import { GroupStatus, ProjectPhase, ProjectStatus } from './enums';

export function getProjectStatusLabel(status: string): string {
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
      return status;
  }
}

export function getProjectPhaseLabel(phase: string): string {
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
      return phase;
  }
}

export function getProjectStatusToneClass(status: string): string {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return 'text-info-700';
    case ProjectStatus.IN_REVIEW:
    case ProjectStatus.PAUSED:
      return 'text-warning-700';
    case ProjectStatus.DONE:
      return 'text-success-700';
    case ProjectStatus.ARCHIVED:
      return 'text-text-tertiary';
    default:
      return 'text-text-primary';
  }
}

export function getGroupStatusLabel(status: string): string {
  switch (status) {
    case GroupStatus.ACTIVE:
      return 'Ativo';
    case GroupStatus.PAUSED:
      return 'Pausado';
    case GroupStatus.ARCHIVED:
      return 'Arquivado';
    default:
      return status;
  }
}

export function getGroupStatusToneClass(status: string): string {
  switch (status) {
    case GroupStatus.PAUSED:
      return 'text-warning-700';
    case GroupStatus.ARCHIVED:
      return 'text-text-tertiary';
    default:
      return 'text-text-primary';
  }
}

export function formatProjectProgressLabel(completed: number, total: number): string {
  return `${completed}/${total} tarefas concluídas`;
}

export function formatAreaLabel(areaM2?: number): string {
  if (!areaM2) return 'Não informado';
  return `${areaM2} m²`;
}

export function formatHoursLabel(totalHours?: number): string {
  if (totalHours === undefined) return 'Não informado';
  return `${totalHours} h`;
}
