import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <input
        className={`block w-full px-3 py-2 border border-border-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-error-500">{error}</p>
      )}
    </div>
  );
};
