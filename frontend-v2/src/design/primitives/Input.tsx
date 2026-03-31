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
        className={`block w-full rounded-md border border-border-primary px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-info-200 focus:border-info-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-200 focus-visible:border-info-500 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-error-500">{error}</p>
      )}
    </div>
  );
};
