import React from 'react';

// Shared shell for Login / Register / OTP / Forgot-password — the brand
// moment before someone lands in a role-specific dashboard.
const AuthShell = ({ eyebrow, title, subtitle, children }) => (
  <div className="flex min-h-screen items-center justify-center bg-canvas dark:bg-canvas-dark px-4">
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <p className="data-mono text-xs uppercase tracking-widest text-brand">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl text-ink dark:text-ink-dark">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted dark:text-muted-dark">{subtitle}</p>}
      </div>
      <div className="rounded-card border border-border dark:border-border-dark bg-surface dark:bg-surface-dark p-7 shadow-card">
        {children}
      </div>
    </div>
  </div>
);

export default AuthShell;
