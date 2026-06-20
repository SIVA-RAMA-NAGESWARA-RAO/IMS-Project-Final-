import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
    <p className="data-mono text-sm text-brand">404</p>
    <h1 className="mt-2 font-display text-3xl text-ink dark:text-ink-dark">Page not found</h1>
    <p className="mt-2 text-sm text-muted dark:text-muted-dark">The page you're looking for doesn't exist or has moved.</p>
    <Link to="/" className="mt-6 text-brand hover:underline">
      Back to home
    </Link>
  </div>
);

export default NotFound;
