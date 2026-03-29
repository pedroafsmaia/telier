import React from 'react';
import { Priority } from '../../lib/enums';

interface PriorityTagProps {
  priority: Priority;
  className?: string;
}

export const PriorityTag: React.FC<PriorityTagProps> = ({ priority, className = '' }) => {
  const getPriorityClasses = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW:
        return 'bg-success-100 text-success-600 border border-success-200';
      case Priority.MEDIUM:
        return 'bg-warning-100 text-warning-600 border border-warning-200';
      case Priority.HIGH:
        return 'bg-error-100 text-error-600 border border-error-200';
      case Priority.URGENT:
        return 'bg-error-100 text-error-700 border border-error-200';
      default:
        return 'bg-surface-secondary text-text-secondary border border-border-secondary';
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case Priority.LOW: return 'Baixa';
      case Priority.MEDIUM: return 'Média';
      case Priority.HIGH: return 'Alta';
      case Priority.URGENT: return 'Urgente';
      default: return priority;
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border ${getPriorityClasses(priority)} ${className}`}>
      {getPriorityLabel(priority)}
    </span>
  );
};
