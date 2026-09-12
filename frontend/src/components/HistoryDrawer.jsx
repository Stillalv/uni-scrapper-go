import React from 'react';
import { X, ClockWaves, Folder, ClockCircle, TrashTwo } from '@mynaui/icons-react';
import Badge from './ui/Badge';

export default function HistoryDrawer({ isOpen, onClose, historyList, onClearHistory }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-all">
      <div className="w-full max-w-md h-full glass-panel border-l border-[var(--border-color)] flex flex-col shadow-2xl animate-slide-left">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockWaves className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-main)]">Download History & Session Logs</h3>
          </div>
          <div className="flex items-center gap-2">
            {historyList.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-rose-500/10 transition-colors"
                title="Clear History"
              >
                <TrashTwo className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--btn-secondary-bg)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {historyList.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted-custom)] space-y-2">
              <ClockCircle className="w-8 h-8 mx-auto opacity-30" />
              <p>No download history in this session yet.</p>
            </div>
          ) : (
            historyList.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl glass-card space-y-2 border border-[var(--border-color)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-main)] truncate">{item.title}</span>
                  <span className="text-[10px] text-[var(--text-muted-custom)] font-mono shrink-0">{item.timestamp}</span>
                </div>
                <div className="text-xs text-[var(--text-sub)] flex items-center justify-between">
                  <span>
                    Chapters: <strong className="text-[var(--text-main)] font-semibold">{item.completedCount} / {item.totalCount}</strong>
                  </span>
                  <Badge variant="emerald">
                    {item.format}
                  </Badge>
                </div>
                <div className="text-[11px] text-[var(--text-muted-custom)] truncate flex items-center gap-1.5 font-mono">
                  <Folder className="w-3 h-3 text-[var(--accent)] shrink-0" />
                  <span className="truncate">{item.outputDir}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
