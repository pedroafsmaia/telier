import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const IconButton: React.FC<IconButtonProps> = ({
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md';
  
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
