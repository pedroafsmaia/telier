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
        return 'bg-surface-secondary text-text-secondary border border-border-secondary';
      case TaskStatus.IN_PROGRESS:
        return 'bg-info-100 text-info-600 border border-info-200';
      case TaskStatus.WAITING:
        return 'bg-warning-100 text-warning-600 border border-warning-200';
      case TaskStatus.DONE:
        return 'bg-success-100 text-success-600 border border-success-200';
      default:
        return 'bg-surface-secondary text-text-secondary border border-border-secondary';
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
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border ${getStatusClasses(status)} ${className}`}>
      {getStatusLabel(status)}
    </span>
  );
};
