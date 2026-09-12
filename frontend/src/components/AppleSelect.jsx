import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from '@mynaui/icons-react';

export default function AppleSelect({ value, onChange, options, className = '' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-8 flex items-center justify-between gap-2 px-3 text-xs rounded-lg font-medium transition-all border select-none
          bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--text-main)]
          hover:border-[var(--border-hover)]
          ${open ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : ''}`}
      >
        <span className="truncate text-left">{selected?.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-[var(--text-sub)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 py-1 rounded-xl overflow-hidden animate-slide-up
            bg-[var(--panel-bg)] backdrop-blur-xl
            border border-[var(--border-color)]
            shadow-xl"
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors
                  ${
                    isActive
                      ? 'bg-[var(--accent)] text-white font-medium'
                      : 'text-[var(--text-main)] hover:bg-[var(--btn-secondary-hover)]'
                  }`}
              >
                <span className="truncate">{opt.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
