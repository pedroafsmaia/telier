import React, { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '' 
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background-overlay transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer panel */}
      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-surface-primary shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
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
          
          {/* Content */}
          <div className={`flex-1 overflow-y-auto ${className}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
