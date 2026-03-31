import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  className?: string;
  actions?: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  children,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  className = '',
  actions,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    const next = !isOpen;
    if (!isControlled) {
      setInternalIsOpen(next);
    }
    onToggle?.(next);
  };

  return (
    <div className={`rounded-lg border border-border-primary ${className}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={handleToggle}
          className="flex min-w-0 flex-1 items-center justify-between text-left transition-colors hover:text-text-secondary"
        >
          <div>
            <h3 className="font-medium text-text-primary">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs text-text-tertiary">{subtitle}</p> : null}
          </div>
          <svg
            className={`h-4 w-4 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="shrink-0">{actions}</div>
      </div>

      {isOpen ? <div className="border-t border-border-primary px-4 pb-4">{children}</div> : null}
    </div>
  );
};
