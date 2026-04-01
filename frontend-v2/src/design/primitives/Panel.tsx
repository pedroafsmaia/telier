import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Panel: React.FC<PanelProps> = ({ 
  children, 
  className = '', 
  padding = 'md' 
}) => {
  const baseClasses = 'bg-surface-primary border border-border-primary rounded-lg shadow-card';
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <div className={`${baseClasses} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};
