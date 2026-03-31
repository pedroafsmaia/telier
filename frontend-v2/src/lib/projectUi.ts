import { ProjectPhase, ProjectStatus } from './enums';

export function getProjectStatusLabel(status: string): string {
  switch (status) {
    case ProjectStatus.TODO:
      return 'A fazer';
    case ProjectStatus.IN_PROGRESS:
      return 'Em andamento';
    case ProjectStatus.IN_REVIEW:
      return 'Em revisao';
    case ProjectStatus.PAUSED:
      return 'Pausado';
    case ProjectStatus.DONE:
      return 'Concluido';
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
      return 'Projeto basico';
    case ProjectPhase.EXECUTIVE_PROJECT:
      return 'Projeto executivo';
    case ProjectPhase.IN_CONSTRUCTION:
      return 'Em obra';
    default:
      return phase;
  }
}

export function getProjectStatusBadgeVariant(status: string): 'default' | 'warning' | 'success' | 'error' {
  if (status === ProjectStatus.DONE) return 'success';
  if (status === ProjectStatus.PAUSED || status === ProjectStatus.IN_REVIEW) return 'warning';
  if (status === ProjectStatus.ARCHIVED) return 'default';
  return 'default';
}
