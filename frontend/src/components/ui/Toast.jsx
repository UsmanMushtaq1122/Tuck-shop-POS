import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiAlertTriangle, FiInfo, FiBell } from 'react-icons/fi';
import { cn } from '@/lib/utils';

const icons = {
  success: FiCheck,
  danger: FiAlertTriangle,
  warning: FiAlertTriangle,
  info: FiInfo,
  default: FiBell,
};

const colors = {
  success: 'border-l-success bg-success/5',
  danger: 'border-l-danger bg-danger/5',
  warning: 'border-l-warning bg-warning/5',
  info: 'border-l-accent bg-accent/5',
  default: 'border-l-border bg-background-tertiary',
};

const iconColors = {
  success: 'text-success bg-success/10',
  danger: 'text-danger bg-danger/10',
  warning: 'text-warning bg-warning/10',
  info: 'text-accent bg-accent/10',
  default: 'text-foreground-muted bg-background',
};

export function Toast({ toast, onRemove }) {
  const Icon = icons[toast.variant] || icons.default;

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border border-l-4 shadow-lg min-w-[320px] max-w-md',
        colors[toast.variant] || colors.default
      )}
    >
      <div className={cn('p-2 rounded-lg shrink-0', iconColors[toast.variant] || iconColors.default)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.title || toast.variant}</p>
        {toast.description && (
          <p className="text-xs text-foreground-secondary mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 rounded-lg hover:bg-background-tertiary transition-colors shrink-0 opacity-60 hover:opacity-100"
      >
        <FiX className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onRemove={onRemove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
