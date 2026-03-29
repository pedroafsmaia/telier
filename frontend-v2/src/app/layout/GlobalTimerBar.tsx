import React from 'react';
import { TimerPill } from '../../design/primitives/TimerPill';
import { useActiveSessions } from '../../features/tasks/queries';
import { formatElapsedDuration } from '../../lib/dates';

interface GlobalTimerBarProps {
  currentUserId?: string;
}

// GlobalTimerBar mantendo identidade visual "The Architectural Monolith"
// Timer global fixo no topo, visível em qualquer página - REALMENTE FIXO@@
export const GlobalTimerBar: React.FC<GlobalTimerBarProps> = ({ currentUserId }) => {
  const { data: activeSessions = [] } = useActiveSessions();
  const currentUserSession = activeSessions.find(session => session.usuarioId === currentUserId);

  if (!currentUserSession) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary-subtle border-b border-primary-subtle px-6 py-2">
      <div className="flex items-center justify-center space-x-4">
        <TimerPill 
          isActive={true}
          duration={formatElapsedDuration(currentUserSession.inicio)}
          user={currentUserSession.usuarioNome}
        />
        <span className="text-sm text-primary-DEFAULT font-medium">
          Timer ativo: "{currentUserSession.tarefaNome}"
        </span>
      </div>
    </div>
  );
};
