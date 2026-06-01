import React from 'react';
import { cn } from '@/lib/utils';

const Button = React.forwardRef(({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
  const variants = {
    default: 'bg-accent text-white hover:bg-accent-hover shadow-accent',
    secondary: 'bg-background-tertiary text-foreground border border-border hover:bg-border',
    success: 'bg-success text-white hover:bg-green-600 shadow-lg shadow-success/20',
    danger: 'bg-danger text-white hover:bg-red-600 shadow-lg shadow-danger/20',
    ghost: 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground',
    outline: 'border border-border hover:bg-background-tertiary hover:border-accent/50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    default: 'px-4 py-2.5 rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-xl',
    icon: 'p-2 rounded-lg',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
