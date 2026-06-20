import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

const Topbar = ({ title }) => {
  const { user, logout, logoutAll } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-6 py-4">
      <h1 className="font-display text-2xl text-ink dark:text-ink-dark">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="rounded-lg border border-border dark:border-border-dark p-2 text-sm text-ink dark:text-ink-dark hover:bg-canvas dark:hover:bg-canvas-dark"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="text-right">
          <p className="text-sm font-medium text-ink dark:text-ink-dark">{user?.name}</p>
          <p className="text-xs capitalize text-muted dark:text-muted-dark">{user?.role}</p>
        </div>
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
        <button onClick={logoutAll} className="text-xs text-muted dark:text-muted-dark hover:text-clay hover:underline">
          all devices
        </button>
      </div>
    </header>
  );
};

export default Topbar;
