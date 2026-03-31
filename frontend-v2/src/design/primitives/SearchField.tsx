import React from 'react';

interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export const SearchField: React.FC<SearchFieldProps> = ({ onClear, className = '', ...props }) => {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-4 w-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        className={`block w-full rounded-md border border-border-primary py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-info-200 focus:border-info-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-200 focus-visible:border-info-500 ${className}`}
        {...props}
      />
      {props.value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-tertiary transition-colors hover:text-text-secondary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-200"
          aria-label="Limpar busca"
          title="Limpar busca"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
