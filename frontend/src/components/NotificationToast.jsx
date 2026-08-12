import React from 'react';
import Toast from './ui/Toast';

export default function NotificationToast({ toasts, onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => onCloseToast(toast.id)} />
      ))}
    </div>
  );
}
