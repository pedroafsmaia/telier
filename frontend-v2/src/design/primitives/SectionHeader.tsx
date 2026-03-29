import React from 'react';

// Interfaces para SectionHeader do Telier
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

// SectionHeader mantendo identidade visual "The Architectural Monolith"
// Cabeçalhos claros, técnicos, sem decoração excessiva
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
