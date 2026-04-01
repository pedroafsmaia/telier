import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    size = 'md',
    children,
    className = '',
    ...props
  },
  ref,
) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-all duration-150 active:scale-95 focus:outline-none focus-visible:outline-none focus:ring-2 focus-visible:ring-2 focus:ring-info-200 focus-visible:ring-info-200 focus:ring-offset-2';

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
