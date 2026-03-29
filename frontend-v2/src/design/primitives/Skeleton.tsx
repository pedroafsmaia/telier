import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: 'w-auto' | 'w-full' | 'w-1/2' | 'w-1/3' | 'w-2/3' | 'w-3/4' | 'w-1/4';
  height?: 'h-auto' | 'h-4' | 'h-6' | 'h-8' | 'h-10' | 'h-12' | 'h-16';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'text',
  width,
  height
}) => {
  const baseClasses = 'animate-pulse bg-surface-secondary rounded';
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  };

  const widthClass = width || (variant === 'circular' ? 'w-10' : 'w-auto');
  const heightClass = height || (variant === 'circular' ? 'h-10' : 'h-auto');

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${heightClass} ${className}`}
    />
  );
};
