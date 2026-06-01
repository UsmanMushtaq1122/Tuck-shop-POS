import React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, icon, ...props }, ref) => {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          'input',
          icon && 'pl-10',
          className
        )}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
