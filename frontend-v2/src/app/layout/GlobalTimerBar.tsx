import React from 'react';
import { AlertTriangle, Clock3, LoaderCircle } from 'lucide-react';
import { TimerPill } from '../../design/primitives/TimerPill';
import { useActiveSessions } from '../../features/tasks/queries';
import { formatElapsedDuration } from '../../lib/dates';
import { useAuth } from '../../lib/auth';

export const GlobalTimerBar: React.FC = () => {
  const { currentUserId } = useAuth();
  const {
    data: activeSessions = [],
    isLoading,
    isError,
  } = useActiveSessions();

  const currentUserSession = activeSessions.find((session) => session.usuarioId === currentUserId);
  const hasAnyActiveSession = activeSessions.length > 0;
  const teammateActiveCount = activeSessions.filter((session) => session.usuarioId !== currentUserId).length;
  const barClassName =
    currentUserSession || hasAnyActiveSession
      ? 'border-b border-info-100 bg-info-50/55'
      : 'border-b border-border-secondary bg-surface-primary';

  let badge: React.ReactNode = (
    <span className="inline-flex h-7 items-center rounded-md border border-border-primary bg-surface-primary px-3 text-xs font-medium text-text-secondary">
      Sem timer ativo
    </span>
  );
  let statusDescription = 'Nenhum timer ativo no momento.';
  let statusClassName = 'text-text-primary';

  if (isLoading && !hasAnyActiveSession) {
    badge = (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border-primary bg-surface-primary px-3 text-xs font-medium text-text-secondary">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        Atualizando
      </span>
    );
    statusDescription = 'Carregando estado global de timers...';
  } else if (isError && !hasAnyActiveSession) {
    badge = (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-alert-subtle bg-alert-subtle/20 px-3 text-xs font-medium text-alert">
        <AlertTriangle className="h-3.5 w-3.5" />
        Erro de rede
      </span>
    );
    statusDescription = 'Não foi possível atualizar os timers ativos.';
    statusClassName = 'text-alert';
  } else if (currentUserSession) {
    badge = (
      <TimerPill
        isActive={true}
        duration={formatElapsedDuration(currentUserSession.inicio)}
        user={currentUserSession.usuarioNome}
        className="shrink-0"
      />
    );
    statusDescription = `Seu timer está ativo em ${currentUserSession.projetoNome}: ${currentUserSession.tarefaNome}.`;
    if (isError) {
      statusDescription = `${statusDescription} Atualização de rede instável.`;
      statusClassName = 'text-alert';
    }
  } else if (hasAnyActiveSession) {
    statusDescription = `${teammateActiveCount} ${teammateActiveCount === 1 ? 'timer ativo na equipe.' : 'timers ativos na equipe.'}`;
    if (isError) {
      statusDescription = `${statusDescription} Atualização de rede instável.`;
      statusClassName = 'text-alert';
    }
  }

  return (
    <div className={barClassName}>
      <div className="flex h-12 items-center justify-between px-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-text-tertiary">
          <Clock3 className="h-4 w-4" />
          <span>Timer global</span>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          {badge}
          <p className={`truncate text-sm ${statusClassName}`}>{statusDescription}</p>
        </div>
      </div>
    </div>
  );
};

