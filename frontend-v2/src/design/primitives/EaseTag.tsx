import React from 'react';
import { Ease } from '../../lib/enums';

interface EaseTagProps {
  ease: Ease;
  className?: string;
}

export const EaseTag: React.FC<EaseTagProps> = ({ ease, className = '' }) => {
  const getEaseClasses = (ease: Ease) => {
    switch (ease) {
      case Ease.VERY_EASY:
        return 'bg-success-100 text-success-600 border border-success-200';
      case Ease.EASY:
        return 'bg-info-100 text-info-600 border border-info-200';
      case Ease.MEDIUM:
        return 'bg-warning-100 text-warning-600 border border-warning-200';
      case Ease.HARD:
        return 'bg-error-100 text-error-600 border border-error-200';
      case Ease.VERY_HARD:
        return 'bg-error-100 text-error-700 border border-error-200';
      default:
        return 'bg-surface-secondary text-text-secondary border border-border-secondary';
    }
  };

  const getEaseLabel = (ease: Ease) => {
    switch (ease) {
      case Ease.VERY_EASY: return 'Muito fácil';
      case Ease.EASY: return 'Fácil';
      case Ease.MEDIUM: return 'Médio';
      case Ease.HARD: return 'Difícil';
      case Ease.VERY_HARD: return 'Muito difícil';
      default: return ease;
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border ${getEaseClasses(ease)} ${className}`}>
      {getEaseLabel(ease)}
    </span>
  );
};
