import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function NotificationToast({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-xl glass-panel shadow-2xl border flex items-start gap-3 transform transition-all duration-300 animate-slide-up ${
              isSuccess
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100'
                : isError
                ? 'border-rose-500/40 bg-rose-950/40 text-rose-100'
                : isWarning
                ? 'border-amber-500/40 bg-amber-950/40 text-amber-100'
                : 'border-blue-500/40 bg-blue-950/40 text-blue-100'
            }`}
          >
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {isError && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold capitalize">{toast.title || 'Notifikasi'}</h4>
              <p className="text-xs text-white/80 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => onCloseToast(toast.id)}
              className="text-white/40 hover:text-white transition-colors p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
