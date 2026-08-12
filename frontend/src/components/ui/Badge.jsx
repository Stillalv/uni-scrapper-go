import React from 'react';

export default function Badge({
  children,
  variant = 'neutral', // 'neutral' | 'blue' | 'emerald' | 'rose' | 'amber'
  icon: Icon,
  className = '',
}) {
  const variantStyles = {
    neutral: 'bg-black/5 dark:bg-white/10 text-[var(--text-main)] border-black/5 dark:border-white/10 opacity-80',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border backdrop-blur-sm ${variantStyles[variant] || variantStyles.neutral} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
