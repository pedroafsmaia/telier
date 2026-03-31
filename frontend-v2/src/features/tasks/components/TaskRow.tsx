import React from 'react';
import { AlertTriangle, Check, FileText, Pause, Play, Share2 } from 'lucide-react';
import { AvatarStack, Button, IconButton } from '../../../design/primitives';
import { formatElapsedDuration, formatShortDate, isOverdue } from '../../../lib/dates';
import { getEaseLabel, getPriorityLabel, getTaskStatusLabel, TaskStatus } from '../../../lib/enums';
import type { ActiveTimeSession, TaskListItem } from '../types';

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

function getResponsibleNames(task: TaskListItem): string {
  if (task.responsaveis.length === 0) {
    return 'Sem responsáveis vinculados';
  }

  return task.responsaveis.map((person) => person.nome).join(', ');
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
  const isWaiting = task.status === TaskStatus.WAITING;
  const isCompleted = task.status === TaskStatus.DONE;
  const waitingHasObservation = Boolean(task.observacaoEspera?.trim());
  const hasOverdue = Boolean(task.prazo && isOverdue(task.prazo) && !isCompleted);
  const hasAnyActiveTimer = activeSessions.length > 0;
  const hasCurrentUserTimer = Boolean(currentUserSession);
  const rowPadding = density === 'compact' ? 'px-3 py-2.5' : 'px-4 py-3';
  const titleClassName = density === 'compact' ? 'text-sm' : 'text-[15px]';
  const metaTextClassName = density === 'compact' ? 'text-[11px]' : 'text-xs';
  const timerButtonClassName = density === 'compact' ? 'min-w-[5.5rem]' : 'min-w-[6rem]';

  const timerReference = currentUserSession || activeSessions[0];
  const timerLabel = hasCurrentUserTimer
    ? timerReference
      ? formatElapsedDuration(timerReference.inicio)
      : 'Ativo'
    : hasAnyActiveTimer
      ? `${activeSessions.length} ativo${activeSessions.length === 1 ? '' : 's'}`
      : null;
  const timerToneClassName = hasCurrentUserTimer ? 'text-info-700' : 'text-text-primary';
  const statusToneClassName = isCompleted
    ? 'text-success-600'
    : isWaiting
      ? waitingHasObservation
        ? 'text-warning-700'
        : 'text-error-600'
      : 'text-text-primary';
  const waitingToneClassName = waitingHasObservation ? 'text-warning-700' : 'text-error-600';
  const responsibleNames = getResponsibleNames(task);

  return (
    <article
      className={`
        flex items-start gap-3 rounded-md border bg-surface-primary transition-colors
        hover:bg-surface-secondary focus-within:border-info-300
        ${hasAnyActiveTimer ? 'border-info-200 bg-info-50/15' : 'border-border-primary'}
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
            <h3 className={`truncate font-medium text-text-primary ${titleClassName}`}>{task.nome}</h3>

            <div className={`mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 ${metaTextClassName}`}>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-text-tertiary">Projeto:</span>
                <span className="font-medium text-text-primary">{task.projetoNome}</span>
              </span>

              <span className={`inline-flex items-center gap-1.5 ${hasOverdue ? 'font-medium text-error-600' : ''}`}>
                <span className="text-text-tertiary">Prazo:</span>
                <span className={hasOverdue ? 'text-error-600' : 'text-text-primary'}>
                  {task.prazo ? formatShortDate(task.prazo) : 'Sem data'}
                </span>
                {hasOverdue ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </span>

              <span className="inline-flex items-center gap-1.5">
                <span className="text-text-tertiary">Status:</span>
                <span className={statusToneClassName}>{getTaskStatusLabel(task.status)}</span>
              </span>

              {timerLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-text-tertiary">Timer:</span>
                  <span className={timerToneClassName}>{timerLabel}</span>
                </span>
              ) : task.foco ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-text-tertiary">Foco:</span>
                  <span className="text-text-primary">Em foco</span>
                </span>
              ) : null}
            </div>
          </div>

          {task.responsaveis.length > 0 ? (
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <span className="sr-only">Responsáveis: {responsibleNames}</span>
              <AvatarStack
                avatars={task.responsaveis.map((person) => ({
                  id: person.id,
                  name: person.nome,
                }))}
                max={4}
                size="sm"
              />
            </div>
          ) : null}
        </div>

        <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 ${metaTextClassName}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-text-tertiary">Prioridade:</span>
            <span className="text-text-primary">{getPriorityLabel(task.prioridade)}</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="text-text-tertiary">Facilidade:</span>
            <span className="text-text-primary">{getEaseLabel(task.facilidade)}</span>
          </span>

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
              title={waitingHasObservation ? 'Em espera com contexto registrado' : 'Em espera sem contexto registrado'}
            >
              <span className="text-text-tertiary">Espera:</span>
              <FileText className={`h-3.5 w-3.5 ${waitingToneClassName}`} aria-hidden="true" />
              <span className={waitingToneClassName}>{waitingHasObservation ? 'Com contexto' : 'Sem contexto'}</span>
            </span>
          ) : null}

          {task.responsaveis.length > 0 ? (
            <div className="sm:hidden">
              <span className="sr-only">Responsáveis: {responsibleNames}</span>
              <AvatarStack
                avatars={task.responsaveis.map((person) => ({
                  id: person.id,
                  name: person.nome,
                }))}
                max={4}
                size="sm"
              />
            </div>
          ) : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2 self-center">
        {hasCurrentUserTimer ? (
          <Button
            variant="secondary"
            size="sm"
            aria-label="Parar timer"
            title="Parar timer"
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              onStopTimer();
            }}
            className={`${timerButtonClassName} justify-center border-warning-300 bg-warning-50 text-warning-700 hover:bg-warning-100`}
          >
            <Pause className="mr-2 h-4 w-4" />
            Parar
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            aria-label="Iniciar timer"
            title="Iniciar timer"
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              onStartTimer();
            }}
            className={`${timerButtonClassName} justify-center`}
          >
            <Play className="mr-2 h-4 w-4" />
            Iniciar
          </Button>
        )}

        {!isCompleted ? (
          <IconButton
            size="sm"
            aria-label="Concluir tarefa"
            title="Concluir tarefa"
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
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
