import React from 'react';

const variants = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark border border-border dark:border-border-dark hover:bg-canvas dark:hover:bg-canvas-dark',
  danger: 'bg-clay text-white hover:opacity-90',
  ghost: 'bg-transparent text-brand hover:bg-brand-light',
};

const Button = ({ variant = 'primary', className = '', children, ...props }) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
