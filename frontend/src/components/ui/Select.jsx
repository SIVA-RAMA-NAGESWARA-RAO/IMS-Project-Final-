import React from 'react';

const Select = ({ label, className = '', children, ...props }) => (
  <label className="block">
    {label && <span className="mb-1.5 block text-sm font-medium text-ink dark:text-ink-dark">{label}</span>}
    <select
      className={`w-full rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-3 py-2 text-sm text-ink dark:text-ink-dark focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light ${className}`}
      {...props}
    >
      {children}
    </select>
  </label>
);

export default Select;
