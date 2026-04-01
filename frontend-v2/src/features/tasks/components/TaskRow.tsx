import React from 'react';
import { AlertTriangle, Check, Pause, Play } from 'lucide-react';
import { AvatarStack, Button, IconButton } from '../../../design/primitives';
import { formatElapsedDuration, formatShortDate, isOverdue } from '../../../lib/dates';
import { getTaskStatusLabel, Priority, TaskStatus } from '../../../lib/enums';
import { getProjectColor } from '../../../lib/projectColors';
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

const priorityBorderClass: Record<string, string> = {
  [Priority.LOW]: 'border-l-emerald-400',
  [Priority.MEDIUM]: 'border-l-amber-400',
  [Priority.HIGH]: 'border-l-orange-500',
  [Priority.URGENT]: 'border-l-red-500',
};

const statusDotClass: Record<string, string> = {
  [TaskStatus.TODO]: 'bg-telier-400',
  [TaskStatus.IN_PROGRESS]: 'bg-info-500',
  [TaskStatus.WAITING]: 'bg-warning-500',
  [TaskStatus.DONE]: 'bg-success-500',
};

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
  const hasOverdue = Boolean(task.prazo && isOverdue(task.prazo) && !isCompleted);
  const hasAnyActiveTimer = activeSessions.length > 0;
  const hasCurrentUserTimer = Boolean(currentUserSession);
  const rowPadding = density === 'compact' ? 'px-3 py-2.5' : 'px-4 py-3';
  const titleClassName = density === 'compact' ? 'text-sm' : 'text-[15px]';
  const metaTextClassName = density === 'compact' ? 'text-[11px]' : 'text-xs';
  const timerButtonClassName = density === 'compact' ? 'min-w-[5.5rem]' : 'min-w-[6rem]';

  const projectColor = getProjectColor(task.projetoId);

  const timerReference = currentUserSession || activeSessions[0];
  const timerLabel = hasCurrentUserTimer
    ? timerReference
      ? formatElapsedDuration(timerReference.inicio)
      : 'Ativo'
    : hasAnyActiveTimer
      ? `${activeSessions.length} ativo${activeSessions.length === 1 ? '' : 's'}`
      : null;
  const timerToneClassName = hasCurrentUserTimer ? 'text-info-700' : 'text-text-primary';
  const responsibleNames = getResponsibleNames(task);
  const isHighPriority = task.prioridade === Priority.HIGH || task.prioridade === Priority.URGENT;

  return (
    <article
      className={`
        flex items-start gap-3 rounded-md border border-l-[3px] bg-surface-primary
        shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-px
        focus-within:border-info-300
        ${priorityBorderClass[task.prioridade] || 'border-l-telier-300'}
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
        {/* Line 1: task name + project dot/name + deadline + avatars */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className={`truncate font-medium text-text-primary ${titleClassName}`}>{task.nome}</h3>

            <div className={`mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 ${metaTextClassName}`}>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: projectColor.light }}
                  aria-hidden="true"
                />
                <span className="hidden text-text-secondary sm:inline">{task.projetoNome}</span>
              </span>

              <span className={`inline-flex items-center gap-1.5 ${hasOverdue ? 'font-medium text-error-600' : ''}`}>
                <span className={hasOverdue ? 'text-error-600' : 'text-text-secondary'}>
                  {task.prazo ? formatShortDate(task.prazo) : 'Sem prazo'}
                </span>
                {hasOverdue ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              </span>
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

        {/* Line 2: status dot + label + timer + priority badge (if high/urgent) */}
        <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 ${metaTextClassName}`}>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusDotClass[task.status] || 'bg-telier-400'}`} aria-hidden="true" />
            <span className="text-text-secondary">{getTaskStatusLabel(task.status)}</span>
          </span>

          {timerLabel ? (
            <span className={`inline-flex items-center gap-1.5 ${timerToneClassName}`}>
              {timerLabel}
            </span>
          ) : task.foco ? (
            <span className="inline-flex items-center gap-1.5 text-info-600 font-medium">
              Em foco
            </span>
          ) : null}

          {isHighPriority ? (
            <span className={`inline-flex items-center gap-1 font-medium ${task.prioridade === Priority.URGENT ? 'text-error-600' : 'text-warning-600'}`}>
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {task.prioridade === Priority.URGENT ? 'Urgente' : 'Alta'}
            </span>
          ) : null}

          {isWaiting ? (
            <span className="text-warning-600">
              {task.observacaoEspera?.trim() ? 'Aguardando (com contexto)' : 'Aguardando (sem contexto)'}
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
