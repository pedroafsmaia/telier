import React from 'react';
import { AvatarStack, Button, IconButton } from '../../../design/primitives';
import { Play, Pause, Check, Share2, AlertTriangle, FileText } from 'lucide-react';
import type { TaskListItem, ActiveTimeSession } from '../types';
import { getEaseLabel, getPriorityLabel, getTaskStatusLabel, TaskStatus } from '../../../lib/enums';
import { formatElapsedDuration, formatShortDate, isOverdue } from '../../../lib/dates';

interface TaskRowProps {
  task: TaskListItem;
  activeSessions?: ActiveTimeSession[];
  currentUserSession?: ActiveTimeSession;
  onClick: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onComplete: () => void;
  density?: 'default' | 'compact';
  className?: string;
}

function getResponsibleSummary(task: TaskListItem): string {
  if (task.responsaveis.length === 0) {
    return 'Sem responsáveis';
  }

  const [firstResponsible] = task.responsaveis;
  const firstName = firstResponsible.nome.split(' ').filter(Boolean)[0] || firstResponsible.nome;

  if (task.responsaveis.length === 1) {
    return firstName;
  }

  return `${firstName} +${task.responsaveis.length - 1}`;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  activeSessions = [],
  currentUserSession,
  onClick,
  onStartTimer,
  onStopTimer,
  onComplete,
  density = 'default',
  className = '',
}) => {
  const hasActiveTimer = activeSessions.length > 0;
  const hasCurrentUserTimer = Boolean(currentUserSession);
  const isWaiting = task.status === TaskStatus.WAITING;
  const isCompleted = task.status === TaskStatus.DONE;
  const waitingHasObservation = Boolean(task.observacaoEspera?.trim());
  const hasOverdue = Boolean(task.prazo && isOverdue(task.prazo) && !isCompleted);
  const rowPadding = density === 'compact' ? 'px-3 py-2.5' : 'px-4 py-3';
  const metaGap = density === 'compact' ? 'gap-x-3 gap-y-1' : 'gap-x-4 gap-y-1.5';
  const titleClass = density === 'compact' ? 'text-sm' : 'text-[15px]';
  const metaTextClass = density === 'compact' ? 'text-[11px]' : 'text-xs';

  const activeTimerReference = currentUserSession || activeSessions[0];
  const activeTimerDuration = activeTimerReference
    ? formatElapsedDuration(activeTimerReference.inicio)
    : undefined;
  const activeTimerLabel = hasCurrentUserTimer
    ? `Em execução${activeTimerDuration ? ` · ${activeTimerDuration}` : ''}`
    : hasActiveTimer
      ? `${activeSessions.length} ativo${activeSessions.length === 1 ? '' : 's'} na equipe`
      : null;
  const timerToneClass = hasCurrentUserTimer ? 'text-info-700' : 'text-text-primary';
  const statusToneClass = isCompleted
    ? 'text-success-600'
    : isWaiting
      ? waitingHasObservation
        ? 'text-warning-600'
        : 'text-error-600'
      : 'text-text-primary';
  const waitingToneClass = waitingHasObservation ? 'text-warning-600' : 'text-error-600';
  const timerButtonLabel = hasCurrentUserTimer ? 'Parar' : 'Iniciar';

  return (
    <article
      className={`
        flex items-start gap-3 rounded-md border bg-surface-primary
        transition-colors hover:bg-surface-secondary focus-within:border-info-300
        ${hasActiveTimer ? 'border-info-200 bg-info-50/15' : 'border-border-primary'}
        ${rowPadding}
        ${className}
      `}
    >
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 text-left focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-info-200"
        aria-label={`Abrir tarefa ${task.nome}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className={`truncate font-medium text-text-primary ${titleClass}`}>{task.nome}</h3>
            <p className={`mt-1 ${metaTextClass} text-text-secondary`}>
              <span className="text-text-tertiary">Projeto:</span>{' '}
              <span className="font-medium text-text-primary">{task.projetoNome}</span>
            </p>
          </div>

          {task.responsaveis.length > 0 ? (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <span className={`${metaTextClass} text-text-tertiary`}>Responsáveis</span>
              <AvatarStack
                avatars={task.responsaveis.map((person) => ({
                  id: person.id,
                  name: person.nome,
                }))}
                max={3}
                size="sm"
              />
            </div>
          ) : null}
        </div>

        <div className={`mt-2 flex flex-wrap items-center ${metaTextClass} ${metaGap}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-text-tertiary">Status:</span>
            <span className={statusToneClass}>{getTaskStatusLabel(task.status)}</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="text-text-tertiary">Prioridade:</span>
            <span className="text-text-primary">{getPriorityLabel(task.prioridade)}</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="text-text-tertiary">Facilidade:</span>
            <span className="text-text-primary">{getEaseLabel(task.facilidade)}</span>
          </span>

          <span className={`inline-flex items-center gap-1.5 ${hasOverdue ? 'font-medium text-error-600' : ''}`}>
            <span className="text-text-tertiary">Prazo:</span>
            <span className={hasOverdue ? 'text-error-600' : 'text-text-primary'}>
              {task.prazo ? formatShortDate(task.prazo) : 'Sem data'}
            </span>
            {hasOverdue ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="text-text-tertiary">Responsáveis:</span>
            <span className="text-text-primary">{getResponsibleSummary(task)}</span>
          </span>

          {activeTimerLabel ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-text-tertiary">Timer:</span>
              <span className={timerToneClass}>{activeTimerLabel}</span>
            </span>
          ) : task.foco ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-text-tertiary">Foco:</span>
              <span className="text-text-primary">Em foco</span>
            </span>
          ) : null}

          {task.compartilhada ? (
            <span
              className="inline-flex items-center gap-1.5 text-text-secondary"
              title="Tarefa compartilhada"
              aria-label="Tarefa compartilhada"
            >
              <span className="text-text-tertiary">Compartilhamento:</span>
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-text-primary">Compartilhada</span>
            </span>
          ) : null}

          {isWaiting ? (
            <span
              className="inline-flex items-center gap-1.5"
              title={waitingHasObservation ? 'Em espera com observação registrada' : 'Em espera sem observação registrada'}
            >
              <span className="text-text-tertiary">Espera:</span>
              <FileText className={`h-3.5 w-3.5 ${waitingToneClass}`} aria-hidden="true" />
              <span className={waitingToneClass}>
                {waitingHasObservation ? 'Com observação' : 'Sem observação'}
              </span>
            </span>
          ) : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2 self-center">
        {hasCurrentUserTimer ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStopTimer();
            }}
            className="min-w-[6.25rem] justify-center border-warning-300 bg-warning-50 text-warning-700 hover:bg-warning-100"
          >
            <Pause className="mr-2 h-4 w-4" />
            {timerButtonLabel}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStartTimer();
            }}
            className="min-w-[6.25rem] justify-center"
          >
            <Play className="mr-2 h-4 w-4" />
            {timerButtonLabel}
          </Button>
        )}

        {!isCompleted ? (
          <IconButton
            size="sm"
            aria-label="Concluir tarefa"
            title="Concluir tarefa"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onComplete();
            }}
            className="border border-border-primary bg-surface-secondary text-text-primary hover:bg-surface-tertiary"
          >
            <Check className="h-4 w-4" />
          </IconButton>
        ) : null}
      </div>
    </article>
  );
};
