import React from 'react';
import { cn } from '@/lib/utils';

const Badge = ({ className, variant = 'default', children }) => {
  const variants = {
    default: 'bg-background-tertiary text-foreground-secondary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-accent/10 text-accent',
    ghost: 'bg-transparent text-foreground-muted border border-border',
    gradient: 'bg-gradient-to-r from-accent to-purple-500 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export { Badge };
