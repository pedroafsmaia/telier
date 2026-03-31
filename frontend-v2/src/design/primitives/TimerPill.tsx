import React from 'react';

interface TimerPillProps {
  isActive: boolean;
  duration?: string;
  user?: string;
  className?: string;
}

export const TimerPill: React.FC<TimerPillProps> = ({ 
  isActive, 
  duration, 
  user, 
  className = '' 
}) => {
  const baseClasses = 'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors';
  
  const statusClasses = isActive 
    ? 'border-info-200 bg-info-600 text-white shadow-sm'
    : 'border-border-secondary bg-surface-secondary text-text-secondary';

  return (
    <div className={`${baseClasses} ${statusClasses} ${className}`}>
      <div className="flex items-center space-x-2">
        {/* Timer icon */}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        
        {/* Duration */}
        {duration && (
          <span className="font-mono">{duration}</span>
        )}
        
        {/* User indicator */}
        {user && isActive && (
          <>
            <span className="text-xs opacity-75">•</span>
            <span className="text-xs">{user}</span>
          </>
        )}
        
        {/* Active indicator */}
        {isActive && (
          <div className="h-2 w-2 rounded-full bg-white/95 ring-2 ring-white/30" />
        )}
      </div>
    </div>
  );
};
