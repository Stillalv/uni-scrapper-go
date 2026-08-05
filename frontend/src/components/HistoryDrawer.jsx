import React from 'react';
import { X, ClockWaves, Folder, ClockCircle, TrashTwo } from '@mynaui/icons-react';

export default function HistoryDrawer({ isOpen, onClose, historyList, onClearHistory }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 dark:bg-black/60 backdrop-blur-sm transition-all">
      <div className="w-full max-w-md h-full glass-panel border-l border-black/10 dark:border-white/10 flex flex-col shadow-2xl animate-slide-left">
        <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockWaves className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Download History & Session Logs</h3>
          </div>
          <div className="flex items-center gap-2">
            {historyList.length > 0 && (
              <button
                onClick={onClearHistory}
                className="text-xs text-rose-600 dark:text-rose-400 hover:opacity-80 flex items-center gap-1 p-1"
                title="Clear History"
              >
                <TrashTwo className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {historyList.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 dark:text-white/40 space-y-2">
              <ClockCircle className="w-8 h-8 mx-auto opacity-30" />
              <p>No download history in this session yet.</p>
            </div>
          ) : (
            historyList.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl glass-card space-y-2 border border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-[240px]">{item.title}</span>
                  <span className="text-[10px] text-neutral-400 dark:text-white/40 font-mono">{item.timestamp}</span>
                </div>
                <div className="text-xs text-neutral-600 dark:text-white/70 flex items-center justify-between">
                  <span>
                    Chapters Completed:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {item.completedCount} / {item.totalCount}
                    </strong>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold border border-emerald-500/30">
                    {item.format}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 dark:text-white/40 truncate flex items-center gap-1">
                  <Folder className="w-3 h-3 text-amber-500 dark:text-yellow-400 shrink-0" />
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
