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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] select-none rounded-lg disabled:opacity-40 disabled:pointer-events-none disabled:transform-none';

  const sizeStyles = {
    sm: 'h-7 px-2.5 text-[11px] gap-1.5',
    md: 'h-8 px-3 text-xs gap-2',
    lg: 'h-9.5 px-4 text-xs gap-2',
  };

  const variantStyles = {
    primary: 'bg-[var(--accent)] hover:opacity-90 text-white shadow-sm',
    secondary: 'bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover)] text-[var(--text-main)] border border-[var(--border-color)]',
    ghost: 'text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--btn-secondary-bg)]',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm',
    outline: 'border border-[var(--border-color)] text-[var(--text-main)] hover:bg-[var(--btn-secondary-bg)]',
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
