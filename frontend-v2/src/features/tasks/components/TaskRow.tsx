import React from 'react';
import { PriorityTag, EaseTag, AvatarStack, IconButton, StatusTag, TimerPill } from '../../../design/primitives';
import { Play, Pause, Check, Share2, AlertTriangle, FileText } from 'lucide-react';
import type { TaskListItem, ActiveTimeSession } from '../types';
import { TaskStatus } from '../../../lib/enums';
import { formatElapsedDuration, formatShortDate } from '../../../lib/dates';

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
  const hasOverdue = task.prazo && new Date(task.prazo) < new Date() && !isCompleted;
  const rowPadding = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';
  const detailsGap = density === 'compact' ? 'gap-2' : 'gap-3';
  const titleClass = density === 'compact' ? 'text-sm' : 'text-[15px]';

  const activeTimerReference = currentUserSession || activeSessions[0];
  const activeTimerDuration = activeTimerReference
    ? formatElapsedDuration(activeTimerReference.inicio)
    : undefined;
  const activeTimerUser =
    !hasCurrentUserTimer && activeSessions.length === 1 ? activeSessions[0].usuarioNome : undefined;

  return (
    <div
      className={`
        flex cursor-pointer items-center gap-3 rounded-lg border bg-surface-primary
        transition-colors hover:bg-surface-secondary focus-within:ring-2 focus-within:ring-info-200
        ${hasActiveTimer ? 'border-info-300 ring-2 ring-info-100 bg-info-50/30 shadow-sm' : 'border-border-subtle'}
        ${rowPadding}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`min-w-0 flex-1 truncate font-medium text-text-primary ${titleClass}`}>
            {task.nome}
          </h3>

          <StatusTag status={task.status} />
        </div>

        <div className={`mt-2 flex flex-wrap items-center text-xs ${detailsGap}`}>
          <span className={`inline-flex items-center gap-1 ${hasOverdue ? 'font-medium text-error-600' : 'text-text-secondary'}`}>
            {hasOverdue ? <AlertTriangle className="h-3 w-3" aria-hidden="true" /> : null}
            Prazo {task.prazo ? formatShortDate(task.prazo) : 'sem data'}
            {hasOverdue ? ' (atrasada)' : ''}
          </span>

          <PriorityTag priority={task.prioridade} />

          <EaseTag ease={task.facilidade} />

          <div className="flex items-center gap-1 text-text-secondary">
            <span className="text-xs font-medium">{task.projetoNome}</span>
          </div>

          {task.responsaveis.length > 0 ? (
            <AvatarStack
              avatars={task.responsaveis.map((p) => ({
                id: p.id,
                name: p.nome,
              }))}
              max={3}
              size="sm"
            />
          ) : null}

          {task.compartilhada ? (
            <span
              className="inline-flex items-center gap-1 text-text-tertiary"
              title="Tarefa compartilhada"
              aria-label="Tarefa compartilhada"
            >
              <Share2 className="h-3 w-3" />
            </span>
          ) : null}

          {isWaiting ? (
            <span
              className={`inline-flex items-center gap-1 ${
                waitingHasObservation
                  ? 'text-warning-600'
                  : 'text-error-600'
              }`}
              title={waitingHasObservation ? 'Em espera com contexto registrado' : 'Em espera sem contexto'}
            >
              <FileText className="h-3 w-3" />
              {waitingHasObservation ? 'Com contexto' : 'Sem contexto'}
            </span>
          ) : null}

          {hasActiveTimer ? (
            <div className="max-w-full">
              <TimerPill
                isActive={true}
                duration={activeTimerDuration}
                user={activeTimerUser}
                className="h-7 text-xs"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {hasCurrentUserTimer ? (
          <IconButton
            size="sm"
            aria-label="Parar timer"
            title="Parar timer"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStopTimer();
            }}
            className="border border-warning-300 bg-warning-100 text-warning-600 hover:bg-warning-50"
          >
            <Pause className="h-4 w-4" />
          </IconButton>
        ) : (
          <IconButton
            size="sm"
            aria-label="Iniciar timer"
            title="Iniciar timer"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStartTimer();
            }}
            className="border border-border-primary bg-surface-secondary text-text-primary hover:bg-surface-tertiary"
          >
            <Play className="h-4 w-4" />
          </IconButton>
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
    </div>
  );
};
