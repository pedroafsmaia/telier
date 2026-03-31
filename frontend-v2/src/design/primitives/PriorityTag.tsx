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
        return 'border border-success-200 bg-success-50 text-success-600';
      case Priority.MEDIUM:
        return 'border border-warning-200 bg-warning-50 text-warning-600';
      case Priority.HIGH:
        return 'border border-error-200 bg-error-50 text-error-600';
      case Priority.URGENT:
        return 'border border-error-300 bg-error-100 text-error-700';
      default:
        return 'border border-border-secondary bg-surface-secondary text-text-secondary';
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
