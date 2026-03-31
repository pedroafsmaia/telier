import React from 'react';
import { Button } from '../../design/primitives';
import { useAuth } from '../../lib/auth';

function getInitials(name: string | undefined): string {
  if (!name) return 'TL';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return initials || 'TL';
}

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="border-b border-border-primary bg-surface-primary px-6 py-4">
      <div className="flex items-center justify-end">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-border-primary bg-surface-secondary px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-primary text-xs font-semibold text-text-primary">
              {getInitials(user?.nome)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{user?.nome || 'Usuario'}</p>
              <p className="truncate text-xs text-text-tertiary">@{user?.usuario_login || 'sem-login'}</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => void logout()}>
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
};
