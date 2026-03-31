import React, { useEffect, useId, useRef } from 'react';
import { getFocusableElements } from '../../lib/a11y';

type DrawerMode = 'modal' | 'contextual';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  mode?: DrawerMode;
}

export const Drawer: React.FC<DrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '',
  mode = 'contextual',
}) => {
  const isContextual = mode === 'contextual';
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    lastFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';

    const focusables = getFocusableElements(drawerRef.current);
    (closeButtonRef.current || focusables[0])?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const currentFocusables = getFocusableElements(drawerRef.current);
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
      lastFocusedElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar painel"
        className={`absolute inset-0 transition-opacity ${isContextual ? 'bg-background-overlay md:bg-transparent' : 'bg-background-overlay'}`}
        onClick={onClose}
      />
      
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={`absolute inset-y-0 right-0 w-full max-w-md bg-surface-primary shadow-xl ${
          isContextual ? 'border-l border-border-primary md:shadow-lg' : ''
        }`}
      >
        <div className="flex flex-col h-full">
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h2 id={titleId} className="text-lg font-medium text-text-primary">{title}</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-info-200 focus-visible:ring-offset-2"
                aria-label="Fechar painel"
                title="Fechar painel"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div className={`flex-1 overflow-y-auto ${className}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
