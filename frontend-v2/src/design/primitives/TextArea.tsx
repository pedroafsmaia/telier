import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-1">
      {label ? <label className="block text-sm font-medium text-text-primary">{label}</label> : null}
      <textarea
        className={`block w-full resize-y rounded-md border border-border-primary px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
      {error ? <p className="text-sm text-error-500">{error}</p> : null}
    </div>
  );
};

