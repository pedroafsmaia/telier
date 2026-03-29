import React from 'react';
import { StatusTag, PriorityTag, EaseTag, AvatarStack, IconButton } from '../../../design/primitives';
import { Play, Pause, Check, Share2, Clock, AlertTriangle } from 'lucide-react';
import type { TaskListItem, ActiveTimeSession } from '../types';
import { TaskStatus } from '../../../lib/enums';
import { formatShortDate } from '../../../lib/dates';

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
  const hasOverdue = task.prazo && new Date(task.prazo) < new Date() && !isCompleted;
  const rowPadding = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';
  const headerGap = density === 'compact' ? 'gap-2' : 'gap-3';
  const detailsGap = density === 'compact' ? 'gap-3' : 'gap-4';
  const titleClass = density === 'compact' ? 'text-sm' : '';

  return (
    <div
      className={`
        flex items-center gap-3 bg-surface-primary border border-border-subtle rounded-lg
        hover:bg-surface-secondary cursor-pointer transition-colors group
        ${hasActiveTimer ? 'ring-2 ring-primary-subtle bg-primary-subtle/20' : ''}
        ${hasOverdue ? 'border-alert-subtle' : ''}
        ${rowPadding}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className={`flex items-center mb-1 ${headerGap}`}>
          <StatusTag status={task.status} />

          <h3 className={`font-medium text-text-primary truncate flex-1 ${titleClass}`}>
            {task.nome}
          </h3>

          <div className="flex items-center gap-2">
            {hasOverdue && (
              <div className="flex items-center gap-1 text-alert-DEFAULT">
                <AlertTriangle className="w-3 h-3" />
                <span className="text-xs font-medium">Atrasado</span>
              </div>
            )}

            {hasActiveTimer && (
              <div className="flex items-center gap-1 text-primary-DEFAULT">
                <Clock className="w-3 h-3 animate-pulse" />
                <span className="text-xs font-medium">Timer ativo</span>
              </div>
            )}

            {task.compartilhada && (
              <div className="flex items-center gap-1 text-text-tertiary">
                <Share2 className="w-3 h-3" />
              </div>
            )}
          </div>
        </div>

        <div className={`flex items-center text-sm ${detailsGap}`}>
          {task.prazo && (
            <div className="flex items-center gap-1 text-text-secondary">
              <span className="text-xs">{formatShortDate(task.prazo)}</span>
            </div>
          )}

          <PriorityTag priority={task.prioridade} />

          <EaseTag ease={task.facilidade} />

          <div className="flex items-center gap-1 text-text-secondary">
            <span className="text-xs font-medium">{task.projetoNome}</span>
          </div>

          {task.responsaveis.length > 0 && (
            <AvatarStack
              avatars={task.responsaveis.map((p) => ({
                id: p.id,
                name: p.nome,
              }))}
              max={3}
              size="sm"
            />
          )}

          {isWaiting && (
            <div className="flex items-center gap-1 text-warning-DEFAULT">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs">{task.observacaoEspera ? 'Em espera com observação' : 'Em espera'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasCurrentUserTimer ? (
          <IconButton
            size="sm"
            aria-label="Parar timer"
            title="Parar timer"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onStopTimer();
            }}
            className="border border-border-primary bg-surface-secondary text-text-primary hover:bg-surface-tertiary"
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

        {!isCompleted && (
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
        )}
      </div>
    </div>
  );
};

