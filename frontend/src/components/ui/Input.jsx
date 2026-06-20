import React from 'react';

const Input = ({ label, className = '', ...props }) => (
  <label className="block">
    {label && <span className="mb-1.5 block text-sm font-medium text-ink dark:text-ink-dark">{label}</span>}
    <input
      className={`w-full rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-3 py-2 text-sm text-ink dark:text-ink-dark placeholder:text-muted dark:placeholder:text-muted-dark focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light ${className}`}
      {...props}
    />
  </label>
);

export default Input;
