import React from 'react';
import { TaskStatus } from '../../lib/enums';

interface StatusTagProps {
  status: TaskStatus;
  className?: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status, className = '' }) => {
  const getStatusClasses = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'border border-border-secondary bg-surface-secondary text-text-secondary';
      case TaskStatus.IN_PROGRESS:
        return 'border border-info-200 bg-info-50 text-info-600';
      case TaskStatus.WAITING:
        return 'border border-warning-200 bg-warning-50 text-warning-600';
      case TaskStatus.DONE:
        return 'border border-success-200 bg-success-50 text-success-600';
      default:
        return 'border border-border-secondary bg-surface-secondary text-text-secondary';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO: return 'A fazer';
      case TaskStatus.IN_PROGRESS: return 'Em andamento';
      case TaskStatus.WAITING: return 'Em espera';
      case TaskStatus.DONE: return 'Concluída';
      default: return status;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${getStatusClasses(status)} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {getStatusLabel(status)}
    </span>
  );
};
