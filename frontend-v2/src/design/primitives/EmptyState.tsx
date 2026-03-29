import React from 'react';

// Interfaces para EmptyState do Telier
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  actions?: React.ReactNode;
  className?: string;
}

// EmptyState mantendo identidade visual "The Architectural Monolith"
// Estados vazios claros, funcionais, sem ilustrações decorativas
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actions,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mx-auto h-12 w-12 text-text-tertiary mb-4">
          <span className="text-3xl">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-medium text-text-primary mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
          {description}
        </p>
      )}
      {actions && (
        <div className="flex justify-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};
