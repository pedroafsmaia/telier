import React, { useEffect } from 'react';

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

  useEffect(() => {
    if (isOpen && !isContextual) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isContextual, isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${isContextual ? 'pointer-events-none' : ''}`}>
      <div
        className={`absolute inset-0 bg-background-overlay transition-opacity ${isContextual ? 'md:hidden' : ''}`}
        onClick={onClose}
      />
      
      <div
        className={`absolute inset-y-0 right-0 w-full max-w-md bg-surface-primary shadow-xl ${
          isContextual ? 'pointer-events-auto border-l border-border-primary md:shadow-lg' : ''
        }`}
      >
        <div className="flex flex-col h-full">
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
              <h2 className="text-lg font-medium text-text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
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
