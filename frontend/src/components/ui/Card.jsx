import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const Card = React.forwardRef(({ className, children, hover = false, gradient = false, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'glass-card',
        hover && 'cursor-pointer',
        gradient && 'gradient-border',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});

Card.displayName = 'Card';

const CardHeader = ({ className, children }) => (
  <div className={cn('px-6 py-4 border-b border-border', className)}>{children}</div>
);

const CardContent = ({ className, children }) => (
  <div className={cn('p-6', className)}>{children}</div>
);

const CardFooter = ({ className, children }) => (
  <div className={cn('px-6 py-4 border-t border-border', className)}>{children}</div>
);

export { Card, CardHeader, CardContent, CardFooter };
