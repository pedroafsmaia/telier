import React from 'react';
import {
  Building2,
  ClipboardList,
  FolderKanban,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Button, IconButton } from '../../design/primitives';
import { useTheme } from '../../lib/theme';
import type { LucideIcon } from 'lucide-react';

type SidebarItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const MAIN_NAV_ITEMS: SidebarItem[] = [
  {
    name: 'Tarefas',
    href: '/tarefas',
    icon: ClipboardList,
  },
  {
    name: 'Projetos',
    href: '/projetos',
    icon: FolderKanban,
  },
  {
    name: 'Grupos',
    href: '/grupos',
    icon: Building2,
  },
];

const FOOTER_NAV_ITEMS: SidebarItem[] = [
  {
    name: 'Administração',
    href: '/admin',
    icon: Settings,
    adminOnly: true,
  },
];

interface SidebarProps {
  variant?: 'default' | 'admin';
}

export const Sidebar: React.FC<SidebarProps> = ({ variant = 'default' }) => {
  const location = useLocation();
  const { isLoading: authLoading, isAdmin, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === '/tarefas') {
      return location.pathname === '/' || location.pathname === '/tarefas';
    }
    if (href === '/projetos') {
      return location.pathname === '/projetos' || location.pathname.startsWith('/projetos/');
    }
    if (href === '/grupos') {
      return location.pathname === '/grupos' || location.pathname.startsWith('/grupos/');
    }
    return location.pathname === href;
  };

  const filterVisibleItems = (items: SidebarItem[]) =>
    items.filter((item) => {
      if (!item.adminOnly) return true;
      if (authLoading) return false;
      return isAdmin;
    });

  const roleVisibleMainItems = filterVisibleItems(MAIN_NAV_ITEMS);
  const roleVisibleFooterItems = filterVisibleItems(FOOTER_NAV_ITEMS);

  const visibleMainItems = variant === 'admin' ? [] : roleVisibleMainItems;
  const visibleFooterItems = roleVisibleFooterItems;

  const initials = user?.nome
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'TL';

  return (
    <aside
      className="sticky top-0 flex h-screen w-72 shrink-0 self-start border-r border-border-secondary bg-surface-secondary"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border-secondary px-6 pb-5 pt-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-tertiary">Telier</p>
          <h1 className="mt-3 text-lg font-semibold text-text-primary">
            {variant === 'admin' ? 'Administração' : 'Operação diária'}
          </h1>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {variant === 'admin'
              ? 'Gestão administrativa do ambiente.'
              : 'Tarefas, projetos e grupos do escritório.'}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Navegação estrutural">
          {visibleMainItems.length > 0 ? (
            <ul className="space-y-1">
              {visibleMainItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`
                        flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors
                        ${active
                          ? 'border-info-500 bg-surface-primary font-medium text-text-primary'
                          : 'border-transparent text-text-secondary hover:border-border-primary hover:bg-surface-primary hover:text-text-primary'
                        }
                      `}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </nav>

        <div className="mt-auto border-t border-border-secondary px-5 py-4">
          {visibleFooterItems.length > 0 ? (
            <div className="mb-4 space-y-1">
              {visibleFooterItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors
                      ${active
                        ? 'border-info-500 bg-surface-primary font-medium text-text-primary'
                        : 'border-transparent text-text-secondary hover:border-border-primary hover:bg-surface-primary hover:text-text-primary'
                      }
                    `}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-primary bg-surface-primary text-xs font-semibold text-text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Usuário</p>
              <p className="truncate text-sm font-medium text-text-primary">{user?.nome || 'Usuário'}</p>
              <p className="truncate text-xs text-text-secondary">@{user?.usuario_login || 'sem-login'}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-secondary pt-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Tema</p>
              <p className="text-sm text-text-secondary">{theme === 'dark' ? 'Escuro' : 'Claro'}</p>
            </div>

            <IconButton
              type="button"
              size="sm"
              className="border border-border-primary bg-surface-primary text-text-primary hover:bg-surface-tertiary"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </IconButton>
          </div>

          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center border border-border-secondary bg-surface-primary hover:bg-surface-tertiary"
              onClick={() => void logout()}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
};
