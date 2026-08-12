import React from 'react';
import { Info, CheckCircle, DangerTriangle, XCircle } from '@mynaui/icons-react';

export default function Alert({
  title,
  children,
  type = 'info', // 'info' | 'success' | 'warning' | 'error'
  className = '',
}) {
  const styles = {
    info: {
      container: 'bg-blue-500/10 text-blue-900 dark:text-blue-200 border-blue-500/20',
      icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
    },
    success: {
      container: 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/20',
      icon: <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    },
    warning: {
      container: 'bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/20',
      icon: <DangerTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    },
    error: {
      container: 'bg-rose-500/10 text-rose-900 dark:text-rose-200 border-rose-500/20',
      icon: <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
    },
  };

  const current = styles[type] || styles.info;

  return (
    <div className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${current.container} ${className}`}>
      {current.icon}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-bold text-xs mb-0.5">{title}</h4>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}
