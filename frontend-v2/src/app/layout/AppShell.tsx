import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { IconButton } from '../../design/primitives';
import { getFocusableElements } from '../../lib/a11y';
import { GlobalTimerBar } from './GlobalTimerBar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  currentUserId?: string;
}

function getMobileContextLabel(pathname: string, search: string): string {
  if (pathname === '/' || pathname === '/tarefas') {
    const params = new URLSearchParams(search);
    return params.get('escopo') === 'minhas' ? 'Minhas tarefas' : 'Hoje';
  }

  if (pathname === '/projetos') return 'Projetos';
  if (pathname.startsWith('/projetos/')) return 'Projeto';
  if (pathname === '/grupos') return 'Grupos';
  if (pathname.startsWith('/grupos/')) return 'Grupo';
  if (pathname === '/admin') return 'Administração';

  return 'Telier';
}

export const AppShell: React.FC<AppShellProps> = ({ children, currentUserId }) => {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileSidebarContainerRef = useRef<HTMLDivElement | null>(null);

  const mobileContextLabel = useMemo(
    () => getMobileContextLabel(location.pathname, location.search),
    [location.pathname, location.search],
  );

  useEffect(() => {
    if (!isMobileSidebarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = mobileMenuButtonRef.current;
    document.body.style.overflow = 'hidden';

    const focusables = getFocusableElements(mobileSidebarContainerRef.current);
    focusables[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusables = getFocusableElements(mobileSidebarContainerRef.current);
      if (currentFocusables.length === 0) return;

      const firstFocusable = currentFocusables[0];
      const lastFocusable = currentFocusables[currentFocusables.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      returnFocusTarget?.focus();
    };
  }, [isMobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-surface-secondary lg:flex">
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar mode="desktop" currentUserId={currentUserId} />
      </div>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navegação principal">
          <button
            type="button"
            className="absolute inset-0 bg-background-overlay"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Fechar navegação"
            tabIndex={-1}
          />

          <div ref={mobileSidebarContainerRef} className="relative h-full">
            <Sidebar
              mode="mobile"
              currentUserId={currentUserId}
              onDismiss={() => setIsMobileSidebarOpen(false)}
              onNavigate={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-surface-primary">
        <div className="sticky top-0 z-40">
          <div className="border-b border-border-secondary bg-surface-primary lg:hidden">
            <div className="flex h-12 items-center justify-between px-4">
              <div className="flex min-w-0 items-center gap-3">
                <IconButton
                  ref={mobileMenuButtonRef}
                  type="button"
                  size="sm"
                  className="border border-border-primary bg-surface-primary text-text-primary hover:bg-surface-tertiary"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  aria-label="Abrir navegação"
                  title="Abrir navegação"
                >
                  <Menu className="h-4 w-4" />
                </IconButton>

                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">Telier</p>
                  <p className="truncate text-sm font-medium text-text-primary">{mobileContextLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <GlobalTimerBar />
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};
