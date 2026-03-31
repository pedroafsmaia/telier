import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

type SidebarItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const SIDEBAR_PLACES: SidebarItem[] = [
  {
    name: 'Tarefas',
    href: '/tarefas',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    name: 'Projetos',
    href: '/projetos',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Grupos',
    href: '/grupos',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  {
    name: 'Administracao',
    href: '/admin',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    adminOnly: true,
  },
];

interface SidebarProps {
  variant?: 'default' | 'admin';
}

export const Sidebar: React.FC<SidebarProps> = ({ variant = 'default' }) => {
  const location = useLocation();
  const { isLoading: authLoading, isAdmin } = useAuth();

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

  const roleVisibleItems = SIDEBAR_PLACES.filter((item) => {
    if (!item.adminOnly) return true;
    if (authLoading) return false;
    return isAdmin;
  });
  const visibleItems =
    variant === 'admin' ? roleVisibleItems.filter((item) => item.href === '/admin') : roleVisibleItems;

  return (
    <aside className={`w-64 min-h-screen border-r ${variant === 'admin' ? 'border-border-secondary bg-surface-primary' : 'border-border-primary bg-surface-secondary'}`}>
      <div className="p-6">
        <h1 className="text-xl font-semibold text-text-primary">Telier</h1>
        {variant === 'admin' ? (
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-tertiary">Camada administrativa</p>
        ) : null}
      </div>

      <nav className="px-4 pb-4" aria-label="Navegacao estrutural">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const active = isActive(item.href);

            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`
                    flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors
                    ${active
                      ? 'border border-info-200 bg-info-50 text-info-600'
                      : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                    }
                  `}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
