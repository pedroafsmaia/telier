import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { EmptyState, Panel } from '../design/primitives';
import { useAuth } from '../lib/auth';

export function RequireAuth() {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-6 py-10">
        <Panel className="w-full max-w-xl">
          <EmptyState title="Carregando sessao" description="Verificando autenticacao antes de abrir a nova UI." />
        </Panel>
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}

