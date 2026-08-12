import React from 'react';
import Spinner from './Spinner';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all active:scale-[0.98] select-none rounded-xl disabled:opacity-50 disabled:pointer-events-none disabled:transform-none';

  const sizeStyles = {
    sm: 'h-7 px-2.5 text-[11px] gap-1.5',
    md: 'h-8.5 px-3.5 text-xs gap-2',
    lg: 'h-10 px-4 text-xs gap-2',
  };

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm border border-blue-400/20',
    secondary: 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-main)] border border-[var(--border-color)]',
    ghost: 'text-[var(--text-main)] opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm border border-red-400/20',
    outline: 'border border-[var(--border-color)] text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 'sm' : 'md'} />
      ) : Icon ? (
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} />
      ) : null}
      {children}
    </button>
  );
}
