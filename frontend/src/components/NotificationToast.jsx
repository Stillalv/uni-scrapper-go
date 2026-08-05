import React from 'react';
import { CheckCircle, DangerTriangle, XCircle, Info, X } from '@mynaui/icons-react';

export default function NotificationToast({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const tone = isSuccess
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : isError
          ? 'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
          : isWarning
          ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
          : 'border-blue-500/40 bg-blue-500/15 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300';

        const iconTone = isSuccess
          ? 'text-emerald-600 dark:text-emerald-400'
          : isError
          ? 'text-rose-600 dark:text-rose-400'
          : isWarning
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-blue-600 dark:text-blue-400';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-xl glass-panel shadow-2xl border flex items-start gap-3 transform transition-all duration-300 animate-slide-up ${tone}`}
          >
            {isSuccess && <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${iconTone}`} />}
            {isError && <XCircle className={`w-5 h-5 shrink-0 mt-0.5 ${iconTone}`} />}
            {isWarning && <DangerTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${iconTone}`} />}
            {!isSuccess && !isError && !isWarning && <Info className={`w-5 h-5 shrink-0 mt-0.5 ${iconTone}`} />}

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold capitalize">{toast.title || 'Notifikasi'}</h4>
              <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => onCloseToast(toast.id)}
              className="opacity-40 hover:opacity-100 transition-opacity p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
