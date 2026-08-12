import React from 'react';
import { CheckCircle, DangerTriangle, XCircle, Info, X } from '@mynaui/icons-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  const tone = isSuccess
    ? 'border-emerald-500/30 bg-white/95 text-slate-900 shadow-xl dark:bg-slate-900/95 dark:text-emerald-200 dark:border-emerald-500/40'
    : isError
    ? 'border-rose-500/30 bg-white/95 text-slate-900 shadow-xl dark:bg-slate-900/95 dark:text-rose-200 dark:border-rose-500/40'
    : isWarning
    ? 'border-amber-500/30 bg-white/95 text-slate-900 shadow-xl dark:bg-slate-900/95 dark:text-amber-200 dark:border-amber-500/40'
    : 'border-blue-500/30 bg-white/95 text-slate-900 shadow-xl dark:bg-slate-900/95 dark:text-blue-200 dark:border-blue-500/40';

  const iconTone = isSuccess
    ? 'text-emerald-600 dark:text-emerald-400'
    : isError
    ? 'text-rose-600 dark:text-rose-400'
    : isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-blue-600 dark:text-blue-400';

  return (
    <div
      className={`pointer-events-auto p-3.5 rounded-2xl backdrop-blur-xl shadow-2xl border flex items-start gap-3 transform transition-all duration-300 animate-slide-up ${tone}`}
    >
      {isSuccess && <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${iconTone}`} />}
      {isError && <XCircle className={`w-5 h-5 shrink-0 mt-0.5 ${iconTone}`} />}
      {isWarning && <DangerTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${iconTone}`} />}
      {!isSuccess && !isError && !isWarning && <Info className={`w-5 h-5 shrink-0 mt-0.5 ${iconTone}`} />}

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold">{toast.title || 'Notification'}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>

      <button
        onClick={onClose}
        className="opacity-40 hover:opacity-100 transition-opacity p-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
