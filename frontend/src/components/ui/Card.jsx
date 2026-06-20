import React from 'react';

const Card = ({ className = '', children, ...props }) => (
  <div
    className={`bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-card shadow-card p-5 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
