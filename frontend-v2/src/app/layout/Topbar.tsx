import React from 'react';
import { useLocation } from 'react-router-dom';
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

// Topbar mantendo identidade visual "The Architectural Monolith"
// Barra superior minima, funcional, sem placeholder pulsante
export const Topbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const getPageTitle = (pathname: string) => {
    if (pathname === '/' || pathname === '/tarefas') return 'Tarefas';
    if (pathname === '/projetos') return 'Projetos';
    if (pathname.startsWith('/projetos/')) return 'Projeto';
    if (pathname === '/grupos') return 'Grupos';
    if (pathname.startsWith('/grupos/')) return 'Grupo';
    if (pathname === '/admin') return 'Administracao';
    return 'Telier';
  };

  return (
    <div className="bg-surface-primary border-b border-border-primary px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-medium text-text-primary">{getPageTitle(location.pathname)}</h1>
        </div>

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

