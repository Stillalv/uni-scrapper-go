import React from 'react';
import { CheckCircle, DangerTriangle, XCircle, Info, X } from '@mynaui/icons-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  const iconColor = isSuccess
    ? 'text-emerald-500'
    : isError
    ? 'text-rose-500'
    : isWarning
    ? 'text-amber-500'
    : 'text-blue-500';

  const IconComponent = isSuccess
    ? CheckCircle
    : isError
    ? XCircle
    : isWarning
    ? DangerTriangle
    : Info;

  return (
    <div
      className="pointer-events-auto p-3 rounded-xl glass-panel shadow-2xl border border-[var(--border-color)] flex items-start gap-3 animate-slide-up"
    >
      <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-[var(--text-main)]">{toast.title || 'Notification'}</h4>
        <p className="text-[11px] text-[var(--text-sub)] mt-0.5 leading-relaxed">{toast.message}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors p-0.5 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
