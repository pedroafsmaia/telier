import React from 'react';

interface MetricStripItem {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  minWidthClassName?: string;
  title?: string;
}

interface MetricStripProps {
  items: MetricStripItem[];
  className?: string;
}

export const MetricStrip: React.FC<MetricStripProps> = ({ items, className = '' }) => {
  return (
    <div className={`overflow-x-auto border-t border-border-secondary ${className}`}>
      <div className="flex min-w-max divide-x divide-border-secondary sm:min-w-full">
        {items.map((item) => (
          <div
            key={item.label}
            className={`shrink-0 px-4 py-4 first:pl-0 last:pr-0 sm:min-w-0 sm:flex-1 sm:basis-0 ${item.minWidthClassName || 'min-w-[9.5rem]'}`}
            title={item.title}
          >
            <p className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">{item.label}</p>
            <div className={`mt-1 text-lg font-semibold leading-snug text-text-primary ${item.valueClassName || ''}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
