import React, { useMemo } from 'react';
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Clock3,
  FolderKanban,
  Moon,
  Plus,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { IconButton } from '../../design/primitives';
import { useRecentSessions, useActiveSessions } from '../../features/tasks/queries';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';

type SidebarNavItem = {
  label: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  adminOnly?: boolean;
};

interface SidebarActionItem {
  label: string;
  description: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  mode?: 'desktop' | 'mobile';
  currentUserId?: string;
  onNavigate?: () => void;
  onDismiss?: () => void;
}

function getTaskScope(search: string): 'today' | 'mine' {
  const params = new URLSearchParams(search);
  return params.get('escopo') === 'minhas' ? 'mine' : 'today';
}

function getInitials(name?: string): string {
  if (!name?.trim()) return 'TL';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function ActionRow({
  item,
  onNavigate,
}: {
  item: SidebarActionItem;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const baseClassName =
    'flex w-full items-start gap-3 border-l-2 px-3 py-2.5 text-left transition-colors';

  if (!item.href) {
    return (
      <div
        className={`${baseClassName} cursor-not-allowed border-transparent text-text-tertiary`}
        aria-disabled="true"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{item.label}</p>
          <p className="mt-1 text-xs leading-5">{item.description}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={`${baseClassName} border-transparent text-text-secondary hover:border-border-primary hover:bg-surface-primary hover:text-text-primary`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{item.label}</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{item.description}</p>
      </div>
    </Link>
  );
}

function NavRow({
  item,
  onNavigate,
}: {
  item: SidebarNavItem;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={`
        flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors
        ${
          item.active
            ? 'border-info-500 bg-surface-primary font-medium text-text-primary'
            : 'border-transparent text-text-secondary hover:border-border-primary hover:bg-surface-primary hover:text-text-primary'
        }
      `}
      aria-current={item.active ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p>{item.label}</p>
        {item.description ? <p className="mt-0.5 text-xs text-text-tertiary">{item.description}</p> : null}
      </div>
    </Link>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode = 'desktop',
  currentUserId,
  onNavigate,
  onDismiss,
}) => {
  const location = useLocation();
  const { isLoading: authLoading, isAdmin, user, logout, currentUserId: authCurrentUserId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: activeSessions = [] } = useActiveSessions();
  const { data: recentSessions = [] } = useRecentSessions(10);

  const taskScope = getTaskScope(location.search);
  const isMobile = mode === 'mobile';
  const sessionOwnerId = currentUserId ?? authCurrentUserId;
  const currentUserSession = activeSessions.find((session) => session.usuarioId === sessionOwnerId);
  const latestUserSession = recentSessions.find((session) => session.usuarioId === sessionOwnerId);

  const actionItems = useMemo<SidebarActionItem[]>(() => {
    const continueReference = currentUserSession || latestUserSession;

    return [
      {
        label: 'Nova tarefa',
        description: 'Abrir criação rápida na tela principal de tarefas.',
        href: '/tarefas?nova=1',
        icon: Plus,
      },
      {
        label: 'Continuar última tarefa',
        description: continueReference
          ? `${continueReference.projetoNome} · ${continueReference.tarefaNome}`
          : 'Nenhuma sessão recente disponível para retomar.',
        href: continueReference ? `/tarefas?escopo=minhas&abrir=${continueReference.tarefaId}` : undefined,
        icon: Clock3,
      },
    ];
  }, [currentUserSession, latestUserSession]);

  const navigationItems = useMemo<SidebarNavItem[]>(
    () => [
      {
        label: 'Hoje',
        description: 'Operação do dia',
        href: '/tarefas',
        icon: ClipboardList,
        active:
          location.pathname === '/' ||
          ((location.pathname === '/tarefas' || location.pathname.startsWith('/tarefas')) && taskScope === 'today'),
      },
      {
        label: 'Minhas tarefas',
        description: 'Todas as tarefas vinculadas',
        href: '/tarefas?escopo=minhas',
        icon: Clock3,
        active:
          (location.pathname === '/tarefas' || location.pathname.startsWith('/tarefas')) && taskScope === 'mine',
      },
      {
        label: 'Projetos',
        href: '/projetos',
        icon: FolderKanban,
        active: location.pathname === '/projetos' || location.pathname.startsWith('/projetos/'),
      },
      {
        label: 'Grupos',
        href: '/grupos',
        icon: Building2,
        active: location.pathname === '/grupos' || location.pathname.startsWith('/grupos/'),
      },
      {
        label: 'Administração',
        href: '/admin',
        icon: Settings,
        active: location.pathname === '/admin',
        adminOnly: true,
      },
    ],
    [location.pathname, taskScope],
  );

  const visibleNavItems = navigationItems.filter((item) => {
    if (!item.adminOnly) return true;
    if (authLoading) return false;
    return isAdmin;
  });

  const containerClassName = isMobile
    ? 'flex h-full w-full max-w-[22rem] flex-col border-r border-border-secondary bg-surface-secondary shadow-xl'
    : 'sticky top-0 flex h-screen w-72 shrink-0 self-start border-r border-border-secondary bg-surface-secondary';

  return (
    <aside className={containerClassName} aria-label="Navegação principal do Telier">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border-secondary px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-tertiary">Telier</p>
              <h1 className="mt-3 text-lg font-semibold text-text-primary">Operação diária</h1>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                Tarefas como centro de trabalho. Projetos e grupos como estrutura operacional.
              </p>
            </div>

            {isMobile ? (
              <IconButton
                type="button"
                size="sm"
                className="border border-border-primary bg-surface-primary text-text-primary hover:bg-surface-tertiary"
                onClick={onDismiss}
                aria-label="Fechar navegação"
                title="Fechar navegação"
              >
                <X className="h-4 w-4" />
              </IconButton>
            ) : null}
          </div>

          <div className="mt-5 space-y-1" aria-label="Ações operacionais">
            {actionItems.map((item) => (
              <ActionRow key={item.label} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Navegação estrutural">
          <ul className="space-y-1">
            {visibleNavItems.map((item) => (
              <li key={item.label}>
                <NavRow item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border-secondary px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-primary bg-surface-primary text-xs font-semibold text-text-primary">
                {getInitials(user?.nome)}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Sessão</p>
                <p className="truncate text-sm font-medium text-text-primary">{user?.nome || 'Usuário'}</p>
                <p className="truncate text-xs text-text-secondary">@{user?.usuario_login || 'sem-login'}</p>
              </div>
            </div>

            <IconButton
              type="button"
              size="sm"
              className="border border-border-primary bg-surface-primary text-text-primary hover:bg-surface-tertiary"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </IconButton>
          </div>

          <div className="mt-4 space-y-1 border-t border-border-secondary pt-4">
            <div className="flex items-center justify-between px-3 py-2 text-sm text-text-secondary">
              <span>Tema atual</span>
              <span className="font-medium text-text-primary">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-between border-l-2 border-transparent px-3 py-2.5 text-sm text-text-secondary transition-colors hover:border-border-primary hover:bg-surface-primary hover:text-text-primary"
              onClick={() => {
                void logout();
                onNavigate?.();
              }}
            >
              <span>Encerrar sessão</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
